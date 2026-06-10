import time
from fastapi import APIRouter, Depends
from sqlmodel import Session, text
from ...core.db import get_session
from ...core.config import settings
from ...core.security import verify_api_key

router = APIRouter(tags=["health"])
_START = time.time()


@router.get("/health")
async def health():
    return {"status": "ok", "service": settings.app_name}


@router.get("/ready")
async def ready(session: Session = Depends(get_session)):
    try:
        session.exec(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False
    return {
        "ready": db_ok,
        "db": "ok" if db_ok else "error",
        "uptime_s": round(time.time() - _START, 1),
    }


@router.get("/metadata")
async def metadata(_: str | None = Depends(verify_api_key)):
    return {
        "app_name": settings.app_name,
        "extraction_mode": settings.extraction_mode,
        "api_key_configured": bool(settings.api_key),
        "llm_model": settings.llm_model if settings.llm_api_key else None,
        "allowed_extensions": settings.allowed_extensions_list,
        "max_upload_mb": settings.max_upload_mb,
    }
