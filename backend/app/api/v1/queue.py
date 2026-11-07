from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.services.auth_service import get_current_user
from app.services.queue_service import queue_service
from app.models.models import User

router = APIRouter(prefix="/queue", tags=["Publishing Queue"])

@router.get("/")
def list_publishing_queue(
    state: Optional[str] = Query(None, pattern="^(QUEUED|PUBLISHING|PUBLISHED|DELAYED|FAILED)$"),
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db)
):
    """Retrieve jobs currently in the publishing queue."""
    return queue_service.list_queue(db, state=state, limit=limit)

@router.post("/{queue_id}/cancel")
def cancel_queue_job(
    queue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel a queued publishing job."""
    success = queue_service.cancel_job(db, queue_id, current_user)
    if not success:
        raise HTTPException(status_code=404, detail="Queue job not found")
    return {"success": True, "message": f"Job #{queue_id} cancelled."}

@router.post("/{queue_id}/retry")
def retry_queue_job(
    queue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reset a delayed or failed job back to QUEUED."""
    success = queue_service.retry_job(db, queue_id, current_user)
    if not success:
        raise HTTPException(status_code=404, detail="Queue job not found")
    return {"success": True, "message": f"Job #{queue_id} queued for retry."}
