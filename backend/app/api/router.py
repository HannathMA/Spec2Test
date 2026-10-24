from fastapi import APIRouter
from backend.app.api.v1.projects import router as projects_router
from backend.app.api.v1.requirements import router as requirements_router
from backend.app.api.v1.test_cases import router as test_cases_router
from backend.app.api.v1.execution import router as execution_router
from backend.app.api.v1.traceability import router as traceability_router
from backend.app.api.v1.change_impact import router as change_impact_router
from backend.app.api.v1.settings import router as settings_router
from backend.app.api.v1.demo import router as demo_router
from backend.app.api.v1.health import router as health_router

api_router = APIRouter()

api_router.include_router(health_router)
api_router.include_router(projects_router)
api_router.include_router(requirements_router)
api_router.include_router(test_cases_router)
api_router.include_router(execution_router)
api_router.include_router(traceability_router)
api_router.include_router(change_impact_router)
api_router.include_router(settings_router)
api_router.include_router(demo_router)
