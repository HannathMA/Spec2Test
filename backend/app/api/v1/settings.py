import time
import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.core.config import settings
from backend.app.schemas.settings import (
    SettingsResponse,
    SettingsUpdateRequest,
    TestConnectionRequest,
    TestConnectionResponse
)
from backend.app.services.execution.safety import validate_target_url

router = APIRouter(prefix="/settings", tags=["Project Settings"])

@router.get("", response_model=SettingsResponse)
def get_current_settings():
    return SettingsResponse(
        project_name=settings.PROJECT_NAME,
        target_url=settings.DEMO_TARGET_URL,
        test_framework="pytest 8.3.2",
        environment="Local",
        ai_provider=settings.AI_PROVIDER,
        ai_model=settings.AI_MODEL,
        ai_configured=bool(settings.AI_API_KEY and settings.AI_PROVIDER != "local"),
        execution_timeout_seconds=settings.TEST_EXECUTION_TIMEOUT_SECONDS
    )

@router.put("", response_model=SettingsResponse)
def update_settings(payload: SettingsUpdateRequest):
    if payload.project_name is not None:
        settings.PROJECT_NAME = payload.project_name
    if payload.target_url is not None:
        if not validate_target_url(payload.target_url):
            raise HTTPException(status_code=400, detail="Invalid target URL. Must be http/https and cannot target private cloud metadata.")
        settings.DEMO_TARGET_URL = payload.target_url
    if payload.ai_provider is not None:
        settings.AI_PROVIDER = payload.ai_provider
    if payload.ai_api_key is not None:
        settings.AI_API_KEY = payload.ai_api_key
    if payload.ai_model is not None:
        settings.AI_MODEL = payload.ai_model
    if payload.execution_timeout_seconds is not None:
        settings.TEST_EXECUTION_TIMEOUT_SECONDS = payload.execution_timeout_seconds

    return get_current_settings()

@router.post("/test-connection", response_model=TestConnectionResponse)
async def test_connection(payload: TestConnectionRequest):
    if not validate_target_url(payload.target_url):
        return TestConnectionResponse(
            success=False,
            message="Invalid or restricted target URL."
        )

    start = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(payload.target_url)
            elapsed_ms = (time.perf_counter() - start) * 1000
            return TestConnectionResponse(
                success=True,
                status_code=resp.status_code,
                response_time_ms=round(elapsed_ms, 2),
                message=f"Connected successfully. Target returned HTTP {resp.status_code} in {elapsed_ms:.1f}ms."
            )
    except Exception as e:
        elapsed_ms = (time.perf_counter() - start) * 1000
        return TestConnectionResponse(
            success=False,
            response_time_ms=round(elapsed_ms, 2),
            message=f"Connection failed: {str(e)}"
        )
