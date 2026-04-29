from __future__ import annotations

import hashlib
import os
from pathlib import Path
from typing import BinaryIO

from fastapi import UploadFile

from app.core.config import get_settings


class UploadTooLargeError(ValueError):
    pass


def ensure_storage_dir() -> Path:
    """Ensure the local storage directory exists."""

    settings = get_settings()
    storage_dir = Path(settings.storage_dir)
    storage_dir.mkdir(parents=True, exist_ok=True)
    return storage_dir


def _sha256_file(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def allowed_extension(filename: str) -> bool:
    settings = get_settings()
    allowed = {ext.strip().lower() for ext in settings.allowed_extensions.split(",") if ext.strip()}
    return Path(filename).suffix.lower() in allowed


async def persist_upload(
    upload: UploadFile,
    document_id: str,
    *,
    max_bytes: int | None = None,
) -> tuple[str, str, int, str]:
    """Persist an uploaded file to local storage.

    Returns: (storage_path, file_ext, size_bytes, sha256)
    """

    storage_dir = ensure_storage_dir()

    file_ext = Path(upload.filename or "").suffix.lower() or ".bin"

    # Store by document id to avoid collisions.
    storage_path = storage_dir / f"{document_id}{file_ext}"

    size = 0
    with storage_path.open("wb") as f:
        while True:
            chunk = await upload.read(1024 * 1024)
            if not chunk:
                break
            f.write(chunk)
            size += len(chunk)

            if max_bytes is not None and size > max_bytes:
                # Abort early to avoid writing excessively large files.
                f.flush()
                try:
                    storage_path.unlink(missing_ok=True)
                finally:
                    raise UploadTooLargeError("File too large")

    sha256 = _sha256_file(storage_path)
    return str(storage_path), file_ext, size, sha256
