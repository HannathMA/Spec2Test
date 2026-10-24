from typing import Optional, Dict, Any
from pydantic import BaseModel

class SettingsResponse(BaseModel):
    project_name: str
    target_url: str
    test_framework: str
    environment: str
    ai_provider: str
    ai_model: str
    ai_configured: bool
    execution_timeout_seconds: int

class SettingsUpdateRequest(BaseModel):
    project_name: Optional[str] = None
    target_url: Optional[str] = None
    test_framework: Optional[str] = None
    environment: Optional[str] = None
    ai_provider: Optional[str] = None
    ai_api_key: Optional[str] = None
    ai_model: Optional[str] = None
    execution_timeout_seconds: Optional[int] = None

class TestConnectionRequest(BaseModel):
    target_url: str

class TestConnectionResponse(BaseModel):
    success: bool
    status_code: Optional[int] = None
    response_time_ms: Optional[float] = None
    message: str
