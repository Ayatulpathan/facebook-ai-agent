from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Request
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.services.auth_service import get_current_user
from app.services.media_service import media_service
from app.services.audit_service import log_audit
from app.models.models import User, MediaAsset
from app.core.config import settings

router = APIRouter(prefix="/media", tags=["Media Library"])

@router.post("/upload")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload an image or video asset to local media storage."""
    file_bytes = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    if len(file_bytes) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds local maximum upload size of {settings.MAX_UPLOAD_SIZE_MB} MB."
        )

    content_type = file.content_type or "application/octet-stream"
    if not (content_type.startswith("image/") or content_type.startswith("video/")):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Only standard images and MP4/MOV videos are permitted."
        )

    asset = media_service.save_upload_file(
        db=db,
        filename=file.filename or "upload.bin",
        file_bytes=file_bytes,
        content_type=content_type,
        is_generated=False
    )

    log_audit(
        db,
        action="MEDIA_UPLOAD",
        entity="media_assets",
        entity_id=str(asset.id),
        actor=current_user.username,
        details=f"Uploaded '{asset.filename}' ({asset.dimensions or 'media'})",
        ip_address=request.client.host if request.client else "127.0.0.1"
    )

    return {
        "id": asset.id,
        "filename": asset.filename,
        "file_path": asset.file_path,
        "file_type": asset.file_type,
        "dimensions": asset.dimensions,
        "file_size_bytes": asset.file_size_bytes,
        "is_generated": asset.is_generated
    }

@router.get("/")
def list_media(
    media_type: Optional[str] = Query(None, pattern="^(image|video)$"),
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db)
):
    """Retrieve locally stored media assets."""
    assets = media_service.list_assets(db, media_type=media_type, limit=limit)
    return [
        {
            "id": a.id,
            "filename": a.filename,
            "file_path": a.file_path,
            "file_type": a.file_type,
            "dimensions": a.dimensions,
            "file_size_bytes": a.file_size_bytes,
            "is_generated": a.is_generated,
            "created_at": a.created_at.isoformat()
        }
        for a in assets
    ]

@router.delete("/{asset_id}")
def delete_media(
    asset_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a media asset from local storage and database."""
    success = media_service.delete_asset(db, asset_id)
    if not success:
        raise HTTPException(status_code=404, detail="Media asset not found")

    log_audit(
        db,
        action="MEDIA_DELETE",
        entity="media_assets",
        entity_id=str(asset_id),
        actor=current_user.username,
        details=f"Deleted media asset #{asset_id}",
        ip_address=request.client.host if request.client else "127.0.0.1"
    )

    return {"success": True, "message": "Media asset deleted successfully"}
