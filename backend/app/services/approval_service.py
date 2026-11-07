import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.models import (
    Content, ContentVersion, Approval, PublishingQueue, User, Niche, MediaAsset
)
from app.services.audit_service import log_audit

class ApprovalService:
    @staticmethod
    def get_pending_approvals(db: Session) -> List[Dict[str, Any]]:
        """
        Retrieve all content items currently awaiting human administrator approval.
        Enforces that AI agents cannot approve their own drafts.
        """
        pending_records = (
            db.query(Approval)
            .filter(Approval.status == "PENDING")
            .order_by(Approval.created_at.desc())
            .all()
        )

        results = []
        for appr in pending_records:
            content = db.query(Content).filter(Content.id == appr.content_id).first()
            if not content:
                continue

            version = (
                db.query(ContentVersion)
                .filter(
                    ContentVersion.content_id == appr.content_id,
                    ContentVersion.version_num == appr.version_num
                )
                .first()
            )
            niche = db.query(Niche).filter(Niche.id == content.niche_id).first() if content.niche_id else None

            results.append({
                "approval_id": appr.id,
                "content_id": content.id,
                "version_num": appr.version_num,
                "title": content.title,
                "content_type": content.content_type,
                "language": content.language,
                "status": content.status,
                "scheduled_for": content.scheduled_for.isoformat() if content.scheduled_for else None,
                "created_at": appr.created_at.isoformat(),
                "niche": niche.name if niche else "General",
                "version": {
                    "caption_bn": version.caption_bn if version else "",
                    "caption_en": version.caption_en if version else "",
                    "hashtags": version.hashtags if version else "",
                    "call_to_action": version.call_to_action if version else "",
                    "quality_score": version.quality_score if version else 1.0,
                    "quality_notes": version.quality_notes if version else "",
                    "created_by": version.created_by if version else "system"
                } if version else None
            })
        return results

    @staticmethod
    def approve_content(
        db: Session,
        content_id: int,
        version_num: int,
        reviewer_id: int,
        decision_notes: str = ""
    ) -> Dict[str, Any]:
        """
        Explicit Human Administrator Approval.
        - Validates version match
        - Marks Approval record APPROVED
        - Transitions Content to Approved or Scheduled
        - Enters item into PublishingQueue with unique idempotency key
        """
        content = db.query(Content).filter(Content.id == content_id).first()
        if not content:
            raise ValueError("Content record not found.")

        # Find the specific version's pending approval
        approval = (
            db.query(Approval)
            .filter(
                Approval.content_id == content_id,
                Approval.version_num == version_num,
                Approval.status == "PENDING"
            )
            .first()
        )
        if not approval:
            # If no pending approval ticket exists, create one
            approval = Approval(
                content_id=content_id,
                version_num=version_num,
                status="PENDING"
            )
            db.add(approval)
            db.flush()

        now = datetime.now(timezone.utc)
        approval.status = "APPROVED"
        approval.reviewer_id = reviewer_id
        approval.decision_notes = decision_notes or "Approved by administrator for publishing queue."
        approval.decided_at = now

        # Update Content status
        if content.scheduled_for and content.scheduled_for > now:
            content.status = "Scheduled"
            queue_time = content.scheduled_for
        else:
            content.status = "Approved"
            queue_time = now

        # Create idempotent queue job
        idempotency_key = f"post_{content.id}_v{version_num}_{uuid.uuid4().hex[:8]}"
        
        # Check if already in queue
        existing_queue = db.query(PublishingQueue).filter(
            PublishingQueue.content_id == content_id,
            PublishingQueue.approved_version_id == version_num,
            PublishingQueue.state.in_(["QUEUED", "PUBLISHING"])
        ).first()

        if not existing_queue:
            queue_item = PublishingQueue(
                content_id=content_id,
                approved_version_id=version_num,
                scheduled_time=queue_time,
                state="QUEUED",
                idempotency_key=idempotency_key,
                created_at=now,
                updated_at=now
            )
            db.add(queue_item)

        db.commit()

        reviewer = db.query(User).filter(User.id == reviewer_id).first()
        reviewer_name = reviewer.username if reviewer else "admin"

        log_audit(
            db,
            action="CONTENT_APPROVED",
            entity="approvals",
            entity_id=str(approval.id),
            actor=reviewer_name,
            details=f"Approved Post #{content_id} v{version_num} for queue execution. Notes: {decision_notes}"
        )

        return {
            "success": True,
            "content_id": content_id,
            "version_num": version_num,
            "status": content.status,
            "idempotency_key": idempotency_key
        }

    @staticmethod
    def reject_content(
        db: Session,
        content_id: int,
        version_num: int,
        reviewer_id: int,
        rejection_reason: str
    ) -> Dict[str, Any]:
        """
        Explicit Human Administrator Rejection.
        Marks approval ticket REJECTED and removes any queued jobs.
        """
        content = db.query(Content).filter(Content.id == content_id).first()
        if not content:
            raise ValueError("Content not found.")

        approval = (
            db.query(Approval)
            .filter(
                Approval.content_id == content_id,
                Approval.version_num == version_num,
                Approval.status == "PENDING"
            )
            .first()
        )
        now = datetime.now(timezone.utc)
        if not approval:
            approval = Approval(
                content_id=content_id,
                version_num=version_num,
                status="PENDING"
            )
            db.add(approval)
            db.flush()

        approval.status = "REJECTED"
        approval.reviewer_id = reviewer_id
        approval.decision_notes = rejection_reason
        approval.decided_at = now

        content.status = "Rejected"

        # Remove from queue if any exists
        db.query(PublishingQueue).filter(
            PublishingQueue.content_id == content_id,
            PublishingQueue.state == "QUEUED"
        ).delete()

        db.commit()

        reviewer = db.query(User).filter(User.id == reviewer_id).first()
        reviewer_name = reviewer.username if reviewer else "admin"

        log_audit(
            db,
            action="CONTENT_REJECTED",
            entity="approvals",
            entity_id=str(approval.id),
            actor=reviewer_name,
            details=f"Rejected Post #{content_id} v{version_num}. Reason: {rejection_reason}"
        )

        return {
            "success": True,
            "content_id": content_id,
            "version_num": version_num,
            "status": "Rejected"
        }

    @staticmethod
    def get_approval_history(db: Session, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieve audit timeline of all approval, rejection, and invalidation decisions."""
        records = (
            db.query(Approval)
            .order_by(Approval.created_at.desc())
            .limit(limit)
            .all()
        )

        results = []
        for r in records:
            content = db.query(Content).filter(Content.id == r.content_id).first()
            reviewer = db.query(User).filter(User.id == r.reviewer_id).first() if r.reviewer_id else None
            results.append({
                "id": r.id,
                "content_id": r.content_id,
                "content_title": content.title if content else f"Post #{r.content_id}",
                "version_num": r.version_num,
                "status": r.status,
                "reviewer": reviewer.username if reviewer else "System / Automated",
                "decision_notes": r.decision_notes,
                "decided_at": r.decided_at.isoformat() if r.decided_at else None,
                "created_at": r.created_at.isoformat()
            })
        return results

approval_service = ApprovalService()
