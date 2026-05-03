from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

import requests
from dotenv import load_dotenv


def _load_env_files() -> None:
    """Load env vars from common repo locations.

    We intentionally support:
    - repo root .env
    - backend/.env (this repo’s current local setup)
    - frontend/.env
    """

    repo_root = Path(__file__).resolve().parents[1]
    candidates = [repo_root / ".env", repo_root / "backend" / ".env", repo_root / "frontend" / ".env"]
    for p in candidates:
        if p.exists():
            load_dotenv(dotenv_path=p, override=False)


_load_env_files()


def _api_base_url_from_env() -> str:
    # BACKEND_BASE_URL is the authoritative runtime setting (Cloud Run/local env).
    base = (os.getenv("BACKEND_BASE_URL") or "http://localhost:8000").strip()
    base = base.rstrip("/")
    return f"{base}/api/v1"


def _normalize_api_base_url(base: str) -> str:
    base = (base or "").strip().rstrip("/")
    if not base:
        return _api_base_url_from_env()

    # Accept either:
    # - http://host:port
    # - http://host:port/api/v1
    if base.endswith("/api/v1"):
        return base
    return f"{base}/api/v1"


def _api_key_from_env() -> str | None:
    key = os.getenv("API_KEY")
    if not key:
        return None
    key = key.strip()
    return key or None


@dataclass
class ApiClient:
    api_base_url: str
    api_key: str | None = None
    timeout_s: int = 60

    @staticmethod
    def from_env(*, override_base_url: str | None = None, override_api_key: str | None = None) -> "ApiClient":
        override_key = (override_api_key or "").strip()
        if not override_key:
            override_key = None
        return ApiClient(
            api_base_url=_normalize_api_base_url(override_base_url or _api_base_url_from_env()).rstrip("/"),
            api_key=override_key if override_key is not None else _api_key_from_env(),
        )

    def _headers(self) -> dict[str, str]:
        # Requirement: send x-api-key header.
        if not self.api_key:
            return {}
        return {"x-api-key": self.api_key}

    def _url(self, path: str) -> str:
        if not path.startswith("/"):
            path = "/" + path
        return f"{self.api_base_url}{path}"

    def get_json(self, path: str) -> Any:
        r = requests.get(self._url(path), headers=self._headers(), timeout=self.timeout_s)
        r.raise_for_status()
        return r.json()

    def post_json(self, path: str, *, json: Any | None = None) -> Any:
        r = requests.post(self._url(path), headers=self._headers(), json=json, timeout=self.timeout_s)
        r.raise_for_status()
        return r.json()

    def patch_json(self, path: str, *, json: Any | None = None) -> Any:
        r = requests.patch(self._url(path), headers=self._headers(), json=json, timeout=self.timeout_s)
        r.raise_for_status()
        return r.json()

    def post_files(self, path: str, *, files: dict[str, Any]) -> Any:
        r = requests.post(self._url(path), headers=self._headers(), files=files, timeout=self.timeout_s)
        r.raise_for_status()
        return r.json()

    def get_text(self, path: str) -> str:
        r = requests.get(self._url(path), headers=self._headers(), timeout=self.timeout_s)
        r.raise_for_status()
        return r.text

    # Convenience API methods
    def health(self) -> dict:
        return self.get_json("/health")

    def ready(self) -> dict:
        return self.get_json("/ready")

    def metadata(self) -> dict:
        return self.get_json("/metadata")

    def stats(self) -> dict:
        return self.get_json("/stats")

    def history(self) -> dict:
        return self.get_json("/history")

    def upload(self, *, filename: str, content: bytes, content_type: str | None) -> dict:
        return self.post_files(
            "/documents/upload",
            files={"file": (filename, content, content_type or "application/octet-stream")},
        )

    def extract_text(self, *, document_id: str) -> dict:
        return self.post_json(f"/documents/{document_id}/extract-text")

    def extract_signals(self, *, document_id: str) -> dict:
        return self.post_json(f"/documents/{document_id}/extract-signals")

    def get_signals(self, *, document_id: str) -> dict:
        return self.get_json(f"/documents/{document_id}/signals")

    def review_signal(self, *, signal_id: str, review_status: str, reviewed_by: str | None, review_note: str | None) -> dict:
        return self.patch_json(
            f"/signals/{signal_id}/review",
            json={"review_status": review_status, "reviewed_by": reviewed_by, "review_note": review_note},
        )

    def export_all_json(self, *, document_id: str) -> Any:
        return self.get_json(f"/documents/{document_id}/export.json")

    def export_all_csv(self, *, document_id: str) -> str:
        return self.get_text(f"/documents/{document_id}/export.csv")

    def export_approved_json(self, *, document_id: str) -> Any:
        return self.get_json(f"/documents/{document_id}/export-approved.json")

    def export_approved_csv(self, *, document_id: str) -> str:
        return self.get_text(f"/documents/{document_id}/export-approved.csv")
