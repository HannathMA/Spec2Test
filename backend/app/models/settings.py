import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, JSON
from backend.app.db.base import Base

class ProjectSetting(Base):
    __tablename__ = "project_settings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    key = Column(String(128), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
