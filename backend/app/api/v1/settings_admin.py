import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.auth_service import get_current_user
from app.models.models import User, AppSetting
from app.core.config import settings
from app.services.backup_service import (
    list_backups, create_database_backup, restore_database_backup, get_windows_task_scheduler_instructions
)
from app.scheduler.worker import run_scheduler_tick
from app.schemas.schemas import BackupItemResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/settings", tags=["Settings & Automated SQLite Backups"])

@router.get("/")
def get_system_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve system paths, configuration, and backup telemetry."""
    pause = db.query(AppSetting).filter(AppSetting.key == "global_pause").first()
    is_paused = pause and pause.value.lower() == "true"

    return {
        "project_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database_path": str(settings.DATABASE_PATH.resolve()),
        "backup_dir": str(settings.BACKUP_DIR.resolve()),
        "media_dir": str(settings.MEDIA_DIR.resolve()),
        "ollama_base_url": settings.OLLAMA_BASE_URL,
        "default_model": settings.OLLAMA_DEFAULT_MODEL,
        "fallback_model": settings.OLLAMA_FALLBACK_MODEL,
        "global_pause": is_paused,
        "backups_count": len(list_backups()),
        "scheduler_instructions": get_windows_task_scheduler_instructions()
    }

@router.get("/backups", response_model=List[BackupItemResponse])
def get_all_backups(
    current_user: User = Depends(get_current_user)
):
    """List all available SQLite database backups."""
    return list_backups()

@router.post("/backups/create", response_model=BackupItemResponse)
def trigger_backup(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a hot, non-blocking ACID SQLite database backup now."""
    return create_database_backup(db=db, actor=current_user.username)

@router.post("/backups/{filename}/restore")
def restore_backup(
    filename: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Safely restore SQLite database from a selected backup file."""
    try:
        return restore_database_backup(filename=filename, db=db, actor=current_user.username)
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/scheduler-tick")
def trigger_scheduler_tick(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Trigger an immediate run of the background publisher and delay detector."""
    return run_scheduler_tick(db=db)
