from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.schemas import AuditLogResponse
from app.models.models import AuditLog, User
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/audit", tags=["Audit Logs"])

@router.get("/logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve security and administrative audit trail logs."""
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
