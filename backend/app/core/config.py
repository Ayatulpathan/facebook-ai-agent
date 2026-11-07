import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent.parent
PROJECT_ROOT = BASE_DIR.parent
DATA_DIR = PROJECT_ROOT / "data"

class Settings(BaseSettings):
    PROJECT_NAME: str = "Facebook AI Page Management Agent"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    
    # Server Binding (Strictly Localhost)
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    
    # Security
    SECRET_KEY: str = "local-agent-secret-key-32-chars-long-minimum-randomized"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # Database
    DATABASE_PATH: Path = DATA_DIR / "database" / "facebook_agent.db"
    DATABASE_URL: str = f"sqlite:///{DATABASE_PATH.as_posix()}"
    
    # Media & Backups
    MEDIA_DIR: Path = DATA_DIR / "media"
    BACKUP_DIR: Path = DATA_DIR / "backups"
    EXPORTS_DIR: Path = DATA_DIR / "exports"
    
    # Local AI Configuration (Ollama)
    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"
    OLLAMA_DEFAULT_MODEL: str = "qwen2.5:1.5b"
    OLLAMA_FALLBACK_MODEL: str = "qwen2.5:0.5b"
    OLLAMA_TIMEOUT_SECONDS: int = 60
    
    # CORS (Strictly Localhost)
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]
    
    # Upload limits
    MAX_UPLOAD_SIZE_MB: int = 25

    model_config = {
        "env_file": ".env",
        "extra": "allow"
    }

settings = Settings()

# Ensure directories exist
settings.MEDIA_DIR.mkdir(parents=True, exist_ok=True)
settings.BACKUP_DIR.mkdir(parents=True, exist_ok=True)
settings.EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
settings.DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
