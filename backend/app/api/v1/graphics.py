from typing import Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database.session import get_db
from app.services.auth_service import get_current_user
from app.services.brand_service import get_brand_profile
from app.services.media_service import media_service
from app.services.audit_service import log_audit
from app.media.graphics import graphic_engine
from app.models.models import User

router = APIRouter(prefix="/graphics", tags=["Graphic Studio"])

class RenderGraphicRequest(BaseModel):
    template: str
    data: Dict[str, str]
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    format: str = "PNG" # PNG or JPEG

@router.get("/templates")
def get_templates():
    """Retrieve available promotional templates and field schemas."""
    return {
        "templates": graphic_engine.get_template_specs(),
        "dimensions": "1080x1080 (Square Facebook Post)",
        "formats_supported": ["PNG", "JPEG"]
    }

@router.post("/render")
def render_template(
    req: RenderGraphicRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Render promotional post graphic and save into local Media Library."""
    brand = get_brand_profile(db)
    primary = req.primary_color or brand.primary_color or "#1877F2"
    secondary = req.secondary_color or brand.secondary_color or "#42B72A"

    image_bytes = graphic_engine.render_graphic(
        template_name=req.template,
        data=req.data,
        primary_color=primary,
        secondary_color=secondary,
        brand_name=brand.page_name,
        format_type=req.format
    )

    filename = f"graphic_{req.template}_{int(datetime.now(timezone.utc).timestamp())}.{req.format.lower()}"
    content_type = "image/png" if req.format.upper() == "PNG" else "image/jpeg"

    asset = media_service.save_upload_file(
        db=db,
        filename=filename,
        file_bytes=image_bytes,
        content_type=content_type,
        is_generated=True
    )

    log_audit(
        db,
        action="RENDER_GRAPHIC",
        entity="media_assets",
        entity_id=str(asset.id),
        actor=current_user.username,
        details=f"Rendered {req.template} graphic ({asset.dimensions})",
        ip_address=request.client.host if request.client else "127.0.0.1"
    )

    return {
        "success": True,
        "asset_id": asset.id,
        "filename": asset.filename,
        "file_path": asset.file_path,
        "dimensions": asset.dimensions,
        "file_size_bytes": asset.file_size_bytes
    }
