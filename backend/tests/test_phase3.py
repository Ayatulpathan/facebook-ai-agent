import pytest
import io
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import Base, engine, SessionLocal
from app.services.auth_service import init_admin_user
from app.services.brand_service import init_brand_profile
from app.services.niche_service import init_sample_niches
from app.models.models import Content, ContentVersion, Approval, MediaAsset

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

def test_media_upload_and_delete():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Create dummy PNG image bytes
    img = Image.new("RGB", (200, 200), color=(73, 109, 137))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    # Upload
    upload_resp = client.post(
        "/api/v1/media/upload",
        files={"file": ("test_upload.png", buf, "image/png")},
        headers=headers
    )
    assert upload_resp.status_code == 200
    asset_data = upload_resp.json()
    assert asset_data["dimensions"] == "200x200"
    asset_id = asset_data["id"]

    # List
    list_resp = client.get("/api/v1/media/?media_type=image")
    assert list_resp.status_code == 200
    ids = [a["id"] for a in list_resp.json()]
    assert asset_id in ids

    # Delete
    del_resp = client.delete(f"/api/v1/media/{asset_id}", headers=headers)
    assert del_resp.status_code == 200
    assert del_resp.json()["success"] is True

def test_graphic_studio_render():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Get templates
    templates_resp = client.get("/api/v1/graphics/templates")
    assert templates_resp.status_code == 200
    assert "promotional" in templates_resp.json()["templates"]

    # 2. Render graphic
    render_resp = client.post(
        "/api/v1/graphics/render",
        json={
            "template": "promotional",
            "data": {
                "title": "Exclusive Festive Offer",
                "subtitle": "Discover verified premium solutions today",
                "badge_text": "Limited Discount",
                "cta_text": "Order via Messenger"
            },
            "primary_color": "#1877F2",
            "secondary_color": "#42B72A",
            "format": "PNG"
        },
        headers=headers
    )
    assert render_resp.status_code == 200
    result = render_resp.json()
    assert result["success"] is True
    assert result["dimensions"] == "1080x1080"
    assert result["file_size_bytes"] > 0

def test_reels_studio_script_and_render():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Generate Script
    script_resp = client.post("/api/v1/reels/script", json={
        "topic": "3 Smartphone Hacks",
        "niche_id": 1,
        "duration_seconds": 15
    })
    assert script_resp.status_code == 200
    script = script_resp.json()
    assert len(script["scenes"]) == 3

    # 2. Render vertical video Reel via FFmpeg (preview mode, 4s)
    render_resp = client.post("/api/v1/reels/render", json={
        "title": "3 Smartphone Hacks",
        "subtitle": "Boost your battery life today",
        "duration_seconds": 3,
        "preview_mode": True
    }, headers=headers)
    assert render_resp.status_code == 200
    res = render_resp.json()
    assert res["success"] is True
    assert res["dimensions"] == "540x960"
    assert res["validated"] is True
    assert res["file_size_bytes"] > 0

def test_content_crud_and_version_invalidation():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Post
    create_resp = client.post("/api/v1/content/", json={
        "niche_id": 1,
        "title": "Smart Productivity Post",
        "caption_bn": "আপনার সময় বাঁচানোর সহজ উপায়!",
        "caption_en": "Easy ways to boost daily productivity!",
        "hashtags": "#Tips #Productivity",
        "call_to_action": "Save Post",
        "status": "Pending Approval"
    }, headers=headers)
    assert create_resp.status_code == 201
    post_id = create_resp.json()["content_id"]

    # 2. Detail check
    detail_resp = client.get(f"/api/v1/content/{post_id}")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert len(detail["versions"]) == 1
    assert detail["status"] == "Pending Approval"

    # 3. Update post (Mandatory rule: creates v2 and invalidates prior approvals!)
    update_resp = client.put(f"/api/v1/content/{post_id}", json={
        "title": "Smart Productivity Post (Updated)",
        "caption_en": "Updated English caption with new tips!",
        "resubmit_for_approval": False
    }, headers=headers)
    assert update_resp.status_code == 200
    assert update_resp.json()["version_num"] == 2
    assert update_resp.json()["status"] == "Draft"

    # Verify that prior approval is INVALIDATED
    db = SessionLocal()
    invalidated_appr = db.query(Approval).filter(
        Approval.content_id == post_id,
        Approval.status == "INVALIDATED"
    ).first()
    assert invalidated_appr is not None
    db.close()

    # 4. Resubmit for approval
    submit_resp = client.post(f"/api/v1/content/{post_id}/submit-approval", headers=headers)
    assert submit_resp.status_code == 200
    assert submit_resp.json()["status"] == "Pending Approval"

def test_calendar_and_reschedule():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Create post with scheduled_for
    create_resp = client.post("/api/v1/content/", json={
        "niche_id": 1,
        "title": "Calendar Scheduled Post",
        "caption_en": "Test scheduled caption",
        "scheduled_for": "2026-11-15T10:00:00Z"
    }, headers=headers)
    assert create_resp.status_code == 201
    post_id = create_resp.json()["content_id"]

    # Check calendar
    cal_resp = client.get("/api/v1/calendar/")
    assert cal_resp.status_code == 200
    events = cal_resp.json()
    assert any(e["id"] == post_id for e in events)

    # Reschedule
    resched_resp = client.post("/api/v1/calendar/reschedule", json={
        "content_id": post_id,
        "scheduled_for": "2026-11-20T14:30:00Z"
    }, headers=headers)
    assert resched_resp.status_code == 200
    assert "2026-11-20" in resched_resp.json()["scheduled_for"]
