from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.demo.seed_data import seed_demo_data

router = APIRouter(prefix="/demo", tags=["Demo Management"])

@router.post("/reset")
def reset_demo_project(db: Session = Depends(get_db)):
    """
    Resets and re-seeds the demo project 'Commerce API Verification'
    with complete realistic requirements, criteria, test cases, and execution runs.
    """
    proj = seed_demo_data(db, force_reset=True)
    return {
        "status": "success",
        "message": f"Demo project '{proj.name}' successfully reset and seeded.",
        "project_id": proj.id
    }
