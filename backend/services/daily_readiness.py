# PART:   Daily Readiness — multi-factor readiness scoring
# ACTOR:  Claude Opus 4.6
# PHASE:  31 — Daily Readiness Score
# TASK:   Compute daily readiness from sleep, recovery, activity, stress, consistency
# SCOPE:  IN: sleep_data, hrv_data, exercise_history, stress_score, bedtime_history
#         OUT: { readiness_score, level, components, recommendation }
#
# ══════ FORMULA ══════
# Readiness = 0.30 × sleep_score
#           + 0.25 × recovery_score
#           + 0.20 × activity_balance
#           + 0.15 × stress_inverse
#           + 0.10 × consistency_bonus
#
# ══════ RECOVERY SCORE ══════
# If HRV available:
#   recovery = normalize(RMSSD_morning, user_baseline) × 100
#   normalize(x, baseline) = min(1.0, x / baseline)
# Else (fallback):
#   recovery = (sleep_efficiency × 0.5 + deep_sleep_pct × 0.5) × 100
#
# ══════ ACTIVITY BALANCE (Goldilocks Principle) ══════
# recent_load = Σ(exercise_minutes, last_3_days)
# usual_load = mean(exercise_minutes, last_14_days) × 3
# balance = 1 - |recent_load - usual_load| / usual_load
# activity_balance = max(0, min(100, balance × 100))
# Idea: not too much, not too little — just right
#
# ══════ STRESS INVERSE ══════
# stress_inverse = 100 - Stress_Score (from Phase 27)
#
# ══════ CONSISTENCY BONUS ══════
# bedtime_regular: std(bedtime_last_7_days) ≤ 30min → 50 points
# exercise_regular: ≥ 3 exercise sessions in last 7 days → 50 points
# consistency_bonus = (bedtime_regular + exercise_regular)
#
# ══════ READINESS LEVELS ══════
# REST:     0-30   → "Hôm nay nên nghỉ ngơi — cơ thể cần hồi phục"
# LIGHT:    30-60  → "Vận động nhẹ — yoga, đi bộ, stretching"
# MODERATE: 60-80  → "Sẵn sàng tập trung bình — có thể cardio/strength"
# PEAK:     80-100 → "Peak performance — tập nặng hoặc thi đấu nếu muốn"

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

# ── Weight constants ──
W_SLEEP = 0.30
W_RECOVERY = 0.25
W_ACTIVITY = 0.20
W_STRESS = 0.15
W_CONSISTENCY = 0.10

# ── Activity balance constants ──
RECENT_LOAD_DAYS = 3
USUAL_LOAD_DAYS = 14

# ── Consistency constants ──
BEDTIME_REGULAR_THRESHOLD_MIN = 30  # ±30 minutes
EXERCISE_REGULAR_THRESHOLD = 3       # 3+ sessions per week
BEDTIME_REGULAR_POINTS = 50
EXERCISE_REGULAR_POINTS = 50

# ── Readiness levels ──
LEVEL_REST = "REST"
LEVEL_LIGHT = "LIGHT"
LEVEL_MODERATE = "MODERATE"
LEVEL_PEAK = "PEAK"

LEVEL_THRESHOLDS = [
    (0, 30, LEVEL_REST),
    (30, 60, LEVEL_LIGHT),
    (60, 80, LEVEL_MODERATE),
    (80, 100, LEVEL_PEAK),
]

LEVEL_MESSAGES = {
    LEVEL_REST: "Hôm nay nên nghỉ ngơi — cơ thể cần hồi phục",
    LEVEL_LIGHT: "Vận động nhẹ — yoga, đi bộ, stretching",
    LEVEL_MODERATE: "Sẵn sàng tập trung bình — có thể cardio/strength",
    LEVEL_PEAK: "Peak performance — tập nặng hoặc thi đấu nếu muốn",
}


@dataclass
class ReadinessComponents:
    """Individual components of readiness score."""
    sleep_score: float           # 0-100
    recovery_score: float        # 0-100
    activity_balance: float      # 0-100
    stress_inverse: float        # 0-100
    consistency_bonus: float     # 0-100
    # Weighted contributions
    sleep_contrib: float
    recovery_contrib: float
    activity_contrib: float
    stress_contrib: float
    consistency_contrib: float


@dataclass
class ReadinessReport:
    """Daily readiness score report."""
    readiness_score: float       # 0-100
    level: str                   # REST, LIGHT, MODERATE, PEAK
    message: str                 # Vietnamese recommendation
    components: ReadinessComponents
    recovery_method: str         # "hrv" or "fallback"


# ══════════════════════════════════════════════════════════════════
#  RECOVERY SCORE
# ══════════════════════════════════════════════════════════════════

def compute_recovery_hrv(
    rmssd_morning: float,
    rmssd_baseline: float,
) -> float:
    """Compute recovery score from HRV (RMSSD).

    recovery = normalize(RMSSD_morning, user_baseline) × 100
    normalize(x, baseline) = min(1.0, x / baseline)

    Parameters
    ----------
    rmssd_morning : float
        This morning's RMSSD value (ms).
    rmssd_baseline : float
        User's baseline RMSSD (e.g., 14-day average).

    Returns
    -------
    float
        Recovery score 0-100.
    """
    if rmssd_baseline <= 0:
        return 50.0  # neutral if no baseline

    normalized = min(1.0, rmssd_morning / rmssd_baseline)
    return normalized * 100.0


def compute_recovery_fallback(
    sleep_efficiency: float,
    deep_sleep_pct: float,
) -> float:
    """Compute recovery score from sleep data (fallback when no HRV).

    recovery = (sleep_efficiency × 0.5 + deep_sleep_pct × 0.5) × 100

    Parameters
    ----------
    sleep_efficiency : float
        Sleep efficiency as fraction (0-1). E.g., 0.85 = 85%.
    deep_sleep_pct : float
        Deep sleep percentage as fraction (0-1). E.g., 0.20 = 20%.

    Returns
    -------
    float
        Recovery score 0-100.
    """
    recovery = (sleep_efficiency * 0.5 + deep_sleep_pct * 0.5) * 100.0
    return max(0.0, min(100.0, recovery))


# ══════════════════════════════════════════════════════════════════
#  ACTIVITY BALANCE (Goldilocks Principle)
# ══════════════════════════════════════════════════════════════════

def compute_activity_balance(
    exercise_minutes_history: list[float],
) -> float:
    """Compute activity balance using Goldilocks principle.

    recent_load = Σ(exercise_minutes, last_3_days)
    usual_load = mean(exercise_minutes, last_14_days) × 3
    balance = 1 - |recent_load - usual_load| / usual_load
    activity_balance = max(0, min(100, balance × 100))

    Parameters
    ----------
    exercise_minutes_history : list[float]
        Daily exercise minutes (oldest first). Needs at least 14 days.

    Returns
    -------
    float
        Activity balance score 0-100.
    """
    if len(exercise_minutes_history) < RECENT_LOAD_DAYS:
        return 50.0  # neutral if insufficient data

    # recent_load = Σ(exercise_minutes, last_3_days)
    recent_load = sum(exercise_minutes_history[-RECENT_LOAD_DAYS:])

    # usual_load = mean(exercise_minutes, last_14_days) × 3
    usual_window = exercise_minutes_history[-USUAL_LOAD_DAYS:]
    daily_usual = float(np.mean(usual_window))
    usual_load = daily_usual * RECENT_LOAD_DAYS

    if usual_load <= 0:
        # No usual activity — any activity is "overload"
        if recent_load == 0:
            return 50.0
        return 30.0  # some imbalance

    # balance = 1 - |recent_load - usual_load| / usual_load
    balance = 1.0 - abs(recent_load - usual_load) / usual_load

    # activity_balance = max(0, min(100, balance × 100))
    activity_balance = max(0.0, min(100.0, balance * 100.0))
    return activity_balance


# ══════════════════════════════════════════════════════════════════
#  STRESS INVERSE
# ══════════════════════════════════════════════════════════════════

def compute_stress_inverse(stress_score: float) -> float:
    """Compute stress inverse component.

    stress_inverse = 100 - Stress_Score (from Phase 27)

    Parameters
    ----------
    stress_score : float
        Stress score from Phase 27 (0-100, higher = more stressed).

    Returns
    -------
    float
        Stress inverse (0-100, higher = less stressed = better readiness).
    """
    return max(0.0, min(100.0, 100.0 - stress_score))


# ══════════════════════════════════════════════════════════════════
#  CONSISTENCY BONUS
# ══════════════════════════════════════════════════════════════════

def compute_consistency_bonus(
    bedtime_minutes_from_midnight: list[float],
    exercise_sessions_last_7_days: int,
) -> float:
    """Compute consistency bonus.

    bedtime_regular: std(bedtime_last_7_days) ≤ 30min → 50 points
    exercise_regular: ≥ 3 exercise sessions in last 7 days → 50 points
    consistency_bonus = bedtime_regular + exercise_regular

    Parameters
    ----------
    bedtime_minutes_from_midnight : list[float]
        Last 7 days of bedtime in minutes from midnight.
        E.g., 22:30 = -90 (90 min before midnight), 0:30 = 30.
    exercise_sessions_last_7_days : int
        Number of exercise sessions in last 7 days.

    Returns
    -------
    float
        Consistency bonus (0-100).
    """
    bonus = 0.0

    # Bedtime regularity: std ≤ 30 min
    if len(bedtime_minutes_from_midnight) >= 3:
        std_bedtime = float(np.std(bedtime_minutes_from_midnight))
        if std_bedtime <= BEDTIME_REGULAR_THRESHOLD_MIN:
            bonus += BEDTIME_REGULAR_POINTS
    else:
        # Not enough data, give partial credit
        bonus += BEDTIME_REGULAR_POINTS * 0.5

    # Exercise regularity: ≥ 3 sessions/week
    if exercise_sessions_last_7_days >= EXERCISE_REGULAR_THRESHOLD:
        bonus += EXERCISE_REGULAR_POINTS

    return bonus


# ══════════════════════════════════════════════════════════════════
#  READINESS LEVEL
# ══════════════════════════════════════════════════════════════════

def classify_readiness_level(score: float) -> tuple[str, str]:
    """Classify readiness score into level with Vietnamese message.

    REST:     0-30
    LIGHT:    30-60
    MODERATE: 60-80
    PEAK:     80-100

    Parameters
    ----------
    score : float
        Readiness score 0-100.

    Returns
    -------
    tuple[str, str]
        (level, message)
    """
    for low, high, level in LEVEL_THRESHOLDS:
        if low <= score < high:
            return level, LEVEL_MESSAGES[level]

    # score == 100
    return LEVEL_PEAK, LEVEL_MESSAGES[LEVEL_PEAK]


# ══════════════════════════════════════════════════════════════════
#  MAIN FUNCTION
# ══════════════════════════════════════════════════════════════════

def compute_daily_readiness(
    sleep_score: float,
    stress_score: float,
    exercise_minutes_history: list[float],
    bedtime_minutes_from_midnight: list[float],
    exercise_sessions_last_7_days: int,
    rmssd_morning: Optional[float] = None,
    rmssd_baseline: Optional[float] = None,
    sleep_efficiency: Optional[float] = None,
    deep_sleep_pct: Optional[float] = None,
) -> ReadinessReport:
    """Compute daily readiness score.

    Readiness = 0.30 × sleep + 0.25 × recovery + 0.20 × activity_balance
              + 0.15 × stress_inverse + 0.10 × consistency_bonus

    Parameters
    ----------
    sleep_score : float
        Sleep score 0-100 (from Phase 23).
    stress_score : float
        Stress score 0-100 (from Phase 27, higher = more stressed).
    exercise_minutes_history : list[float]
        Daily exercise minutes (oldest first, at least 3 days).
    bedtime_minutes_from_midnight : list[float]
        Last 7 days bedtime in minutes from midnight.
    exercise_sessions_last_7_days : int
        Number of exercise sessions in last 7 days.
    rmssd_morning : float, optional
        Morning RMSSD for HRV-based recovery. None = use fallback.
    rmssd_baseline : float, optional
        User's RMSSD baseline. Required if rmssd_morning provided.
    sleep_efficiency : float, optional
        Sleep efficiency 0-1 (for fallback recovery).
    deep_sleep_pct : float, optional
        Deep sleep percentage 0-1 (for fallback recovery).

    Returns
    -------
    ReadinessReport
    """
    # ── Recovery score ──
    if rmssd_morning is not None and rmssd_baseline is not None:
        recovery = compute_recovery_hrv(rmssd_morning, rmssd_baseline)
        recovery_method = "hrv"
    else:
        eff = sleep_efficiency if sleep_efficiency is not None else 0.80
        deep = deep_sleep_pct if deep_sleep_pct is not None else 0.20
        recovery = compute_recovery_fallback(eff, deep)
        recovery_method = "fallback"

    # ── Activity balance ──
    activity_balance = compute_activity_balance(exercise_minutes_history)

    # ── Stress inverse ──
    stress_inv = compute_stress_inverse(stress_score)

    # ── Consistency bonus ──
    consistency = compute_consistency_bonus(
        bedtime_minutes_from_midnight,
        exercise_sessions_last_7_days,
    )

    # ── Final readiness score ──
    # Readiness = 0.30×sleep + 0.25×recovery + 0.20×activity_balance
    #           + 0.15×stress_inverse + 0.10×consistency_bonus
    readiness = (
        W_SLEEP * sleep_score
        + W_RECOVERY * recovery
        + W_ACTIVITY * activity_balance
        + W_STRESS * stress_inv
        + W_CONSISTENCY * consistency
    )
    readiness = max(0.0, min(100.0, readiness))

    # ── Classify level ──
    level, message = classify_readiness_level(readiness)

    # ── Build components ──
    components = ReadinessComponents(
        sleep_score=round(sleep_score, 1),
        recovery_score=round(recovery, 1),
        activity_balance=round(activity_balance, 1),
        stress_inverse=round(stress_inv, 1),
        consistency_bonus=round(consistency, 1),
        sleep_contrib=round(W_SLEEP * sleep_score, 2),
        recovery_contrib=round(W_RECOVERY * recovery, 2),
        activity_contrib=round(W_ACTIVITY * activity_balance, 2),
        stress_contrib=round(W_STRESS * stress_inv, 2),
        consistency_contrib=round(W_CONSISTENCY * consistency, 2),
    )

    return ReadinessReport(
        readiness_score=round(readiness, 1),
        level=level,
        message=message,
        components=components,
        recovery_method=recovery_method,
    )
