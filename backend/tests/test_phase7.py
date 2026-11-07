import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import SessionLocal, Base, engine
from app.models.models import PublishingQueue, Content, Notification, Approval, User

client = TestClient(app)

def get_auth_token():
    res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "adminpassword123"})
    assert res.status_code == 200
    return res.json()["access_token"]

def test_analytics_overview_and_csv_export():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Fetch overview
    res = client.get("/api/v1/analytics/overview?days=14", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "metrics" in data
    assert "total_impressions" in data["metrics"]
    assert "post_engagements" in data["metrics"]
    assert "daily_trends" in data
    assert len(data["daily_trends"]) == 14
    assert "data_source" in data

    # 2. Export CSV
    csv_res = client.get("/api/v1/analytics/export/csv?days=14", headers=headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "Total Impressions" in csv_res.text
    assert "Daily Breakdown" in csv_res.text

def test_notifications_lifecycle():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Check unread count
    cnt_res = client.get("/api/v1/notifications/unread-count", headers=headers)
    assert cnt_res.status_code == 200
    assert "unread_count" in cnt_res.json()

    # 2. List notifications
    list_res = client.get("/api/v1/notifications/", headers=headers)
    assert list_res.status_code == 200
    notifs = list_res.json()

    if notifs:
        nid = notifs[0]["id"]
        # Mark single as read
        read_res = client.post(f"/api/v1/notifications/{nid}/read", headers=headers)
        assert read_res.status_code == 200
        assert read_res.json()["is_read"] is True

    # Mark all as read
    all_res = client.post("/api/v1/notifications/read-all", headers=headers)
    assert all_res.status_code == 200
    assert all_res.json()["success"] is True

    # Check unread count is now 0
    cnt_after = client.get("/api/v1/notifications/unread-count", headers=headers).json()
    assert cnt_after["unread_count"] == 0

def test_database_backup_and_restore():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create hot online SQLite backup
    create_res = client.post("/api/v1/settings/backups/create", headers=headers)
    assert create_res.status_code == 200
    b_data = create_res.json()
    assert "filename" in b_data
    filename = b_data["filename"]
    assert filename.startswith("facebook_agent_backup_")

    # 2. List backups
    list_res = client.get("/api/v1/settings/backups", headers=headers)
    assert list_res.status_code == 200
    backups = list_res.json()
    assert any(b["filename"] == filename for b in backups)

    # 3. Restore from backup
    restore_res = client.post(f"/api/v1/settings/backups/{filename}/restore", headers=headers)
    assert restore_res.status_code == 200
    assert restore_res.json()["success"] is True

    # 4. Check system settings & Task Scheduler info
    settings_res = client.get("/api/v1/settings/", headers=headers)
    assert settings_res.status_code == 200
    s_data = settings_res.json()
    assert "scheduler_instructions" in s_data
    assert "Register-ScheduledTask" in s_data["scheduler_instructions"]["powershell_command"]

def test_background_scheduler_delay_detection():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    try:
        # Create an approved post scheduled 30 minutes in the past
        content = Content(
            title="Missed Scheduled Slot Post",
            content_type="post",
            language="en",
            status="Scheduled",
            scheduled_for=datetime.now(timezone.utc) - timedelta(minutes=30)
        )
        db.add(content)
        db.commit()
        db.refresh(content)

        # Enqueue with scheduled_time in the past
        queue_item = PublishingQueue(
            content_id=content.id,
            approved_version_id=1,
            scheduled_time=datetime.now(timezone.utc) - timedelta(minutes=30),
            state="QUEUED",
            idempotency_key=f"delay_test_{content.id}"
        )
        db.add(queue_item)
        db.commit()
        db.refresh(queue_item)
        job_id = queue_item.id
        cid = content.id
    finally:
        db.close()

    # Trigger scheduler tick
    tick_res = client.post("/api/v1/settings/scheduler-tick", headers=headers)
    assert tick_res.status_code == 200
    tick_data = tick_res.json()
    assert tick_data["success"] is True
    assert tick_data["delayed"] >= 1

    # Verify that the post was marked as DELAYED and NOT published silently!
    db = SessionLocal()
    try:
        job = db.query(PublishingQueue).filter(PublishingQueue.id == job_id).first()
        assert job.state == "DELAYED"

        cont = db.query(Content).filter(Content.id == cid).first()
        assert cont.status == "Delayed"

        # Check warning notification created
        notif = (
            db.query(Notification)
            .filter(Notification.title.like("%Delayed%"))
            .order_by(Notification.created_at.desc())
            .first()
        )
        assert notif is not None
        assert notif.severity == "warning"
        assert "Approval Center" in notif.message
    finally:
        db.close()
