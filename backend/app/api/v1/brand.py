from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.schemas import BrandProfileResponse, BrandProfileUpdate
from app.services.brand_service import get_brand_profile, update_brand_profile
from app.services.auth_service import get_current_user
from app.services.audit_service import log_audit
from app.models.models import User

router = APIRouter(prefix="/brand", tags=["Brand Profile"])

@router.get("/profile", response_model=BrandProfileResponse)
def read_brand_profile(db: Session = Depends(get_db)):
    """Retrieve current brand profile and identity configuration."""
    profile = get_brand_profile(db)
    return profile

@router.put("/profile", response_model=BrandProfileResponse)
def modify_brand_profile(
    request: Request,
    update_data: BrandProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update brand profile configuration and parameters."""
    profile = update_brand_profile(db, update_data)
    log_audit(
        db,
        action="UPDATE_BRAND_PROFILE",
        entity="brand_profiles",
        entity_id=str(profile.id),
        actor=current_user.username,
        details=f"Brand profile updated: {profile.page_name}",
        ip_address=request.client.host if request.client else "127.0.0.1"
    )
    return profile
