from typing import Optional
from sqlalchemy.orm import Session
from app.models.models import AuditLog

def log_audit(
    db: Session,
    action: str,
    entity: str,
    entity_id: Optional[str] = None,
    actor: str = "system",
    details: str = "",
    ip_address: str = "127.0.0.1"
) -> AuditLog:
    """Record an audit trail event for security and compliance."""
    log_entry = AuditLog(
        action=action,
        entity=entity,
        entity_id=str(entity_id) if entity_id is not None else None,
        actor=actor,
        details=details,
        ip_address=ip_address
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry
