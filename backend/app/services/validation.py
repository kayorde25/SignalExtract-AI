from pathlib import Path
from fastapi import HTTPException, status
from ..core.config import settings


def validate_upload(filename: str, size: int) -> None:
    ext = Path(filename).suffix.lower()
    allowed = settings.allowed_extensions_list
    if ext not in allowed:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"File type '{ext}' not allowed. Allowed: {', '.join(allowed)}",
        )
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if size > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds {settings.max_upload_mb} MB limit",
        )
