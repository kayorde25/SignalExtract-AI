from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlmodel import Session, text

from app.core.config import get_settings
from app.core.db import get_session
from app.services.storage import ensure_storage_dir

router = APIRouter()


@router.get("/health")
def health_check() -> dict:
    return {"status": "ok"}


@router.get("/ready")
def readiness_check(session: Session = Depends(get_session)) -> dict:
    """Readiness: checks DB connectivity and storage directory."""

    settings = get_settings()

    # DB connectivity
    session.exec(text("SELECT 1"))

    # Storage directory existence
    storage_dir = ensure_storage_dir()

    return {
        "ready": True,
        "database": "ok",
        "storage_dir": str(storage_dir),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/metadata")
def metadata() -> dict:
    settings = get_settings()

    return {
        "app_name": settings.app_name,
        "app_version": settings.app_version,
        "api_prefix": settings.api_v1_prefix,
        "extraction_mode": settings.extraction_mode,
        "review_threshold": settings.review_threshold,
        "max_upload_mb": settings.max_upload_mb,
        "allowed_extensions": [e.strip() for e in settings.allowed_extensions.split(",") if e.strip()],
        "require_api_key": bool(settings.require_api_key),
        "cors_allow_origins": [o.strip() for o in settings.cors_allow_origins.split(",") if o.strip()],
    }
