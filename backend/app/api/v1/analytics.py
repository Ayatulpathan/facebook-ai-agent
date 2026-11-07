import logging
from typing import Dict, Any
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.auth_service import get_current_user
from app.models.models import User
from app.services.analytics_service import get_analytics_overview, export_analytics_csv

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["Page Performance & Analytics"])

@router.get("/overview")
def read_analytics_overview(
    days: int = Query(30, ge=7, le=90, description="Time window in days"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve reach, impressions, post engagements, and video views from official Meta Graph API."""
    return get_analytics_overview(db, days=days)

@router.get("/export/csv")
def download_analytics_csv(
    days: int = Query(30, ge=7, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export performance insights and daily trend metrics to a CSV report."""
    csv_text = export_analytics_csv(db, days=days)
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="facebook_page_analytics_{days}d.csv"'}
    )
