from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class AnalysisFindingResponse(BaseModel):
    id: str
    requirement_id: str
    finding_type: str
    severity: str
    title: str
    explanation: str
    suggested_clarification: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AcceptanceCriterionBase(BaseModel):
    criterion_id: str
    criterion_text: str
    format: str = "given_when_then"
    review_status: str = "pending"  # pending, approved, rejected
    is_approved: bool = False

class AcceptanceCriterionCreate(BaseModel):
    criterion_id: Optional[str] = None
    criterion_text: str
    format: str = "given_when_then"
    review_status: str = "pending"
    is_approved: bool = False

class AcceptanceCriterionUpdate(BaseModel):
    criterion_text: Optional[str] = None
    is_approved: Optional[bool] = None
    review_status: Optional[str] = None

class AcceptanceCriterionResponse(AcceptanceCriterionBase):
    id: str
    requirement_id: str
    version_number: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class RequirementVersionResponse(BaseModel):
    id: str
    requirement_id: str
    version_number: int
    title: str
    original_text: str
    description: Optional[str] = None
    priority: str
    status: str
    change_summary: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class RequirementBase(BaseModel):
    title: str
    original_text: str
    description: Optional[str] = None
    priority: str = "High"
    source: str = "manual"
    source_location: Optional[str] = None

class RequirementCreate(RequirementBase):
    project_id: str

class RequirementUpdate(BaseModel):
    title: Optional[str] = None
    original_text: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    change_summary: Optional[str] = None

class RequirementResponse(RequirementBase):
    id: str
    project_id: str
    req_id: str
    status: str
    current_version: int
    created_at: datetime
    updated_at: datetime
    acceptance_criteria_count: int = 0
    test_cases_count: int = 0
    verification_status: str = "Unverified"  # Verified, Failed, Unverified

    class Config:
        from_attributes = True

class RequirementDetailResponse(RequirementResponse):
    acceptance_criteria: List[AcceptanceCriterionResponse] = []
    findings: List[AnalysisFindingResponse] = []
    versions: List[RequirementVersionResponse] = []

class RequirementAnalyzeRequest(BaseModel):
    requirement_id: str

class BatchAcceptanceCriteriaApproval(BaseModel):
    criterion_ids: List[str]
    approve: bool = True
