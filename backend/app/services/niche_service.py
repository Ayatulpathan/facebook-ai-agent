import re
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.models import Niche
from app.schemas.schemas import NicheCreate, NicheUpdate

def slugify(text: str) -> str:
    """Generate URL-safe unique slug."""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text.strip('-')

def init_sample_niches(db: Session):
    """Seed initial sample niches to demonstrate multi-niche capability."""
    if db.query(Niche).count() == 0:
        samples = [
            Niche(
                name="Technology & Gadgets",
                slug="technology-gadgets",
                description="Consumer tech reviews, mobile tips, AI tools, and smart lifestyle tutorials.",
                target_demographic="Age 18-35, tech enthusiasts, university students, remote workers.",
                preferred_tone="Analytical, Innovative, Clear, Actionable",
                preferred_cta="Follow for Daily Tech Tips",
                sample_topics="Budget smartphone comparisons, Top AI tools for students, Windows productivity hacks",
                is_active=True
            ),
            Niche(
                name="Health & Wellness",
                slug="health-wellness",
                description="Practical everyday fitness routines, nutrition guides, mental wellness, and ergonomic tips.",
                target_demographic="Age 22-45, working professionals, fitness beginners, busy parents.",
                preferred_tone="Encouraging, Empathetic, Informative, Gentle",
                preferred_cta="Save this post & Start Today",
                sample_topics="10-minute desk stretches, Balanced breakfast ideas, Hydration benefits",
                is_active=True
            ),
            Niche(
                name="E-Commerce & Special Deals",
                slug="ecommerce-deals",
                description="Curated lifestyle products, festive discount alerts, verified gift recommendations.",
                target_demographic="Online shoppers, deal seekers, gift buyers in Bangladesh & international.",
                preferred_tone="Excited, Urgency-driven, Trustworthy, Transparent",
                preferred_cta="Shop Now via Messenger",
                sample_topics="Flash sale announcement, Customer unboxing review, Limited time bundles",
                is_active=True
            )
        ]
        db.add_all(samples)
        db.commit()

def get_all_niches(db: Session, active_only: bool = False) -> List[Niche]:
    query = db.query(Niche)
    if active_only:
        query = query.filter(Niche.is_active == True)
    return query.order_by(Niche.created_at.desc()).all()

def get_niche_by_id(db: Session, niche_id: int) -> Optional[Niche]:
    return db.query(Niche).filter(Niche.id == niche_id).first()

def create_niche(db: Session, niche_in: NicheCreate) -> Niche:
    base_slug = slugify(niche_in.name)
    slug = base_slug
    counter = 1
    while db.query(Niche).filter(Niche.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    niche = Niche(
        name=niche_in.name,
        slug=slug,
        description=niche_in.description,
        target_demographic=niche_in.target_demographic,
        preferred_tone=niche_in.preferred_tone,
        preferred_cta=niche_in.preferred_cta,
        sample_topics=niche_in.sample_topics,
        is_active=niche_in.is_active
    )
    db.add(niche)
    db.commit()
    db.refresh(niche)
    return niche

def update_niche(db: Session, niche: Niche, update_in: NicheUpdate) -> Niche:
    update_dict = update_in.model_dump(exclude_unset=True)
    if "name" in update_dict and update_dict["name"] != niche.name:
        update_dict["slug"] = slugify(update_dict["name"])
    for field, value in update_dict.items():
        setattr(niche, field, value)
    db.commit()
    db.refresh(niche)
    return niche

def delete_niche(db: Session, niche: Niche) -> bool:
    db.delete(niche)
    db.commit()
    return True
