import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import Base, engine, SessionLocal
from app.services.auth_service import init_admin_user
from app.services.brand_service import init_brand_profile
from app.services.niche_service import init_sample_niches, get_all_niches
from app.agents.provider import OllamaProvider
from app.agents.orchestrator import QualityControlAgent, MasterOrchestrator
from app.models.models import BrandProfile, Content, ContentVersion

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

def test_llm_provider_offline_handling():
    # Configure provider to a closed port
    provider = OllamaProvider(base_url="http://127.0.0.1:9999", timeout=1)
    health = provider.health_check()
    assert health["status"] == "offline"
    assert "error" in health

    gen = provider.generate("Test prompt")
    assert gen["success"] is False
    assert "error" in gen

def test_quality_control_agent():
    qc = QualityControlAgent()
    profile = BrandProfile(
        page_name="TechMart",
        verified_prices="Standard: 500 BDT, Pro: 1500 BDT",
        prohibited_claims="100% guarantee, instant wealth",
        prohibited_topics="politics"
    )

    # 1. Clean post should pass
    clean_post = "Get our official standard service today for only 500 BDT! Message us for details."
    result = qc.evaluate(clean_post, profile)
    assert result["passed"] is True
    assert result["score"] >= 0.7
    assert len(result["flags"]) == 0

    # 2. Hallucinated price should be flagged
    fake_price_post = "Huge sale! Only 8888 BDT for today only!"
    result = qc.evaluate(fake_price_post, profile)
    assert result["passed"] is False
    assert any("Unverified price" in f for f in result["flags"])

    # 3. Prohibited claim should be flagged
    prohibited_post = "Join our course for instant wealth and standard package!"
    result = qc.evaluate(prohibited_post, profile)
    assert result["passed"] is False
    assert any("Prohibited claim" in f for f in result["flags"])

def test_writing_agent_offline_fallback():
    orchestrator = MasterOrchestrator()
    db = SessionLocal()
    brand = db.query(BrandProfile).first()
    niches = get_all_niches(db)
    niche = niches[0] if niches else None

    result = orchestrator.writer.generate_post(
        topic="Smartphone Battery Health Tips",
        brand_profile=brand,
        niche=niche,
        language="both"
    )
    db.close()

    assert "caption_bn" in result
    assert "caption_en" in result
    assert "hashtags" in result
    assert "call_to_action" in result
    assert "quality_check" in result
    assert result["quality_check"]["passed"] is True

def test_strategy_agent_planning():
    orchestrator = MasterOrchestrator()
    db = SessionLocal()
    brand = db.query(BrandProfile).first()
    niches = get_all_niches(db)
    niche = niches[0]

    plan = orchestrator.strategist.generate_plan(niche, brand, timeframe="weekly")
    db.close()

    assert "strategy_title" in plan
    assert "items" in plan
    assert len(plan["items"]) > 0

def test_research_agent_topics():
    orchestrator = MasterOrchestrator()
    db = SessionLocal()
    brand = db.query(BrandProfile).first()
    niches = get_all_niches(db)
    niche = niches[0]

    ideas = orchestrator.researcher.research_topics(niche, brand, category="all")
    db.close()

    assert isinstance(ideas, list)
    assert len(ideas) >= 3
    assert "title" in ideas[0]
    assert "concept" in ideas[0]

def test_api_agents_endpoints():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Status
    status_resp = client.get("/api/v1/agents/status")
    assert status_resp.status_code == 200
    assert status_resp.json()["engine"] == "Ollama (Local Only)"

    # 2. Switch Model
    switch_resp = client.post("/api/v1/agents/switch-model", json={
        "model_name": "qwen2.5:0.5b"
    }, headers=headers)
    assert switch_resp.status_code == 200
    assert switch_resp.json()["active_model"] == "qwen2.5:0.5b"

    # Switch back to 1.5b default
    client.post("/api/v1/agents/switch-model", json={
        "model_name": "qwen2.5:1.5b"
    }, headers=headers)

    # 3. Generate Post & save as draft
    gen_resp = client.post("/api/v1/agents/generate-post", json={
        "topic": "AI Productivity Tools",
        "post_type": "educational",
        "language": "both",
        "save_as_draft": True
    }, headers=headers)
    assert gen_resp.status_code == 200
    data = gen_resp.json()
    assert "caption_bn" in data
    assert "caption_en" in data
    assert data["saved_content_id"] is not None

    # Verify saved content in DB
    db = SessionLocal()
    saved = db.query(Content).filter(Content.id == data["saved_content_id"]).first()
    assert saved is not None
    assert saved.status == "Draft"
    db.close()

    # 4. Generate Strategy
    strat_resp = client.post("/api/v1/agents/generate-strategy", json={
        "niche_id": 1,
        "timeframe": "weekly"
    }, headers=headers)
    assert strat_resp.status_code == 200
    assert "strategy_title" in strat_resp.json()

    # 5. Research Topics
    res_resp = client.post("/api/v1/agents/research-topics", json={
        "niche_id": 1,
        "category": "all"
    }, headers=headers)
    assert res_resp.status_code == 200
    assert len(res_resp.json()["ideas"]) > 0

    # 6. Save Idea
    idea_resp = client.post("/api/v1/agents/save-idea", json={
        "niche_id": 1,
        "title": "5 Morning Tech Rituals",
        "concept": "Daily micro-habits to boost productivity",
        "category": "educational"
    }, headers=headers)
    assert idea_resp.status_code == 200
    assert idea_resp.json()["success"] is True

    # 7. Agent Runs Log
    runs_resp = client.get("/api/v1/agents/runs", headers=headers)
    assert runs_resp.status_code == 200
    assert len(runs_resp.json()) > 0
