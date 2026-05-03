from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic import AliasChoices, Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration.

    All settings are environment-variable driven so the repo can be run locally,
    in Docker, or in a cloud runtime without hard-coded secrets.
    """

    _repo_root = Path(__file__).resolve().parents[3]
    _backend_root = Path(__file__).resolve().parents[2]

    # Load .env from either repo root or backend/ for reliable local startup.
    model_config = SettingsConfigDict(
        env_file=[_repo_root / ".env", _backend_root / ".env"],
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = Field(default="CleanExtractAI", validation_alias=AliasChoices("APP_NAME", "app_name"))
    api_v1_prefix: str = Field(default="/api/v1", validation_alias=AliasChoices("API_V1_PREFIX", "api_v1_prefix"))

    app_version: str = Field(default="0.2.0", validation_alias=AliasChoices("APP_VERSION", "app_version"))

    log_level: str = Field(default="INFO", validation_alias=AliasChoices("LOG_LEVEL", "log_level"))

    # Local default is SQLite; can be swapped for Postgres later.
    database_url: str = Field(
        default="sqlite:///./cleanextract.db",
        validation_alias=AliasChoices("DATABASE_URL", "TEST_DATABASE_URL", "database_url"),
    )

    # Where uploads and derived artifacts are stored (local dev default).
    storage_dir: str = Field(
        default="./storage",
        validation_alias=AliasChoices("STORAGE_DIR", "LOCAL_STORAGE_PATH", "storage_dir"),
    )

    # Flag signals for review when confidence is below this threshold.
    review_threshold: float = Field(
        default=0.7,
        validation_alias=AliasChoices("REVIEW_THRESHOLD", "MIN_CONFIDENCE_THRESHOLD", "review_threshold"),
    )

    # Upload constraints
    max_upload_mb: int = Field(
        default=25,
        validation_alias=AliasChoices("MAX_UPLOAD_MB", "MAX_UPLOAD_SIZE_MB", "max_upload_mb"),
    )

    # Allowed extensions (simple security + predictable behavior)
    allowed_extensions: str = Field(
        default=".txt,.pdf,.docx,.eml",
        validation_alias=AliasChoices("ALLOWED_EXTENSIONS", "ALLOWED_FILE_TYPES", "allowed_extensions"),
    )

    # CORS (comma-separated list). Use "*" only for local dev.
    cors_allow_origins: str = Field(
        default="*",
        validation_alias=AliasChoices("CORS_ALLOW_ORIGINS", "CORS_ORIGINS", "cors_allow_origins"),
    )

    # Optional API key protection for the HTTP API.
    require_api_key: bool = Field(default=False, validation_alias=AliasChoices("REQUIRE_API_KEY", "require_api_key"))
    api_key: Optional[SecretStr] = Field(default=None, validation_alias=AliasChoices("API_KEY", "api_key"))

    # Extraction strategy selection.
    # - rule_based: deterministic baseline (default)
    # - llm: schema-constrained LLM extraction (requires API key)
    # - hybrid: combine llm + rule_based with validation
    extraction_mode: str = Field(
        default="rule_based",
        validation_alias=AliasChoices("EXTRACTION_MODE", "extraction_mode"),
    )  # rule_based|llm|hybrid

    # Local LLM configuration (Ollama, etc.). The backend does not call the model by default;
    # these values are primarily for UI display and future plug-in implementations.
    local_llm_enabled: bool = Field(
        default=False,
        validation_alias=AliasChoices("LOCAL_LLM_ENABLED", "local_llm_enabled"),
    )
    local_llm_provider: str = Field(
        default="ollama",
        validation_alias=AliasChoices("LOCAL_LLM_PROVIDER", "local_llm_provider"),
    )
    local_llm_endpoint: str = Field(
        default="http://localhost:11434",
        validation_alias=AliasChoices("LOCAL_LLM_ENDPOINT", "local_llm_endpoint"),
    )
    local_llm_model: str = Field(
        default="llama3.1",
        validation_alias=AliasChoices("LOCAL_LLM_MODEL", "local_llm_model"),
    )

    # LLM configuration (optional; never log these values)
    llm_api_key: Optional[SecretStr] = Field(default=None, validation_alias=AliasChoices("LLM_API_KEY", "llm_api_key"))
    llm_model: str = Field(default="gpt-4.1-mini", validation_alias=AliasChoices("LLM_MODEL", "llm_model"))

    @field_validator("log_level")
    @classmethod
    def _normalize_log_level(cls, v: str) -> str:
        v = (v or "INFO").strip()
        return v.upper() if v else "INFO"

    @field_validator("allowed_extensions")
    @classmethod
    def _normalize_allowed_extensions(cls, v: str) -> str:
        raw = (v or "").strip()
        if not raw:
            return ".txt,.pdf,.docx,.eml"

        parts = [p.strip() for p in raw.split(",") if p.strip()]
        # Support env values like "txt,pdf" by converting to ".txt,.pdf".
        normalized = [(p if p.startswith(".") else f".{p}") for p in parts]
        return ",".join(normalized)


@lru_cache
def get_settings() -> Settings:
    return Settings()
