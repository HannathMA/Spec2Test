import os
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import Field

# Base directory is the repository root or backend root
REPO_DIR = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = REPO_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
db_file = DATA_DIR / "spec2test.db"

class Settings(BaseSettings):
    PROJECT_NAME: str = "Spec2Test AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Base directories
    BASE_DIR: Path = REPO_DIR
    DATA_DIR: Path = DATA_DIR
    
    # Database with absolute path to ensure cross-platform SQLite compatibility
    DATABASE_URL: str = Field(default=f"sqlite:///{db_file.as_posix()}")
    
    # AI configuration
    AI_PROVIDER: str = Field(default="local")  # "openai", "groq", "local"
    AI_API_KEY: str = Field(default="")
    AI_BASE_URL: str = Field(default="https://api.openai.com/v1")
    AI_MODEL: str = Field(default="gpt-4o-mini")
    
    # Test Execution Security & Limits
    TEST_EXECUTION_TIMEOUT_SECONDS: int = 45
    ALLOWED_TARGET_SCHEMES: list[str] = ["http", "https"]
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    
    # Demo App settings
    DEMO_TARGET_URL: str = "http://127.0.0.1:8000/demo-target"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

settings = Settings()

# Ensure directories exist
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
(settings.DATA_DIR / "test_workspace").mkdir(parents=True, exist_ok=True)
