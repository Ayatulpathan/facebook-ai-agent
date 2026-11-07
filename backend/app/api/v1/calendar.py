from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database.session import get_db
from app.services.auth_service import get_current_user
from app.services.audit_service import log_audit
from app.models.models import User, Content, Niche

router = APIRouter(prefix="/calendar", tags=["Content Calendar"])

class RescheduleRequest(BaseModel):
    content_id: int
    scheduled_for: datetime

@router.get("/")
def get_calendar_events(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """Retrieve posts with scheduled times for calendar rendering."""
    query = db.query(Content).filter(Content.scheduled_for.isnot(None))
    if start_date:
        query = query.filter(Content.scheduled_for >= start_date)
    if end_date:
        query = query.filter(Content.scheduled_for <= end_date)

    posts = query.order_by(Content.scheduled_for.asc()).all()
    results = []
    for p in posts:
        niche = db.query(Niche).filter(Niche.id == p.niche_id).first() if p.niche_id else None
        results.append({
            "id": p.id,
            "title": p.title,
            "content_type": p.content_type,
            "status": p.status,
            "scheduled_for": p.scheduled_for.isoformat(),
            "niche": niche.name if niche else "General"
        })
    return results

@router.post("/reschedule")
def reschedule_post(
    req: RescheduleRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update scheduled publishing timestamp for a post."""
    content = db.query(Content).filter(Content.id == req.content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    old_time = content.scheduled_for.isoformat() if content.scheduled_for else "Unscheduled"
    content.scheduled_for = req.scheduled_for
    db.commit()

    log_audit(
        db,
        action="RESCHEDULE_CONTENT",
        entity="content",
        entity_id=str(content.id),
        actor=current_user.username,
        details=f"Rescheduled post #{content.id} from {old_time} to {req.scheduled_for.isoformat()}",
        ip_address=request.client.host if request.client else "127.0.0.1"
    )

    return {
        "success": True,
        "content_id": content.id,
        "scheduled_for": content.scheduled_for.isoformat()
    }
