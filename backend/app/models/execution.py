import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.db.base import Base

class TestRun(Base):
    __tablename__ = "test_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    run_number = Column(String(64), nullable=False, index=True)  # e.g., RUN-2025-07-26-001
    status = Column(String(32), default="running")  # running, completed, failed, errored, aborted
    environment = Column(String(64), default="Local")
    framework = Column(String(64), default="pytest 8.3.2")
    target_url = Column(String(512), nullable=True)
    
    total_tests = Column(Integer, default=0, nullable=False)
    passed_count = Column(Integer, default=0, nullable=False)
    failed_count = Column(Integer, default=0, nullable=False)
    skipped_count = Column(Integer, default=0, nullable=False)
    error_count = Column(Integer, default=0, nullable=False)
    
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    duration_ms = Column(Integer, default=0, nullable=False)
    
    raw_stdout = Column(Text, nullable=True)
    raw_stderr = Column(Text, nullable=True)
    exit_code = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="test_runs")
    results = relationship("TestResult", back_populates="run", cascade="all, delete-orphan")

class TestResult(Base):
    __tablename__ = "test_results"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    run_id = Column(String(36), ForeignKey("test_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    test_case_id = Column(String(36), ForeignKey("test_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    
    status = Column(String(32), nullable=False)  # Passed, Failed, Error, Skipped, Blocked
    duration_ms = Column(Integer, default=0, nullable=False)
    assertion_message = Column(Text, nullable=True)
    failure_details = Column(Text, nullable=True)
    stack_trace = Column(Text, nullable=True)
    stdout = Column(Text, nullable=True)
    stderr = Column(Text, nullable=True)
    
    is_stale = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    run = relationship("TestRun", back_populates="results")
    test_case = relationship("TestCase", back_populates="results")
    evidence = relationship("EvidenceRecord", back_populates="result", cascade="all, delete-orphan")

class EvidenceRecord(Base):
    __tablename__ = "evidence_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    test_result_id = Column(String(36), ForeignKey("test_results.id", ondelete="CASCADE"), nullable=False, index=True)
    evidence_type = Column(String(64), nullable=False)  # stdout_log, stack_trace, http_exchange, assertion_diff
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    result = relationship("TestResult", back_populates="evidence")
