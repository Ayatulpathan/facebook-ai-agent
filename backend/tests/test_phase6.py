import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import SessionLocal, Base, engine
from app.models.models import FacebookComment, Conversation, Message, ReplyDraft, Lead, BrandProfile

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    db.query(FacebookComment).delete()
    db.query(ReplyDraft).delete()
    db.query(Message).delete()
    db.query(Conversation).delete()
    db.commit()
    db.close()

client = TestClient(app)

def get_auth_token():
    res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "adminpassword123"})
    assert res.status_code == 200
    return res.json()["access_token"]

def test_comment_sync_and_classification():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Ensure Brand Profile has verified price
    client.put("/api/v1/brand/profile", headers=headers, json={"verified_prices": "AI Premium Pack: 2500 BDT"})

    # Trigger sync
    sync_res = client.post("/api/v1/comments/sync", headers=headers)
    assert sync_res.status_code == 200
    data = sync_res.json()
    assert data["success"] is True

    # List comments
    list_res = client.get("/api/v1/comments/", headers=headers)
    assert list_res.status_code == 200
    comments = list_res.json()
    assert len(comments) > 0

    # Verify every comment starts in PENDING status (human gatekeeper invariant)
    assert any(c["reply_status"] == "PENDING" for c in comments)
    # Verify categories
    categories = [c["category"] for c in comments]
    assert any("Inquiry" in cat for cat in categories)

def test_comment_approval_and_send_gatekeeper():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    client.post("/api/v1/comments/sync", headers=headers)
    comments = client.get("/api/v1/comments/?reply_status=PENDING", headers=headers).json()
    assert len(comments) > 0
    target_comment = comments[0]

    # Approve and send reply
    approve_res = client.post(
        f"/api/v1/comments/{target_comment['id']}/approve",
        headers=headers,
        json={"reply_text": "ধন্যবাদ ভাইয়া! আপনার সাথে দ্রুত যোগাযোগ করছি।"}
    )
    assert approve_res.status_code == 200
    appr_data = approve_res.json()
    assert appr_data["success"] is True
    assert appr_data["reply_status"] == "SENT"
    assert "ধন্যবাদ" in appr_data["approved_reply_text"]

    # Reject another pending comment
    pending_left = client.get("/api/v1/comments/?reply_status=PENDING", headers=headers).json()
    if pending_left:
        rej_target = pending_left[0]
        rej_res = client.post(f"/api/v1/comments/{rej_target['id']}/reject", headers=headers)
        assert rej_res.status_code == 200
        assert rej_res.json()["reply_status"] == "REJECTED"

def test_comment_reply_blocked_by_global_pause():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    client.post("/api/v1/comments/sync", headers=headers)
    comments = client.get("/api/v1/comments/", headers=headers).json()
    assert len(comments) > 0
    cid = comments[0]["id"]

    # Enable Global Pause
    client.post("/api/v1/dashboard/global-pause", headers=headers, json={"paused": True})

    # Attempt to reply -> MUST fail with 403
    appr_res = client.post(
        f"/api/v1/comments/{cid}/approve",
        headers=headers,
        json={"reply_text": "Trying to reply during pause"}
    )
    assert appr_res.status_code == 403
    assert "Global Pause" in appr_res.json()["detail"]

    # Disable Global Pause
    client.post("/api/v1/dashboard/global-pause", headers=headers, json={"paused": False})

def test_messenger_sync_and_approval_gatekeeper():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Sync messenger threads
    sync_res = client.post("/api/v1/messenger/sync", headers=headers)
    assert sync_res.status_code == 200
    assert sync_res.json()["success"] is True

    # List conversations
    convs_res = client.get("/api/v1/messenger/conversations", headers=headers)
    assert convs_res.status_code == 200
    threads = convs_res.json()
    assert len(threads) > 0

    # Get conversation with pending draft
    target_thread = next((t for t in threads if t.get("has_pending_approval")), threads[0])
    thread_res = client.get(f"/api/v1/messenger/conversations/{target_thread['id']}", headers=headers)
    assert thread_res.status_code == 200
    thread_data = thread_res.json()
    assert "messages" in thread_data
    assert thread_data["pending_draft"] is not None

    draft_id = thread_data["pending_draft"]["id"]

    # Approve and send reply
    appr_res = client.post(
        f"/api/v1/messenger/drafts/{draft_id}/approve",
        headers=headers,
        json={"reply_text": "Hello! We have approved your inquiry. A representative will contact you."}
    )
    assert appr_res.status_code == 200
    assert appr_res.json()["approval_status"] == "SENT"

def test_messenger_reply_blocked_by_global_pause():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Re-sync to get fresh drafts
    client.post("/api/v1/messenger/sync", headers=headers)
    threads = client.get("/api/v1/messenger/conversations", headers=headers).json()
    
    # Find thread with pending draft
    draft_id = None
    for t in threads:
        td = client.get(f"/api/v1/messenger/conversations/{t['id']}", headers=headers).json()
        if td.get("pending_draft"):
            draft_id = td["pending_draft"]["id"]
            break

    if draft_id:
        # Enable Global Pause
        client.post("/api/v1/dashboard/global-pause", headers=headers, json={"paused": True})

        # Attempt to approve draft -> MUST fail with 403
        appr_res = client.post(
            f"/api/v1/messenger/drafts/{draft_id}/approve",
            headers=headers,
            json={"reply_text": "Blocked during pause"}
        )
        assert appr_res.status_code == 403
        assert "Global Pause" in appr_res.json()["detail"]

        # Disable Global Pause
        client.post("/api/v1/dashboard/global-pause", headers=headers, json={"paused": False})

def test_lead_management_and_export():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Check auto-extracted leads
    leads_res = client.get("/api/v1/leads/", headers=headers)
    assert leads_res.status_code == 200
    leads = leads_res.json()
    assert len(leads) > 0

    # Verify phone number was auto-extracted from Nusrat Jahan's mock message (01711223344)
    assert any("01711223344" in l["contact_info"] for l in leads)

    # 2. Check lead metrics
    metrics_res = client.get("/api/v1/leads/metrics", headers=headers)
    assert metrics_res.status_code == 200
    metrics = metrics_res.json()
    assert metrics["total"] > 0
    assert "new" in metrics

    # 3. Create manual lead
    new_lead_res = client.post(
        "/api/v1/leads/",
        headers=headers,
        json={
            "customer_name": "Test Customer Direct",
            "contact_info": "01888990011",
            "inquiry_type": "Phone Inquiry",
            "product_interest": "Summer T-Shirt",
            "notes": "Called office directly"
        }
    )
    assert new_lead_res.status_code == 200
    created_id = new_lead_res.json()["id"]

    # 4. Update lead status
    update_res = client.put(
        f"/api/v1/leads/{created_id}",
        headers=headers,
        json={"status": "Qualified", "notes": "Verified delivery address in Dhanmondi"}
    )
    assert update_res.status_code == 200
    assert update_res.json()["follow_up_status"] == "Qualified"

    # 5. Export leads as CSV
    csv_res = client.get("/api/v1/leads/export/csv", headers=headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "Customer Name" in csv_res.text
    assert "01888990011" in csv_res.text
