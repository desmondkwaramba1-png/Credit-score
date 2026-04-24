"""
Application configuration loaded from environment variables / .env file.
Uses pydantic-settings for validation and type coercion.
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache


class Settings(BaseSettings):
    # ── App ────────────────────────────────────────────────────────────────────
    app_name: str = Field(default="CredAI Credit Scoring", env="APP_NAME")
    app_version: str = Field(default="1.0.0", env="APP_VERSION")
    app_env: str = Field(default="development", env="APP_ENV")
    debug: bool = Field(default=False, env="DEBUG")

    # ── Database ───────────────────────────────────────────────────────────────
    database_url: str = Field(
        default="postgresql://postgres:password@localhost:5432/credit_scoring_db",
        env="DATABASE_URL",
    )

    # ── Security ───────────────────────────────────────────────────────────────
    jwt_secret: str = Field(
        default="super-secret-key-change-in-production",
        env="JWT_SECRET",
    )

    # ── CORS ───────────────────────────────────────────────────────────────────
    # Comma-separated list of allowed origins.  In production set this in .env.
    cors_origins_raw: str = Field(
        default="http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174",
        env="CORS_ORIGINS",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins_raw.split(",") if o.strip()]

    # ── Rate Limiting ──────────────────────────────────────────────────────────
    rate_limit: str = Field(default="100/minute", env="RATE_LIMIT")

    # ── ML ─────────────────────────────────────────────────────────────────────
    model_path: str = Field(default="app/ml/model.pkl", env="MODEL_PATH")
    model_url: str | None = Field(default=None, env="MODEL_URL")

    # ── Redis (optional — for rate limiting backend) ────────────────────────────
    redis_url: str | None = Field(default=None, env="REDIS_URL")

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore"
    }


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance – call this everywhere instead of instantiating Settings()."""
    return Settings()
