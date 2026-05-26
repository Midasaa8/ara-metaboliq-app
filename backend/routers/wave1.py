# PART:   Wave 1 Router — Phase 20-25 endpoints
# ACTOR:  Claude Sonnet 4.6
# PHASE:  20s-25s — Wave 1 API endpoints
# TASK:   HTTP endpoints for Body Composition, Step/AZM, Sleep Score,
#         Health Score V2, Exercise Calculator, Medical OCR (text fallback)
#
# SECURITY: All inputs validated by Pydantic. Health Score server-side only.

from __future__ import annotations

import base64
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.services.body_composition import compute_body_composition
from backend.services.step_counter import process_step_data
from backend.services.active_zone import process_active_zone_minutes
from backend.services.sleep_score import compute_sleep_score
from backend.services.health_score_v2 import (
    compute_health_score_v2,
    VoiceWellness,
)
from backend.services.exercise_calculator import (
    calculate_calories,
    haversine_distance,
    calculate_pace,
    GpsCoord,
    compute_exercise_session,
    compute_weekly_stats,
)
from backend.services.medical_ocr import process_lab_text_fallback

router = APIRouter(prefix="/wave1", tags=["wave1"])


# ══════════════════════════════════════════════
#  Phase 20 — Body Composition
# ══════════════════════════════════════════════

class BodyCompositionRequest(BaseModel):
    height_cm:    float = Field(..., ge=100, le=250)
    weight_kg:    float = Field(..., ge=20, le=300)
    age:          int   = Field(..., ge=10, le=120)
    sex:          str   = Field(..., pattern="^(male|female|m|f)$")
    activity_level: str = Field(default="moderate",
                                pattern="^(sedentary|light|moderate|active|very_active)$")
    waist_cm:     Optional[float] = Field(default=None, ge=40, le=200)
    hip_cm:       Optional[float] = Field(default=None, ge=40, le=200)
    neck_cm:      Optional[float] = Field(default=None, ge=20, le=80)
    daily_calorie_intake: Optional[float] = Field(default=None, ge=0, le=10000)


@router.post("/body-composition")
async def body_composition(req: BodyCompositionRequest):
    """Phase 20: BMI, BMR, TDEE, Body Fat%, Stride.
    POST /api/v1/wave1/body-composition
    """
    result = compute_body_composition(
        height_cm=req.height_cm,
        weight_kg=req.weight_kg,
        age=req.age,
        sex=req.sex,
        activity_level=req.activity_level,
        waist_cm=req.waist_cm,
        hip_cm=req.hip_cm,
        neck_cm=req.neck_cm,
        daily_calorie_intake=req.daily_calorie_intake,
    )
    return {
        "bmi":           result.bmi,
        "bmi_class":     result.bmi_class,
        "bmr":           result.bmr,
        "tdee":          result.tdee,
        "body_fat_pct":  result.body_fat_pct,
        "stride_m":      result.stride_m,
        "calorie_target": result.calorie_target,
    }


# ══════════════════════════════════════════════
#  Phase 21 — Active Zone Minutes (HR-based or MET fallback)
# ══════════════════════════════════════════════

class AZMRequest(BaseModel):
    age:          int   = Field(..., ge=10, le=100)
    hr_samples:   Optional[list[float]] = Field(default=None)
    hr_sampling_interval_seconds: float = Field(default=60.0, ge=1, le=3600)
    met_value:    Optional[float] = Field(default=None, ge=1.0, le=20.0)
    duration_minutes: Optional[float] = Field(default=None, ge=1, le=480)


@router.post("/active-zone-minutes")
async def active_zone_minutes(req: AZMRequest):
    """Phase 21: AZM from HR samples or MET fallback.
    POST /api/v1/wave1/active-zone-minutes
    """
    return process_active_zone_minutes(
        age=req.age,
        hr_samples=req.hr_samples,
        hr_sampling_interval_seconds=req.hr_sampling_interval_seconds,
        met_value=req.met_value,
        duration_minutes=req.duration_minutes,
    )


# ══════════════════════════════════════════════
#  Phase 22 — Sleep Score
# ══════════════════════════════════════════════

class SleepScoreRequest(BaseModel):
    total_sleep_minutes:  float = Field(..., ge=0, le=960)
    deep_minutes:         float = Field(..., ge=0, le=480)
    rem_minutes:          float = Field(..., ge=0, le=480)
    time_in_bed_minutes:  float = Field(..., ge=0, le=1200)
    bedtimes_last_7_days: Optional[list[str]] = None
    prev_deep_pct:        Optional[float] = Field(default=None, ge=0, le=1)
    prev_consistency_score: Optional[float] = Field(default=None, ge=0, le=100)


@router.post("/sleep-score")
async def sleep_score(req: SleepScoreRequest):
    """Phase 22: Sleep Score (0-100) with 5-component breakdown + insights.
    POST /api/v1/wave1/sleep-score
    """
    result = compute_sleep_score(
        total_sleep_minutes=req.total_sleep_minutes,
        deep_minutes=req.deep_minutes,
        rem_minutes=req.rem_minutes,
        time_in_bed_minutes=req.time_in_bed_minutes,
        bedtimes_last_7_days=req.bedtimes_last_7_days,
        prev_deep_pct=req.prev_deep_pct,
        prev_consistency_score=req.prev_consistency_score,
    )
    return {
        "sleep_score":        result.sleep_score,
        "tier":               result.tier,
        "total_sleep_hours":  result.total_sleep_hours,
        "breakdown": {
            "duration":    result.duration_score,
            "deep_pct":    result.deep_pct_score,
            "rem_pct":     result.rem_pct_score,
            "consistency": result.consistency_score,
            "efficiency":  result.efficiency_score,
        },
        "insights": result.insights,
    }


# ══════════════════════════════════════════════
#  Phase 23 — Health Score V2
# ══════════════════════════════════════════════

class VoiceWellnessModel(BaseModel):
    stress:  float = Field(..., ge=0, le=100)
    burnout: float = Field(..., ge=0, le=100)
    anxiety: float = Field(..., ge=0, le=100)


class HealthScoreV2Request(BaseModel):
    steps:               int   = Field(..., ge=0, le=100000)
    azm:                 float = Field(..., ge=0, le=1000)
    sleep_score:         float = Field(..., ge=0, le=100)
    voice_wellness:      VoiceWellnessModel
    food_completeness:   float = Field(..., ge=0, le=1)
    macro_balance:       float = Field(..., ge=0, le=1)
    streak_days:         int   = Field(..., ge=0, le=365)
    reminders_responded: int   = Field(..., ge=0)
    reminders_sent:      int   = Field(..., ge=0)
    h_prev:              Optional[float] = Field(default=None, ge=0, le=100)
    score_history:       Optional[list[float]] = None


@router.post("/health-score")
async def health_score_v2(req: HealthScoreV2Request):
    """Phase 23: Health Score V2 with exponential smoothing.
    POST /api/v1/wave1/health-score
    """
    if req.reminders_sent > 0 and req.reminders_responded > req.reminders_sent:
        raise HTTPException(422, "reminders_responded cannot exceed reminders_sent")

    voice = VoiceWellness(
        stress=req.voice_wellness.stress,
        burnout=req.voice_wellness.burnout,
        anxiety=req.voice_wellness.anxiety,
    )
    result = compute_health_score_v2(
        steps=req.steps,
        azm=req.azm,
        sleep_score=req.sleep_score,
        voice_wellness=voice,
        food_completeness=req.food_completeness,
        macro_balance=req.macro_balance,
        streak_days=req.streak_days,
        reminders_responded=req.reminders_responded,
        reminders_sent=req.reminders_sent,
        h_prev=req.h_prev,
        score_history=req.score_history,
    )
    return {
        "score":      result.score,
        "h_raw":      result.h_raw,
        "tier":       result.tier,
        "breakdown":  result.breakdown,
        "trend_7d":   result.trend_7d,
        "updated_at": result.updated_at,
    }


# ══════════════════════════════════════════════
#  Phase 24 — Exercise Calculator
# ══════════════════════════════════════════════

class ExerciseCalcRequest(BaseModel):
    activity_type:  str   = Field(..., min_length=2, max_length=50)
    weight_kg:      float = Field(..., ge=20, le=300)
    duration_min:   float = Field(..., ge=1, le=480)
    gps_coords: Optional[list[dict]] = None   # [{"lat": float, "lon": float}]


@router.post("/exercise")
async def exercise_calculator(req: ExerciseCalcRequest):
    """Phase 24: Calories + GPS distance + pace.
    POST /api/v1/wave1/exercise
    """
    gps: Optional[list[GpsCoord]] = None
    if req.gps_coords:
        gps = [GpsCoord(lat=p["lat"], lon=p["lon"]) for p in req.gps_coords]

    result = compute_exercise_session(
        activity_type=req.activity_type,
        weight_kg=req.weight_kg,
        duration_min=req.duration_min,
        gps_coords=gps,
    )
    return {
        "activity_type":   result.activity_type,
        "duration_min":    result.duration_min,
        "calories":        result.calories,
        "distance_km":     result.distance_km,
        "pace_min_per_km": result.pace_min_per_km,
    }


# ══════════════════════════════════════════════
#  Phase 25 — Medical OCR (text fallback for hackathon demo)
# ══════════════════════════════════════════════

class LabTextRequest(BaseModel):
    raw_text: str = Field(..., min_length=5, max_length=10000)
    sex:      Optional[str] = Field(default=None, pattern="^(male|female|m|f)$")


@router.post("/ocr/text")
async def ocr_text_fallback(req: LabTextRequest):
    """Phase 25: Parse lab results from plain text (no image needed).
    Hackathon demo mode — full PaddleOCR image mode via POST /ocr/scan.
    POST /api/v1/wave1/ocr/text
    """
    results = process_lab_text_fallback(req.raw_text, sex=req.sex)
    return {
        "results": [
            {
                "test":          r.test,
                "value":         r.value,
                "unit":          r.unit,
                "normal_range":  r.normal_range,
                "status":        r.status,
                "status_display": r.status_display,
                "loinc":         r.loinc,
                "confidence":    r.confidence,
            }
            for r in results
        ],
        "count":      len(results),
        "disclaimer": (
            "These results are wellness insights only and NOT medical diagnoses. "
            "Please consult a qualified healthcare professional for interpretation."
        ),
    }
