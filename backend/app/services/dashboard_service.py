from datetime import datetime, timezone
from typing import Dict, Any, List
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import (
    Content, Approval, Message, ReplyDraft, Lead, PageConnection, AppSetting, PublishingQueue, FacebookComment
)
from app.schemas.schemas import PostStatusCounts, DashboardOverview, SystemHealthResponse
from app.core.config import settings

def get_global_pause(db: Session) -> bool:
    """Retrieve the current Global Pause state."""
    setting = db.query(AppSetting).filter(AppSetting.key == "global_pause").first()
    if not setting:
        return False
    return setting.value.lower() in ("true", "1", "yes")

def set_global_pause(db: Session, paused: bool) -> bool:
    """Toggle the Global Pause kill-switch."""
    setting = db.query(AppSetting).filter(AppSetting.key == "global_pause").first()
    if not setting:
        setting = AppSetting(
            key="global_pause",
            value=str(paused).lower(),
            description="Global Pause stops all scheduled publishing, outgoing replies, and automated actions"
        )
        db.add(setting)
    else:
        setting.value = str(paused).lower()
    db.commit()
    return paused

def get_post_status_counts(db: Session) -> PostStatusCounts:
    """Aggregate counts for all content workflow stages."""
    counts = db.query(Content.status, func.count(Content.id)).group_by(Content.status).all()
    status_map = {status.lower().replace(" ", "_"): count for status, count in counts}
    
    total = sum(status_map.values())
    return PostStatusCounts(
        total_posts=total,
        draft=status_map.get("draft", 0),
        generating=status_map.get("generating", 0),
        quality_check=status_map.get("quality_check", 0),
        pending_approval=status_map.get("pending_approval", 0),
        approved=status_map.get("approved", 0),
        scheduled=status_map.get("scheduled", 0),
        publishing=status_map.get("publishing", 0),
        published=status_map.get("published", 0),
        rejected=status_map.get("rejected", 0),
        failed=status_map.get("failed", 0),
        delayed=status_map.get("delayed", 0)
    )

def check_ollama_status() -> Dict[str, Any]:
    """Check if local Ollama server is running without stalling."""
    try:
        response = httpx.get(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=2.0)
        if response.status_code == 200:
            models = [m.get("name") for m in response.json().get("models", [])]
            return {"status": "online", "models": models, "url": settings.OLLAMA_BASE_URL}
    except Exception as e:
        return {"status": "offline", "error": "Ollama service not running at 127.0.0.1:11434"}
    return {"status": "offline", "error": "Unknown Ollama status"}

def get_dashboard_overview(db: Session) -> DashboardOverview:
    """Assemble all dashboard metrics."""
    post_counts = get_post_status_counts(db)
    pending_approvals = db.query(Approval).filter(Approval.status == "PENDING").count()
    pending_comments = db.query(FacebookComment).filter(FacebookComment.reply_status == "PENDING").count()
    pending_replies = db.query(ReplyDraft).filter(ReplyDraft.approval_status == "PENDING").count()
    new_leads = db.query(Lead).filter(Lead.follow_up_status == "New").count()
    
    # Facebook status
    fb_conn = db.query(PageConnection).first()
    fb_status = fb_conn.status if fb_conn else "disconnected"

    # Ollama status
    ollama_info = check_ollama_status()
    ai_status = ollama_info.get("status", "offline")

    # Upcoming publishing queue items
    upcoming_queue = (
        db.query(PublishingQueue)
        .filter(PublishingQueue.state == "QUEUED")
        .order_by(PublishingQueue.scheduled_time.asc())
        .limit(5)
        .all()
    )
    upcoming_tasks = [
        {
            "id": item.id,
            "content_id": item.content_id,
            "scheduled_time": item.scheduled_time.isoformat(),
            "state": item.state
        }
        for item in upcoming_queue
    ]

    return DashboardOverview(
        post_counts=post_counts,
        pending_approvals_count=pending_approvals,
        pending_comments_count=pending_comments,
        pending_messages_count=pending_replies,
        new_leads_count=new_leads,
        ai_status=ai_status,
        facebook_status=fb_status,
        local_ai_model=settings.OLLAMA_DEFAULT_MODEL,
        global_pause_enabled=get_global_pause(db),
        upcoming_tasks=upcoming_tasks
    )

def check_system_health(db: Session) -> SystemHealthResponse:
    """Compile comprehensive system health telemetry."""
    # Test DB
    db_status = "healthy"
    try:
        db.execute(func.now()).first()
    except Exception as e:
        db_status = f"degraded: {str(e)}"

    ollama_info = check_ollama_status()
    fb_conn = db.query(PageConnection).first()
    fb_status = {
        "status": fb_conn.status if fb_conn else "disconnected",
        "page_name": fb_conn.page_name if fb_conn else None,
        "token_expires_at": fb_conn.token_expires_at.isoformat() if fb_conn and fb_conn.token_expires_at else None
    }

    return SystemHealthResponse(
        status="healthy" if db_status == "healthy" else "degraded",
        timestamp=datetime.now(timezone.utc),
        database=db_status,
        ollama_service=ollama_info,
        facebook_connection=fb_status,
        global_pause=get_global_pause(db),
        version=settings.VERSION
    )
