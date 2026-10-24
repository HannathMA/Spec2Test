import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import settings
from backend.app.db.base import Base
from backend.app.db.session import engine, SessionLocal
from backend.app.api.router import api_router
from backend.app.demo.sample_target_api import router as demo_target_router
from backend.app.demo.seed_data import seed_demo_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("spec2test")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schema
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)

    # Automatic schema migration for SQLite
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            cols = [r[1] for r in conn.execute(text("PRAGMA table_info(acceptance_criteria)")).fetchall()]
            if cols and "review_status" not in cols:
                logger.info("Migrating acceptance_criteria: adding review_status column...")
                conn.execute(text("ALTER TABLE acceptance_criteria ADD COLUMN review_status VARCHAR(32) DEFAULT 'pending' NOT NULL"))
    except Exception as err:
        logger.warning(f"Database schema migration check notice: {err}")

    # Seed demo project if none exists
    db = SessionLocal()
    try:
        seed_demo_data(db, force_reset=False)
        logger.info("Demo project verified in database.")
    except Exception as e:
        logger.error(f"Error seeding demo project: {e}")
    finally:
        db.close()

    yield
    logger.info("Shutting down Spec2Test backend.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Spec2Test AI — Requirements Engineering and Software Verification Platform.",
    lifespan=lifespan
)

# CORS configuration (allows localhost and Vercel production frontend)
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://localhost:4173",
    "https://spec2-test.vercel.app",
]
extra_origins = os.getenv("ALLOWED_ORIGINS", "")
if extra_origins:
    for origin in extra_origins.split(","):
        trimmed = origin.strip()
        if trimmed and trimmed not in allowed_origins:
            allowed_origins.append(trimmed)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount primary API router under /api/v1
app.include_router(api_router, prefix=settings.API_V1_STR)

# Mount controlled local target API under /demo-target
app.include_router(demo_target_router)

@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "health_url": f"{settings.API_V1_STR}/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
