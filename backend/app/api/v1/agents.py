import time
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database.session import get_db
from app.services.auth_service import get_current_user
from app.services.brand_service import get_brand_profile
from app.services.niche_service import get_niche_by_id
from app.services.audit_service import log_audit
from app.models.models import User, Niche, Content, ContentVersion, ContentIdea, AgentRun
from app.agents.provider import default_provider
from app.agents.orchestrator import master_orchestrator
from app.core.config import settings

router = APIRouter(prefix="/agents", tags=["AI Agents & Generation"])

# Schemas
class SwitchModelRequest(BaseModel):
    model_name: str

class GeneratePostRequest(BaseModel):
    niche_id: Optional[int] = None
    topic: str
    post_type: str = "promotional" # promotional, educational, informational, engagement, festival
    language: str = "both" # bn, en, both
    tone: Optional[str] = None
    custom_cta: Optional[str] = None
    include_emojis: bool = True
    save_as_draft: bool = False

class GenerateStrategyRequest(BaseModel):
    niche_id: int
    timeframe: str = "weekly" # daily, weekly, monthly
    goals: str = "organic engagement and brand awareness"

class ResearchTopicsRequest(BaseModel):
    niche_id: int
    category: str = "all" # seasonal, faq, trending_concepts, educational

class SaveIdeaRequest(BaseModel):
    niche_id: Optional[int] = None
    title: str
    concept: str
    category: str = "educational"

@router.get("/status")
def get_agents_status():
    """Retrieve local Ollama connection health and active model metadata."""
    health = default_provider.health_check()
    return {
        "engine": "Ollama (Local Only)",
        "connection": health,
        "active_model": default_provider.model,
        "default_model": settings.OLLAMA_DEFAULT_MODEL,
        "fallback_model": settings.OLLAMA_FALLBACK_MODEL,
        "zero_cost_verified": True,
        "hardware_recommendation": {
            "ram_target": "8 GB",
            "vram_target": "4 GB NVIDIA",
            "recommended_models": ["qwen2.5:1.5b", "qwen2.5:0.5b", "gemma3:1b"]
        }
    }

@router.post("/switch-model")
def switch_model(
    req: SwitchModelRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Switch the active local LLM model."""
    allowed_models = ["qwen2.5:1.5b", "qwen2.5:0.5b", "gemma3:1b", "qwen2.5:latest"]
    if not any(req.model_name.startswith(m.split(':')[0]) for m in allowed_models):
        raise HTTPException(
            status_code=400,
            detail=f"Model '{req.model_name}' exceeds 4GB VRAM budget or is unsupported. Recommended: qwen2.5:1.5b or qwen2.5:0.5b"
        )
    
    old_model = default_provider.model
    default_provider.model = req.model_name
    
    log_audit(
        db,
        action="SWITCH_AI_MODEL",
        entity="ai_engine",
        actor=current_user.username,
        details=f"Switched model from '{old_model}' to '{req.model_name}'",
        ip_address=request.client.host if request.client else "127.0.0.1"
    )
    
    return {
        "success": True,
        "active_model": default_provider.model,
        "message": f"Active AI model changed to {req.model_name}"
    }

@router.post("/generate-post")
def generate_post(
    req: GeneratePostRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Writing Agent: Generate social media caption and apply Quality Control checks."""
    brand = get_brand_profile(db)
    niche = get_niche_by_id(db, req.niche_id) if req.niche_id else None

    start_time = time.time()
    result = master_orchestrator.writer.generate_post(
        topic=req.topic,
        brand_profile=brand,
        niche=niche,
        post_type=req.post_type,
        tone=req.tone,
        language=req.language,
        custom_cta=req.custom_cta,
        include_emojis=req.include_emojis
    )
    duration_ms = int((time.time() - start_time) * 1000)

    # Log telemetry
    master_orchestrator.log_run(
        db=db,
        agent_name="Writing Agent",
        duration_ms=duration_ms,
        prompt_tokens=result.get("tokens", {}).get("prompt", 0),
        output_tokens=result.get("tokens", {}).get("output", 0),
        status="success" if not result.get("is_offline_fallback") else "fallback"
    )

    # Optionally persist as Draft in Content table
    content_id = None
    if req.save_as_draft:
        new_content = Content(
            niche_id=niche.id if niche else None,
            title=result.get("title", req.topic),
            content_type="post",
            language=req.language,
            status="Draft"
        )
        db.add(new_content)
        db.commit()
        db.refresh(new_content)

        new_version = ContentVersion(
            content_id=new_content.id,
            version_num=1,
            caption_bn=result.get("caption_bn", ""),
            caption_en=result.get("caption_en", ""),
            hashtags=result.get("hashtags", ""),
            call_to_action=result.get("call_to_action", ""),
            quality_score=result.get("quality_check", {}).get("score", 1.0),
            quality_notes=result.get("quality_check", {}).get("notes", ""),
            created_by=current_user.username
        )
        db.add(new_version)
        db.commit()
        db.refresh(new_version)
        
        new_content.current_version_id = new_version.id
        db.commit()
        content_id = new_content.id

    result["saved_content_id"] = content_id
    return result

@router.post("/generate-strategy")
def generate_strategy(
    req: GenerateStrategyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Strategy Agent: Generate weekly or monthly editorial calendars."""
    niche = get_niche_by_id(db, req.niche_id)
    if not niche:
        raise HTTPException(status_code=404, detail="Niche not found")
    brand = get_brand_profile(db)

    start_time = time.time()
    plan = master_orchestrator.strategist.generate_plan(
        niche=niche,
        brand_profile=brand,
        timeframe=req.timeframe,
        goals=req.goals
    )
    duration_ms = int((time.time() - start_time) * 1000)

    master_orchestrator.log_run(
        db=db,
        agent_name="Content Strategy Agent",
        duration_ms=duration_ms,
        status="success"
    )

    return plan

@router.post("/research-topics")
def research_topics(
    req: ResearchTopicsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Research Agent: Discover niche-specific content ideas, seasonal occasions, and FAQs."""
    niche = get_niche_by_id(db, req.niche_id)
    if not niche:
        raise HTTPException(status_code=404, detail="Niche not found")
    brand = get_brand_profile(db)

    start_time = time.time()
    ideas = master_orchestrator.researcher.research_topics(
        niche=niche,
        brand_profile=brand,
        category=req.category
    )
    duration_ms = int((time.time() - start_time) * 1000)

    master_orchestrator.log_run(
        db=db,
        agent_name="Research Agent",
        duration_ms=duration_ms,
        status="success"
    )

    return {"niche": niche.name, "ideas": ideas}

@router.post("/save-idea")
def save_idea(
    req: SaveIdeaRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Save an AI-researched topic into content_ideas table for future editorial planning."""
    idea = ContentIdea(
        niche_id=req.niche_id,
        title=req.title,
        concept=req.concept,
        category=req.category,
        is_ai_generated=True,
        source="Research Agent"
    )
    db.add(idea)
    db.commit()
    db.refresh(idea)
    return {"success": True, "id": idea.id, "title": idea.title}

@router.get("/runs")
def list_agent_runs(
    limit: int = Query(default=20, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve telemetry history for all local agent runs."""
    runs = db.query(AgentRun).order_by(AgentRun.created_at.desc()).limit(limit).all()
    return runs
