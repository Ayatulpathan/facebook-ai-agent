import json
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.models import Conversation, Message, ReplyDraft, BrandProfile, AppSetting, PageConnection
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

def sync_messenger_threads(db: Session) -> Dict[str, Any]:
    """
    Syncs customer Messenger conversations, drafts proposed AI replies held in PENDING state,
    and extracts qualified CRM leads automatically.
    """
    client = _get_active_client(db)
    agent = EngagementAgent()
    brand_profile = db.query(BrandProfile).first()

    threads = client.get_messenger_conversations()
    synced_threads = 0
    synced_messages = 0
    new_leads = 0

    for thread in threads:
        thread_id = thread.get("id")
        if not thread_id:
            continue

        senders_data = thread.get("senders", {}).get("data", [{}])
        sender_obj = senders_data[0] if senders_data else {}
        sender_name = sender_obj.get("name", "Customer")
        sender_id = sender_obj.get("id", f"sender_{thread_id}")

        conv = db.query(Conversation).filter(Conversation.meta_thread_id == thread_id).first()
        if not conv:
            conv = Conversation(
                meta_thread_id=thread_id,
                sender_id=sender_id,
                sender_name=sender_name,
                platform="messenger",
                status="active"
            )
            db.add(conv)
            db.commit()
            db.refresh(conv)
            synced_threads += 1

        # Fetch messages for this thread
        raw_msgs = client.get_conversation_messages(thread_id)
        for m in raw_msgs:
            meta_msg_id = m.get("id")
            existing_msg = db.query(Message).filter(Message.meta_message_id == meta_msg_id).first()
            if existing_msg:
                continue

            msg_text = m.get("message", "")
            from_obj = m.get("from", {})
            sender_type = "page" if from_obj.get("id") == client.page_id else "customer"

            msg_record = Message(
                conversation_id=conv.id,
                meta_message_id=meta_msg_id,
                sender_type=sender_type,
                message_text=msg_text,
                timestamp=datetime.now(timezone.utc)
            )
            db.add(msg_record)
            db.commit()
            db.refresh(msg_record)
            synced_messages += 1

            # If customer message, draft AI suggested reply
            if sender_type == "customer":
                analysis = agent.classify_and_draft_messenger_reply(msg_text, brand_profile=brand_profile)
                
                draft = ReplyDraft(
                    message_id=msg_record.id,
                    suggested_reply=analysis["suggested_reply"],
                    detected_intent=analysis["intent"],
                    approval_status="PENDING", # Mandatory Human Gatekeeper
                    created_at=datetime.now(timezone.utc)
                )
                db.add(draft)

                # Extract CRM Lead
                if analysis["is_lead"]:
                    create_or_update_lead(
                        db=db,
                        customer_name=sender_name,
                        facebook_reference=f"https://facebook.com/{sender_id}",
                        contact_info=analysis.get("contact_info", ""),
                        inquiry_type=analysis["intent"],
                        product_interest="Messenger inquiry",
                        notes=f"Auto-detected from Messenger: \"{msg_text}\""
                    )
                    new_leads += 1

        conv.updated_at = datetime.now(timezone.utc)
        db.commit()

    return {
        "success": True,
        "synced_threads": synced_threads,
        "synced_messages": synced_messages,
        "new_leads": new_leads
    }

def get_conversations(db: Session) -> List[Dict[str, Any]]:
    threads = db.query(Conversation).order_by(Conversation.updated_at.desc()).all()
    results = []
    for t in threads:
        latest_msg = db.query(Message).filter(Message.conversation_id == t.id).order_by(Message.timestamp.desc()).first()
        pending_drafts = (
            db.query(ReplyDraft)
            .join(Message, Message.id == ReplyDraft.message_id)
            .filter(Message.conversation_id == t.id, ReplyDraft.approval_status == "PENDING")
            .count()
        )
        results.append({
            "id": t.id,
            "meta_thread_id": t.meta_thread_id,
            "sender_name": t.sender_name,
            "sender_id": t.sender_id,
            "platform": t.platform,
            "status": t.status,
            "updated_at": t.updated_at.isoformat(),
            "latest_message": latest_msg.message_text if latest_msg else "",
            "latest_message_sender": latest_msg.sender_type if latest_msg else "",
            "has_pending_approval": pending_drafts > 0,
            "pending_drafts_count": pending_drafts
        })
    return results

def get_conversation_thread(db: Session, conversation_id: int) -> Dict[str, Any]:
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise ValueError(f"Conversation {conversation_id} not found.")

    msgs = db.query(Message).filter(Message.conversation_id == conv.id).order_by(Message.timestamp.asc()).all()
    message_list = []
    latest_pending_draft = None

    for m in msgs:
        draft = db.query(ReplyDraft).filter(ReplyDraft.message_id == m.id).order_by(ReplyDraft.created_at.desc()).first()
        if draft and draft.approval_status == "PENDING":
            latest_pending_draft = {
                "id": draft.id,
                "message_id": draft.message_id,
                "suggested_reply": draft.suggested_reply,
                "detected_intent": draft.detected_intent,
                "approval_status": draft.approval_status,
                "created_at": draft.created_at.isoformat()
            }

        message_list.append({
            "id": m.id,
            "sender_type": m.sender_type,
            "message_text": m.message_text,
            "timestamp": m.timestamp.isoformat(),
            "draft": {
                "id": draft.id,
                "suggested_reply": draft.suggested_reply,
                "detected_intent": draft.detected_intent,
                "approval_status": draft.approval_status
            } if draft else None
        })

    return {
        "conversation": {
            "id": conv.id,
            "meta_thread_id": conv.meta_thread_id,
            "sender_name": conv.sender_name,
            "sender_id": conv.sender_id,
            "updated_at": conv.updated_at.isoformat()
        },
        "messages": message_list,
        "pending_draft": latest_pending_draft
    }

def approve_and_send_messenger_reply(
    db: Session,
    draft_id: int,
    custom_reply: Optional[str],
    admin_user_id: int,
    actor: str = "admin"
) -> Dict[str, Any]:
    """
    CRITICAL HUMAN GATEKEEPER:
    Validates explicit approval and transmits reply to customer via Meta API.
    """
    pause = db.query(AppSetting).filter(AppSetting.key == "global_pause").first()
    if pause and pause.value.lower() == "true":
        raise PermissionError("Outgoing Messenger replies are blocked: Emergency Global Pause is ACTIVE.")

    draft = db.query(ReplyDraft).filter(ReplyDraft.id == draft_id).first()
    if not draft:
        raise ValueError(f"Reply draft {draft_id} not found.")

    msg = db.query(Message).filter(Message.id == draft.message_id).first()
    if not msg:
        raise ValueError("Original customer message not found.")

    conv = db.query(Conversation).filter(Conversation.id == msg.conversation_id).first()
    if not conv:
        raise ValueError("Conversation not found.")

    final_reply = custom_reply.strip() if custom_reply and custom_reply.strip() else draft.suggested_reply
    if not final_reply:
        raise ValueError("Outgoing reply text cannot be empty.")

    client = _get_active_client(db)

    # Dispatch to customer via Meta API
    meta_res = client.send_messenger_message(recipient_id=conv.sender_id, message=final_reply)

    # Record outgoing Page message in thread
    page_msg = Message(
        conversation_id=conv.id,
        meta_message_id=meta_res.get("meta_message_id", f"msg_out_{draft_id}"),
        sender_type="page",
        message_text=final_reply,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(page_msg)

    # Update draft state
    draft.approval_status = "SENT"
    draft.approved_by = admin_user_id
    draft.sent_at = datetime.now(timezone.utc)
    conv.updated_at = datetime.now(timezone.utc)

    db.commit()

    log_audit(
        db,
        action="SEND_MESSENGER_REPLY",
        entity="reply_draft",
        entity_id=str(draft.id),
        actor=actor,
        details=f"Human approved and dispatched Messenger reply to {conv.sender_name}."
    )

    return {
        "success": True,
        "draft_id": draft.id,
        "approval_status": "SENT",
        "sent_text": final_reply,
        "meta_message_id": page_msg.meta_message_id,
        "sent_at": draft.sent_at.isoformat()
    }

def reject_messenger_reply(
    db: Session,
    draft_id: int,
    admin_user_id: int,
    actor: str = "admin"
) -> Dict[str, Any]:
    draft = db.query(ReplyDraft).filter(ReplyDraft.id == draft_id).first()
    if not draft:
        raise ValueError(f"Reply draft {draft_id} not found.")

    draft.approval_status = "REJECTED"
    draft.approved_by = admin_user_id
    db.commit()

    log_audit(
        db,
        action="REJECT_MESSENGER_REPLY",
        entity="reply_draft",
        entity_id=str(draft.id),
        actor=actor,
        details=f"Admin rejected proposed reply draft {draft.id}."
    )

    return {
        "success": True,
        "draft_id": draft.id,
        "approval_status": "REJECTED"
    }
