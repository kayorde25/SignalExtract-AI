from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "SignalExtract AI"
    api_v1_prefix: str = "/api/v1"
    log_level: str = "INFO"

    database_url: str = "sqlite:///./signalextract.db"
    storage_dir: str = "./storage"
    max_upload_mb: int = 25
    allowed_extensions: str = ".txt,.pdf,.docx,.eml"

    cors_allow_origins: str = "*"

    require_api_key: bool = False
    api_key: str = ""

    extraction_mode: str = "rule_based"  # rule_based | llm | hybrid
    review_threshold: float = 0.7

    llm_api_key: str = ""
    llm_model: str = "claude-haiku-4-5-20251001"

    @property
    def allowed_extensions_list(self) -> list[str]:
        return [ext.strip() for ext in self.allowed_extensions.split(",") if ext.strip()]

    @property
    def cors_origins_list(self) -> list[str]:
        if self.cors_allow_origins.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.cors_allow_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
