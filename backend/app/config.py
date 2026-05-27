"""
Application configuration loaded from environment variables.

Supports SQLite (local dev) and PostgreSQL (production) with no code changes.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import List

from dotenv import load_dotenv


# ── load .env from the backend directory ──────────────────────────────────
_dotenv_path = Path(__file__).resolve().parents[1] / ".env"
if _dotenv_path.exists():
    load_dotenv(_dotenv_path)


def _parse_cors_origins() -> List[str]:
    raw = os.getenv("CORS_ORIGINS", "*")
    if raw == "*":
        return ["*"]

    return [origin.strip() for origin in raw.split(",") if origin.strip()]


@dataclass(frozen=True)
class Settings:
    app_env: str = field(
        default_factory=lambda: os.getenv(
            "APP_ENV", os.getenv("ENVIRONMENT", "development")
        ).lower()
    )

    @property
    def is_production(self) -> bool:
        return self.app_env in {"prod", "production"}

    @property
    def is_deployed(self) -> bool:
        return self.app_env in {"staging", "stage", "prod", "production"}

    # ── Database ────────────────────────────────────────────────────────────
    database_url: str = field(
        default_factory=lambda: os.getenv(
            "DATABASE_URL", "sqlite:///./trades.db"
        )
    )

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    # ── JWT ────────────────────────────────────────────────────────────────
    jwt_secret_key: str = field(
        default_factory=lambda: os.getenv(
            "JWT_SECRET_KEY", "change-this-dev-secret-before-deployment"
        )
    )
    access_token_expire_minutes: int = field(
        default_factory=lambda: int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    )

    # ── CORS ───────────────────────────────────────────────────────────────
    cors_origins: List[str] = field(default_factory=_parse_cors_origins)

    # ── Server ─────────────────────────────────────────────────────────────
    host: str = field(default_factory=lambda: os.getenv("HOST", "0.0.0.0"))
    port: int = field(default_factory=lambda: int(os.getenv("PORT", "8000")))
    enable_api_docs: bool = field(
        default_factory=lambda: os.getenv("ENABLE_API_DOCS", "").lower()
        in {"1", "true", "yes", "on"}
    )

    @property
    def docs_enabled(self) -> bool:
        return self.enable_api_docs or not self.is_deployed

    def __post_init__(self) -> None:
        if not self.is_deployed:
            return

        insecure_secrets = {
            "",
            "change-this-dev-secret-before-deployment",
        }

        if self.jwt_secret_key in insecure_secrets or len(self.jwt_secret_key) < 32:
            raise RuntimeError(
                "JWT_SECRET_KEY must be set to a strong non-default value in deployed environments."
            )

        if self.is_sqlite:
            raise RuntimeError(
                "DATABASE_URL must point to PostgreSQL in deployed environments."
            )

        if self.cors_origins == ["*"]:
            raise RuntimeError(
                "CORS_ORIGINS must be restricted in deployed environments."
            )


# ── Singleton ─────────────────────────────────────────────────────────────
settings = Settings()
