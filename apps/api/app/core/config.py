from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

API_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = API_ROOT.parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(REPO_ROOT / ".env"), str(API_ROOT / ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: Literal["development", "test", "production"] = "development"
    app_name: str = "TalentOS"
    app_url: str = "http://localhost:3000"
    api_url: str = "http://localhost:8000"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    jwt_secret_key: str = Field(
        default="talentos-local-development-jwt-secret-change-me-in-production-64ch"
    )
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 14
    signed_url_secret: str = Field(
        default="talentos-local-development-signed-url-secret-change-me-in-prod"
    )
    cookie_secure: bool = False

    database_url: str = f"sqlite:///{(REPO_ROOT / 'data' / 'talentos.db').as_posix()}"

    storage_backend: Literal["local", "supabase"] = "local"
    local_storage_path: str = str(API_ROOT / "storage")
    max_resume_size_mb: int = 5
    document_retention_days: int = 180

    ai_provider: Literal["fallback", "openai", "gemini", "ollama"] = "fallback"
    ai_allow_external_in_demo: bool = False
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4o-mini"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1:8b"

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "noreply@talentos.local"

    rate_limit_auth_per_minute: int = 30
    rate_limit_demo_per_minute: int = 20
    rate_limit_upload_per_minute: int = 20

    @field_validator("jwt_secret_key")
    @classmethod
    def validate_jwt_secret(cls, value: str) -> str:
        if len(value) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters long.")
        return value

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def max_resume_size_bytes(self) -> int:
        return self.max_resume_size_mb * 1024 * 1024

    @property
    def storage_root(self) -> Path:
        path = Path(self.local_storage_path)
        if not path.is_absolute():
            path = (API_ROOT / path).resolve()
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def email_configured(self) -> bool:
        return bool(self.smtp_host and self.smtp_user)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
