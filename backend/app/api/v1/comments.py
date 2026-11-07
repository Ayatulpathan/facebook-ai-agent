import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.auth_service import get_current_user
from app.models.models import User
from app.schemas.schemas import CommentResponse, CommentApproveRequest
from app.services.comment_service import (
    get_comments, sync_comments_from_facebook, approve_and_send_comment_reply, reject_comment_reply
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/comments", tags=["Facebook Comments Management"])

@router.get("/", response_model=List[CommentResponse])
def list_comments(
    category: Optional[str] = Query(None, description="Filter by category: General Question, Product Inquiry, Price Inquiry, Positive Feedback, Complaint, Spam, Other"),
    reply_status: Optional[str] = Query(None, description="Filter by status: PENDING, APPROVED, REJECTED, SENT"),
    search: Optional[str] = Query(None, description="Search in text or sender"),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve comments with original customer text and proposed AI response."""
    return get_comments(db, category=category, reply_status=reply_status, search=search, skip=skip, limit=limit)

@router.post("/sync")
def sync_comments(
    post_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Sync comments from Facebook Page feed, classify intents, and hold replies in PENDING state."""
    return sync_comments_from_facebook(db, post_id=post_id)

@router.post("/{comment_id}/approve")
def approve_reply(
    comment_id: int,
    payload: CommentApproveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    CRITICAL HUMAN GATEKEEPER:
    Approve proposed or edited response and transmit it to Facebook.
    Refuses execution if Global Pause is active.
    """
    try:
        return approve_and_send_comment_reply(
            db=db,
            comment_id=comment_id,
            reply_text=payload.reply_text,
            admin_user_id=current_user.id,
            actor=current_user.username
        )
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error approving comment reply: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to send reply: {str(e)}")

@router.post("/{comment_id}/reject")
def reject_reply(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reject suggested comment response. No message will be sent to the user."""
    try:
        return reject_comment_reply(
            db=db,
            comment_id=comment_id,
            admin_user_id=current_user.id,
            actor=current_user.username
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
