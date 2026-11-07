import json
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.models import FacebookComment, BrandProfile, AppSetting, PageConnection, PublishedPost
from app.facebook.meta_client import BaseMetaClient, LiveMetaClient, MockMetaClient
from app.agents.engagement import EngagementAgent
from app.services.lead_service import create_or_update_lead
from app.services.audit_service import log_audit

logger = logging.getLogger(__name__)

def _get_active_client(db: Session) -> BaseMetaClient:
    conn = db.query(PageConnection).first()
    if not conn or conn.is_mock_mode or not conn.access_token_encrypted:
        return MockMetaClient(
            page_id=conn.page_id if conn and conn.page_id else "mock_page_1020304050",
            page_name=conn.page_name if conn and conn.page_name else "Local AI Brand Sandbox"
        )
    return LiveMetaClient(
        page_id=conn.page_id,
        access_token=conn.access_token_encrypted,
        app_id=conn.app_id,
        app_secret=conn.app_secret_masked
    )

def sync_comments_from_facebook(db: Session, post_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Retrieves latest comments from Meta API (or Mock Sandbox), classifies them into 7 categories,
    drafts anti-hallucination suggested responses, extracts leads, and holds them in PENDING state.
    """
    client = _get_active_client(db)
    agent = EngagementAgent()
    brand_profile = db.query(BrandProfile).first()

    # Determine post ID to check
    target_post_id = post_id
    if not target_post_id:
        latest_published = db.query(PublishedPost).order_by(PublishedPost.published_at.desc()).first()
        target_post_id = latest_published.meta_post_id if latest_published else "mock_post_demo"

    comments_data = client.get_recent_comments(target_post_id)
    synced_count = 0
    new_leads_count = 0

    for item in comments_data:
        meta_id = item.get("id")
        if not meta_id:
            continue

        existing = db.query(FacebookComment).filter(FacebookComment.meta_comment_id == meta_id).first()
        if existing:
            continue

        text = item.get("message", "")
        sender_obj = item.get("from", {})
        sender_name = sender_obj.get("name", "Facebook User")
        sender_id = sender_obj.get("id", "")

        # Classify and draft
        analysis = agent.classify_and_draft_comment_reply(text, brand_profile=brand_profile)

        comment_record = FacebookComment(
            meta_post_id=target_post_id,
            meta_comment_id=meta_id,
            sender_name=sender_name,
            sender_id=sender_id,
            comment_text=text,
            category=analysis["category"],
            suggested_reply=analysis["suggested_reply"],
            reply_status="PENDING", # Mandatory Human Gatekeeper
            is_lead=analysis["is_lead"],
            created_at=datetime.now(timezone.utc)
        )
        db.add(comment_record)
        synced_count += 1

        # Extract lead if buying intent or contact info detected
        if analysis["is_lead"]:
            contact = analysis.get("detected_phone") or analysis.get("detected_email") or ""
            create_or_update_lead(
                db=db,
                customer_name=sender_name,
                facebook_reference=f"https://facebook.com/{sender_id}" if sender_id else f"comment_{meta_id}",
                contact_info=contact,
                inquiry_type=analysis["category"],
                product_interest="Inquired in comment",
                notes=f"Auto-detected from comment: \"{text}\""
            )
            new_leads_count += 1

    db.commit()

    log_audit(
        db,
        action="SYNC_FACEBOOK_COMMENTS",
        entity="facebook_comments",
        entity_id=target_post_id,
        actor="system",
        details=f"Synced {synced_count} new comments ({new_leads_count} leads extracted)."
    )

    return {
        "success": True,
        "synced_count": synced_count,
        "new_leads_count": new_leads_count,
        "post_id": target_post_id
    }

def get_comments(
    db: Session,
    category: Optional[str] = None,
    reply_status: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
) -> List[FacebookComment]:
    query = db.query(FacebookComment)
    if category and category.lower() != "all":
        query = query.filter(FacebookComment.category == category)
    if reply_status and reply_status.lower() != "all":
        query = query.filter(FacebookComment.reply_status == reply_status)
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                FacebookComment.sender_name.ilike(term),
                FacebookComment.comment_text.ilike(term),
                FacebookComment.suggested_reply.ilike(term)
            )
        )
    return query.order_by(FacebookComment.created_at.desc()).offset(skip).limit(limit).all()

def approve_and_send_comment_reply(
    db: Session,
    comment_id: int,
    reply_text: Optional[str],
    admin_user_id: int,
    actor: str = "admin"
) -> Dict[str, Any]:
    """
    CRITICAL GATEKEEPER:
    Validates human authorization and sends outgoing reply to Meta Graph API.
    """
    # 1. Check Global Pause
    pause = db.query(AppSetting).filter(AppSetting.key == "global_pause").first()
    if pause and pause.value.lower() == "true":
        raise PermissionError("Outgoing comment replies are blocked: Global Pause is ACTIVE.")

    comment = db.query(FacebookComment).filter(FacebookComment.id == comment_id).first()
    if not comment:
        raise ValueError(f"Comment {comment_id} not found.")

    final_text = reply_text.strip() if reply_text and reply_text.strip() else comment.suggested_reply
    if not final_text:
        raise ValueError("Reply text cannot be empty.")

    client = _get_active_client(db)

    # 2. Transmit reply via Meta Client
    res = client.reply_to_comment(comment_id=comment.meta_comment_id, message=final_text)

    # 3. Update database record
    comment.approved_reply_text = final_text
    comment.reply_status = "SENT"
    comment.approved_by = admin_user_id
    comment.sent_at = datetime.now(timezone.utc)
    comment.meta_reply_id = res.get("meta_reply_id", f"reply_{comment.id}")
    db.commit()

    log_audit(
        db,
        action="SEND_COMMENT_REPLY",
        entity="facebook_comment",
        entity_id=str(comment.id),
        actor=actor,
        details=f"Human approved and sent comment reply to {comment.sender_name}."
    )

    return {
        "success": True,
        "comment_id": comment.id,
        "reply_status": "SENT",
        "approved_reply_text": final_text,
        "meta_reply_id": comment.meta_reply_id,
        "sent_at": comment.sent_at.isoformat()
    }

def reject_comment_reply(
    db: Session,
    comment_id: int,
    admin_user_id: int,
    actor: str = "admin"
) -> Dict[str, Any]:
    comment = db.query(FacebookComment).filter(FacebookComment.id == comment_id).first()
    if not comment:
        raise ValueError(f"Comment {comment_id} not found.")

    comment.reply_status = "REJECTED"
    comment.approved_by = admin_user_id
    db.commit()

    log_audit(
        db,
        action="REJECT_COMMENT_REPLY",
        entity="facebook_comment",
        entity_id=str(comment.id),
        actor=actor,
        details=f"Admin rejected proposed comment reply for comment {comment.id}."
    )

    return {
        "success": True,
        "comment_id": comment.id,
        "reply_status": "REJECTED"
    }
