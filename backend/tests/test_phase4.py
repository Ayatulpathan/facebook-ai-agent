import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import Base, engine, SessionLocal
from app.services.auth_service import init_admin_user
from app.services.brand_service import init_brand_profile
from app.services.niche_service import init_sample_niches
from app.models.models import Content, ContentVersion, Approval, PublishingQueue

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    init_admin_user(db)
    init_brand_profile(db)
    init_sample_niches(db)
    db.close()
    yield

client = TestClient(app)

def get_auth_token():
    resp = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "adminpassword123"
    })
    return resp.json()["access_token"]

def test_pending_approvals_and_approval_flow():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Post as Pending Approval
    create_resp = client.post("/api/v1/content/", json={
        "niche_id": 1,
        "title": "High Impact AI Campaign",
        "caption_bn": "সেরা প্রযুক্তির সঠিক সমাধান!",
        "caption_en": "The right technological solutions for your business!",
        "hashtags": "#Tech #Innovation",
        "call_to_action": "Message Us",
        "status": "Pending Approval"
    }, headers=headers)
    assert create_resp.status_code == 201
    post_id = create_resp.json()["content_id"]

    # 2. Check pending list
    pending_resp = client.get("/api/v1/approvals/pending")
    assert pending_resp.status_code == 200
    pending_items = pending_resp.json()
    assert any(item["content_id"] == post_id for item in pending_items)

    # 3. Approve post (Admin explicit approval)
    approve_resp = client.post(
        f"/api/v1/approvals/{post_id}/approve",
        json={"version_num": 1, "decision_notes": "All anti-hallucination checks passed."},
        headers=headers
    )
    assert approve_resp.status_code == 200
    assert approve_resp.json()["success"] is True
    assert "idempotency_key" in approve_resp.json()

    # 4. Verify post status and queue entry
    detail_resp = client.get(f"/api/v1/content/{post_id}")
    assert detail_resp.status_code == 200
    assert detail_resp.json()["status"] in ["Approved", "Scheduled"]

    queue_resp = client.get("/api/v1/queue/?state=QUEUED")
    assert queue_resp.status_code == 200
    assert any(q["content_id"] == post_id for q in queue_resp.json())

def test_approval_invalidation_on_content_edit():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create and approve post
    create_resp = client.post("/api/v1/content/", json={
        "niche_id": 1,
        "title": "Post To Invalidate",
        "caption_en": "Original approved caption",
        "status": "Pending Approval"
    }, headers=headers)
    post_id = create_resp.json()["content_id"]

    client.post(
        f"/api/v1/approvals/{post_id}/approve",
        json={"version_num": 1, "decision_notes": "Initial approval"},
        headers=headers
    )

    # 2. Edit post text (Modifying post after approval)
    update_resp = client.put(f"/api/v1/content/{post_id}", json={
        "caption_en": "Modified caption after initial approval!"
    }, headers=headers)
    assert update_resp.status_code == 200
    assert update_resp.json()["version_num"] == 2
    assert update_resp.json()["status"] == "Draft"

    # 3. Verify prior approval record is INVALIDATED
    history_resp = client.get("/api/v1/approvals/history")
    assert history_resp.status_code == 200
    history = history_resp.json()
    post_records = [h for h in history if h["content_id"] == post_id]
    assert any(h["status"] == "INVALIDATED" for h in post_records)

def test_admin_rejection_flow():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create post
    create_resp = client.post("/api/v1/content/", json={
        "niche_id": 1,
        "title": "Post To Reject",
        "caption_en": "Uncertain claims without verified pricing",
        "status": "Pending Approval"
    }, headers=headers)
    post_id = create_resp.json()["content_id"]

    # 2. Reject post with reason
    reject_resp = client.post(
        f"/api/v1/approvals/{post_id}/reject",
        json={"version_num": 1, "rejection_reason": "Tone is too aggressive and claims lack verification."},
        headers=headers
    )
    assert reject_resp.status_code == 200
    assert reject_resp.json()["status"] == "Rejected"

    # 3. Verify post detail shows Rejected
    detail_resp = client.get(f"/api/v1/content/{post_id}")
    assert detail_resp.status_code == 200
    assert detail_resp.json()["status"] == "Rejected"

def test_queue_cancel_and_retry():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create and approve post
    create_resp = client.post("/api/v1/content/", json={
        "niche_id": 1,
        "title": "Queue Management Post",
        "caption_en": "Staged for publishing queue",
        "status": "Pending Approval"
    }, headers=headers)
    post_id = create_resp.json()["content_id"]

    client.post(
        f"/api/v1/approvals/{post_id}/approve",
        json={"version_num": 1},
        headers=headers
    )

    # 2. Find queue item
    queue_resp = client.get("/api/v1/queue/")
    assert queue_resp.status_code == 200
    queue_item = next(q for q in queue_resp.json() if q["content_id"] == post_id)
    queue_id = queue_item["id"]

    # 3. Retry job
    retry_resp = client.post(f"/api/v1/queue/{queue_id}/retry", headers=headers)
    assert retry_resp.status_code == 200
    assert retry_resp.json()["success"] is True

    # 4. Cancel job
    cancel_resp = client.post(f"/api/v1/queue/{queue_id}/cancel", headers=headers)
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["success"] is True
