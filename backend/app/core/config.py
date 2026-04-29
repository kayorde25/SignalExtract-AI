from __future__ import annotations

from functools import lru_cache
from typing import Optional

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration.

    All settings are environment-variable driven so the repo can be run locally,
    in Docker, or in a cloud runtime without hard-coded secrets.
    """

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "SignalExtract AI"
    api_v1_prefix: str = "/api/v1"

    app_version: str = "0.2.0"

    log_level: str = "INFO"

    # SQLite by default; can be swapped for Postgres later.
    database_url: str = "sqlite:///./signalextract.db"

    # Where uploads and derived artifacts are stored (local dev default).
    storage_dir: str = "./storage"

    # Flag signals for review when confidence is below this threshold.
    review_threshold: float = 0.7

    # Upload constraints
    max_upload_mb: int = 25

    # Allowed extensions (simple security + predictable behavior)
    allowed_extensions: str = ".txt,.pdf,.docx,.eml"

    # CORS (comma-separated list). Use "*" only for local dev.
    cors_allow_origins: str = "*"

    # Optional API key protection for the HTTP API.
    require_api_key: bool = False
    api_key: Optional[SecretStr] = None

    # Extraction strategy selection.
    # - rule_based: deterministic baseline (default)
    # - llm: schema-constrained LLM extraction (requires API key)
    # - hybrid: combine llm + rule_based with validation
    extraction_mode: str = "rule_based"  # rule_based|llm|hybrid

    # LLM configuration (optional; never log these values)
    llm_api_key: Optional[SecretStr] = None
    llm_model: str = "gpt-4.1-mini"  # default (override per deployment)


@lru_cache
def get_settings() -> Settings:
    return Settings()
