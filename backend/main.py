# PART:   FastAPI Main App — entry point
# ACTOR:  Claude Opus 4.6 (bootstrap — Sonnet extends in Phase 19)
# PHASE:  4 — Voice AI Module (backend bootstrap)
# TASK:   FastAPI app with voice router mounted
# SCOPE:  IN: app init, CORS, router mounting
#         OUT: full auth, DB sessions, all other routers (Phase 19)

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config.settings import settings
from .routers.voice import router as voice_router
from .routers.health import router as health_router

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description="ARA MetaboliQ — AI Health-Fintech API",
)

# ── CORS (dev mode — tighten in production) ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.DEBUG else ["https://ara-metaboliq.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Route mounting ──
app.include_router(voice_router, prefix="/api/v1")
app.include_router(health_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    """Basic health check endpoint."""
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "hackathon_mode": settings.IS_HACKATHON,
    }
