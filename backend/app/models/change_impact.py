import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.db.base import Base

class ChangeImpactRecord(Base):
    __tablename__ = "change_impact_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    requirement_id = Column(String(36), ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False, index=True)
    
    old_version = Column(Integer, nullable=False)
    new_version = Column(Integer, nullable=False)
    
    old_text = Column(Text, nullable=False)
    new_text = Column(Text, nullable=False)
    
    diff_summary = Column(Text, nullable=True)
    affected_test_case_ids = Column(JSON, default=list)  # list of TC ids affected
    new_test_cases_needed = Column(Integer, default=0)
    tests_to_rerun_count = Column(Integer, default=0)
    stale_results_count = Column(Integer, default=0)
    
    status = Column(String(32), default="Pending")  # Pending, Approved, Rejected, Applied
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    project = relationship("Project", back_populates="change_records")
