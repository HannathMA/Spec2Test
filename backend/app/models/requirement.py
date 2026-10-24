import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.db.base import Base

class Requirement(Base):
    __tablename__ = "requirements"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    req_id = Column(String(32), nullable=False, index=True)  # e.g., REQ-001
    title = Column(String(255), nullable=False)
    original_text = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    source = Column(String(128), default="manual")
    source_location = Column(String(255), nullable=True)
    priority = Column(String(32), default="High")  # High, Medium, Low
    status = Column(String(32), default="Draft")   # Draft, Analyzed, Refined, Approved, Deprecated
    current_version = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="requirements")
    versions = relationship("RequirementVersion", back_populates="requirement", cascade="all, delete-orphan", order_by="RequirementVersion.version_number.desc()")
    acceptance_criteria = relationship("AcceptanceCriterion", back_populates="requirement", cascade="all, delete-orphan")
    findings = relationship("AnalysisFinding", back_populates="requirement", cascade="all, delete-orphan")
    test_cases = relationship("TestCase", back_populates="requirement")

class RequirementVersion(Base):
    __tablename__ = "requirement_versions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    requirement_id = Column(String(36), ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    original_text = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(String(32), default="High")
    status = Column(String(32), default="Draft")
    change_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    requirement = relationship("Requirement", back_populates="versions")

class AcceptanceCriterion(Base):
    __tablename__ = "acceptance_criteria"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    requirement_id = Column(String(36), ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False, index=True)
    criterion_id = Column(String(32), nullable=False)  # e.g., AC-001
    criterion_text = Column(Text, nullable=False)
    format = Column(String(32), default="given_when_then")  # given_when_then, bullet
    review_status = Column(String(32), default="pending", nullable=False)  # pending, approved, rejected
    is_approved = Column(Boolean, default=False, nullable=False)
    version_number = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    requirement = relationship("Requirement", back_populates="acceptance_criteria")

class AnalysisFinding(Base):
    __tablename__ = "analysis_findings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    requirement_id = Column(String(36), ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False, index=True)
    finding_type = Column(String(64), nullable=False)  # ambiguity, missing_threshold, conflict, missing_detail, etc.
    severity = Column(String(32), default="medium")     # high, medium, low
    title = Column(String(255), nullable=False)
    explanation = Column(Text, nullable=False)
    suggested_clarification = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    requirement = relationship("Requirement", back_populates="findings")
