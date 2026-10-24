import re
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.db.session import get_db
from backend.app.models.requirement import Requirement, RequirementVersion, AcceptanceCriterion, AnalysisFinding
from backend.app.models.test_case import TestCase
from backend.app.models.activity import ActivityEvent
from backend.app.schemas.requirement import (
    RequirementCreate,
    RequirementUpdate,
    RequirementResponse,
    RequirementDetailResponse,
    AcceptanceCriterionCreate,
    AcceptanceCriterionResponse,
    AcceptanceCriterionUpdate,
    BatchAcceptanceCriteriaApproval
)
from backend.app.services.requirements.doc_parser import extract_text_from_file
from backend.app.services.ai.analyzer import analyze_requirement, regenerate_single_criterion
from backend.app.services.traceability.service import compute_traceability_matrix

router = APIRouter(prefix="/requirements", tags=["Requirements"])

def _generate_req_id(db: Session, project_id: str) -> str:
    count = db.query(Requirement).filter(Requirement.project_id == project_id).count()
    return f"REQ-{count + 1:03d}"

@router.get("", response_model=List[RequirementDetailResponse])
def list_requirements(project_id: str, db: Session = Depends(get_db)):
    reqs = db.query(Requirement).filter(Requirement.project_id == project_id).order_by(Requirement.req_id).all()
    matrix = compute_traceability_matrix(db, project_id)
    verif_map = {r.requirement_id: r.verification_state for r in matrix.rows}

    res = []
    for r in reqs:
        crit_count = len(r.acceptance_criteria) if r.acceptance_criteria else 0
        test_count = db.query(TestCase).filter(
            TestCase.project_id == project_id,
            (TestCase.requirement_id == r.id) | (TestCase.linked_req_id == r.req_id)
        ).count()
        dto = RequirementDetailResponse.from_orm(r)
        dto.acceptance_criteria_count = crit_count
        dto.test_cases_count = test_count
        dto.verification_status = verif_map.get(r.id, "Unverified")
        res.append(dto)
    return res

@router.post("", response_model=RequirementDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_requirement(payload: RequirementCreate, db: Session = Depends(get_db)):
    req_id = _generate_req_id(db, payload.project_id)
    
    req = Requirement(
        project_id=payload.project_id,
        req_id=req_id,
        title=payload.title,
        original_text=payload.original_text,
        description=payload.description or f"Requirement {req_id}",
        priority=payload.priority,
        source=payload.source,
        source_location=payload.source_location,
        status="Analyzed",
        current_version=1
    )
    db.add(req)
    db.flush()

    # Save Version 1
    db.add(RequirementVersion(
        requirement_id=req.id,
        version_number=1,
        title=req.title,
        original_text=req.original_text,
        description=req.description,
        priority=req.priority,
        status="Analyzed",
        change_summary="Initial created requirement"
    ))

    # Perform immediate analysis (ambiguity, thresholds, criteria suggestions)
    analysis = await analyze_requirement(req.title, req.original_text)

    # Save findings
    for f in analysis.findings:
        db.add(AnalysisFinding(
            requirement_id=req.id,
            finding_type=f.finding_type,
            severity=f.severity,
            title=f.title,
            explanation=f.explanation,
            suggested_clarification=f.suggested_clarification
        ))

    # Save suggested criteria
    for sc in analysis.suggested_criteria:
        db.add(AcceptanceCriterion(
            requirement_id=req.id,
            criterion_id=sc.criterion_id,
            criterion_text=sc.criterion_text,
            format=sc.format,
            review_status="pending",
            is_approved=False,
            version_number=1
        ))

    # Log activity
    db.add(ActivityEvent(
        project_id=payload.project_id,
        event_type="requirement_analyzed",
        title="Requirements analyzed",
        description=f"Ingested and analyzed {req_id} with {len(analysis.suggested_criteria)} suggested criteria."
    ))

    db.commit()
    db.refresh(req)
    return req

@router.post("/upload", response_model=RequirementDetailResponse)
async def upload_requirement_file(
    project_id: str = Form(...),
    title: Optional[str] = Form(None),
    priority: str = Form("High"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Ingests requirements document (.pdf, .docx, .txt, .md).
    Extracts text safely, creates requirement, and performs automated analysis.
    """
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds maximum allowable limit of 10 MB.")

    try:
        extracted_text, doc_type = extract_text_from_file(file.filename, content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    doc_title = title or file.filename.rsplit('.', 1)[0].replace('_', ' ').replace('-', ' ').title()
    req_id = _generate_req_id(db, project_id)

    req = Requirement(
        project_id=project_id,
        req_id=req_id,
        title=doc_title,
        original_text=extracted_text,
        description=f"Ingested from uploaded document '{file.filename}' ({doc_type}).",
        priority=priority,
        source=f"upload:{doc_type}",
        source_location=file.filename,
        status="Analyzed",
        current_version=1
    )
    db.add(req)
    db.flush()

    db.add(RequirementVersion(
        requirement_id=req.id,
        version_number=1,
        title=req.title,
        original_text=req.original_text,
        description=req.description,
        priority=req.priority,
        status="Analyzed",
        change_summary=f"Ingested from {file.filename}"
    ))

    # Run Analysis
    analysis = await analyze_requirement(req.title, req.original_text)

    for f in analysis.findings:
        db.add(AnalysisFinding(
            requirement_id=req.id,
            finding_type=f.finding_type,
            severity=f.severity,
            title=f.title,
            explanation=f.explanation,
            suggested_clarification=f.suggested_clarification
        ))

    for sc in analysis.suggested_criteria:
        db.add(AcceptanceCriterion(
            requirement_id=req.id,
            criterion_id=sc.criterion_id,
            criterion_text=sc.criterion_text,
            format=sc.format,
            review_status="pending",
            is_approved=False,
            version_number=1
        ))

    db.add(ActivityEvent(
        project_id=project_id,
        event_type="requirement_analyzed",
        title="Document ingested & analyzed",
        description=f"Extracted requirements from '{file.filename}'. Found {len(analysis.findings)} potential issues."
    ))

    db.commit()
    db.refresh(req)
    return req

@router.get("/{requirement_id}", response_model=RequirementDetailResponse)
def get_requirement(requirement_id: str, db: Session = Depends(get_db)):
    req = db.query(Requirement).filter(Requirement.id == requirement_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    return req

@router.post("/{requirement_id}/analyze")
async def trigger_analysis(requirement_id: str, db: Session = Depends(get_db)):
    req = db.query(Requirement).filter(Requirement.id == requirement_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    # Clear old findings
    db.query(AnalysisFinding).filter(AnalysisFinding.requirement_id == req.id).delete()

    analysis = await analyze_requirement(req.title, req.original_text)

    for f in analysis.findings:
        db.add(AnalysisFinding(
            requirement_id=req.id,
            finding_type=f.finding_type,
            severity=f.severity,
            title=f.title,
            explanation=f.explanation,
            suggested_clarification=f.suggested_clarification
        ))

    # Add suggested criteria if none exist
    existing_crit_count = db.query(AcceptanceCriterion).filter(AcceptanceCriterion.requirement_id == req.id).count()
    if existing_crit_count == 0:
        for sc in analysis.suggested_criteria:
            db.add(AcceptanceCriterion(
                requirement_id=req.id,
                criterion_id=sc.criterion_id,
                criterion_text=sc.criterion_text,
                format=sc.format,
                review_status="pending",
                is_approved=False,
                version_number=req.current_version
            ))

    req.status = "Analyzed"
    db.commit()
    db.refresh(req)
    return req

@router.put("/criteria/{criterion_id}", response_model=AcceptanceCriterionResponse)
def update_acceptance_criterion(criterion_id: str, payload: AcceptanceCriterionUpdate, db: Session = Depends(get_db)):
    crit = db.query(AcceptanceCriterion).filter(AcceptanceCriterion.id == criterion_id).first()
    if not crit:
        raise HTTPException(status_code=404, detail="Acceptance criterion not found")

    if payload.criterion_text is not None:
        crit.criterion_text = payload.criterion_text
    
    if payload.review_status is not None:
        crit.review_status = payload.review_status
        crit.is_approved = (payload.review_status == "approved")
    elif payload.is_approved is not None:
        crit.is_approved = payload.is_approved
        crit.review_status = "approved" if payload.is_approved else "rejected"

    db.commit()
    db.refresh(crit)
    return crit

@router.post("/criteria/{criterion_id}/regenerate", response_model=AcceptanceCriterionResponse)
async def regenerate_criterion(criterion_id: str, db: Session = Depends(get_db)):
    crit = db.query(AcceptanceCriterion).filter(AcceptanceCriterion.id == criterion_id).first()
    if not crit:
        raise HTTPException(status_code=404, detail="Acceptance criterion not found")
    
    req = db.query(Requirement).filter(Requirement.id == crit.requirement_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    new_text = await regenerate_single_criterion(req.title, req.original_text, crit.criterion_id, crit.criterion_text)
    crit.criterion_text = new_text
    crit.review_status = "pending"
    crit.is_approved = False
    
    db.commit()
    db.refresh(crit)
    return crit

@router.post("/{requirement_id}/criteria", response_model=AcceptanceCriterionResponse, status_code=status.HTTP_201_CREATED)
def create_acceptance_criterion(requirement_id: str, payload: AcceptanceCriterionCreate, db: Session = Depends(get_db)):
    req = db.query(Requirement).filter(Requirement.id == requirement_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    crit_id = payload.criterion_id
    if not crit_id:
        existing_count = db.query(AcceptanceCriterion).filter(AcceptanceCriterion.requirement_id == requirement_id).count()
        crit_id = f"AC-{req.req_id.replace('REQ-', '')}-{existing_count + 1:02d}"

    review_status = payload.review_status or ("approved" if payload.is_approved else "pending")
    is_approved = (review_status == "approved")

    crit = AcceptanceCriterion(
        requirement_id=requirement_id,
        criterion_id=crit_id,
        criterion_text=payload.criterion_text,
        format=payload.format or "given_when_then",
        review_status=review_status,
        is_approved=is_approved,
        version_number=req.current_version
    )
    db.add(crit)
    db.commit()
    db.refresh(crit)
    return crit

@router.delete("/criteria/{criterion_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_acceptance_criterion(criterion_id: str, db: Session = Depends(get_db)):
    crit = db.query(AcceptanceCriterion).filter(AcceptanceCriterion.id == criterion_id).first()
    if not crit:
        raise HTTPException(status_code=404, detail="Acceptance criterion not found")
    db.delete(crit)
    db.commit()
    return None

@router.post("/{requirement_id}/criteria/batch-approve")
def batch_approve_criteria(requirement_id: str, payload: BatchAcceptanceCriteriaApproval, db: Session = Depends(get_db)):
    req = db.query(Requirement).filter(Requirement.id == requirement_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    crits = db.query(AcceptanceCriterion).filter(
        AcceptanceCriterion.requirement_id == requirement_id,
        AcceptanceCriterion.id.in_(payload.criterion_ids)
    ).all()

    new_status = "approved" if payload.approve else "rejected"
    for c in crits:
        c.is_approved = payload.approve
        c.review_status = new_status

    all_req_crits = db.query(AcceptanceCriterion).filter(AcceptanceCriterion.requirement_id == requirement_id).all()
    req.status = "Refined" if any(c.is_approved for c in all_req_crits) else "Analyzed"
    db.commit()
    return {"updated": len(crits), "approved": payload.approve, "review_status": new_status}

@router.put("/{requirement_id}", response_model=RequirementDetailResponse)
def update_requirement(requirement_id: str, payload: RequirementUpdate, db: Session = Depends(get_db)):
    req = db.query(Requirement).filter(Requirement.id == requirement_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    text_changed = payload.original_text and payload.original_text != req.original_text
    
    if payload.title is not None:
        req.title = payload.title
    if payload.original_text is not None:
        req.original_text = payload.original_text
    if payload.description is not None:
        req.description = payload.description
    if payload.priority is not None:
        req.priority = payload.priority
    if payload.status is not None:
        req.status = payload.status

    if text_changed:
        req.current_version += 1
        # Record new version
        db.add(RequirementVersion(
            requirement_id=req.id,
            version_number=req.current_version,
            title=req.title,
            original_text=req.original_text,
            description=req.description,
            priority=req.priority,
            status=req.status,
            change_summary=payload.change_summary or "Requirement text updated."
        ))

        # Invalidate tests: flag linked tests as stale!
        linked_tests = db.query(TestCase).filter(
            (TestCase.requirement_id == req.id) | (TestCase.linked_req_id == req.req_id)
        ).all()
        for t in linked_tests:
            t.is_stale = True

    db.commit()
    db.refresh(req)
    return req
