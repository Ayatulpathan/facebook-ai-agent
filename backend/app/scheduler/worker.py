import time
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.models.models import PublishingQueue, Content, PageConnection, AppSetting, Notification
from app.facebook.publisher import PublisherGatekeeper, GlobalPauseActiveError, UnapprovedContentError
from app.services.notification_service import create_notification
from app.services.audit_service import log_audit

logger = logging.getLogger(__name__)

# Delay threshold: 15 minutes
DELAY_THRESHOLD_SECONDS = 900

def run_scheduler_tick(db: Optional[Session] = None) -> Dict[str, Any]:
    """
    Executes a single polling tick of the background scheduler.
    Processes ready queue items, guards against delayed missed posts, and monitors token health.
    """
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        now_utc = datetime.now(timezone.utc)
        
        # 1. Check Global Pause
        pause_setting = db.query(AppSetting).filter(AppSetting.key == "global_pause").first()
        is_paused = pause_setting and pause_setting.value.lower() == "true"

        # 2. Query queued jobs whose scheduled time has arrived
        queued_jobs = (
            db.query(PublishingQueue)
            .filter(PublishingQueue.state == "QUEUED")
            .all()
        )

        processed = 0
        delayed = 0
        failed = 0

        for job in queued_jobs:
            sched_time = job.scheduled_time
            if sched_time.tzinfo is None:
                sched_time = sched_time.replace(tzinfo=timezone.utc)

            # Not yet time to publish
            if sched_time > now_utc:
                continue

            content = db.query(Content).filter(Content.id == job.content_id).first()
            content_title = content.title if content else f"Post #{job.content_id}"

            # Check if post missed its scheduled window (e.g. computer was sleeping, offline, or app stopped)
            time_difference = (now_utc - sched_time).total_seconds()
            if time_difference > DELAY_THRESHOLD_SECONDS or is_paused:
                # Mark as DELAYED - NEVER publish silently!
                job.state = "DELAYED"
                if content:
                    content.status = "Delayed"
                
                db.commit()
                delayed += 1

                create_notification(
                    db,
                    title="Scheduled Post Delayed",
                    message=f"Post '{content_title}' missed its window ({int(time_difference // 60)}m ago) due to downtime or Global Pause. Please review in Approval Center to reschedule or publish.",
                    severity="warning",
                    link="/approvals"
                )

                log_audit(
                    db,
                    action="POST_MARKED_DELAYED",
                    entity="publishing_queue",
                    entity_id=str(job.id),
                    actor="scheduler_worker",
                    details=f"Post marked DELAYED: {content_title}. Missed by {int(time_difference)}s."
                )
                continue

            # Within active window: execute publishing via Gatekeeper
            try:
                gatekeeper = PublisherGatekeeper(db=db)
                gatekeeper.publish_approved_content(
                    content_id=job.content_id,
                    triggered_by="background_worker"
                )
                processed += 1
            except Exception as e:
                logger.error(f"Worker publishing error for job {job.id}: {e}")
                failed += 1

        # 3. Check Token Expiry
        conn = db.query(PageConnection).first()
        if conn and conn.token_expires_at:
            token_exp = conn.token_expires_at
            if token_exp.tzinfo is None:
                token_exp = token_exp.replace(tzinfo=timezone.utc)
            delta = token_exp - now_utc
            if 0 < delta.days <= 7:
                # Check if notification already sent today
                existing_notif = (
                    db.query(Notification)
                    .filter(
                        Notification.title.like("%Token Expiry Warning%"),
                        Notification.created_at >= now_utc - timedelta(days=1)
                    )
                    .first()
                )
                if not existing_notif:
                    create_notification(
                        db,
                        title="Meta Token Expiry Warning",
                        message=f"Your Facebook Page access token expires in {delta.days} days. Please refresh token in Facebook Page settings.",
                        severity="warning",
                        link="/facebook"
                    )

        return {
            "success": True,
            "processed": processed,
            "delayed": delayed,
            "failed": failed,
            "timestamp": now_utc.isoformat()
        }

    finally:
        if close_db:
            db.close()
