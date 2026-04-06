# PART:   Backend Config — settings and environment
# ACTOR:  Claude Opus 4.6 (bootstrap — Sonnet takes over in Phase 19)
# PHASE:  4 — Voice AI Module (backend bootstrap)
# TASK:   Centralized config for FastAPI backend

from __future__ import annotations

import os


class Settings:
    """Application settings loaded from environment variables."""

    APP_NAME: str = "ARA MetaboliQ API"
    DEBUG: bool = os.getenv("DEBUG", "true").lower() in ("true", "1")
    IS_HACKATHON: bool = os.getenv("IS_HACKATHON", "true").lower() in ("true", "1", "yes")

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://ara:ara_dev@localhost:5432/ara_metaboliq",
    )

    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # JWT
    JWT_SECRET: str = os.getenv("JWT_SECRET", "CHANGE_ME_IN_PRODUCTION")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_TTL_MIN: int = 15
    REFRESH_TOKEN_TTL_DAYS: int = 7

    # Voice AI
    VOICE_MODEL_DIR: str = os.getenv("VOICE_MODEL_DIR", "backend/models/voice")
    MAX_AUDIO_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB


settings = Settings()
