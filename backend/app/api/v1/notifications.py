import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.auth_service import get_current_user
from app.models.models import User
from app.schemas.schemas import NotificationResponse
from app.services.notification_service import (
    get_notifications, get_unread_count, mark_as_read, mark_all_as_read
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["System Notifications & Alerts"])

@router.get("/", response_model=List[NotificationResponse])
def list_notifications(
    unread_only: bool = Query(False, description="Filter unread notifications only"),
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List system notifications, approvals alerts, and token expiry warnings."""
    return get_notifications(db, unread_only=unread_only, limit=limit)

@router.get("/unread-count")
def read_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve unread count for sidebar badges."""
    return {"unread_count": get_unread_count(db)}

@router.post("/{notification_id}/read", response_model=NotificationResponse)
def set_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a single notification as read."""
    try:
        return mark_as_read(db, notification_id=notification_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.post("/read-all")
def set_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark all active notifications as read."""
    count = mark_all_as_read(db)
    return {"success": True, "marked_count": count}
