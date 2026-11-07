from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.models import PublishingQueue, Content, User
from app.services.audit_service import log_audit

class PublishingQueueService:
    @staticmethod
    def list_queue(
        db: Session,
        state: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """List jobs in the local publishing execution queue."""
        query = db.query(PublishingQueue)
        if state:
            query = query.filter(PublishingQueue.state == state)

        jobs = query.order_by(PublishingQueue.scheduled_time.asc()).limit(limit).all()
        results = []
        for j in jobs:
            content = db.query(Content).filter(Content.id == j.content_id).first()
            results.append({
                "id": j.id,
                "content_id": j.content_id,
                "content_title": content.title if content else f"Post #{j.content_id}",
                "approved_version_id": j.approved_version_id,
                "scheduled_time": j.scheduled_time.isoformat(),
                "state": j.state,
                "retry_count": j.retry_count,
                "error_message": j.error_message,
                "idempotency_key": j.idempotency_key,
                "created_at": j.created_at.isoformat()
            })
        return results

    @staticmethod
    def cancel_job(db: Session, queue_id: int, user: User) -> bool:
        """Cancel and remove a pending job from the publishing queue."""
        job = db.query(PublishingQueue).filter(PublishingQueue.id == queue_id).first()
        if not job:
            return False

        content_id = job.content_id
        db.delete(job)
        
        # Reset content status to Draft or Approved
        content = db.query(Content).filter(Content.id == content_id).first()
        if content and content.status == "Scheduled":
            content.status = "Draft"

        db.commit()

        log_audit(
            db,
            action="CANCEL_QUEUE_JOB",
            entity="publishing_queue",
            entity_id=str(queue_id),
            actor=user.username,
            details=f"Cancelled publishing queue job #{queue_id} for Post #{content_id}"
        )
        return True

    @staticmethod
    def retry_job(db: Session, queue_id: int, user: User) -> bool:
        """Reset a failed or delayed job back to QUEUED."""
        job = db.query(PublishingQueue).filter(PublishingQueue.id == queue_id).first()
        if not job:
            return False

        job.state = "QUEUED"
        job.error_message = ""
        job.updated_at = datetime.now(timezone.utc)
        db.commit()

        log_audit(
            db,
            action="RETRY_QUEUE_JOB",
            entity="publishing_queue",
            entity_id=str(queue_id),
            actor=user.username,
            details=f"Reset queue job #{queue_id} for retry"
        )
        return True

queue_service = PublishingQueueService()
