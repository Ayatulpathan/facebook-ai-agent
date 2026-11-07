from typing import Optional
from sqlalchemy.orm import Session
from app.models.models import BrandProfile
from app.schemas.schemas import BrandProfileUpdate

def init_brand_profile(db: Session) -> BrandProfile:
    """Ensure a default brand profile exists."""
    profile = db.query(BrandProfile).first()
    if not profile:
        profile = BrandProfile(
            page_name="Official Brand Page",
            page_description="AI-driven multi-niche business and engagement page.",
            brand_identity="Modern, customer-focused, responsive, authentic.",
            brand_logo_url="",
            primary_color="#1877F2",
            secondary_color="#42B72A",
            target_audience="Young professionals, entrepreneurs, active consumers",
            languages="Bangla, English",
            writing_tone="Engaging, Friendly, Professional, Reliable",
            products_and_services="Premium local services, product reviews, tech tutorials",
            verified_prices="Consultation: Free; Standard Service: 500 BDT; Premium Package: 1500 BDT",
            contact_details="WhatsApp / Messenger: +8801700000000 | Email: support@example.com",
            preferred_cta="Send Message",
            prohibited_claims="No 100% medical or get-rich-quick financial guarantees",
            prohibited_topics="Political debates, unverified religious commentary, defamatory remarks"
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

def get_brand_profile(db: Session) -> BrandProfile:
    """Get the active brand profile."""
    profile = db.query(BrandProfile).first()
    if not profile:
        profile = init_brand_profile(db)
    return profile

def update_brand_profile(db: Session, update_data: BrandProfileUpdate) -> BrandProfile:
    """Update brand profile fields."""
    profile = get_brand_profile(db)
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile
