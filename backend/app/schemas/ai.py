from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class RawFinding(BaseModel):
    finding_type: str = Field(description="ambiguity, missing_threshold, conflict, missing_detail, non_testable")
    severity: str = Field(description="high, medium, low")
    title: str
    explanation: str
    suggested_clarification: Optional[str] = None

class RawCriterion(BaseModel):
    criterion_id: str
    criterion_text: str
    format: str = "given_when_then"

class RequirementAnalysisResult(BaseModel):
    findings: List[RawFinding] = Field(default_factory=list)
    suggested_criteria: List[RawCriterion] = Field(default_factory=list)
    overall_quality_score: int = Field(default=80, ge=0, le=100)
    summary: str = ""

class RawGeneratedTest(BaseModel):
    test_id: str
    title: str
    description: str
    test_type: str = "Positive"  # Positive, Negative, Boundary, Edge Case, Performance, Security
    priority: str = "High"
    preconditions: str = ""
    steps: List[str] = Field(default_factory=list)
    expected_outcome: str
    linked_criterion_ids: List[str] = Field(default_factory=list)
    python_test_code: str = ""

class TestGenerationResult(BaseModel):
    test_cases: List[RawGeneratedTest] = Field(default_factory=list)
    reasoning: str = ""

class FailureExplanationResult(BaseModel):
    root_cause: str
    requirement_violated: Optional[str] = None
    suggested_fix: str
    confidence: float = 0.9
