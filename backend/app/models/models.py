from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Float, Enum, Index
)
from sqlalchemy.orm import relationship
from app.database.session import Base

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="admin", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    last_login = Column(DateTime, nullable=True)

class BrandProfile(Base):
    __tablename__ = "brand_profiles"

    id = Column(Integer, primary_key=True, index=True)
    page_name = Column(String(100), default="My Facebook Page", nullable=False)
    page_description = Column(Text, default="", nullable=False)
    brand_identity = Column(Text, default="Professional, modern brand", nullable=False)
    brand_logo_url = Column(String(255), default="", nullable=False)
    primary_color = Column(String(20), default="#1877F2", nullable=False) # Facebook blue default
    secondary_color = Column(String(20), default="#42B72A", nullable=False)
    target_audience = Column(Text, default="General audience", nullable=False)
    languages = Column(String(100), default="Bangla, English", nullable=False)
    writing_tone = Column(String(100), default="Engaging, Friendly, Professional", nullable=False)
    products_and_services = Column(Text, default="", nullable=False)
    verified_prices = Column(Text, default="", nullable=False) # JSON or markdown string
    contact_details = Column(Text, default="", nullable=False)
    preferred_cta = Column(String(200), default="Send Message", nullable=False)
    prohibited_claims = Column(Text, default="Do not make medical or financial guarantees", nullable=False)
    prohibited_topics = Column(Text, default="Politics, controversial religious debates", nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

class Niche(Base):
    __tablename__ = "niches"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(Text, default="", nullable=False)
    target_demographic = Column(Text, default="", nullable=False)
    preferred_tone = Column(String(100), default="Informative", nullable=False)
    preferred_cta = Column(String(200), default="Learn More", nullable=False)
    sample_topics = Column(Text, default="", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    contents = relationship("Content", back_populates="niche", cascade="all, delete-orphan")

class PageConnection(Base):
    __tablename__ = "page_connections"

    id = Column(Integer, primary_key=True, index=True)
    page_id = Column(String(100), unique=True, index=True, nullable=True)
    page_name = Column(String(200), nullable=True)
    access_token_encrypted = Column(Text, nullable=True)
    token_expires_at = Column(DateTime, nullable=True)
    permissions_granted = Column(Text, default="[]", nullable=False) # JSON list
    missing_permissions = Column(Text, default="[]", nullable=False) # JSON list
    status = Column(String(50), default="disconnected", nullable=False) # connected, disconnected, expired, error
    app_id = Column(String(100), nullable=True)
    app_secret_masked = Column(String(100), nullable=True)
    category = Column(String(100), default="Business Page", nullable=False)
    followers_count = Column(Integer, default=0, nullable=False)
    avatar_url = Column(String(500), default="", nullable=False)
    is_mock_mode = Column(Boolean, default=True, nullable=False)
    connected_at = Column(DateTime, nullable=True)
    last_verified_at = Column(DateTime, nullable=True)

class ContentIdea(Base):
    __tablename__ = "content_ideas"

    id = Column(Integer, primary_key=True, index=True)
    niche_id = Column(Integer, ForeignKey("niches.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    concept = Column(Text, nullable=False)
    category = Column(String(50), default="educational") # educational, promotional, seasonal, engagement
    is_ai_generated = Column(Boolean, default=True)
    source = Column(String(200), default="AI Idea Generator")
    created_at = Column(DateTime, default=utc_now, nullable=False)

class Content(Base):
    __tablename__ = "content"

    id = Column(Integer, primary_key=True, index=True)
    niche_id = Column(Integer, ForeignKey("niches.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    content_type = Column(String(50), default="post", nullable=False) # post, reel, story, carousel
    language = Column(String(20), default="bn", nullable=False) # bn, en, both
    status = Column(String(50), default="Draft", index=True, nullable=False)
    # Statuses: Draft, Generating, Quality Check, Pending Approval, Approved, Scheduled, Publishing, Published, Rejected, Failed, Delayed
    current_version_id = Column(Integer, nullable=True)
    scheduled_for = Column(DateTime, nullable=True, index=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    niche = relationship("Niche", back_populates="contents")
    versions = relationship("ContentVersion", back_populates="content", cascade="all, delete-orphan")
    approvals = relationship("Approval", back_populates="content", cascade="all, delete-orphan")

class ContentVersion(Base):
    __tablename__ = "content_versions"

    id = Column(Integer, primary_key=True, index=True)
    content_id = Column(Integer, ForeignKey("content.id", ondelete="CASCADE"), nullable=False)
    version_num = Column(Integer, default=1, nullable=False)
    caption_bn = Column(Text, default="", nullable=False)
    caption_en = Column(Text, default="", nullable=False)
    hashtags = Column(Text, default="", nullable=False)
    call_to_action = Column(String(200), default="", nullable=False)
    media_asset_ids = Column(Text, default="[]", nullable=False) # JSON list
    quality_score = Column(Float, default=1.0)
    quality_notes = Column(Text, default="")
    created_by = Column(String(50), default="ai_writer")
    created_at = Column(DateTime, default=utc_now, nullable=False)

    content = relationship("Content", back_populates="versions")

class MediaAsset(Base):
    __tablename__ = "media_assets"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False) # image/png, image/jpeg, video/mp4
    file_size_bytes = Column(Integer, default=0)
    dimensions = Column(String(50), default="") # e.g. 1080x1080 or 1080x1920
    is_generated = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

class Approval(Base):
    __tablename__ = "approvals"

    id = Column(Integer, primary_key=True, index=True)
    content_id = Column(Integer, ForeignKey("content.id", ondelete="CASCADE"), nullable=False)
    version_num = Column(Integer, nullable=False)
    status = Column(String(50), default="PENDING", index=True, nullable=False) # PENDING, APPROVED, REJECTED, INVALIDATED
    reviewer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    decision_notes = Column(Text, default="")
    decided_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    content = relationship("Content", back_populates="approvals")

class PublishingQueue(Base):
    __tablename__ = "publishing_queue"

    id = Column(Integer, primary_key=True, index=True)
    content_id = Column(Integer, ForeignKey("content.id", ondelete="CASCADE"), nullable=False)
    approved_version_id = Column(Integer, nullable=False)
    scheduled_time = Column(DateTime, nullable=False, index=True)
    state = Column(String(50), default="QUEUED", index=True, nullable=False) # QUEUED, PUBLISHING, PUBLISHED, DELAYED, FAILED
    retry_count = Column(Integer, default=0)
    error_message = Column(Text, default="")
    idempotency_key = Column(String(100), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

class PublishedPost(Base):
    __tablename__ = "published_posts"

    id = Column(Integer, primary_key=True, index=True)
    content_id = Column(Integer, ForeignKey("content.id", ondelete="CASCADE"), nullable=False)
    meta_post_id = Column(String(100), unique=True, index=True, nullable=False)
    permalink_url = Column(String(500), default="")
    published_at = Column(DateTime, default=utc_now, nullable=False)

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    meta_thread_id = Column(String(100), unique=True, index=True, nullable=False)
    sender_id = Column(String(100), nullable=False)
    sender_name = Column(String(200), default="Customer")
    platform = Column(String(50), default="messenger") # messenger, comment
    status = Column(String(50), default="active")
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    meta_message_id = Column(String(100), unique=True, index=True, nullable=True)
    sender_type = Column(String(20), default="customer") # customer, page
    message_text = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=utc_now, nullable=False)

    conversation = relationship("Conversation", back_populates="messages")
    reply_drafts = relationship("ReplyDraft", back_populates="message", cascade="all, delete-orphan")

class ReplyDraft(Base):
    __tablename__ = "reply_drafts"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    suggested_reply = Column(Text, nullable=False)
    detected_intent = Column(String(100), default="general_question") # question, pricing, complaint, lead, spam
    approval_status = Column(String(50), default="PENDING", index=True, nullable=False) # PENDING, APPROVED, REJECTED
    approved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    message = relationship("Message", back_populates="reply_drafts")

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String(200), default="")
    facebook_reference = Column(String(200), default="")
    contact_info = Column(String(200), default="")
    inquiry_type = Column(String(100), default="General Inquiry")
    product_interest = Column(String(200), default="")
    follow_up_status = Column(String(50), default="New") # New, Contacted, Qualified, Closed
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=utc_now, nullable=False)

class AnalyticsSnapshot(Base):
    __tablename__ = "analytics_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    metric_name = Column(String(100), index=True, nullable=False)
    metric_value = Column(Float, default=0.0, nullable=False)
    date_recorded = Column(DateTime, default=utc_now, nullable=False)

class AgentRun(Base):
    __tablename__ = "agent_runs"

    id = Column(Integer, primary_key=True, index=True)
    agent_name = Column(String(100), index=True, nullable=False)
    model_used = Column(String(100), nullable=False)
    prompt_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    duration_ms = Column(Integer, default=0)
    status = Column(String(50), default="success") # success, failed, timeout
    created_at = Column(DateTime, default=utc_now, nullable=False)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String(20), default="info") # info, warning, error, success
    is_read = Column(Boolean, default=False, index=True, nullable=False)
    link = Column(String(200), default="")
    created_at = Column(DateTime, default=utc_now, nullable=False)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(100), index=True, nullable=False)
    entity = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=True)
    actor = Column(String(100), default="system", nullable=False)
    details = Column(Text, default="")
    ip_address = Column(String(50), default="127.0.0.1")
    created_at = Column(DateTime, default=utc_now, nullable=False)

class AppSetting(Base):
    __tablename__ = "app_settings"

    key = Column(String(100), primary_key=True, index=True)
    value = Column(Text, nullable=False)
    description = Column(String(255), default="")
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
