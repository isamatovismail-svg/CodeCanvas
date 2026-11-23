import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

DEFAULT_DEV_SECRET = "codecanvas-insecure-development-secret-key-replace-in-prod-xyz-2025"


class Settings(BaseSettings):
    PROJECT_NAME: str = "CodeCanvas"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"  # "development", "test", "production"
    
    SECRET_KEY: str = DEFAULT_DEV_SECRET
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Defaults to SQLite async for seamless out-of-the-box local operation; configurable to PostgreSQL
    DATABASE_URL: str = "sqlite+aiosqlite:///./codecanvas.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ]
    
    UPLOAD_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../uploads"))
    MAX_UPLOAD_SIZE_BYTES: int = 25 * 1024 * 1024  # 25MB
    
    # AI Assistant Keys (Optional - gracefully fallback if not configured)
    OPENAI_API_KEY: str | None = None
    ANTHROPIC_API_KEY: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str, info) -> str:
        env = os.getenv("ENVIRONMENT", "development").lower()
        if env == "production":
            if v == DEFAULT_DEV_SECRET or len(v) < 32:
                raise ValueError(
                    "CRITICAL SECURITY CONFIGURATION ERROR: In production mode, "
                    "a secure non-default SECRET_KEY with at least 32 characters must be provided."
                )
        return v


settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
