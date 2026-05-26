# PART:   Health Score V2 — Exponential Smoothing + Adaptive Weights
# ACTOR:  Claude Opus 4.6
# PHASE:  23 — Health Score V2 (replaces Phase 16 hackathon formula)
# TASK:   Compute H_score with exponential smoothing to prevent single-day wild swings
# SCOPE:  IN: steps, azm, sleep_score, voice_wellness, food_completeness,
#             macro_balance, streak_days, reminders_responded, reminders_sent, h_prev?
#         OUT: { score, tier, breakdown, trend_7d, updated_at }
#
# Formula:
#   H_t = α × H_raw + (1 - α) × H_prev    [α = 0.3]
#   H_raw = Σ(wk × sk) for k active modules
#
# Endpoint: POST /health/score
#
# SECURITY: Health Score ONLY computed server-side. NEVER expose raw sub-scores in logs.

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

# ══════════════════════════════════════════════
#  Constants — must not be changed
# ══════════════════════════════════════════════

# Exponential smoothing factor
# H_t = α × H_raw + (1 - α) × H_prev
ALPHA: float = 0.3

# Adaptive weights — SOFTWARE-ONLY mode (no Pod / Wave 1)
# H_raw = Σ(wk × sk) for k modules
WEIGHTS_SOFTWARE: dict[str, float] = {
    "exercise":   0.25,    # Steps + AZM + exercise sessions (Phase 21)
    "sleep":      0.25,    # Sleep Score (Phase 22)
    "voice":      0.20,    # Voice AI wellness score (Phase 26)
    "nutrition":  0.15,    # Food logging completeness + macro balance
    "discipline": 0.15,    # Streak + consistency + reminders response
}

# Adaptive weights — WITH POD (Wave 3, future)
# Vitals (HR, HRV, SpO₂, Temp) added → reweight others down
WEIGHTS_WITH_POD: dict[str, float] = {
    "vitals":     0.20,
    "exercise":   0.20,
    "sleep":      0.20,
    "voice":      0.15,
    "nutrition":  0.13,
    "discipline": 0.12,
}

# Sanity check
assert abs(sum(WEIGHTS_SOFTWARE.values()) - 1.0) < 1e-9
assert abs(sum(WEIGHTS_WITH_POD.values()) - 1.0) < 1e-9

# Daily step goal (Fitbit standard)
DAILY_STEP_GOAL: int = 10_000

# Weekly AZM target (WHO 150 min moderate exercise)
WEEKLY_AZM_TARGET: float = 150.0

# Score tiers
SCORE_TIERS: list[tuple[float, str]] = [
    (90.0, "Excellent"),   # 90–100 🟢
    (75.0, "Good"),        # 75–89  🟢
    (60.0, "Fair"),        # 60–74  🟡
    (0.0,  "Poor"),        # 0–59   🔴
]

# Fallback H_prev when no history (neutral starting point)
DEFAULT_H_PREV: float = 50.0


# ══════════════════════════════════════════════
#  Data classes
# ══════════════════════════════════════════════

@dataclass
class VoiceWellness:
    """Output from Phase 26 voice_5disease module."""
    stress:   float   # 0–100
    burnout:  float   # 0–100
    anxiety:  float   # 0–100


@dataclass
class HealthScoreV2Result:
    score:       float           # H_t exponentially smoothed, 0–100
    h_raw:       float           # H_raw before smoothing
    tier:        str
    breakdown:   dict[str, float]  # per-module sub-scores
    trend_7d:    Optional[float]   # slope of last 7 scores (+ = improving)
    updated_at:  str             # ISO 8601


# ══════════════════════════════════════════════
#  Sub-score formulas (exact per spec)
# ══════════════════════════════════════════════

def compute_exercise_score(steps: int, azm: float) -> float:
    """
    exercise_score = min(steps/10000 × 50 + AZM/150 × 50, 100)

    Steps contribute 50 points (at 10k goal) + AZM contribute 50 points (at 150 weekly).
    Capped at 100.
    """
    # exercise_score = min(steps/10000 × 50 + azm/150 × 50, 100)
    return min(
        (steps / DAILY_STEP_GOAL) * 50.0
        + (azm / WEEKLY_AZM_TARGET) * 50.0,
        100.0,
    )


def compute_voice_score(voice: VoiceWellness) -> float:
    """
    voice_score = 100 - (stress + burnout + anxiety) / 3

    From Phase 26 output. Inverse of average negative signals.
    """
    # voice_score = 100 - (stress + burnout + anxiety) / 3
    avg_negative = (voice.stress + voice.burnout + voice.anxiety) / 3.0
    return max(0.0, 100.0 - avg_negative)


def compute_nutrition_score(food_completeness: float, macro_balance: float) -> float:
    """
    nutrition_score = food_log_completeness × 50 + macro_balance × 50

    food_completeness: 0.0–1.0 (fraction of daily meals logged)
    macro_balance:     0.0–1.0 (how balanced protein/carbs/fat are)
    """
    # nutrition_score = food_completeness × 50 + macro_balance × 50
    return food_completeness * 50.0 + macro_balance * 50.0


def compute_discipline_score(
    streak_days: int,
    reminders_responded: int,
    reminders_sent: int,
) -> float:
    """
    discipline_score = streak_days/7 × 50 + reminders_responded/reminders_sent × 50

    streak_days: consecutive days with activity logged
    """
    # streak_score = streak_days/7 × 50  (capped at 50 when streak ≥ 7)
    streak_score = min(streak_days / 7.0, 1.0) * 50.0

    # reminder_score = responded/sent × 50
    if reminders_sent > 0:
        reminder_score = (reminders_responded / reminders_sent) * 50.0
    else:
        reminder_score = 50.0  # neutral if no reminders sent

    # discipline_score = streak_score + reminder_score
    return streak_score + reminder_score


# ══════════════════════════════════════════════
#  H_raw aggregation
# ══════════════════════════════════════════════

def compute_h_raw(
    exercise_score: float,
    sleep_score: float,
    voice_score: float,
    nutrition_score: float,
    discipline_score: float,
    use_pod: bool = False,
    vitals_score: Optional[float] = None,
) -> float:
    """
    H_raw = Σ(wk × sk) for k active modules

    SOFTWARE-ONLY weights (Wave 1, no Pod):
      exercise:   0.25
      sleep:      0.25
      voice:      0.20
      nutrition:  0.15
      discipline: 0.15
    """
    if use_pod and vitals_score is not None:
        weights = WEIGHTS_WITH_POD
        h_raw = (
            weights["vitals"]     * vitals_score
            + weights["exercise"] * exercise_score
            + weights["sleep"]    * sleep_score
            + weights["voice"]    * voice_score
            + weights["nutrition"]* nutrition_score
            + weights["discipline"]* discipline_score
        )
    else:
        weights = WEIGHTS_SOFTWARE
        # H_raw = 0.25×exercise + 0.25×sleep + 0.20×voice + 0.15×nutrition + 0.15×discipline
        h_raw = (
            weights["exercise"]   * exercise_score
            + weights["sleep"]    * sleep_score
            + weights["voice"]    * voice_score
            + weights["nutrition"]* nutrition_score
            + weights["discipline"]* discipline_score
        )

    return round(min(100.0, max(0.0, h_raw)), 4)


# ══════════════════════════════════════════════
#  Exponential smoothing
# ══════════════════════════════════════════════

def apply_exponential_smoothing(h_raw: float, h_prev: float) -> float:
    """
    H_t = α × H_raw + (1 - α) × H_prev    [α = 0.3]

    Prevents wild swings from a single bad day.
    New data gets 30% weight, history gets 70% weight.
    """
    # H_t = 0.3 × H_raw + 0.7 × H_prev
    return round(ALPHA * h_raw + (1.0 - ALPHA) * h_prev, 2)


# ══════════════════════════════════════════════
#  Trend calculation
# ══════════════════════════════════════════════

def compute_trend_7d(score_history: list[float]) -> Optional[float]:
    """
    Linear regression slope over last 7 scores.
    Positive slope → improving, Negative → declining.
    Returns None if fewer than 3 data points.
    """
    n = len(score_history)
    if n < 3:
        return None

    # Use last 7 data points
    data = score_history[-7:]
    n = len(data)
    # Slope of OLS linear regression: β = (n×Σxy - Σx×Σy) / (n×Σx² - (Σx)²)
    x_vals = list(range(n))
    sum_x  = sum(x_vals)
    sum_y  = sum(data)
    sum_xy = sum(x * y for x, y in zip(x_vals, data))
    sum_xx = sum(x * x for x in x_vals)

    denom = n * sum_xx - sum_x ** 2
    if denom == 0:
        return 0.0

    slope = (n * sum_xy - sum_x * sum_y) / denom
    return round(slope, 4)


# ══════════════════════════════════════════════
#  Score tier
# ══════════════════════════════════════════════

def classify_tier(score: float) -> str:
    """
    90–100: Excellent 🟢
    75–89:  Good      🟢
    60–74:  Fair      🟡
    0–59:   Poor      🔴
    """
    for threshold, label in SCORE_TIERS:
        if score >= threshold:
            return label
    return "Poor"


# ══════════════════════════════════════════════
#  Public API
# ══════════════════════════════════════════════

def compute_health_score_v2(
    steps: int,
    azm: float,
    sleep_score: float,
    voice_wellness: VoiceWellness,
    food_completeness: float,
    macro_balance: float,
    streak_days: int,
    reminders_responded: int,
    reminders_sent: int,
    h_prev: Optional[float] = None,
    score_history: Optional[list[float]] = None,
    use_pod: bool = False,
    vitals_score: Optional[float] = None,
) -> HealthScoreV2Result:
    """
    Main entry point for Phase 23 — Health Score V2.

    Endpoint: POST /health/score
    Body: { steps, azm, sleep_score, voice_wellness: {stress, burnout, anxiety},
            food_completeness, macro_balance, streak_days,
            reminders_responded, reminders_sent }
    Response: { score, tier, breakdown, trend_7d, updated_at }

    All formulas exact per OPUS_PHASES.md Phase 23 spec.
    """
    # ── 1. Compute sub-scores ──────────────────
    exercise_score   = compute_exercise_score(steps, azm)
    voice_score      = compute_voice_score(voice_wellness)
    nutrition_score  = compute_nutrition_score(food_completeness, macro_balance)
    discipline_score = compute_discipline_score(streak_days, reminders_responded, reminders_sent)
    # sleep_score passed directly from Phase 22

    # ── 2. H_raw = weighted sum ────────────────
    h_raw = compute_h_raw(
        exercise_score=exercise_score,
        sleep_score=sleep_score,
        voice_score=voice_score,
        nutrition_score=nutrition_score,
        discipline_score=discipline_score,
        use_pod=use_pod,
        vitals_score=vitals_score,
    )

    # ── 3. Exponential smoothing ───────────────
    prev = h_prev if h_prev is not None else DEFAULT_H_PREV
    # H_t = 0.3 × H_raw + 0.7 × H_prev
    h_t = apply_exponential_smoothing(h_raw, prev)

    # ── 4. Trend ───────────────────────────────
    trend = compute_trend_7d(score_history) if score_history else None

    # ── 5. Tier ────────────────────────────────
    tier = classify_tier(h_t)

    return HealthScoreV2Result(
        score=h_t,
        h_raw=round(h_raw, 2),
        tier=tier,
        breakdown={
            "exercise":   round(exercise_score, 2),
            "sleep":      round(sleep_score, 2),
            "voice":      round(voice_score, 2),
            "nutrition":  round(nutrition_score, 2),
            "discipline": round(discipline_score, 2),
        },
        trend_7d=trend,
        updated_at=datetime.now(timezone.utc).isoformat(),
    )
