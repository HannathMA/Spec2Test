from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.db.session import get_db
from backend.app.models.requirement import Requirement, RequirementVersion, AcceptanceCriterion
from backend.app.models.test_case import TestCase
from backend.app.models.execution import TestResult
from backend.app.models.change_impact import ChangeImpactRecord
from backend.app.models.activity import ActivityEvent
from backend.app.schemas.change_impact import (
    ChangeImpactRequest,
    ChangeImpactResponse,
    ChangeImpactApprovalRequest,
    AffectedTestSummary
)
from backend.app.services.ai.impact_analyzer import analyze_impact
from backend.app.services.ai.generator import generate_tests_for_requirement

router = APIRouter(prefix="/change-impact", tags=["Change Impact"])

@router.post("/analyze", response_model=ChangeImpactResponse)
async def analyze_requirement_change(payload: ChangeImpactRequest, db: Session = Depends(get_db)):
    req = db.query(Requirement).filter(Requirement.id == payload.requirement_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    # Get existing test cases
    test_cases = db.query(TestCase).filter(
        (TestCase.requirement_id == req.id) | (TestCase.linked_req_id == req.req_id)
    ).all()
    
    tc_dicts = [
        {
            "test_id": t.test_id,
            "title": t.title,
            "test_type": t.test_type,
            "generated_code": t.generated_code or "",
            "latest_status": "Passed" if not t.is_stale else "Stale"
        }
        for t in test_cases
    ]

    diff_summary, affected_tests, new_needed, to_rerun = await analyze_impact(
        old_text=req.original_text,
        new_text=payload.new_text,
        test_cases=tc_dicts
    )

    # Count historical results for these tests
    tc_ids = [t.id for t in test_cases]
    stale_results_count = db.query(TestResult).filter(TestResult.test_case_id.in_(tc_ids)).count()

    # Save pending impact record
    record = ChangeImpactRecord(
        project_id=req.project_id,
        requirement_id=req.id,
        old_version=req.current_version,
        new_version=req.current_version + 1,
        old_text=req.original_text,
        new_text=payload.new_text,
        diff_summary=diff_summary,
        affected_test_case_ids=[t.test_id for t in affected_tests],
        new_test_cases_needed=new_needed,
        tests_to_rerun_count=to_rerun,
        stale_results_count=stale_results_count,
        status="Pending",
        created_at=datetime.utcnow()
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return ChangeImpactResponse(
        record_id=record.id,
        requirement_id=req.id,
        req_id=req.req_id,
        old_version=req.current_version,
        new_version=req.current_version + 1,
        old_text=req.original_text,
        new_text=payload.new_text,
        diff_summary=diff_summary,
        affected_test_cases=affected_tests,
        affected_test_cases_count=len(affected_tests),
        new_test_cases_needed=new_needed,
        tests_to_rerun_count=to_rerun,
        stale_results_count=stale_results_count,
        status="Pending",
        created_at=record.created_at
    )

@router.post("/approve", response_model=ChangeImpactResponse)
async def approve_and_apply_change(payload: ChangeImpactApprovalRequest, db: Session = Depends(get_db)):
    req = db.query(Requirement).filter(Requirement.id == payload.requirement_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    old_text = req.original_text
    old_version = req.current_version
    new_version = old_version + 1

    # Update requirement
    req.original_text = payload.new_text
    if payload.new_title:
        req.title = payload.new_title
    req.current_version = new_version
    req.status = "Refined"
    req.updated_at = datetime.utcnow()

    # Create new RequirementVersion
    db.add(RequirementVersion(
        requirement_id=req.id,
        version_number=new_version,
        title=req.title,
        original_text=payload.new_text,
        description=req.description,
        priority=req.priority,
        status="Approved",
        change_summary=payload.change_summary or f"Updated specification to v{new_version}",
        created_at=datetime.utcnow()
    ))

    # Mark existing tests as stale
    linked_tests = db.query(TestCase).filter(
        (TestCase.requirement_id == req.id) | (TestCase.linked_req_id == req.req_id)
    ).all()

    for t in linked_tests:
        t.is_stale = True

    # Mark previous execution results as stale
    linked_tc_ids = [t.id for t in linked_tests]
    if linked_tc_ids:
        db.query(TestResult).filter(TestResult.test_case_id.in_(linked_tc_ids)).update({"is_stale": True}, synchronize_session=False)

    # Optionally regenerate tests
    if payload.auto_regenerate_tests:
        criteria = db.query(AcceptanceCriterion).filter(AcceptanceCriterion.requirement_id == req.id).all()
        criteria_dicts = [{"criterion_id": c.criterion_id, "criterion_text": c.criterion_text} for c in criteria]
        target_url = req.project.target_url if req.project else "http://127.0.0.1:8000/demo-target"

        new_tests = await generate_tests_for_requirement(
            req_id=req.req_id,
            title=req.title,
            criteria=criteria_dicts,
            target_url=target_url
        )
        for nt in new_tests:
            # Update existing matching test case code or create new
            match_tc = next((t for t in linked_tests if t.test_id == nt.test_id), None)
            if match_tc:
                match_tc.title = nt.title
                match_tc.generated_code = nt.python_test_code
                match_tc.is_stale = False
                match_tc.req_version_at_generation = new_version
            else:
                db.add(TestCase(
                    project_id=req.project_id,
                    requirement_id=req.id,
                    test_id=nt.test_id,
                    title=nt.title,
                    description=nt.description,
                    linked_req_id=req.req_id,
                    linked_criterion_ids=nt.linked_criterion_ids,
                    test_type=nt.test_type,
                    priority=nt.priority,
                    preconditions=nt.preconditions,
                    steps=nt.steps,
                    expected_outcome=nt.expected_outcome,
                    execution_method="pytest",
                    generated_code=nt.python_test_code,
                    test_module_name=f"test_{req.req_id.lower()}_{nt.test_id.lower()}.py",
                    test_function_name=f"test_{req.req_id.lower()}_{nt.test_id.lower()}",
                    review_status="Approved",
                    is_stale=False,
                    req_version_at_generation=new_version
                ))

    # Update impact record
    if payload.impact_record_id:
        rec = db.query(ChangeImpactRecord).filter(ChangeImpactRecord.id == payload.impact_record_id).first()
        if rec:
            rec.status = "Applied"
            rec.reviewed_at = datetime.utcnow()

    # Log activity
    db.add(ActivityEvent(
        project_id=req.project_id,
        event_type="requirement_updated",
        title=f"Requirement {req.req_id} updated to v{new_version}",
        description=f"Specification modified. Invalidated {len(linked_tests)} test cases as stale."
    ))

    db.commit()

    return ChangeImpactResponse(
        record_id=payload.impact_record_id,
        requirement_id=req.id,
        req_id=req.req_id,
        old_version=old_version,
        new_version=new_version,
        old_text=old_text,
        new_text=payload.new_text,
        diff_summary=f"Requirement updated from v{old_version} to v{new_version}. Stale tests flagged.",
        affected_test_cases=[
            AffectedTestSummary(
                test_id=t.test_id,
                title=t.title,
                test_type=t.test_type,
                action_required="rerun",
                current_status="Stale"
            )
            for t in linked_tests
        ],
        affected_test_cases_count=len(linked_tests),
        new_test_cases_needed=0,
        tests_to_rerun_count=len(linked_tests),
        stale_results_count=len(linked_tc_ids),
        status="Applied",
        created_at=datetime.utcnow()
    )

@router.get("/records", response_model=List[ChangeImpactResponse])
def list_impact_records(project_id: str, db: Session = Depends(get_db)):
    records = (
        db.query(ChangeImpactRecord)
        .filter(ChangeImpactRecord.project_id == project_id)
        .order_by(desc(ChangeImpactRecord.created_at))
        .all()
    )
    res = []
    for r in records:
        req = db.query(Requirement).filter(Requirement.id == r.requirement_id).first()
        res.append(ChangeImpactResponse(
            record_id=r.id,
            requirement_id=r.requirement_id,
            req_id=req.req_id if req else "REQ",
            old_version=r.old_version,
            new_version=r.new_version,
            old_text=r.old_text,
            new_text=r.new_text,
            diff_summary=r.diff_summary or "",
            affected_test_cases=[],
            affected_test_cases_count=len(r.affected_test_case_ids or []),
            new_test_cases_needed=r.new_test_cases_needed,
            tests_to_rerun_count=r.tests_to_rerun_count,
            stale_results_count=r.stale_results_count,
            status=r.status,
            created_at=r.created_at
        ))
    return res
