from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class EvidenceRecordResponse(BaseModel):
    id: str
    test_result_id: str
    evidence_type: str
    title: str
    content: str
    metadata_json: Dict[str, Any] = {}
    created_at: datetime

    class Config:
        from_attributes = True

class TestResultResponse(BaseModel):
    id: str
    run_id: str
    test_case_id: str
    test_id: str = ""
    test_title: str = ""
    linked_req_id: Optional[str] = None
    status: str  # Passed, Failed, Error, Skipped, Blocked
    duration_ms: int
    assertion_message: Optional[str] = None
    failure_details: Optional[str] = None
    stack_trace: Optional[str] = None
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    is_stale: bool
    created_at: datetime
    evidence: List[EvidenceRecordResponse] = []

    class Config:
        from_attributes = True

class TestRunResponse(BaseModel):
    id: str
    project_id: str
    run_number: str
    status: str
    environment: str
    framework: str
    target_url: Optional[str] = None
    total_tests: int
    passed_count: int
    failed_count: int
    skipped_count: int
    error_count: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_ms: int
    exit_code: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TestRunDetailResponse(TestRunResponse):
    raw_stdout: Optional[str] = None
    raw_stderr: Optional[str] = None
    results: List[TestResultResponse] = []

class ExecuteTestsRequest(BaseModel):
    project_id: str
    test_case_ids: Optional[List[str]] = None  # None = run all approved
    environment: Optional[str] = "Local"
    rerun_failed_only: bool = False
