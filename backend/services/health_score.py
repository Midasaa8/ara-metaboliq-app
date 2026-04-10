# PART:   HealthScoreEngine — server-side H_score computation
# ACTOR:  Claude Opus 4.6
# PHASE:  16 — Health Score Server
# TASK:   Compute H_score từ 5 tiêu chí (hackathon) hoặc 7 tiêu chí (full product)
# SCOPE:  IN: sub-scores from mobile/other services
#         OUT: { score, tier, breakdown }
#
# SECURITY: Health Score NEVER computed on client.
#           Server validates all sub-scores are physiologically plausible.
#
# Source: Tong_Hop_Thuat_Toan §3 — Health Score Formula

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any, Optional

# ══════════════════════════════════════════════
#  Constants
# ══════════════════════════════════════════════

# Hackathon weights (5 criteria)
HACKATHON_WEIGHTS = {
    "exercise": 0.25,
    "sleep": 0.20,
    "voice": 0.25,
    "nutrition": 0.15,
    "discipline": 0.15,
}

# Full product weights (7 criteria)
FULL_PRODUCT_WEIGHTS = {
    "exercise": 0.20,
    "sleep": 0.15,
    "voice": 0.20,
    "nutrition": 0.10,
    "discipline": 0.10,
    "patch_vitals": 0.15,
    "chronos": 0.10,
}

IS_HACKATHON = True

# Score tier boundaries
TIER_MAP = [
    (90, "Excellent"),
    (75, "Good"),
    (60, "Fair"),
    (0, "Poor"),
]

# Validation bounds (reject if input > 2× max)
INPUT_BOUNDS = {
    "exercise_reps": (0, 500),
    "sleep_min": (0, 960),       # max 16h
    "deep_sleep_min": (0, 480),
    "rem_min": (0, 480),
    "voice_recovery": (0.0, 1.0),
    "nutrition_score": (0, 100),
    "streak_days": (0, 365),
}


# ══════════════════════════════════════════════
#  Sub-score Computations
# ══════════════════════════════════════════════

def compute_exercise_score(reps_today: int, target_reps: int = 50) -> float:
    """E = min(reps_today / target_reps, 1.0) × 100

    Parameters
    ----------
    reps_today : int
        Total reps across all exercises today.
    target_reps : int
        Daily target (default: 50).

    Returns
    -------
    float
        Exercise score [0, 100].
    """
    if target_reps <= 0:
        return 0.0
    return min(reps_today / target_reps, 1.0) * 100


def compute_sleep_score(
    total_min: float,
    deep_min: float = 0,
    rem_min: float = 0,
) -> float:
    """S = min(total_sleep_min / 480, 1.0) × 100 + bonuses/penalties

    Bonus: +5 if deep_sleep > 90min, +5 if REM > 60min
    Penalty: -10 if total < 360min (6h)

    Parameters
    ----------
    total_min : float
        Total sleep in minutes.
    deep_min : float
        Deep sleep in minutes.
    rem_min : float
        REM sleep in minutes.

    Returns
    -------
    float
        Sleep score [0, 100].
    """
    base = min(total_min / 480.0, 1.0) * 100

    bonus = 0
    if deep_min > 90:
        bonus += 5
    if rem_min > 60:
        bonus += 5

    penalty = 0
    if total_min < 360:
        penalty = 10

    return max(0, min(base + bonus - penalty, 100))


def compute_voice_score(recovery_readiness: float) -> float:
    """V = recovery_readiness × 100

    Parameters
    ----------
    recovery_readiness : float
        Voice AI recovery readiness [0.0, 1.0].

    Returns
    -------
    float
        Voice score [0, 100].
    """
    return max(0, min(recovery_readiness * 100, 100))


def compute_discipline_score(streak_days: int) -> float:
    """D = min(streak_days / 7, 1.0) × 100

    streak = consecutive days with ≥1 voice check.

    Parameters
    ----------
    streak_days : int
        Number of consecutive active days.

    Returns
    -------
    float
        Discipline score [0, 100].
    """
    return min(streak_days / 7.0, 1.0) * 100


# ══════════════════════════════════════════════
#  Tier Classification
# ══════════════════════════════════════════════

def classify_tier(score: float) -> str:
    """Map score to tier label.

    90-100: Excellent
    75-89:  Good
    60-74:  Fair
    0-59:   Poor
    """
    for threshold, label in TIER_MAP:
        if score >= threshold:
            return label
    return "Poor"


# ══════════════════════════════════════════════
#  Input Validation
# ══════════════════════════════════════════════

def validate_inputs(data: dict[str, Any]) -> Optional[str]:
    """Validate all inputs are within bounds.

    Returns error message string if invalid, None if OK.
    """
    for key, (lo, hi) in INPUT_BOUNDS.items():
        if key not in data:
            continue
        val = data[key]
        if not isinstance(val, (int, float)):
            return f"{key} must be a number"
        if val < lo:
            return f"{key} must be >= {lo}"
        if val > hi * 2:
            return f"{key} exceeds maximum ({hi * 2})"
    return None


# ══════════════════════════════════════════════
#  Main Health Score Computation
# ══════════════════════════════════════════════

def compute_health_score(
    exercise_reps: int = 0,
    sleep_min: float = 0,
    deep_sleep_min: float = 0,
    rem_min: float = 0,
    voice_recovery: float = 0.0,
    nutrition_score: float = 70,
    streak_days: int = 0,
    patch_vitals_score: float = 0,
    chronos_score: float = 0,
) -> dict[str, Any]:
    """Compute Health Score from sub-criteria.

    Hackathon (5 criteria):
      H = 0.25×E + 0.20×S + 0.25×V + 0.15×N + 0.15×D

    Full Product (7 criteria):
      H = 0.20×E + 0.15×S + 0.20×V + 0.10×N + 0.10×D + 0.15×P + 0.10×C

    Parameters
    ----------
    exercise_reps : int
        Total reps today.
    sleep_min : float
        Total sleep in minutes.
    deep_sleep_min : float
        Deep sleep in minutes.
    rem_min : float
        REM sleep in minutes.
    voice_recovery : float
        Recovery readiness from Voice AI [0.0, 1.0].
    nutrition_score : float
        Nutrition score [0, 100]. Hackathon: fixed 70.
    streak_days : int
        Consecutive active days.
    patch_vitals_score : float
        Vital sign stability score [0, 100]. Full product only.
    chronos_score : float
        Circadian rhythm compliance [0, 100]. Full product only.

    Returns
    -------
    dict
        { score, tier, breakdown, weights, computed_at }
    """
    # Compute sub-scores
    e = compute_exercise_score(exercise_reps)
    s = compute_sleep_score(sleep_min, deep_sleep_min, rem_min)
    v = compute_voice_score(voice_recovery)
    n = max(0, min(nutrition_score, 100))
    d = compute_discipline_score(streak_days)

    breakdown = {
        "exercise": round(e, 1),
        "sleep": round(s, 1),
        "voice": round(v, 1),
        "nutrition": round(n, 1),
        "discipline": round(d, 1),
    }

    if IS_HACKATHON:
        weights = HACKATHON_WEIGHTS
        # H = 0.25×E + 0.20×S + 0.25×V + 0.15×N + 0.15×D
        score = (
            weights["exercise"] * e
            + weights["sleep"] * s
            + weights["voice"] * v
            + weights["nutrition"] * n
            + weights["discipline"] * d
        )
    else:
        weights = FULL_PRODUCT_WEIGHTS
        p = max(0, min(patch_vitals_score, 100))
        c = max(0, min(chronos_score, 100))
        breakdown["patch_vitals"] = round(p, 1)
        breakdown["chronos"] = round(c, 1)
        # H = 0.20×E + 0.15×S + 0.20×V + 0.10×N + 0.10×D + 0.15×P + 0.10×C
        score = (
            weights["exercise"] * e
            + weights["sleep"] * s
            + weights["voice"] * v
            + weights["nutrition"] * n
            + weights["discipline"] * d
            + weights["patch_vitals"] * p
            + weights["chronos"] * c
        )

    score = max(0, min(round(score), 100))
    tier = classify_tier(score)

    return {
        "score": score,
        "tier": tier,
        "breakdown": breakdown,
        "weights": weights,
        "is_hackathon": IS_HACKATHON,
        "computed_at": int(time.time() * 1000),
    }
