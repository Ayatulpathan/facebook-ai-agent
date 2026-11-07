import logging
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.auth_service import get_current_user
from app.models.models import User
from app.schemas.schemas import LeadResponse, LeadUpdateRequest, LeadCreateRequest
from app.services.lead_service import (
    get_leads, get_lead_metrics, create_or_update_lead, update_lead, export_leads_csv
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/leads", tags=["Lead Management CRM"])

@router.get("/", response_model=List[LeadResponse])
def list_leads(
    status: Optional[str] = Query(None, description="Filter by status: New, Contacted, Qualified, Closed"),
    search: Optional[str] = Query(None, description="Search by name, contact, notes"),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve captured customer leads extracted from comments and Messenger."""
    return get_leads(db, status=status, search=search, skip=skip, limit=limit)

@router.get("/metrics")
def read_lead_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve aggregated funnel metrics for leads."""
    return get_lead_metrics(db)

@router.post("/", response_model=LeadResponse)
def create_lead(
    payload: LeadCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Manually add a customer lead."""
    return create_or_update_lead(
        db=db,
        customer_name=payload.customer_name,
        facebook_reference=payload.facebook_reference or "",
        contact_info=payload.contact_info or "",
        inquiry_type=payload.inquiry_type or "Manual Entry",
        product_interest=payload.product_interest or "",
        notes=payload.notes or ""
    )

@router.put("/{lead_id}", response_model=LeadResponse)
def modify_lead(
    lead_id: int,
    payload: LeadUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update lead status (New, Contacted, Qualified, Closed) or append notes."""
    try:
        return update_lead(
            db=db,
            lead_id=lead_id,
            status=payload.status,
            notes=payload.notes,
            contact_info=payload.contact_info,
            actor=current_user.username
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.get("/export/csv")
def download_leads_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export all customer leads to a clean, standard CSV file."""
    csv_data = export_leads_csv(db)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="facebook_leads.csv"'}
    )
