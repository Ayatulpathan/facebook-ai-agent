import os
import shutil
import sqlite3
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.audit_service import log_audit
from app.services.notification_service import create_notification

logger = logging.getLogger(__name__)

def list_backups() -> List[Dict[str, Any]]:
    backup_dir = settings.BACKUP_DIR
    backup_dir.mkdir(parents=True, exist_ok=True)
    
    backups = []
    for f in backup_dir.glob("*.db"):
        stat = f.stat()
        backups.append({
            "filename": f.name,
            "path": str(f.resolve()),
            "size_bytes": stat.st_size,
            "size_kb": round(stat.st_size / 1024, 2),
            "created_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()
        })
    # Sort newest first
    backups.sort(key=lambda x: x["created_at"], reverse=True)
    return backups

def create_database_backup(db: Optional[Session] = None, actor: str = "admin") -> Dict[str, Any]:
    """
    Creates a non-blocking hot SQLite backup using the official SQLite Online Backup API.
    Guarantees ACID consistency without locking or corrupting running database transactions.
    """
    source_db_path = settings.DATABASE_PATH
    backup_dir = settings.BACKUP_DIR
    backup_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_filename = f"facebook_agent_backup_{timestamp}.db"
    backup_dest_path = backup_dir / backup_filename

    # Perform online SQLite backup
    src_conn = sqlite3.connect(source_db_path.as_posix())
    dest_conn = sqlite3.connect(backup_dest_path.as_posix())
    try:
        src_conn.backup(dest_conn)
    finally:
        dest_conn.close()
        src_conn.close()

    stat = backup_dest_path.stat()

    if db:
        log_audit(
            db,
            action="CREATE_DATABASE_BACKUP",
            entity="database",
            entity_id=backup_filename,
            actor=actor,
            details=f"Created SQLite backup: {backup_filename} ({round(stat.st_size / 1024, 2)} KB)"
        )
        create_notification(
            db,
            title="Database Backup Completed",
            message=f"Backup {backup_filename} created successfully.",
            severity="success",
            link="/settings"
        )

    return {
        "success": True,
        "filename": backup_filename,
        "path": str(backup_dest_path.resolve()),
        "size_kb": round(stat.st_size / 1024, 2),
        "created_at": datetime.now(timezone.utc).isoformat()
    }

def restore_database_backup(filename: str, db: Optional[Session] = None, actor: str = "admin") -> Dict[str, Any]:
    """
    Safely restores SQLite database from a selected backup file.
    """
    backup_path = settings.BACKUP_DIR / filename
    if not backup_path.exists():
        raise FileNotFoundError(f"Backup file '{filename}' does not exist.")

    source_path = settings.DATABASE_PATH

    # Validate that backup is a valid SQLite database
    test_conn = sqlite3.connect(backup_path.as_posix())
    try:
        cur = test_conn.cursor()
        cur.execute("PRAGMA integrity_check")
        result = cur.fetchone()
        if not result or result[0] != "ok":
            raise ValueError(f"Backup file '{filename}' failed SQLite integrity check.")
    finally:
        test_conn.close()

    # Online restore into target database
    src_conn = sqlite3.connect(backup_path.as_posix())
    dest_conn = sqlite3.connect(source_path.as_posix())
    try:
        src_conn.backup(dest_conn)
    finally:
        dest_conn.close()
        src_conn.close()

    if db:
        log_audit(
            db,
            action="RESTORE_DATABASE_BACKUP",
            entity="database",
            entity_id=filename,
            actor=actor,
            details=f"Restored database from backup {filename}."
        )

    return {
        "success": True,
        "filename": filename,
        "restored_at": datetime.now(timezone.utc).isoformat()
    }

def get_windows_task_scheduler_instructions() -> Dict[str, Any]:
    """Generates ready-to-run PowerShell script to register an automated Windows Task Scheduler job."""
    project_root = settings.DATABASE_PATH.parent.parent.parent
    backend_dir = project_root / "backend"
    python_exe = backend_dir / "venv" / "Scripts" / "python.exe"
    
    powershell_script = f"""# Register Automated Daily SQLite Backup in Windows Task Scheduler
$Action = New-ScheduledTaskAction -Execute "{python_exe.as_posix()}" -Argument "-c \\"from app.services.backup_service import create_database_backup; create_database_backup(actor='windows_task_scheduler')\\"" -WorkingDirectory "{backend_dir.as_posix()}"
$Trigger = New-ScheduledTaskTrigger -Daily -At 3:00AM
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "FacebookAIAgent_DailyBackup" -Action $Action -Trigger $Trigger -Settings $Settings -Description "Daily automated local SQLite backup for Facebook AI Agent"
"""
    return {
        "task_name": "FacebookAIAgent_DailyBackup",
        "schedule": "Daily at 3:00 AM",
        "powershell_command": powershell_script.strip(),
        "zero_cost_note": "Windows Task Scheduler is built into Windows 10/11 and consumes zero cloud resources."
    }
