from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import uuid4

from sqlalchemy import Column
from sqlalchemy.types import TEXT
from sqlmodel import Field, SQLModel


class AuditLog(SQLModel, table=True):
    """Immutable audit log for traceability.

    This is a write-optimized table intended for high-signal business events.
    Keep it append-only and never update rows in-place.
    """

    audit_id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)

    event_type: str = Field(index=True)
    entity_type: str = Field(index=True)
    entity_id: str = Field(index=True)

    document_id: Optional[str] = Field(default=None, index=True)

    message: str
    actor: Optional[str] = Field(default=None, index=True)

    # Store JSON as text for cross-DB compatibility (SQLite/Postgres).
    metadata_json: str = Field(default="{}", sa_column=Column(TEXT, nullable=False))

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)

    @staticmethod
    def encode_metadata(metadata: dict[str, Any] | None) -> str:
        return json.dumps(metadata or {}, ensure_ascii=False, separators=(",", ":"))
