import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session

from app.models.models import PageConnection, AuditLog, Notification
from app.facebook.meta_client import (
    BaseMetaClient, LiveMetaClient, MockMetaClient,
    REQUIRED_PERMISSIONS, build_meta_oauth_url
)
from app.facebook.publisher import PublisherGatekeeper
from app.services.audit_service import log_audit

logger = logging.getLogger(__name__)

def get_or_create_connection(db: Session) -> PageConnection:
    conn = db.query(PageConnection).first()
    if not conn:
        conn = PageConnection(
            page_id="mock_page_1020304050",
            page_name="Local AI Brand Sandbox",
            status="connected",
            category="E-Commerce & Digital Brand",
            followers_count=3450,
            avatar_url="https://placehold.co/200x200/1877f2/ffffff?text=FB",
            is_mock_mode=True,
            permissions_granted=json.dumps(list(REQUIRED_PERMISSIONS.keys())),
            missing_permissions=json.dumps([]),
            token_expires_at=datetime.now(timezone.utc) + timedelta(days=58),
            connected_at=datetime.now(timezone.utc),
            last_verified_at=datetime.now(timezone.utc)
        )
        db.add(conn)
        db.commit()
        db.refresh(conn)
    return conn

def get_facebook_status(db: Session) -> Dict[str, Any]:
    conn = get_or_create_connection(db)
    
    # Check token expiration
    expires_in_days: Optional[int] = None
    if conn.token_expires_at:
        token_exp = conn.token_expires_at
        if token_exp.tzinfo is None:
            token_exp = token_exp.replace(tzinfo=timezone.utc)
        delta = token_exp - datetime.now(timezone.utc)
        expires_in_days = max(0, delta.days)

    granted_list: List[str] = []
    missing_list: List[str] = []
    try:
        granted_list = json.loads(conn.permissions_granted)
    except Exception:
        pass
    try:
        missing_list = json.loads(conn.missing_permissions)
    except Exception:
        pass

    # Detailed permissions breakdown
    permissions_details = []
    for perm_key, perm_meta in REQUIRED_PERMISSIONS.items():
        is_granted = perm_key in granted_list
        permissions_details.append({
            "key": perm_key,
            "name": perm_meta["name"],
            "description": perm_meta["description"],
            "required": perm_meta["required"],
            "impact_if_missing": perm_meta["impact_if_missing"],
            "is_granted": is_granted
        })

    token_status = "VALID"
    if expires_in_days is not None and expires_in_days <= 0:
        token_status = "EXPIRED"
    elif expires_in_days is not None and expires_in_days < 7:
        token_status = "EXPIRING_SOON"
    elif missing_list:
        token_status = "DEGRADED"

    return {
        "is_connected": conn.status == "connected",
        "is_mock_mode": conn.is_mock_mode,
        "page_id": conn.page_id,
        "page_name": conn.page_name,
        "category": conn.category,
        "followers_count": conn.followers_count,
        "avatar_url": conn.avatar_url,
        "status": conn.status,
        "has_token": bool(conn.access_token_encrypted) or conn.is_mock_mode,
        "app_id": conn.app_id,
        "app_secret_configured": bool(conn.app_secret_masked),
        "token_status": token_status,
        "token_expires_at": conn.token_expires_at.isoformat() if conn.token_expires_at else None,
        "expires_in_days": expires_in_days,
        "permissions_summary": {
            "total": len(REQUIRED_PERMISSIONS),
            "granted": len(granted_list),
            "missing": len(missing_list),
            "all_required_granted": len(missing_list) == 0
        },
        "permissions": permissions_details,
        "last_verified_at": conn.last_verified_at.isoformat() if conn.last_verified_at else None,
        "last_error": conn.last_error,
        "legal_disclaimer": "Meta Graph API access is subject to Meta's review, policies, and permissions. All tokens remain stored exclusively on your local machine."
    }

def update_facebook_config(
    db: Session,
    page_id: Optional[str] = None,
    access_token: Optional[str] = None,
    app_id: Optional[str] = None,
    app_secret: Optional[str] = None,
    is_mock_mode: Optional[bool] = None,
    actor: str = "admin"
) -> Dict[str, Any]:
    conn = get_or_create_connection(db)

    if is_mock_mode is not None:
        conn.is_mock_mode = is_mock_mode
        if is_mock_mode:
            conn.page_name = "Local AI Brand Sandbox"
            conn.category = "E-Commerce & Digital Brand"
            conn.followers_count = 3450
            conn.status = "connected"
            conn.permissions_granted = json.dumps(list(REQUIRED_PERMISSIONS.keys()))
            conn.missing_permissions = json.dumps([])
            conn.token_expires_at = datetime.now(timezone.utc) + timedelta(days=58)
            conn.last_error = None

    if app_id is not None:
        conn.app_id = app_id.strip()

    if app_secret is not None and app_secret.strip():
        conn.app_secret_masked = "•" * 12

    if page_id is not None and page_id.strip():
        conn.page_id = page_id.strip()

    if access_token is not None and access_token.strip():
        conn.access_token_encrypted = access_token.strip()
        conn.is_mock_mode = False
        conn.status = "connected"

    # Verify connection with client
    verify_facebook_connection(db, actor=actor)
    db.commit()
    db.refresh(conn)

    log_audit(
        db,
        action="UPDATE_FACEBOOK_CONFIG",
        entity="page_connection",
        entity_id=conn.page_id or "unknown",
        actor=actor,
        details=f"Updated Facebook settings. Mock mode: {conn.is_mock_mode}, Status: {conn.status}"
    )

    return get_facebook_status(db)

def verify_facebook_connection(db: Session, actor: str = "system") -> Dict[str, Any]:
    conn = get_or_create_connection(db)
    
    if conn.is_mock_mode:
        client = MockMetaClient(
            page_id=conn.page_id or "mock_page_1020304050",
            page_name=conn.page_name or "Local AI Brand Sandbox"
        )
    else:
        if not conn.access_token_encrypted or not conn.page_id:
            conn.status = "disconnected"
            db.commit()
            return get_facebook_status(db)

        client = LiveMetaClient(
            page_id=conn.page_id,
            access_token=conn.access_token_encrypted,
            app_id=conn.app_id,
            app_secret=conn.app_secret_masked
        )

    try:
        page_info = client.get_page_info()
        token_info = client.verify_token()

        conn.page_name = page_info.get("page_name", conn.page_name)
        conn.category = page_info.get("category", conn.category)
        conn.followers_count = page_info.get("followers_count", conn.followers_count)
        conn.avatar_url = page_info.get("avatar_url", conn.avatar_url)
        conn.permissions_granted = json.dumps(token_info.get("permissions_granted", []))
        conn.missing_permissions = json.dumps(token_info.get("missing_permissions", []))
        conn.status = "connected"
        conn.last_error = None
        conn.last_verified_at = datetime.now(timezone.utc)
        
        if conn.is_mock_mode:
            conn.token_expires_at = datetime.now(timezone.utc) + timedelta(days=58)

        db.commit()
        db.refresh(conn)

    except Exception as e:
        err_msg = str(e)
        logger.error(f"Facebook verification failed: {err_msg}")
        conn.status = "error"
        if "expired" in err_msg.lower() or "session has expired" in err_msg.lower():
            conn.status = "expired"
            conn.token_expires_at = datetime.now(timezone.utc)
        conn.last_error = err_msg
        db.commit()

    return get_facebook_status(db)

def disconnect_facebook_page(db: Session, actor: str = "admin") -> Dict[str, Any]:
    conn = get_or_create_connection(db)
    page_id = conn.page_id or "unknown"
    
    conn.access_token_encrypted = None
    conn.status = "disconnected"
    conn.permissions_granted = json.dumps([])
    conn.missing_permissions = json.dumps(list(REQUIRED_PERMISSIONS.keys()))
    conn.is_mock_mode = False
    
    db.commit()
    db.refresh(conn)

    log_audit(
        db,
        action="DISCONNECT_FACEBOOK_PAGE",
        entity="page_connection",
        entity_id=page_id,
        actor=actor,
        details="Disconnected Facebook Page and cleared local token references."
    )

    return get_facebook_status(db)

def trigger_manual_publishing(db: Session, content_id: int, user_id: int) -> Dict[str, Any]:
    """Manually publishes an approved content item via the PublisherGatekeeper."""
    gatekeeper = PublisherGatekeeper(db=db)
    return gatekeeper.publish_approved_content(
        content_id=content_id,
        triggered_by=f"admin_user_{user_id}"
    )
