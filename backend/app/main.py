import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.database.session import engine, Base, SessionLocal, apply_sqlite_migrations
from app.api.v1 import (
    auth, brand, niches, dashboard, audit, agents, media, graphics, reels, content, calendar,
    approvals, queue, facebook
)
from app.services.auth_service import init_admin_user
from app.services.brand_service import init_brand_profile
from app.services.niche_service import init_sample_niches
from app.services.audit_service import log_audit

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database schema
    Base.metadata.create_all(bind=engine)
    apply_sqlite_migrations(engine)
    
    # Initialize seed records
    db = SessionLocal()
    try:
        init_admin_user(db)
        init_brand_profile(db)
        init_sample_niches(db)
        log_audit(
            db,
            action="SYSTEM_STARTUP",
            entity="system",
            actor="fastapi_lifecycle",
            details="Backend initialized. Local SQLite and seed state ready."
        )
    finally:
        db.close()
    
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Privacy-First, Local-Only AI Facebook Page Management System.",
    lifespan=lifespan
)

# Strict CORS configuration (Localhost only)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static media route
app.mount("/media", StaticFiles(directory=settings.MEDIA_DIR), name="media")

# Include Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(brand.router, prefix="/api/v1")
app.include_router(niches.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(audit.router, prefix="/api/v1")
app.include_router(agents.router, prefix="/api/v1")
app.include_router(media.router, prefix="/api/v1")
app.include_router(graphics.router, prefix="/api/v1")
app.include_router(reels.router, prefix="/api/v1")
app.include_router(content.router, prefix="/api/v1")
app.include_router(calendar.router, prefix="/api/v1")
app.include_router(approvals.router, prefix="/api/v1")
app.include_router(queue.router, prefix="/api/v1")
app.include_router(facebook.router, prefix="/api/v1")

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "mode": "local_zero_cost"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
