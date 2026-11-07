from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database.session import get_db
from app.services.auth_service import get_current_user
from app.services.brand_service import get_brand_profile
from app.services.niche_service import get_niche_by_id
from app.services.audit_service import log_audit
from app.media.reels import reels_engine
from app.models.models import User, MediaAsset

router = APIRouter(prefix="/reels", tags=["Reels Studio"])

class GenerateReelScriptRequest(BaseModel):
    topic: str
    niche_id: Optional[int] = None
    duration_seconds: int = 15

class RenderReelRequest(BaseModel):
    title: str
    subtitle: str
    duration_seconds: int = 8
    preview_mode: bool = True # 540x960 fast preview for 8GB RAM vs 1080x1920 full

@router.post("/script")
def create_reel_script(
    req: GenerateReelScriptRequest,
    db: Session = Depends(get_db)
):
    """Generate Reel concepts, scene-by-scene storyboard, voiceover script, and subtitles."""
    brand = get_brand_profile(db)
    niche = get_niche_by_id(db, req.niche_id) if req.niche_id else None
    niche_name = niche.name if niche else "Official"

    script = reels_engine.generate_reel_script(
        topic=req.topic,
        niche_name=niche_name,
        brand_name=brand.page_name,
        duration_seconds=req.duration_seconds
    )
    return script

@router.post("/render")
def render_reel(
    req: RenderReelRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Render vertical MP4 video using local FFmpeg and register in Media Library."""
    timestamp = int(datetime.now(timezone.utc).timestamp())
    mode_str = "preview" if req.preview_mode else "full"
    output_filename = f"reel_{mode_str}_{timestamp}.mp4"

    render_result = reels_engine.render_reel_video(
        output_filename=output_filename,
        title_text=req.title,
        subtitle_text=req.subtitle,
        duration_seconds=req.duration_seconds,
        preview_mode=req.preview_mode
    )

    if not render_result.get("success"):
        raise HTTPException(
            status_code=500,
            detail=render_result.get("error", "FFmpeg Reel rendering failed.")
        )

    # Register in media_assets
    asset = MediaAsset(
        filename=output_filename,
        file_path=render_result["file_path"],
        file_type="video/mp4",
        file_size_bytes=render_result["file_size_bytes"],
        dimensions=render_result["dimensions"],
        is_generated=True,
        created_at=datetime.now(timezone.utc)
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)

    log_audit(
        db,
        action="RENDER_REEL",
        entity="media_assets",
        entity_id=str(asset.id),
        actor=current_user.username,
        details=f"Rendered Reel video {render_result['dimensions']} ({render_result['duration']})",
        ip_address=request.client.host if request.client else "127.0.0.1"
    )

    return {
        "success": True,
        "asset_id": asset.id,
        "filename": asset.filename,
        "file_path": asset.file_path,
        "dimensions": asset.dimensions,
        "duration": render_result["duration"],
        "file_size_bytes": asset.file_size_bytes,
        "validated": True
    }
