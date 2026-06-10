import hashlib
from pathlib import Path
from ..core.config import settings
from ..core.logging import get_logger

logger = get_logger(__name__)


def _storage_dir() -> Path:
    p = Path(settings.storage_dir)
    p.mkdir(parents=True, exist_ok=True)
    return p


def save_file(original_filename: str, content: bytes) -> tuple[str, int]:
    """Persist bytes to storage. Returns (absolute_path, size)."""
    content_hash = hashlib.sha256(content).hexdigest()[:16]
    ext = Path(original_filename).suffix.lower()
    stored_path = _storage_dir() / f"{content_hash}{ext}"
    stored_path.write_bytes(content)
    logger.info(f"Stored {len(content):,} bytes → {stored_path.name}")
    return str(stored_path), len(content)


def load_file(stored_path: str) -> bytes:
    return Path(stored_path).read_bytes()


def delete_file(stored_path: str) -> None:
    try:
        Path(stored_path).unlink(missing_ok=True)
    except Exception as exc:
        logger.warning(f"Could not delete {stored_path}: {exc}")
