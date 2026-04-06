# PART:   Voice Router — POST /voice/analyze + GET /voice/history
# ACTOR:  Claude Opus 4.6 (bootstrap — Sonnet owns routers in Phase 19)
# PHASE:  4 — Voice AI Module
# TASK:   HTTP endpoints for voice analysis pipeline
# SCOPE:  IN: receive audio, return analysis result, query history
#         OUT: algorithm logic (voice_ai.py), model training (ai-models/)
#
# Endpoints:
#   POST /voice/analyze   — Upload audio → MARVEL pipeline → result
#   GET  /voice/history/{user_id} — Retrieve past analyses + trend

from __future__ import annotations

import base64
import logging
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from ..services.voice_ai import analyze_voice
from ..services.voice_trend import compare_vs_yesterday, compute_trend

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice", tags=["voice"])


# ── Request / Response Models ──

class VoiceAnalyzeRequest(BaseModel):
    """Request body for POST /voice/analyze."""
    audio: str = Field(..., description="Base64-encoded PCM audio (16kHz, 16-bit signed LE, mono)")
    sample_rate: int = Field(default=16000, ge=8000, le=48000)
    duration_ms: int = Field(default=5000, ge=3000, le=15000)
    user_id: str | None = Field(default=None, description="User UUID for history tracking")


class VoiceSubScores(BaseModel):
    energy: int = Field(ge=0, le=100)
    stress: int = Field(ge=0, le=100)
    cardiac_recovery: int = Field(ge=0, le=100)
    respiratory: int = Field(ge=0, le=100)


class VoiceAnalyzeResponse(BaseModel):
    """Response from POST /voice/analyze."""
    recovery_readiness_score: int = Field(ge=0, le=100)
    sub_scores: VoiceSubScores
    condition_risks: dict[str, float]
    overall_neurological: float
    overall_respiratory: float
    overall_voice_disorder: float
    snr_db: float
    flags: list[str]
    inference_ms: float
    model_version: str
    # comparison vs yesterday (if user_id provided + has history)
    comparison: dict[str, Any] | None = None


class VoiceHistoryResponse(BaseModel):
    """Response from GET /voice/history/{user_id}."""
    trend_7d: dict[str, Any]
    trend_30d: dict[str, Any]
    trend_90d: dict[str, Any]
    recent_analyses: list[dict[str, Any]]


# ── In-memory store for hackathon (replaced by PostgreSQL in Phase 19) ──
_voice_history: dict[str, list[dict[str, Any]]] = {}


# ── Endpoints ──

@router.post("/analyze", response_model=VoiceAnalyzeResponse)
async def voice_analyze(req: VoiceAnalyzeRequest) -> VoiceAnalyzeResponse:
    """Analyze a voice recording using the MARVEL pipeline.

    1. Decode base64 audio
    2. Run SNR check + feature extraction + classification
    3. Store result in history
    4. Compare with yesterday if available
    5. Return structured result
    """
    # Decode base64 → raw PCM bytes
    try:
        pcm_bytes = base64.b64decode(req.audio)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid base64 audio data: {exc}",
        )

    # Validate audio size (max 5 MB)
    if len(pcm_bytes) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Audio data exceeds 5 MB limit",
        )

    # Run MARVEL pipeline
    try:
        result = analyze_voice(
            pcm_bytes=pcm_bytes,
            sample_rate=req.sample_rate,
            user_id=req.user_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )

    # Store in hackathon in-memory history
    user_key = req.user_id or "anonymous"
    from datetime import date
    record = {
        **result,
        "date": str(date.today()),
        "user_id": user_key,
    }

    if user_key not in _voice_history:
        _voice_history[user_key] = []
    _voice_history[user_key].append(record)

    # Compare with yesterday
    comparison = None
    user_history = _voice_history.get(user_key, [])
    if len(user_history) >= 2:
        comparison = compare_vs_yesterday(
            today_result=result,
            yesterday_result=user_history[-2],
        )

    # Build response (exclude features_88d from API response — stored only)
    return VoiceAnalyzeResponse(
        recovery_readiness_score=result["recovery_readiness_score"],
        sub_scores=VoiceSubScores(**result["sub_scores"]),
        condition_risks=result["condition_risks"],
        overall_neurological=result["overall_neurological"],
        overall_respiratory=result["overall_respiratory"],
        overall_voice_disorder=result["overall_voice_disorder"],
        snr_db=result["snr_db"],
        flags=result["flags"],
        inference_ms=result["inference_ms"],
        model_version=result["model_version"],
        comparison=comparison,
    )


@router.get("/history/{user_id}", response_model=VoiceHistoryResponse)
async def voice_history(user_id: str) -> VoiceHistoryResponse:
    """Retrieve voice analysis history with trend calculations.

    Returns 7/30/90-day trends and recent analyses.
    """
    history = _voice_history.get(user_id, [])

    return VoiceHistoryResponse(
        trend_7d=compute_trend(history, window_days=7),
        trend_30d=compute_trend(history, window_days=30),
        trend_90d=compute_trend(history, window_days=90),
        recent_analyses=[
            {
                "date": h["date"],
                "recovery_readiness_score": h["recovery_readiness_score"],
                "sub_scores": h["sub_scores"],
                "flags": h["flags"],
            }
            for h in history[-10:]  # Last 10 records
        ],
    )
