# PART:   Health Score Router — POST /health/score endpoint
# ACTOR:  Claude Opus 4.6
# PHASE:  16 — Health Score Server
# TASK:   API endpoint for server-side health score computation
# SCOPE:  IN: sub-score inputs | OUT: { score, tier, breakdown }

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from backend.services.health_score import compute_health_score, validate_inputs

router = APIRouter(prefix="/health", tags=["health"])


class HealthScoreRequest(BaseModel):
    exercise_reps: int = Field(default=0, ge=0, le=1000)
    sleep_min: float = Field(default=0, ge=0, le=960)
    deep_sleep_min: float = Field(default=0, ge=0, le=480)
    rem_min: float = Field(default=0, ge=0, le=480)
    voice_recovery: float = Field(default=0.0, ge=0.0, le=1.0)
    nutrition_score: float = Field(default=70, ge=0, le=100)
    streak_days: int = Field(default=0, ge=0, le=365)
    # Full product only
    patch_vitals_score: Optional[float] = Field(default=None, ge=0, le=100)
    chronos_score: Optional[float] = Field(default=None, ge=0, le=100)


@router.post("/score")
async def calculate_health_score(req: HealthScoreRequest):
    """Compute Health Score from sub-criteria.

    Hackathon: H = 0.25×E + 0.20×S + 0.25×V + 0.15×N + 0.15×D
    """
    # Validate
    data = req.model_dump()
    error = validate_inputs(data)
    if error:
        raise HTTPException(status_code=422, detail=error)

    result = compute_health_score(
        exercise_reps=req.exercise_reps,
        sleep_min=req.sleep_min,
        deep_sleep_min=req.deep_sleep_min,
        rem_min=req.rem_min,
        voice_recovery=req.voice_recovery,
        nutrition_score=req.nutrition_score,
        streak_days=req.streak_days,
        patch_vitals_score=req.patch_vitals_score or 0,
        chronos_score=req.chronos_score or 0,
    )
    return result
