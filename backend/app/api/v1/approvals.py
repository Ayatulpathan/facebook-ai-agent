from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database.session import get_db
from app.services.auth_service import get_current_user
from app.services.approval_service import approval_service
from app.models.models import User

router = APIRouter(prefix="/approvals", tags=["Approval Center"])

class ApproveRequest(BaseModel):
    version_num: int
    decision_notes: Optional[str] = "Approved by administrator for queue."

class RejectRequest(BaseModel):
    version_num: int
    rejection_reason: str

@router.get("/pending")
def list_pending_approvals(db: Session = Depends(get_db)):
    """Retrieve all posts and drafts currently awaiting human administrator authorization."""
    return approval_service.get_pending_approvals(db)

@router.post("/{content_id}/approve")
def approve_post(
    content_id: int,
    req: ApproveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Explicit Administrator Approval.
    - AI agents CANNOT approve content.
    - Approves exact version number and places job in publishing queue.
    """
    try:
        res = approval_service.approve_content(
            db=db,
            content_id=content_id,
            version_num=req.version_num,
            reviewer_id=current_user.id,
            decision_notes=req.decision_notes or ""
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{content_id}/reject")
def reject_post(
    content_id: int,
    req: RejectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Explicit Administrator Rejection.
    - Marks approval ticket REJECTED with recorded feedback.
    - Removes post from publishing queue.
    """
    try:
        res = approval_service.reject_content(
            db=db,
            content_id=content_id,
            version_num=req.version_num,
            reviewer_id=current_user.id,
            rejection_reason=req.rejection_reason
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/history")
def get_approval_audit_history(
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db)
):
    """Retrieve chronological audit trail of all approval, rejection, and invalidation decisions."""
    return approval_service.get_approval_history(db, limit=limit)
