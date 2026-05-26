# PART:   Stress Management Score — voice + HRV + sleep composite
# ACTOR:  Claude Opus 4.6
# PHASE:  27 — Stress Score
# TASK:   Compute composite stress from voice mood, HRV, and sleep quality
# SCOPE:  IN: mood_score (Phase 26), hrv_rmssd (Health Connect), sleep_score (Phase 22)
#         OUT: { stress_score, level, message, trend }
#
# ══════ COMPOSITE STRESS SCORE ══════
# Stress_Score = 0.40 × voice_stress + 0.30 × hrv_stress + 0.30 × sleep_stress
#
# ── Voice Stress (Phase 26 output) ──
# voice_stress = 100 - mood_score  (inverse of mood wellness)
#
# ── HRV Stress (if Health Connect HRV available) ──
# hrv_stress = 100 - normalize(RMSSD, min=10, max=100) × 100
# RMSSD < 20ms = high stress, > 60ms = relaxed
# If HRV not available: weight redistributed to voice (0.55) + sleep (0.45)
#
# ── Sleep Quality Stress ──
# sleep_stress = 100 - Sleep_Score  (bad sleep = high stress indicator)
#
# ══════ STRESS LEVELS ══════
# 0-25:   Low        "Bạn đang rất thư giãn 🌿"
# 25-50:  Moderate   "Mức stress bình thường 👌"
# 50-75:  Elevated   "Stress hơi cao — thử thở sâu 🧘"
# 75-100: High       "Stress cao — nên nghỉ ngơi và tham khảo chuyên gia"
#
# ══════ DAILY TREND ══════
# stress_trend = linear_regression_slope(stress_scores[-7:])
# Positive slope = stress increasing → alert notification

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

# ── Weights ──
WEIGHT_VOICE = 0.40
WEIGHT_HRV = 0.30
WEIGHT_SLEEP = 0.30

# Fallback weights when HRV not available
WEIGHT_VOICE_NO_HRV = 0.55
WEIGHT_SLEEP_NO_HRV = 0.45

# ── HRV normalization range ──
RMSSD_MIN = 10.0   # ms — very high stress baseline
RMSSD_MAX = 100.0  # ms — very relaxed baseline

# ── Stress level thresholds and messages ──
STRESS_LEVELS = {
    "low": {
        "range": (0, 25),
        "message": "Bạn đang rất thư giãn 🌿",
    },
    "moderate": {
        "range": (25, 50),
        "message": "Mức stress bình thường 👌",
    },
    "elevated": {
        "range": (50, 75),
        "message": "Stress hơi cao — thử thở sâu 🧘",
    },
    "high": {
        "range": (75, 100),
        "message": "Stress cao — nên nghỉ ngơi và tham khảo chuyên gia",
    },
}


@dataclass
class StressResult:
    """Result from stress score computation."""
    stress_score: float         # 0-100, higher = more stressed
    level: str                  # "low", "moderate", "elevated", "high"
    message: str                # Vietnamese UI message
    voice_stress: float         # component: 100 - mood_score
    hrv_stress: Optional[float] # component: 100 - normalize(RMSSD)×100
    sleep_stress: float         # component: 100 - sleep_score
    hrv_available: bool         # whether HRV was used
    trend_slope: Optional[float]  # 7-day trend slope (positive = worsening)
    trend_direction: Optional[str]  # "improving", "stable", "worsening"


def normalize_rmssd(rmssd_ms: float) -> float:
    """Normalize RMSSD to [0, 1] range.

    normalize(RMSSD, min=10, max=100)
    0 = very stressed (RMSSD=10ms), 1 = very relaxed (RMSSD=100ms)
    """
    # Clamp to [RMSSD_MIN, RMSSD_MAX]
    clamped = max(RMSSD_MIN, min(RMSSD_MAX, rmssd_ms))
    # Linear normalization
    normalized = (clamped - RMSSD_MIN) / (RMSSD_MAX - RMSSD_MIN)
    return normalized


def classify_stress_level(stress_score: float) -> tuple[str, str]:
    """Classify stress score into level and message.

    Parameters
    ----------
    stress_score : float
        Stress score [0, 100].

    Returns
    -------
    tuple[str, str]
        (level_name, message)
    """
    for level_name, info in STRESS_LEVELS.items():
        low, high = info["range"]
        if low <= stress_score < high:
            return level_name, info["message"]

    # Edge case: score == 100
    return "high", STRESS_LEVELS["high"]["message"]


def compute_trend_slope(stress_scores: list[float]) -> Optional[float]:
    """Compute linear regression slope of recent stress scores.

    stress_trend = linear_regression_slope(stress_scores[-7:])
    Positive slope = stress increasing

    Parameters
    ----------
    stress_scores : list[float]
        Historical stress scores (most recent last).

    Returns
    -------
    float or None
        Slope of trend line, or None if insufficient data.
    """
    scores = stress_scores[-7:]  # last 7 days
    if len(scores) < 3:
        return None

    x = np.arange(len(scores), dtype=np.float64)
    y = np.array(scores, dtype=np.float64)

    # Linear regression: y = mx + b
    # slope m = (n*Σxy - Σx*Σy) / (n*Σx² - (Σx)²)
    n = len(x)
    sum_x = np.sum(x)
    sum_y = np.sum(y)
    sum_xy = np.sum(x * y)
    sum_x2 = np.sum(x * x)

    denominator = n * sum_x2 - sum_x * sum_x
    if abs(denominator) < 1e-10:
        return 0.0

    slope = (n * sum_xy - sum_x * sum_y) / denominator
    return round(float(slope), 3)


def classify_trend(slope: Optional[float]) -> Optional[str]:
    """Classify trend direction from slope.

    Parameters
    ----------
    slope : float or None
        Linear regression slope.

    Returns
    -------
    str or None
        "improving" (negative slope), "stable", or "worsening" (positive slope).
    """
    if slope is None:
        return None
    if slope > 2.0:
        return "worsening"
    elif slope < -2.0:
        return "improving"
    else:
        return "stable"


def calculate_stress(
    mood_score: float,
    sleep_score: float,
    hrv_rmssd: Optional[float] = None,
    stress_history: Optional[list[float]] = None,
) -> StressResult:
    """Calculate composite stress score.

    Stress_Score = 0.40 × voice_stress + 0.30 × hrv_stress + 0.30 × sleep_stress

    If HRV not available:
    Stress_Score = 0.55 × voice_stress + 0.45 × sleep_stress

    Parameters
    ----------
    mood_score : float
        Mood pattern score from Phase 26 voice analysis [0-100].
        Higher = better mood = less stress.
    sleep_score : float
        Sleep score from Phase 22 [0-100].
        Higher = better sleep = less stress.
    hrv_rmssd : float, optional
        RMSSD value in milliseconds from Health Connect.
        If None, HRV weight is redistributed.
    stress_history : list[float], optional
        Previous stress scores for trend calculation.

    Returns
    -------
    StressResult
        Complete stress assessment with score, level, message, and trend.
    """
    # ── Voice Stress ──
    # voice_stress = 100 - mood_score  (inverse of mood wellness)
    voice_stress = 100.0 - float(np.clip(mood_score, 0.0, 100.0))

    # ── Sleep Stress ──
    # sleep_stress = 100 - Sleep_Score
    sleep_stress = 100.0 - float(np.clip(sleep_score, 0.0, 100.0))

    # ── HRV Stress ──
    hrv_available = hrv_rmssd is not None
    hrv_stress: Optional[float] = None

    if hrv_available:
        # hrv_stress = 100 - normalize(RMSSD, min=10, max=100) × 100
        normalized = normalize_rmssd(hrv_rmssd)
        hrv_stress = 100.0 - normalized * 100.0

        # Composite with all 3 components
        # Stress_Score = 0.40 × voice_stress + 0.30 × hrv_stress + 0.30 × sleep_stress
        stress_score = (
            WEIGHT_VOICE * voice_stress
            + WEIGHT_HRV * hrv_stress
            + WEIGHT_SLEEP * sleep_stress
        )
    else:
        # No HRV → redistribute weight
        # Stress_Score = 0.55 × voice_stress + 0.45 × sleep_stress
        stress_score = (
            WEIGHT_VOICE_NO_HRV * voice_stress
            + WEIGHT_SLEEP_NO_HRV * sleep_stress
        )

    # Clamp final score
    stress_score = float(np.clip(stress_score, 0.0, 100.0))
    stress_score = round(stress_score, 2)

    # ── Classify level ──
    level, message = classify_stress_level(stress_score)

    # ── Trend ──
    trend_slope = None
    trend_direction = None
    if stress_history:
        trend_slope = compute_trend_slope(stress_history)
        trend_direction = classify_trend(trend_slope)

    return StressResult(
        stress_score=stress_score,
        level=level,
        message=message,
        voice_stress=round(voice_stress, 2),
        hrv_stress=round(hrv_stress, 2) if hrv_stress is not None else None,
        sleep_stress=round(sleep_stress, 2),
        hrv_available=hrv_available,
        trend_slope=trend_slope,
        trend_direction=trend_direction,
    )
