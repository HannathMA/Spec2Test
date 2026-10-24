from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class TraceabilityLinkedCriterion(BaseModel):
    criterion_id: str
    criterion_text: str
    is_approved: bool
    review_status: str = "pending"

class TraceabilityLinkedTest(BaseModel):
    test_id: str
    title: str
    test_type: str
    priority: str
    latest_status: str  # Passed, Failed, Unverified, Error
    is_stale: bool
    evidence_url: Optional[str] = None
    last_run_id: Optional[str] = None

class TraceabilityRow(BaseModel):
    requirement_id: str
    req_id: str
    title: str
    priority: str
    approved_criteria_count: int
    linked_criteria: List[TraceabilityLinkedCriterion] = []
    linked_test_count: int
    linked_tests: List[TraceabilityLinkedTest] = []
    latest_execution_state: str  # Passed, Failed, Mixed, Unverified, Stale
    verification_state: str      # Verified, Failed, Unverified
    has_missing_coverage: bool
    missing_coverage_reason: Optional[str] = None
    has_stale_tests: bool

class TraceabilityMatrixResponse(BaseModel):
    total_requirements: int
    verified_count: int
    failed_count: int
    unverified_count: int
    verification_rate: float  # percentage
    rows: List[TraceabilityRow] = []

class TraceabilityExportRequest(BaseModel):
    project_id: str
    format: str = "csv"  # csv, html
