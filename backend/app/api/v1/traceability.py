from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.project import Project
from backend.app.schemas.traceability import TraceabilityMatrixResponse
from backend.app.services.traceability.service import (
    compute_traceability_matrix,
    generate_traceability_csv,
    generate_traceability_html
)

router = APIRouter(prefix="/traceability", tags=["Traceability Matrix"])

@router.get("/matrix", response_model=TraceabilityMatrixResponse)
def get_matrix(project_id: str, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return compute_traceability_matrix(db, project_id)

@router.get("/export/csv")
def export_csv(project_id: str, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    matrix = compute_traceability_matrix(db, project_id)
    csv_data = generate_traceability_csv(matrix)

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=traceability_{proj.name.lower().replace(' ', '_')}.csv"}
    )

@router.get("/export/html")
def export_html(project_id: str, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    matrix = compute_traceability_matrix(db, project_id)
    html_data = generate_traceability_html(matrix, proj.name)

    return Response(
        content=html_data,
        media_type="text/html",
        headers={"Content-Disposition": f"inline; filename=traceability_report_{proj.name.lower().replace(' ', '_')}.html"}
    )
