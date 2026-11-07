import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.auth_service import get_current_user
from app.models.models import User
from app.schemas.schemas import FacebookConfigRequest, FacebookStatusResponse, GenericMessage
from app.services.facebook_service import (
    get_facebook_status, update_facebook_config, verify_facebook_connection,
    disconnect_facebook_page, trigger_manual_publishing
)
from app.facebook.meta_client import build_meta_oauth_url
from app.facebook.publisher import UnapprovedContentError, GlobalPauseActiveError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/facebook", tags=["Facebook Page Integration"])

@router.get("/status", response_model=FacebookStatusResponse)
def read_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve connected Facebook Page identity, token validity, and granular permission health."""
    return get_facebook_status(db)

@router.post("/config", response_model=FacebookStatusResponse)
def save_config(
    payload: FacebookConfigRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update local Facebook Page credentials or switch between Live Meta API and Mock Sandbox Mode.
    Tokens are stored locally in SQLite and are never exposed back to client JavaScript.
    """
    return update_facebook_config(
        db,
        page_id=payload.page_id,
        access_token=payload.access_token,
        app_id=payload.app_id,
        app_secret=payload.app_secret,
        is_mock_mode=payload.is_mock_mode,
        actor=current_user.username
    )

@router.get("/oauth-url")
def get_oauth_dialog_url(
    redirect_uri: str = "http://localhost:5173/facebook/callback",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate the official Meta OAuth Dialog URL for admin consent."""
    status_data = get_facebook_status(db)
    app_id = status_data.get("app_id")
    if not app_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Meta App ID is not configured. Please enter your Meta App ID in Facebook settings."
        )
    url = build_meta_oauth_url(app_id=app_id, redirect_uri=redirect_uri)
    return {"oauth_url": url}

@router.post("/verify", response_model=FacebookStatusResponse)
def verify_connection(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Force an active verification of the connected Page and token permissions."""
    return verify_facebook_connection(db, actor=current_user.username)

@router.post("/disconnect", response_model=FacebookStatusResponse)
def disconnect_page(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Disconnect Facebook Page, clear tokens, and record security audit log."""
    return disconnect_facebook_page(db, actor=current_user.username)

@router.post("/publish-now/{content_id}")
def publish_now(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Enforce Human Gatekeeper verification and instantly publish approved content to the Facebook Page.
    CRITICAL: Refuses execution if unapproved, modified, or if Global Pause is active.
    """
    try:
        result = trigger_manual_publishing(db, content_id=content_id, user_id=current_user.id)
        return result
    except GlobalPauseActiveError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except UnapprovedContentError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Publish now error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Publishing failed: {str(e)}")
