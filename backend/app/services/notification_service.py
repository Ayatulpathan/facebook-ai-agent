import logging
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.models import Notification

logger = logging.getLogger(__name__)

def get_notifications(
    db: Session,
    unread_only: bool = False,
    limit: int = 50
) -> List[Notification]:
    query = db.query(Notification)
    if unread_only:
        query = query.filter(Notification.is_read == False)
    return query.order_by(Notification.created_at.desc()).limit(limit).all()

def get_unread_count(db: Session) -> int:
    return db.query(Notification).filter(Notification.is_read == False).count()

def mark_as_read(db: Session, notification_id: int) -> Notification:
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise ValueError(f"Notification {notification_id} not found.")
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif

def mark_all_as_read(db: Session) -> int:
    unread_rows = db.query(Notification).filter(Notification.is_read == False).all()
    count = len(unread_rows)
    for n in unread_rows:
        n.is_read = True
    db.commit()
    return count

def create_notification(
    db: Session,
    title: str,
    message: str,
    severity: str = "info", # info, warning, error, success
    link: str = ""
) -> Notification:
    notif = Notification(
        title=title,
        message=message,
        severity=severity,
        is_read=False,
        link=link,
        created_at=datetime.now(timezone.utc)
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif
