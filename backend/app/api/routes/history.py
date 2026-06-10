from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func
from ...core.db import get_session
from ...core.security import verify_api_key
from ...models.audit_log import AuditLog
from ...schemas.history import AuditLogRead, HistoryResponse

router = APIRouter(prefix="/history", tags=["history"])


@router.get("/", response_model=HistoryResponse)
async def get_history(
    skip: int = 0,
    limit: int = 100,
    entity_type: str | None = None,
    session: Session = Depends(get_session),
    _: str | None = Depends(verify_api_key),
):
    stmt = select(AuditLog).order_by(AuditLog.timestamp.desc())
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    total = session.exec(select(func.count()).select_from(AuditLog)).one()
    items = session.exec(stmt.offset(skip).limit(limit)).all()
    return HistoryResponse(items=list(items), total=total)
