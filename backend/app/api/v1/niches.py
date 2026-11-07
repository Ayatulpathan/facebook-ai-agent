from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.schemas import NicheResponse, NicheCreate, NicheUpdate, GenericMessage
from app.services.niche_service import (
    get_all_niches, get_niche_by_id, create_niche, update_niche, delete_niche
)
from app.services.auth_service import get_current_user
from app.services.audit_service import log_audit
from app.models.models import User

router = APIRouter(prefix="/niches", tags=["Niches"])

@router.get("/", response_model=List[NicheResponse])
def list_niches(active_only: bool = False, db: Session = Depends(get_db)):
    """List all configurable niches."""
    return get_all_niches(db, active_only=active_only)

@router.get("/{niche_id}", response_model=NicheResponse)
def retrieve_niche(niche_id: int, db: Session = Depends(get_db)):
    """Retrieve details for a specific niche."""
    niche = get_niche_by_id(db, niche_id)
    if not niche:
        raise HTTPException(status_code=404, detail="Niche not found")
    return niche

@router.post("/", response_model=NicheResponse, status_code=status.HTTP_201_CREATED)
def add_niche(
    request: Request,
    niche_in: NicheCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new business niche."""
    niche = create_niche(db, niche_in)
    log_audit(
        db,
        action="CREATE_NICHE",
        entity="niches",
        entity_id=str(niche.id),
        actor=current_user.username,
        details=f"Created niche '{niche.name}' ({niche.slug})",
        ip_address=request.client.host if request.client else "127.0.0.1"
    )
    return niche

@router.put("/{niche_id}", response_model=NicheResponse)
def edit_niche(
    request: Request,
    niche_id: int,
    update_in: NicheUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Modify an existing business niche."""
    niche = get_niche_by_id(db, niche_id)
    if not niche:
        raise HTTPException(status_code=404, detail="Niche not found")
    updated = update_niche(db, niche, update_in)
    log_audit(
        db,
        action="UPDATE_NICHE",
        entity="niches",
        entity_id=str(updated.id),
        actor=current_user.username,
        details=f"Updated niche '{updated.name}'",
        ip_address=request.client.host if request.client else "127.0.0.1"
    )
    return updated

@router.delete("/{niche_id}", response_model=GenericMessage)
def remove_niche(
    request: Request,
    niche_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a business niche."""
    niche = get_niche_by_id(db, niche_id)
    if not niche:
        raise HTTPException(status_code=404, detail="Niche not found")
    name = niche.name
    delete_niche(db, niche)
    log_audit(
        db,
        action="DELETE_NICHE",
        entity="niches",
        entity_id=str(niche_id),
        actor=current_user.username,
        details=f"Deleted niche '{name}'",
        ip_address=request.client.host if request.client else "127.0.0.1"
    )
    return GenericMessage(message=f"Niche '{name}' successfully deleted.")
