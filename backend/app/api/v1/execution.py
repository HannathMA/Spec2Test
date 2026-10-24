from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.db.session import get_db
from backend.app.models.execution import TestRun, TestResult, EvidenceRecord
from backend.app.models.test_case import TestCase
from backend.app.schemas.execution import (
    TestRunResponse,
    TestRunDetailResponse,
    TestResultResponse,
    EvidenceRecordResponse,
    ExecuteTestsRequest
)
from backend.app.services.execution.service import execute_project_tests

router = APIRouter(prefix="/execution", tags=["Execution Center"])

@router.get("/runs", response_model=List[TestRunResponse])
def list_test_runs(project_id: str, db: Session = Depends(get_db)):
    runs = (
        db.query(TestRun)
        .filter(TestRun.project_id == project_id)
        .order_by(desc(TestRun.started_at))
        .all()
    )
    return runs

@router.post("/run", response_model=TestRunDetailResponse)
def trigger_test_run(payload: ExecuteTestsRequest, db: Session = Depends(get_db)):
    """
    Executes actual test cases via isolated pytest subprocess runner.
    Captures live output, exit code, assertion diffs, and evidence records.
    """
    selected_tc_ids = payload.test_case_ids

    # If rerun_failed_only is requested, find failed tests from previous run
    if payload.rerun_failed_only and not selected_tc_ids:
        last_run = (
            db.query(TestRun)
            .filter(TestRun.project_id == payload.project_id)
            .order_by(desc(TestRun.started_at))
            .first()
        )
        if last_run:
            failed_results = (
                db.query(TestResult)
                .filter(TestResult.run_id == last_run.id, TestResult.status.in_(["Failed", "Error"]))
                .all()
            )
            selected_tc_ids = [r.test_case_id for r in failed_results]

    try:
        run = execute_project_tests(
            db=db,
            project_id=payload.project_id,
            test_case_ids=selected_tc_ids,
            environment=payload.environment or "Local"
        )
        return get_test_run_detail(run_id=run.id, db=db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution failed: {str(e)}")

@router.get("/runs/{run_id}", response_model=TestRunDetailResponse)
def get_test_run_detail(run_id: str, db: Session = Depends(get_db)):
    run = db.query(TestRun).filter(TestRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Test run not found")

    results = db.query(TestResult).filter(TestResult.run_id == run_id).all()
    
    result_dtos = []
    for r in results:
        tc = db.query(TestCase).filter(TestCase.id == r.test_case_id).first()
        ev_records = db.query(EvidenceRecord).filter(EvidenceRecord.test_result_id == r.id).all()

        dto = TestResultResponse(
            id=r.id,
            run_id=r.run_id,
            test_case_id=r.test_case_id,
            test_id=tc.test_id if tc else "",
            test_title=tc.title if tc else "Unknown Test",
            linked_req_id=tc.linked_req_id if tc else None,
            status=r.status,
            duration_ms=r.duration_ms,
            assertion_message=r.assertion_message,
            failure_details=r.failure_details,
            stack_trace=r.stack_trace,
            stdout=r.stdout,
            stderr=r.stderr,
            is_stale=r.is_stale,
            created_at=r.created_at,
            evidence=[EvidenceRecordResponse.from_orm(e) for e in ev_records]
        )
        result_dtos.append(dto)

    detail = TestRunDetailResponse.from_orm(run)
    detail.results = result_dtos
    return detail

@router.get("/runs/{run_id}/results/{result_id}", response_model=TestResultResponse)
def get_single_result(run_id: str, result_id: str, db: Session = Depends(get_db)):
    r = db.query(TestResult).filter(TestResult.id == result_id, TestResult.run_id == run_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Test result not found")

    tc = db.query(TestCase).filter(TestCase.id == r.test_case_id).first()
    ev_records = db.query(EvidenceRecord).filter(EvidenceRecord.test_result_id == r.id).all()

    return TestResultResponse(
        id=r.id,
        run_id=r.run_id,
        test_case_id=r.test_case_id,
        test_id=tc.test_id if tc else "",
        test_title=tc.title if tc else "Unknown Test",
        linked_req_id=tc.linked_req_id if tc else None,
        status=r.status,
        duration_ms=r.duration_ms,
        assertion_message=r.assertion_message,
        failure_details=r.failure_details,
        stack_trace=r.stack_trace,
        stdout=r.stdout,
        stderr=r.stderr,
        is_stale=r.is_stale,
        created_at=r.created_at,
        evidence=[EvidenceRecordResponse.from_orm(e) for e in ev_records]
    )
