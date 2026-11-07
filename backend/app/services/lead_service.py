import io
import csv
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.models import Lead, AuditLog
from app.services.audit_service import log_audit

def get_leads(
    db: Session,
    status: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
) -> List[Lead]:
    query = db.query(Lead)
    if status and status.lower() != "all":
        query = query.filter(Lead.follow_up_status.ilike(status))
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                Lead.customer_name.ilike(term),
                Lead.contact_info.ilike(term),
                Lead.product_interest.ilike(term),
                Lead.notes.ilike(term)
            )
        )
    return query.order_by(Lead.created_at.desc()).offset(skip).limit(limit).all()

def get_lead_metrics(db: Session) -> Dict[str, int]:
    leads = db.query(Lead).all()
    metrics = {
        "total": len(leads),
        "new": 0,
        "contacted": 0,
        "qualified": 0,
        "closed": 0
    }
    for l in leads:
        st = (l.follow_up_status or "new").lower()
        if st in metrics:
            metrics[st] += 1
    return metrics

def create_or_update_lead(
    db: Session,
    customer_name: str,
    facebook_reference: str,
    contact_info: str = "",
    inquiry_type: str = "General Inquiry",
    product_interest: str = "",
    notes: str = ""
) -> Lead:
    # Deduplicate by facebook_reference or contact_info if available
    lead: Optional[Lead] = None
    if facebook_reference:
        lead = db.query(Lead).filter(Lead.facebook_reference == facebook_reference).first()
    if not lead and contact_info:
        lead = db.query(Lead).filter(Lead.contact_info == contact_info).first()

    if not lead:
        lead = Lead(
            customer_name=customer_name or "Anonymous Customer",
            facebook_reference=facebook_reference,
            contact_info=contact_info,
            inquiry_type=inquiry_type,
            product_interest=product_interest,
            follow_up_status="New",
            notes=notes
        )
        db.add(lead)
    else:
        # Update existing
        if contact_info and not lead.contact_info:
            lead.contact_info = contact_info
        if product_interest:
            lead.product_interest = product_interest
        if notes:
            lead.notes = f"{lead.notes}\n{notes}".strip()

    db.commit()
    db.refresh(lead)
    return lead

def update_lead(
    db: Session,
    lead_id: int,
    status: Optional[str] = None,
    notes: Optional[str] = None,
    contact_info: Optional[str] = None,
    actor: str = "admin"
) -> Lead:
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise ValueError(f"Lead {lead_id} not found.")

    if status:
        lead.follow_up_status = status
    if notes is not None:
        lead.notes = notes
    if contact_info is not None:
        lead.contact_info = contact_info

    db.commit()
    db.refresh(lead)

    log_audit(
        db,
        action="UPDATE_LEAD",
        entity="lead",
        entity_id=str(lead_id),
        actor=actor,
        details=f"Updated lead {lead_id} status to {lead.follow_up_status}"
    )

    return lead

def export_leads_csv(db: Session) -> str:
    leads = db.query(Lead).order_by(Lead.created_at.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Customer Name", "Contact Info", "Facebook Reference",
        "Inquiry Type", "Product Interest", "Status", "Notes", "Created At"
    ])
    for l in leads:
        writer.writerow([
            l.id,
            l.customer_name,
            l.contact_info,
            l.facebook_reference,
            l.inquiry_type,
            l.product_interest,
            l.follow_up_status,
            l.notes,
            l.created_at.isoformat()
        ])
    return output.getvalue()
