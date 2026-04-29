from __future__ import annotations

from typing import Any, Optional

from sqlmodel import Session

from app.models.audit_log import AuditLog


def audit_event(
    session: Session,
    *,
    event_type: str,
    entity_type: str,
    entity_id: str,
    document_id: Optional[str],
    message: str,
    actor: Optional[str] = None,
    metadata: dict[str, Any] | None = None,
) -> AuditLog:
    """Append a business-relevant audit event.

    Keep this small and consistent: it is intended to be searchable and exportable.
    """

    row = AuditLog(
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        document_id=document_id,
        message=message,
        actor=actor,
        metadata_json=AuditLog.encode_metadata(metadata),
    )
    session.add(row)
    return row
