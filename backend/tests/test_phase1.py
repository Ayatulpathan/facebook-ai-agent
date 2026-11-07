import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import Base, engine, SessionLocal
from app.services.auth_service import init_admin_user
from app.services.brand_service import init_brand_profile
from app.services.niche_service import init_sample_niches

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

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["mode"] == "local_zero_cost"

def test_auth_login_success():
    response = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "adminpassword123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "admin"

def test_auth_login_failure():
    response = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "wrongpassword"
    })
    assert response.status_code == 401

def test_auth_me():
    # Login first
    login_resp = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "adminpassword123"
    })
    token = login_resp.json()["access_token"]
    
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["username"] == "admin"

def test_brand_profile_read_and_update():
    # Login
    login_resp = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "adminpassword123"
    })
    token = login_resp.json()["access_token"]
    
    # Read
    get_resp = client.get("/api/v1/brand/profile")
    assert get_resp.status_code == 200
    assert "page_name" in get_resp.json()
    
    # Update
    update_data = get_resp.json()
    update_data["page_name"] = "Automated AI Page Test"
    update_data["primary_color"] = "#2563EB"
    
    put_resp = client.put(
        "/api/v1/brand/profile",
        json=update_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert put_resp.status_code == 200
    assert put_resp.json()["page_name"] == "Automated AI Page Test"
    assert put_resp.json()["primary_color"] == "#2563EB"

def test_niches_crud():
    login_resp = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "adminpassword123"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # List
    list_resp = client.get("/api/v1/niches/")
    assert list_resp.status_code == 200
    initial_count = len(list_resp.json())
    assert initial_count >= 1
    
    # Create
    create_resp = client.post("/api/v1/niches/", json={
        "name": "Eco Gardening",
        "description": "Urban gardening and green living tips.",
        "target_demographic": "Urban residents, balcony gardeners",
        "preferred_tone": "Warm and Eco-conscious",
        "preferred_cta": "Join the Green Club",
        "sample_topics": "Apartment composting, Balcony herb garden",
        "is_active": True
    }, headers=headers)
    assert create_resp.status_code == 201
    created_niche = create_resp.json()
    niche_id = created_niche["id"]
    assert created_niche["slug"] == "eco-gardening"
    
    # Update
    update_resp = client.put(f"/api/v1/niches/{niche_id}", json={
        "preferred_cta": "Get Free Seedling Guide"
    }, headers=headers)
    assert update_resp.status_code == 200
    assert update_resp.json()["preferred_cta"] == "Get Free Seedling Guide"
    
    # Delete
    del_resp = client.delete(f"/api/v1/niches/{niche_id}", headers=headers)
    assert del_resp.status_code == 200
    assert del_resp.json()["success"] is True

def test_dashboard_overview_and_global_pause():
    login_resp = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "adminpassword123"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Overview
    overview_resp = client.get("/api/v1/dashboard/overview")
    assert overview_resp.status_code == 200
    data = overview_resp.json()
    assert "post_counts" in data
    assert "global_pause_enabled" in data
    
    # System Status
    status_resp = client.get("/api/v1/dashboard/system-status")
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] == "healthy"
    
    # Toggle Pause
    pause_resp = client.post("/api/v1/dashboard/global-pause", json={"paused": True}, headers=headers)
    assert pause_resp.status_code == 200
    assert pause_resp.json()["global_pause"] is True
    
    # Toggle Resume
    resume_resp = client.post("/api/v1/dashboard/global-pause", json={"paused": False}, headers=headers)
    assert resume_resp.status_code == 200
    assert resume_resp.json()["global_pause"] is False

def test_audit_logs():
    login_resp = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "adminpassword123"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    audit_resp = client.get("/api/v1/audit/logs", headers=headers)
    assert audit_resp.status_code == 200
    logs = audit_resp.json()
    assert len(logs) > 0
    actions = [log["action"] for log in logs]
    assert "LOGIN_SUCCESS" in actions
