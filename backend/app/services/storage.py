"""Pluggable file storage: local filesystem, Google Cloud Storage, or S3-compatible.

Public API (unchanged): save_file / load_file / delete_file.
The string returned by save_file is an opaque reference stored on the document;
each backend knows how to load/delete by that reference.
"""
import hashlib
from pathlib import Path
from ..core.config import settings
from ..core.logging import get_logger

logger = get_logger(__name__)


def _object_name(original_filename: str, content: bytes) -> str:
    content_hash = hashlib.sha256(content).hexdigest()[:16]
    ext = Path(original_filename).suffix.lower()
    return f"{content_hash}{ext}"


class LocalStorage:
    def save(self, original_filename: str, content: bytes) -> tuple[str, int]:
        base = Path(settings.storage_dir)
        base.mkdir(parents=True, exist_ok=True)
        path = base / _object_name(original_filename, content)
        path.write_bytes(content)
        logger.info(f"Stored {len(content):,} bytes → {path.name} (local)")
        return str(path), len(content)

    def load(self, ref: str) -> bytes:
        return Path(ref).read_bytes()

    def delete(self, ref: str) -> None:
        try:
            Path(ref).unlink(missing_ok=True)
        except Exception as exc:
            logger.warning(f"Could not delete {ref}: {exc}")


class _BucketStorage:
    """Shared key handling for object stores."""
    def _key(self, name: str) -> str:
        prefix = settings.storage_prefix
        return f"{prefix}{name}" if prefix else name


class GCSStorage(_BucketStorage):
    def __init__(self) -> None:
        from google.cloud import storage as gcs  # lazy import
        self._bucket = gcs.Client().bucket(settings.storage_bucket)

    def save(self, original_filename: str, content: bytes) -> tuple[str, int]:
        key = self._key(_object_name(original_filename, content))
        self._bucket.blob(key).upload_from_string(content)
        logger.info(f"Stored {len(content):,} bytes → {key} (gcs)")
        return key, len(content)

    def load(self, ref: str) -> bytes:
        return self._bucket.blob(ref).download_as_bytes()

    def delete(self, ref: str) -> None:
        try:
            self._bucket.blob(ref).delete()
        except Exception as exc:
            logger.warning(f"Could not delete {ref}: {exc}")


class S3Storage(_BucketStorage):
    def __init__(self) -> None:
        import boto3  # lazy import
        kwargs = {}
        if settings.s3_endpoint_url:
            kwargs["endpoint_url"] = settings.s3_endpoint_url
        if settings.s3_region:
            kwargs["region_name"] = settings.s3_region
        self._s3 = boto3.client("s3", **kwargs)
        self._bucket = settings.storage_bucket

    def save(self, original_filename: str, content: bytes) -> tuple[str, int]:
        key = self._key(_object_name(original_filename, content))
        self._s3.put_object(Bucket=self._bucket, Key=key, Body=content)
        logger.info(f"Stored {len(content):,} bytes → {key} (s3)")
        return key, len(content)

    def load(self, ref: str) -> bytes:
        return self._s3.get_object(Bucket=self._bucket, Key=ref)["Body"].read()

    def delete(self, ref: str) -> None:
        try:
            self._s3.delete_object(Bucket=self._bucket, Key=ref)
        except Exception as exc:
            logger.warning(f"Could not delete {ref}: {exc}")


_backend = None


def _get_backend():
    global _backend
    if _backend is None:
        t = settings.storage_type.lower()
        if t == "gcs":
            _backend = GCSStorage()
        elif t == "s3":
            _backend = S3Storage()
        else:
            _backend = LocalStorage()
        logger.info(f"File storage backend: {t}")
    return _backend


def save_file(original_filename: str, content: bytes) -> tuple[str, int]:
    return _get_backend().save(original_filename, content)


def load_file(ref: str) -> bytes:
    return _get_backend().load(ref)


def delete_file(ref: str) -> None:
    _get_backend().delete(ref)
