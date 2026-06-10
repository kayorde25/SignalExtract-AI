import json
from datetime import datetime
from sqlmodel import Session
from ..models.audit_log import AuditLog
from ..core.logging import get_logger

logger = get_logger(__name__)


def log_event(
    session: Session,
    *,
    entity_type: str,
    entity_id: str,
    action: str,
    actor: str | None = None,
    details: dict | None = None,
) -> AuditLog:
    entry = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor=actor,
        details=json.dumps(details) if details else None,
        timestamp=datetime.utcnow(),
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry
