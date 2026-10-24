import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from backend.app.db.base import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    target_url = Column(String(512), nullable=False, default="http://127.0.0.1:8000/demo-target")
    test_framework = Column(String(64), nullable=False, default="pytest")
    environment = Column(String(64), nullable=False, default="Local")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    requirements = relationship("Requirement", back_populates="project", cascade="all, delete-orphan")
    test_cases = relationship("TestCase", back_populates="project", cascade="all, delete-orphan")
    test_runs = relationship("TestRun", back_populates="project", cascade="all, delete-orphan")
    activities = relationship("ActivityEvent", back_populates="project", cascade="all, delete-orphan")
    change_records = relationship("ChangeImpactRecord", back_populates="project", cascade="all, delete-orphan")
