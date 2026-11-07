import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.auth_service import get_current_user
from app.models.models import User
from app.schemas.schemas import MessengerApproveRequest
from app.services.messenger_service import (
    sync_messenger_threads, get_conversations, get_conversation_thread,
    approve_and_send_messenger_reply, reject_messenger_reply
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/messenger", tags=["Facebook Messenger Integration"])

@router.get("/conversations")
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve Messenger conversation list with unread/pending approval status."""
    return get_conversations(db)

@router.get("/conversations/{conversation_id}")
def read_thread(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve message history and pending proposed AI reply for a conversation."""
    try:
        return get_conversation_thread(db, conversation_id=conversation_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.post("/sync")
def sync_threads(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Sync conversations and incoming messages from Meta Messenger Platform."""
    return sync_messenger_threads(db)

@router.post("/drafts/{draft_id}/approve")
def approve_draft(
    draft_id: int,
    payload: MessengerApproveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    CRITICAL HUMAN GATEKEEPER:
    Approve proposed or edited response and transmit it to the customer via Messenger.
    Refuses execution if Global Pause is active.
    """
    try:
        return approve_and_send_messenger_reply(
            db=db,
            draft_id=draft_id,
            custom_reply=payload.reply_text,
            admin_user_id=current_user.id,
            actor=current_user.username
        )
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error approving Messenger reply: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to transmit Messenger reply: {str(e)}")

@router.post("/drafts/{draft_id}/reject")
def reject_draft(
    draft_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reject suggested Messenger response. No message will be sent to the customer."""
    try:
        return reject_messenger_reply(
            db=db,
            draft_id=draft_id,
            admin_user_id=current_user.id,
            actor=current_user.username
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
