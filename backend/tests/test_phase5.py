import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.database.session import get_db, SessionLocal
from app.models.models import Content, ContentVersion, Approval, PublishingQueue, PublishedPost, PageConnection

client = TestClient(app)

def get_auth_token():
    res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "adminpassword123"})
    assert res.status_code == 200
    return res.json()["access_token"]

def test_facebook_status_and_defaults():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/facebook/status", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "is_connected" in data
    assert "permissions" in data
    assert len(data["permissions"]) == 5
    assert "token_status" in data
    assert data["token_status"] in ("VALID", "DEGRADED", "EXPIRED", "EXPIRING_SOON")
    assert "legal_disclaimer" in data
    assert "Meta" in data["legal_disclaimer"]

def test_oauth_url_and_config():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Without App ID, OAuth URL generation returns 400
    res_oauth_fail = client.get("/api/v1/facebook/oauth-url", headers=headers)
    # If app_id is None, it should fail with 400
    # Let's configure app_id first
    res_cfg = client.post(
        "/api/v1/facebook/config",
        headers=headers,
        json={"app_id": "meta_app_998877", "app_secret": "my_super_secret_meta_key", "is_mock_mode": True}
    )
    assert res_cfg.status_code == 200
    cfg_data = res_cfg.json()
    assert cfg_data["app_id"] == "meta_app_998877"
    assert cfg_data["app_secret_configured"] is True

    # 2. Now OAuth URL generation succeeds
    res_oauth = client.get("/api/v1/facebook/oauth-url", headers=headers)
    assert res_oauth.status_code == 200
    oauth_url = res_oauth.json()["oauth_url"]
    assert "meta_app_998877" in oauth_url
    assert "pages_manage_posts" in oauth_url
    assert "response_type=code" in oauth_url

def test_facebook_disconnect_and_reconnect():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Disconnect
    res_disc = client.post("/api/v1/facebook/disconnect", headers=headers)
    assert res_disc.status_code == 200
    assert res_disc.json()["is_connected"] is False
    assert res_disc.json()["status"] == "disconnected"

    # Reconnect in Mock mode
    res_recon = client.post(
        "/api/v1/facebook/config",
        headers=headers,
        json={"is_mock_mode": True}
    )
    assert res_recon.status_code == 200
    assert res_recon.json()["is_connected"] is True
    assert res_recon.json()["status"] == "connected"

def test_publishing_gatekeeper_blocks_unapproved():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Create unapproved draft
    post_res = client.post(
        "/api/v1/content/",
        headers=headers,
        json={
            "title": "Unapproved Draft Post",
            "content_type": "post",
            "language": "en",
            "status": "Draft",
            "caption_en": "This post has never been approved by a human."
        }
    )
    assert post_res.status_code == 201
    content_id = post_res.json()["content_id"]

    # Attempt to publish now -> MUST fail with 400
    pub_res = client.post(f"/api/v1/facebook/publish-now/{content_id}", headers=headers)
    assert pub_res.status_code == 400
    assert "human approval" in pub_res.json()["detail"].lower()

def test_publishing_gatekeeper_blocks_global_pause():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Create and approve a post
    post_res = client.post(
        "/api/v1/content/",
        headers=headers,
        json={
            "title": "Post for Pause Test",
            "content_type": "post",
            "language": "en",
            "status": "Draft",
            "caption_en": "Post caption for pause testing."
        }
    )
    assert post_res.status_code == 201
    content_id = post_res.json()["content_id"]

    # Submit for approval
    client.post(f"/api/v1/content/{content_id}/submit-approval", headers=headers)

    # Human admin approves it
    client.post(
        f"/api/v1/approvals/{content_id}/approve",
        headers=headers,
        json={"version_num": 1, "decision_notes": "Looks great"}
    )

    # Enable Global Pause
    client.post("/api/v1/dashboard/global-pause", headers=headers, json={"paused": True})

    # Attempt to publish -> MUST fail with 403
    pub_res = client.post(f"/api/v1/facebook/publish-now/{content_id}", headers=headers)
    assert pub_res.status_code == 403
    assert "Global Pause" in pub_res.json()["detail"]

    # Disable Global Pause
    client.post("/api/v1/dashboard/global-pause", headers=headers, json={"paused": False})

def test_publishing_gatekeeper_blocks_invalidated_version():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create content and approve version 1
    post_res = client.post(
        "/api/v1/content/",
        headers=headers,
        json={
            "title": "Invalidation Publishing Test",
            "content_type": "post",
            "language": "en",
            "status": "Draft",
            "caption_en": "Original approved version text."
        }
    )
    assert post_res.status_code == 201
    content_id = post_res.json()["content_id"]

    client.post(f"/api/v1/content/{content_id}/submit-approval", headers=headers)
    client.post(
        f"/api/v1/approvals/{content_id}/approve",
        headers=headers,
        json={"version_num": 1, "decision_notes": "Approved v1"}
    )

    # 2. Modify content to create version 2 (invalidates approval)
    edit_res = client.put(
        f"/api/v1/content/{content_id}",
        headers=headers,
        json={"caption_en": "Modified version 2 text which lacks approval!"}
    )
    assert edit_res.status_code == 200

    # 3. Attempt to publish -> MUST fail with 400
    pub_res = client.post(f"/api/v1/facebook/publish-now/{content_id}", headers=headers)
    assert pub_res.status_code == 400
    assert "human approval" in pub_res.json()["detail"].lower()

def test_publishing_gatekeeper_success_flow():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create content
    post_res = client.post(
        "/api/v1/content/",
        headers=headers,
        json={
            "title": "Final Approved Facebook Post",
            "content_type": "post",
            "language": "bn",
            "status": "Draft",
            "caption_bn": "আমাদের নতুন কালেকশন এখন সব আউটলেটে পাওয়া যাচ্ছে!",
            "call_to_action": "অর্ডার করতে ইনবক্স করুন"
        }
    )
    assert post_res.status_code == 201
    content_id = post_res.json()["content_id"]

    # 2. Submit for approval
    client.post(f"/api/v1/content/{content_id}/submit-approval", headers=headers)

    # 3. Human admin approves
    appr_res = client.post(
        f"/api/v1/approvals/{content_id}/approve",
        headers=headers,
        json={"version_num": 1, "decision_notes": "Approved by human admin for Facebook dispatch"}
    )
    assert appr_res.status_code == 200

    # 4. Trigger publishing
    pub_res = client.post(f"/api/v1/facebook/publish-now/{content_id}", headers=headers)
    assert pub_res.status_code == 200
    data = pub_res.json()
    assert data["success"] is True
    assert "meta_post_id" in data
    assert "permalink_url" in data

    # 5. Verify database state
    db = SessionLocal()
    try:
        content = db.query(Content).filter(Content.id == content_id).first()
        assert content.status == "Published"

        queue_item = db.query(PublishingQueue).filter(PublishingQueue.content_id == content_id).first()
        assert queue_item.state == "PUBLISHED"

        published = db.query(PublishedPost).filter(PublishedPost.content_id == content_id).first()
        assert published is not None
        assert published.meta_post_id == data["meta_post_id"]
    finally:
        db.close()
