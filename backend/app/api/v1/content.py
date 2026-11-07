import json
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database.session import get_db
from app.services.auth_service import get_current_user
from app.services.audit_service import log_audit
from app.models.models import User, Content, ContentVersion, Approval, Niche, MediaAsset
from app.agents.orchestrator import master_orchestrator
from app.services.brand_service import get_brand_profile

router = APIRouter(prefix="/content", tags=["Content Management"])

# Schemas
class CreatePostRequest(BaseModel):
    niche_id: Optional[int] = None
    title: str
    content_type: str = "post" # post, reel, story
    language: str = "both" # bn, en, both
    caption_bn: str = ""
    caption_en: str = ""
    hashtags: str = ""
    call_to_action: str = ""
    media_asset_ids: List[int] = []
    scheduled_for: Optional[datetime] = None
    status: str = "Draft" # Draft or Pending Approval

class UpdatePostRequest(BaseModel):
    title: Optional[str] = None
    caption_bn: Optional[str] = None
    caption_en: Optional[str] = None
    hashtags: Optional[str] = None
    call_to_action: Optional[str] = None
    media_asset_ids: Optional[List[int]] = None
    scheduled_for: Optional[datetime] = None
    resubmit_for_approval: bool = False

@router.get("/")
def list_content(
    status_filter: Optional[str] = None,
    niche_id: Optional[int] = None,
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db)
):
    """Retrieve content items with version info and lifecycle status."""
    query = db.query(Content)
    if status_filter:
        query = query.filter(Content.status == status_filter)
    if niche_id:
        query = query.filter(Content.niche_id == niche_id)
    
    posts = query.order_by(Content.created_at.desc()).limit(limit).all()
    
    results = []
    for p in posts:
        # Get latest version
        latest_ver = (
            db.query(ContentVersion)
            .filter(ContentVersion.content_id == p.id)
            .order_by(ContentVersion.version_num.desc())
            .first()
        )
        niche = db.query(Niche).filter(Niche.id == p.niche_id).first() if p.niche_id else None

        results.append({
            "id": p.id,
            "title": p.title,
            "content_type": p.content_type,
            "language": p.language,
            "status": p.status,
            "scheduled_for": p.scheduled_for.isoformat() if p.scheduled_for else None,
            "created_at": p.created_at.isoformat(),
            "niche": {"id": niche.id, "name": niche.name} if niche else None,
            "latest_version": {
                "version_num": latest_ver.version_num if latest_ver else 1,
                "caption_bn": latest_ver.caption_bn if latest_ver else "",
                "caption_en": latest_ver.caption_en if latest_ver else "",
                "hashtags": latest_ver.hashtags if latest_ver else "",
                "call_to_action": latest_ver.call_to_action if latest_ver else "",
                "media_asset_ids": json.loads(latest_ver.media_asset_ids) if latest_ver and latest_ver.media_asset_ids else [],
                "quality_score": latest_ver.quality_score if latest_ver else 1.0,
                "quality_notes": latest_ver.quality_notes if latest_ver else ""
            } if latest_ver else None
        })
    return results

@router.get("/{content_id}")
def get_content_detail(content_id: int, db: Session = Depends(get_db)):
    """Retrieve comprehensive post record with complete version and approval history."""
    content = db.query(Content).filter(Content.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    versions = (
        db.query(ContentVersion)
        .filter(ContentVersion.content_id == content_id)
        .order_by(ContentVersion.version_num.asc())
        .all()
    )
    approvals = (
        db.query(Approval)
        .filter(Approval.content_id == content_id)
        .order_by(Approval.created_at.desc())
        .all()
    )

    return {
        "id": content.id,
        "niche_id": content.niche_id,
        "title": content.title,
        "content_type": content.content_type,
        "language": content.language,
        "status": content.status,
        "scheduled_for": content.scheduled_for.isoformat() if content.scheduled_for else None,
        "created_at": content.created_at.isoformat(),
        "versions": [
            {
                "id": v.id,
                "version_num": v.version_num,
                "caption_bn": v.caption_bn,
                "caption_en": v.caption_en,
                "hashtags": v.hashtags,
                "call_to_action": v.call_to_action,
                "media_asset_ids": json.loads(v.media_asset_ids) if v.media_asset_ids else [],
                "quality_score": v.quality_score,
                "quality_notes": v.quality_notes,
                "created_by": v.created_by,
                "created_at": v.created_at.isoformat()
            }
            for v in versions
        ],
        "approvals": [
            {
                "id": a.id,
                "version_num": a.version_num,
                "status": a.status,
                "decision_notes": a.decision_notes,
                "decided_at": a.decided_at.isoformat() if a.decided_at else None,
                "created_at": a.created_at.isoformat()
            }
            for a in approvals
        ]
    }

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_content(
    req: CreatePostRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new content record with initial version."""
    brand = get_brand_profile(db)
    niche = db.query(Niche).filter(Niche.id == req.niche_id).first() if req.niche_id else None

    # Run Quality Control check on captions
    combined_text = f"{req.caption_en} {req.caption_bn}"
    qc_result = master_orchestrator.qc.evaluate(combined_text, brand, niche)

    initial_status = "Pending Approval" if req.status == "Pending Approval" else "Draft"

    new_content = Content(
        niche_id=req.niche_id,
        title=req.title,
        content_type=req.content_type,
        language=req.language,
        status=initial_status,
        scheduled_for=req.scheduled_for
    )
    db.add(new_content)
    db.commit()
    db.refresh(new_content)

    new_version = ContentVersion(
        content_id=new_content.id,
        version_num=1,
        caption_bn=req.caption_bn,
        caption_en=req.caption_en,
        hashtags=req.hashtags,
        call_to_action=req.call_to_action,
        media_asset_ids=json.dumps(req.media_asset_ids),
        quality_score=qc_result.get("score", 1.0),
        quality_notes=qc_result.get("notes", ""),
        created_by=current_user.username
    )
    db.add(new_version)
    db.commit()
    db.refresh(new_version)

    new_content.current_version_id = new_version.id

    # If created as Pending Approval, register approval ticket
    if initial_status == "Pending Approval":
        approval = Approval(
            content_id=new_content.id,
            version_num=1,
            status="PENDING",
            decision_notes="Awaiting administrator review."
        )
        db.add(approval)

    db.commit()

    log_audit(
        db,
        action="CREATE_CONTENT",
        entity="content",
        entity_id=str(new_content.id),
        actor=current_user.username,
        details=f"Created post '{new_content.title}' (Status: {initial_status})",
        ip_address=request.client.host if request.client else "127.0.0.1"
    )

    return {"success": True, "content_id": new_content.id, "status": initial_status}

@router.put("/{content_id}")
def update_content(
    content_id: int,
    req: UpdatePostRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update post content.
    MANDATORY APPROVAL RULE: Any edit creates a new version and INVALIDATES prior approvals.
    Resets status to Pending Approval or Draft.
    """
    content = db.query(Content).filter(Content.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    brand = get_brand_profile(db)
    niche = db.query(Niche).filter(Niche.id == content.niche_id).first() if content.niche_id else None

    # Get latest version
    latest_ver = (
        db.query(ContentVersion)
        .filter(ContentVersion.content_id == content_id)
        .order_by(ContentVersion.version_num.desc())
        .first()
    )
    next_ver_num = (latest_ver.version_num + 1) if latest_ver else 1

    # Invalidate any existing approvals
    existing_approvals = db.query(Approval).filter(
        Approval.content_id == content_id,
        Approval.status.in_(["PENDING", "APPROVED"])
    ).all()
    for appr in existing_approvals:
        appr.status = "INVALIDATED"
        appr.decision_notes = f"Approval invalidated due to version edit by {current_user.username}."

    if req.title:
        content.title = req.title
    if req.scheduled_for is not None:
        content.scheduled_for = req.scheduled_for

    new_caption_bn = req.caption_bn if req.caption_bn is not None else (latest_ver.caption_bn if latest_ver else "")
    new_caption_en = req.caption_en if req.caption_en is not None else (latest_ver.caption_en if latest_ver else "")
    new_hashtags = req.hashtags if req.hashtags is not None else (latest_ver.hashtags if latest_ver else "")
    new_cta = req.call_to_action if req.call_to_action is not None else (latest_ver.call_to_action if latest_ver else "")
    new_media = req.media_asset_ids if req.media_asset_ids is not None else (json.loads(latest_ver.media_asset_ids) if latest_ver and latest_ver.media_asset_ids else [])

    # Run Quality Control check
    qc = master_orchestrator.qc.evaluate(f"{new_caption_en} {new_caption_bn}", brand, niche)

    # Create new immutable version
    new_version = ContentVersion(
        content_id=content_id,
        version_num=next_ver_num,
        caption_bn=new_caption_bn,
        caption_en=new_caption_en,
        hashtags=new_hashtags,
        call_to_action=new_cta,
        media_asset_ids=json.dumps(new_media),
        quality_score=qc.get("score", 1.0),
        quality_notes=qc.get("notes", ""),
        created_by=current_user.username
    )
    db.add(new_version)
    db.commit()
    db.refresh(new_version)

    content.current_version_id = new_version.id

    if req.resubmit_for_approval:
        content.status = "Pending Approval"
        approval = Approval(
            content_id=content_id,
            version_num=next_ver_num,
            status="PENDING",
            decision_notes="Resubmitted after modification."
        )
        db.add(approval)
    else:
        content.status = "Draft"

    db.commit()

    log_audit(
        db,
        action="UPDATE_CONTENT_VERSION",
        entity="content",
        entity_id=str(content_id),
        actor=current_user.username,
        details=f"Created version {next_ver_num} for '{content.title}'. Prior approvals invalidated.",
        ip_address=request.client.host if request.client else "127.0.0.1"
    )

    return {
        "success": True,
        "content_id": content_id,
        "version_num": next_ver_num,
        "status": content.status
    }

@router.post("/{content_id}/submit-approval")
def submit_for_approval(
    content_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit a draft post to the Approval Center."""
    content = db.query(Content).filter(Content.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    latest_ver = (
        db.query(ContentVersion)
        .filter(ContentVersion.content_id == content_id)
        .order_by(ContentVersion.version_num.desc())
        .first()
    )
    ver_num = latest_ver.version_num if latest_ver else 1

    content.status = "Pending Approval"
    approval = Approval(
        content_id=content_id,
        version_num=ver_num,
        status="PENDING",
        decision_notes="Submitted for administrator review."
    )
    db.add(approval)
    db.commit()

    log_audit(
        db,
        action="SUBMIT_APPROVAL",
        entity="content",
        entity_id=str(content_id),
        actor=current_user.username,
        details=f"Post #{content_id} (v{ver_num}) submitted to Approval Center",
        ip_address=request.client.host if request.client else "127.0.0.1"
    )

    return {"success": True, "message": "Content submitted to Approval Center", "status": "Pending Approval"}

@router.delete("/{content_id}")
def delete_content(
    content_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a post and its associated versions."""
    content = db.query(Content).filter(Content.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    title = content.title
    db.delete(content)
    db.commit()

    log_audit(
        db,
        action="DELETE_CONTENT",
        entity="content",
        entity_id=str(content_id),
        actor=current_user.username,
        details=f"Deleted post '{title}'",
        ip_address=request.client.host if request.client else "127.0.0.1"
    )

    return {"success": True, "message": f"Post '{title}' deleted."}
