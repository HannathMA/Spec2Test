from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class ChangeImpactRequest(BaseModel):
    requirement_id: str
    new_text: str
    new_title: Optional[str] = None
    change_summary: Optional[str] = None

class AffectedTestSummary(BaseModel):
    test_id: str
    title: str
    test_type: str
    action_required: str  # "regenerate", "rerun", "review"
    current_status: str

class ChangeImpactResponse(BaseModel):
    record_id: Optional[str] = None
    requirement_id: str
    req_id: str
    old_version: int
    new_version: int
    old_text: str
    new_text: str
    diff_summary: str
    affected_test_cases: List[AffectedTestSummary] = []
    affected_test_cases_count: int
    new_test_cases_needed: int
    tests_to_rerun_count: int
    stale_results_count: int
    status: str
    created_at: datetime

class ChangeImpactApprovalRequest(BaseModel):
    impact_record_id: Optional[str] = None
    requirement_id: str
    new_text: str
    new_title: Optional[str] = None
    change_summary: Optional[str] = None
    auto_regenerate_tests: bool = True
