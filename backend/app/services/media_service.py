import os
import shutil
import hashlib
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from PIL import Image
from sqlalchemy.orm import Session
from app.models.models import MediaAsset
from app.core.config import settings

def get_file_hash(filepath: Path) -> str:
    """Compute SHA-256 hash of a file for deduplication and audit."""
    h = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()

class MediaService:
    @staticmethod
    def save_upload_file(
        db: Session,
        filename: str,
        file_bytes: bytes,
        content_type: str,
        is_generated: bool = False
    ) -> MediaAsset:
        """Save an uploaded or rendered media file to local data/media storage."""
        # Sanitize filename
        safe_name = os.path.basename(filename).replace(" ", "_")
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        target_name = f"{timestamp}_{safe_name}"
        target_path = settings.MEDIA_DIR / target_name

        with open(target_path, "wb") as f:
            f.write(file_bytes)

        file_size = len(file_bytes)
        dimensions = ""

        # Extract image dimensions if image
        if "image" in content_type:
            try:
                with Image.open(target_path) as img:
                    dimensions = f"{img.width}x{img.height}"
            except Exception:
                dimensions = "unknown"

        # Web-accessible path relative to backend static mount
        web_path = f"/media/{target_name}"

        media_asset = MediaAsset(
            filename=target_name,
            file_path=web_path,
            file_type=content_type,
            file_size_bytes=file_size,
            dimensions=dimensions,
            is_generated=is_generated,
            created_at=datetime.now(timezone.utc)
        )
        db.add(media_asset)
        db.commit()
        db.refresh(media_asset)
        return media_asset

    @staticmethod
    def list_assets(
        db: Session,
        media_type: Optional[str] = None,
        limit: int = 50
    ) -> List[MediaAsset]:
        query = db.query(MediaAsset)
        if media_type == "image":
            query = query.filter(MediaAsset.file_type.like("image/%"))
        elif media_type == "video":
            query = query.filter(MediaAsset.file_type.like("video/%"))
        return query.order_by(MediaAsset.created_at.desc()).limit(limit).all()

    @staticmethod
    def delete_asset(db: Session, asset_id: int) -> bool:
        asset = db.query(MediaAsset).filter(MediaAsset.id == asset_id).first()
        if not asset:
            return False
        # Remove physical file if exists
        disk_filename = os.path.basename(asset.file_path)
        disk_path = settings.MEDIA_DIR / disk_filename
        if disk_path.exists():
            disk_path.unlink()
        db.delete(asset)
        db.commit()
        return True

media_service = MediaService()
