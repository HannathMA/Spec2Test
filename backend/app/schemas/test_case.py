from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class TestCaseBase(BaseModel):
    title: str
    description: Optional[str] = None
    linked_req_id: Optional[str] = None
    linked_criterion_ids: List[str] = []
    test_type: str = "Positive"  # Positive, Negative, Boundary, Edge Case, Performance, Security
    priority: str = "High"
    preconditions: Optional[str] = None
    input_data: Dict[str, Any] = {}
    steps: List[str] = []
    expected_outcome: str
    execution_method: str = "pytest"
    generated_code: Optional[str] = None
    test_module_name: Optional[str] = None
    test_function_name: Optional[str] = None
    review_status: str = "Approved"

class TestCaseCreate(TestCaseBase):
    project_id: str
    requirement_id: Optional[str] = None
    test_id: Optional[str] = None

class TestCaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    test_type: Optional[str] = None
    priority: Optional[str] = None
    preconditions: Optional[str] = None
    input_data: Optional[Dict[str, Any]] = None
    steps: Optional[List[str]] = None
    expected_outcome: Optional[str] = None
    generated_code: Optional[str] = None
    review_status: Optional[str] = None

class TestCaseResponse(TestCaseBase):
    id: str
    project_id: str
    requirement_id: Optional[str] = None
    test_id: str
    is_stale: bool
    req_version_at_generation: int
    latest_status: str = "Unverified"  # Passed, Failed, Unverified, Error
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TestCaseGenerateRequest(BaseModel):
    project_id: str
    requirement_id: Optional[str] = None
    overwrite_existing: bool = False
