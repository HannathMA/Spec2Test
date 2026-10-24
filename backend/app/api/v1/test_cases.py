from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.db.session import get_db
from backend.app.models.test_case import TestCase, TestCaseVersion
from backend.app.models.requirement import Requirement, AcceptanceCriterion
from backend.app.models.project import Project
from backend.app.models.execution import TestResult
from backend.app.models.activity import ActivityEvent
from backend.app.schemas.test_case import (
    TestCaseCreate,
    TestCaseUpdate,
    TestCaseResponse,
    TestCaseGenerateRequest
)
from backend.app.services.ai.generator import generate_tests_for_requirement

router = APIRouter(prefix="/test-cases", tags=["Test Cases"])

@router.get("", response_model=List[TestCaseResponse])
def list_test_cases(
    project_id: str,
    requirement_id: Optional[str] = None,
    test_type: Optional[str] = None,
    priority: Optional[str] = None,
    review_status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(TestCase).filter(TestCase.project_id == project_id)

    if requirement_id:
        query = query.filter((TestCase.requirement_id == requirement_id) | (TestCase.linked_req_id == requirement_id))
    if test_type:
        query = query.filter(TestCase.test_type == test_type)
    if priority:
        query = query.filter(TestCase.priority == priority)
    if review_status:
        query = query.filter(TestCase.review_status == review_status)

    tests = query.order_by(TestCase.test_id).all()

    res = []
    for t in tests:
        # Get latest execution status
        latest = (
            db.query(TestResult)
            .filter(TestResult.test_case_id == t.id)
            .order_by(desc(TestResult.created_at))
            .first()
        )
        st = "Unverified"
        if latest and not latest.is_stale and not t.is_stale:
            st = latest.status

        dto = TestCaseResponse.from_orm(t)
        dto.latest_status = st
        res.append(dto)

    return res

@router.post("/generate", response_model=List[TestCaseResponse])
async def generate_test_cases(payload: TestCaseGenerateRequest, db: Session = Depends(get_db)):
    """
    Generates structured, executable test cases for approved requirements and criteria.
    Covers Positive, Negative, Boundary, Edge Case, Performance, and Security.
    """
    proj = db.query(Project).filter(Project.id == payload.project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    req_query = db.query(Requirement).filter(Requirement.project_id == payload.project_id)
    if payload.requirement_id:
        req_query = req_query.filter(Requirement.id == payload.requirement_id)
    
    requirements = req_query.all()
    if not requirements:
        raise HTTPException(status_code=400, detail="No requirements found to generate tests for.")

    created_tests: List[TestCase] = []

    for req in requirements:
        # Backend independent verification: Get ONLY approved criteria.
        # Pending or rejected criteria MUST NOT generate tests under any circumstances.
        approved_criteria = db.query(AcceptanceCriterion).filter(
            AcceptanceCriterion.requirement_id == req.id,
            AcceptanceCriterion.review_status == "approved"
        ).all()

        if not approved_criteria:
            continue

        criteria_dicts = [
            {"criterion_id": c.criterion_id, "criterion_text": c.criterion_text}
            for c in approved_criteria
        ]

        if payload.overwrite_existing:
            db.query(TestCase).filter(
                TestCase.project_id == proj.id,
                TestCase.requirement_id == req.id
            ).delete()
            db.flush()

        # Generate test specifications + real code
        raw_tests = await generate_tests_for_requirement(
            req_id=req.req_id,
            title=req.title,
            criteria=criteria_dicts,
            target_url=proj.target_url
        )

        for rt in raw_tests:
            # Check if test_id already exists in this project
            existing = db.query(TestCase).filter(
                TestCase.project_id == proj.id,
                TestCase.test_id == rt.test_id
            ).first()
            if existing:
                continue

            tc = TestCase(
                project_id=proj.id,
                requirement_id=req.id,
                test_id=rt.test_id,
                title=rt.title,
                description=rt.description,
                linked_req_id=req.req_id,
                linked_criterion_ids=rt.linked_criterion_ids,
                test_type=rt.test_type,
                priority=rt.priority,
                preconditions=rt.preconditions,
                steps=rt.steps,
                expected_outcome=rt.expected_outcome,
                execution_method="pytest",
                generated_code=rt.python_test_code,
                test_module_name=f"test_{req.req_id.lower()}_{rt.test_id.lower()}.py",
                test_function_name=f"test_{req.req_id.lower()}_{rt.test_id.lower()}",
                review_status="Approved",
                is_stale=False,
                req_version_at_generation=req.current_version
            )
            db.add(tc)
            created_tests.append(tc)

    db.add(ActivityEvent(
        project_id=proj.id,
        event_type="test_generated",
        title="Test cases generated",
        description=f"Generated {len(created_tests)} executable test case(s) with pytest verification code."
    ))

    db.commit()

    # Re-fetch for response
    return list_test_cases(project_id=proj.id, db=db)

@router.get("/{test_case_id}", response_model=TestCaseResponse)
def get_test_case(test_case_id: str, db: Session = Depends(get_db)):
    tc = db.query(TestCase).filter(TestCase.id == test_case_id).first()
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    
    latest = (
        db.query(TestResult)
        .filter(TestResult.test_case_id == tc.id)
        .order_by(desc(TestResult.created_at))
        .first()
    )
    dto = TestCaseResponse.from_orm(tc)
    dto.latest_status = latest.status if latest and not latest.is_stale and not tc.is_stale else "Unverified"
    return dto

@router.put("/{test_case_id}", response_model=TestCaseResponse)
def update_test_case(test_case_id: str, payload: TestCaseUpdate, db: Session = Depends(get_db)):
    tc = db.query(TestCase).filter(TestCase.id == test_case_id).first()
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")

    update_dict = payload.dict(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(tc, k, v)

    # If code was manually edited or approved, record version and unmark stale
    if payload.generated_code is not None or payload.review_status == "Approved":
        tc.is_stale = False

    db.commit()
    db.refresh(tc)
    return get_test_case(test_case_id=tc.id, db=db)

@router.delete("/{test_case_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_test_case(test_case_id: str, db: Session = Depends(get_db)):
    tc = db.query(TestCase).filter(TestCase.id == test_case_id).first()
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    db.delete(tc)
    db.commit()
    return None
