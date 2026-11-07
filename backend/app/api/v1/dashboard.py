from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.schemas import (
    DashboardOverview, SystemHealthResponse, GlobalPauseRequest, GlobalPauseResponse
)
from app.services.dashboard_service import (
    get_dashboard_overview, check_system_health, set_global_pause, get_global_pause
)
from app.services.auth_service import get_current_user
from app.services.audit_service import log_audit
from app.models.models import User

router = APIRouter(prefix="/dashboard", tags=["Dashboard & Controls"])

@router.get("/overview", response_model=DashboardOverview)
def overview(db: Session = Depends(get_db)):
    """Retrieve all high-level dashboard metrics, counters, and status states."""
    return get_dashboard_overview(db)

@router.get("/system-status", response_model=SystemHealthResponse)
def system_status(db: Session = Depends(get_db)):
    """Check runtime health across database, local Ollama engine, and Meta connection."""
    return check_system_health(db)

@router.post("/global-pause", response_model=GlobalPauseResponse)
def toggle_pause(
    request: Request,
    pause_req: GlobalPauseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Toggle Global Pause. Halts all scheduled publishing, outgoing replies, and background dispatching."""
    new_state = set_global_pause(db, pause_req.paused)
    state_str = "ENABLED" if new_state else "DISABLED"
    
    log_audit(
        db,
        action="GLOBAL_PAUSE_TOGGLE",
        entity="app_settings",
        entity_id="global_pause",
        actor=current_user.username,
        details=f"Global Pause {state_str}. All automated actions {'halted' if new_state else 'resumed'}.",
        ip_address=request.client.host if request.client else "127.0.0.1"
    )
    
    msg = "Global Pause is active. All scheduled posts and outgoing replies are suspended." if new_state else "Global Pause released. Normal operation resumed."
    return GlobalPauseResponse(global_pause=new_state, message=msg)
