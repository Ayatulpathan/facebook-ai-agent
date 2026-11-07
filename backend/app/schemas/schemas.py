from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

# ----------------- Auth Schemas -----------------
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# ----------------- Brand Profile Schemas -----------------
class BrandProfileBase(BaseModel):
    page_name: str = "My Facebook Page"
    page_description: str = ""
    brand_identity: str = ""
    brand_logo_url: str = ""
    primary_color: str = "#1877F2"
    secondary_color: str = "#42B72A"
    target_audience: str = ""
    languages: str = "Bangla, English"
    writing_tone: str = "Engaging, Friendly, Professional"
    products_and_services: str = ""
    verified_prices: str = ""
    contact_details: str = ""
    preferred_cta: str = "Send Message"
    prohibited_claims: str = "Do not make medical or financial guarantees"
    prohibited_topics: str = "Politics, controversial religious debates"

class BrandProfileUpdate(BrandProfileBase):
    pass

class BrandProfileResponse(BrandProfileBase):
    id: int
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ----------------- Niche Schemas -----------------
class NicheBase(BaseModel):
    name: str
    description: str = ""
    target_demographic: str = ""
    preferred_tone: str = "Informative"
    preferred_cta: str = "Learn More"
    sample_topics: str = ""
    is_active: bool = True

class NicheCreate(NicheBase):
    pass

class NicheUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    target_demographic: Optional[str] = None
    preferred_tone: Optional[str] = None
    preferred_cta: Optional[str] = None
    sample_topics: Optional[str] = None
    is_active: Optional[bool] = None

class NicheResponse(NicheBase):
    id: int
    slug: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ----------------- Dashboard & Health Schemas -----------------
class PostStatusCounts(BaseModel):
    total_posts: int = 0
    draft: int = 0
    generating: int = 0
    quality_check: int = 0
    pending_approval: int = 0
    approved: int = 0
    scheduled: int = 0
    publishing: int = 0
    published: int = 0
    rejected: int = 0
    failed: int = 0
    delayed: int = 0

class DashboardOverview(BaseModel):
    post_counts: PostStatusCounts
    pending_approvals_count: int = 0
    pending_comments_count: int = 0
    pending_messages_count: int = 0
    new_leads_count: int = 0
    ai_status: str = "offline" # online, offline, busy, error
    facebook_status: str = "disconnected" # connected, disconnected, token_expiring
    local_ai_model: str = "qwen2.5:1.5b"
    global_pause_enabled: bool = False
    upcoming_tasks: List[Dict[str, Any]] = []

class SystemHealthResponse(BaseModel):
    status: str
    timestamp: datetime
    database: str
    ollama_service: Dict[str, Any]
    facebook_connection: Dict[str, Any]
    global_pause: bool
    version: str

class GlobalPauseRequest(BaseModel):
    paused: bool

class GlobalPauseResponse(BaseModel):
    global_pause: bool
    message: str

# ----------------- Audit Schemas -----------------
class AuditLogResponse(BaseModel):
    id: int
    action: str
    entity: str
    entity_id: Optional[str]
    actor: str
    details: str
    ip_address: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ----------------- Generic Message -----------------
class GenericMessage(BaseModel):
    message: str
    success: bool = True
