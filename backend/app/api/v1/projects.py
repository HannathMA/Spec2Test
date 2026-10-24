from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.db.session import get_db
from backend.app.models.project import Project
from backend.app.models.requirement import Requirement, AcceptanceCriterion
from backend.app.models.test_case import TestCase
from backend.app.models.execution import TestRun, TestResult
from backend.app.models.activity import ActivityEvent
from backend.app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from backend.app.services.traceability.service import compute_traceability_matrix

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.get("", response_model=List[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    return db.query(Project).order_by(desc(Project.created_at)).all()

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    proj = Project(
        name=payload.name,
        description=payload.description,
        target_url=payload.target_url,
        test_framework=payload.test_framework,
        environment=payload.environment
    )
    db.add(proj)
    db.commit()
    db.refresh(proj)

    db.add(ActivityEvent(
        project_id=proj.id,
        event_type="project_created",
        title="Project created",
        description=f"Initialized '{proj.name}'."
    ))
    db.commit()

    return proj

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return proj

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: str, payload: ProjectUpdate, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = payload.dict(exclude_unset=True)
    for field, val in update_data.items():
        setattr(proj, field, val)

    db.commit()
    db.refresh(proj)
    return proj

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: str, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(proj)
    db.commit()
    return None

@router.get("/{project_id}/stats")
def get_project_stats(project_id: str, db: Session = Depends(get_db)):
    """
    Returns verified aggregate metrics for the Overview dashboard:
    - Total Requirements
    - Total Acceptance Criteria
    - Generated Tests
    - Passed / Failed / Unverified test results
    - Requirement Verification Rate & Project Health
    - Recent Activity feed
    """
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    requirements = db.query(Requirement).filter(Requirement.project_id == project_id).all()
    total_reqs = len(requirements)

    criteria_count = (
        db.query(AcceptanceCriterion)
        .join(Requirement)
        .filter(Requirement.project_id == project_id)
        .count()
    )

    test_cases = db.query(TestCase).filter(TestCase.project_id == project_id).all()
    total_tests = len(test_cases)

    # Calculate test case outcomes based on latest execution results
    passed_tests = 0
    failed_tests = 0
    unverified_tests = 0

    for tc in test_cases:
        latest = (
            db.query(TestResult)
            .filter(TestResult.test_case_id == tc.id)
            .order_by(desc(TestResult.created_at))
            .first()
        )
        if not latest or latest.is_stale or tc.is_stale:
            unverified_tests += 1
        elif latest.status == "Passed":
            passed_tests += 1
        elif latest.status == "Failed":
            failed_tests += 1
        else:
            unverified_tests += 1

    # Requirement Verification rate using Traceability policy
    trace_matrix = compute_traceability_matrix(db, project_id)

    # Recent activities
    activities = (
        db.query(ActivityEvent)
        .filter(ActivityEvent.project_id == project_id)
        .order_by(desc(ActivityEvent.created_at))
        .limit(8)
        .all()
    )

    activity_list = []
    for a in activities:
        # compute relative time string
        activity_list.append({
            "id": a.id,
            "event_type": a.event_type,
            "title": a.title,
            "description": a.description,
            "created_at": a.created_at.isoformat()
        })

    return {
        "project": {
            "id": proj.id,
            "name": proj.name,
            "environment": proj.environment,
            "target_url": proj.target_url,
            "test_framework": proj.test_framework
        },
        "metrics": {
            "total_requirements": total_reqs,
            "acceptance_criteria": criteria_count,
            "generated_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "unverified_tests": unverified_tests,
            "verified_requirements": trace_matrix.verified_count,
            "failed_requirements": trace_matrix.failed_count,
            "unverified_requirements": trace_matrix.unverified_count,
            "verification_rate": trace_matrix.verification_rate
        },
        "recent_activity": activity_list
    }
