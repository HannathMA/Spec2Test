import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.db.base import Base

class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    requirement_id = Column(String(36), ForeignKey("requirements.id", ondelete="CASCADE"), nullable=True, index=True)
    test_id = Column(String(32), nullable=False, index=True)  # e.g., TC-001
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    linked_req_id = Column(String(32), nullable=True)  # e.g., REQ-001
    linked_criterion_ids = Column(JSON, default=list)  # list of strings e.g. ["AC-001"]
    
    test_type = Column(String(32), default="Positive")  # Positive, Negative, Boundary, Edge Case, Performance, Security
    priority = Column(String(32), default="High")       # High, Medium, Low
    
    preconditions = Column(Text, nullable=True)
    input_data = Column(JSON, default=dict)
    steps = Column(JSON, default=list)
    expected_outcome = Column(Text, nullable=False)
    
    execution_method = Column(String(64), default="pytest")
    generated_code = Column(Text, nullable=True)
    test_module_name = Column(String(128), nullable=True)  # e.g., test_auth.py
    test_function_name = Column(String(128), nullable=True) # e.g., test_valid_login
    
    review_status = Column(String(32), default="Approved")  # Draft, Approved, Rejected
    is_stale = Column(Boolean, default=False, nullable=False) # set to True when linked requirement changes
    req_version_at_generation = Column(Integer, default=1, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="test_cases")
    requirement = relationship("Requirement", back_populates="test_cases")
    results = relationship("TestResult", back_populates="test_case", cascade="all, delete-orphan")
    versions = relationship("TestCaseVersion", back_populates="test_case", cascade="all, delete-orphan")

class TestCaseVersion(Base):
    __tablename__ = "test_case_versions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    test_case_id = Column(String(36), ForeignKey("test_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    generated_code = Column(Text, nullable=True)
    review_status = Column(String(32), default="Approved")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    test_case = relationship("TestCase", back_populates="versions")
