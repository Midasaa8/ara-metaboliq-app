# PART:   Sleep Score — 5-component weighted formula
# ACTOR:  Claude Opus 4.6
# PHASE:  22 — Sleep Score Algorithm
# TASK:   Compute 0-100 sleep quality score + natural language insights
# SCOPE:  IN: total_minutes, deep_minutes, rem_minutes, awake_minutes,
#             bedtimes_last_7_days (ISO strings), time_in_bed_minutes
#         OUT: sleep_score, tier, component_scores, insights
#
# Formula weights (exact per OPUS_PHASES.md Phase 22 spec):
#   0.25 × duration_score
#   0.20 × deep_pct_score
#   0.15 × rem_pct_score
#   0.20 × consistency_score
#   0.20 × efficiency_score
#
# SECURITY: No raw health data in logs.

from __future__ import annotations

import math
import statistics
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

# ══════════════════════════════════════════════
#  Constants — weights (must not be changed)
# ══════════════════════════════════════════════

W_DURATION:    float = 0.25
W_DEEP_PCT:    float = 0.20
W_REM_PCT:     float = 0.15
W_CONSISTENCY: float = 0.20
W_EFFICIENCY:  float = 0.20

# Sanity check: weights must sum to 1.0
assert abs(W_DURATION + W_DEEP_PCT + W_REM_PCT + W_CONSISTENCY + W_EFFICIENCY - 1.0) < 1e-9

# Duration targets (in hours)
DURATION_OPTIMAL_LOW:  float = 7.0   # ≥7h  → optimal starts
DURATION_OPTIMAL_HIGH: float = 9.0   # ≤9h  → optimal ends
DURATION_POOR_LOW:     float = 5.0   # <5h  → score 0
DURATION_GOOD_LOW:     float = 6.0   # 6–7h → linear(60, 85)
DURATION_EXCESS_MAX:   float = 11.0  # ≥11h → score floor

# Deep sleep target
DEEP_TARGET_PCT: float = 0.20   # 20% of total = score 100

# REM target
REM_TARGET_PCT: float = 0.25    # 25% of total = score 100

# Consistency: bedtime std dev threshold (minutes)
# consistency_score = max(0, 100 - bedtime_std × 2)
CONSISTENCY_PENALTY_FACTOR: float = 2.0

# Efficiency target
EFFICIENCY_TARGET: float = 95.0   # 95% efficiency → score 100

# Score tiers
SCORE_TIERS: list[tuple[float, str]] = [
    (90.0, "Excellent"),   # 90–100
    (75.0, "Good"),        # 75–89
    (60.0, "Fair"),        # 60–74
    (0.0,  "Poor"),        # 0–59
]


# ══════════════════════════════════════════════
#  Data classes
# ══════════════════════════════════════════════

@dataclass
class SleepScoreResult:
    sleep_score:       float          # 0–100 composite
    tier:              str            # Excellent / Good / Fair / Poor
    duration_score:    float
    deep_pct_score:    float
    rem_pct_score:     float
    consistency_score: float
    efficiency_score:  float
    total_sleep_hours: float
    insights:          list[str]      # natural language insights (Vietnamese)


# ══════════════════════════════════════════════
#  Component score functions
# ══════════════════════════════════════════════

def _lerp(value: float, x0: float, x1: float, y0: float, y1: float) -> float:
    """Linear interpolation: map value in [x0, x1] to [y0, y1]."""
    if x1 == x0:
        return y0
    t = (value - x0) / (x1 - x0)
    return y0 + t * (y1 - y0)


def calculate_duration_score(total_minutes: float) -> float:
    """
    Duration score based on total sleep hours.

    Optimal: 7–9 hours → 100
    <5h      → 0
    5–6h     → linear(0, 60)
    6–7h     → linear(60, 85)
    7–9h     → 100
    >9h      → linear(100, 70)  down to ~70 at 11h+
    """
    h = total_minutes / 60.0

    if h < 5.0:
        # < 5h → 0
        return 0.0
    elif h < 6.0:
        # 5–6h → linear(0, 60)
        return _lerp(h, 5.0, 6.0, 0.0, 60.0)
    elif h < 7.0:
        # 6–7h → linear(60, 85)
        return _lerp(h, 6.0, 7.0, 60.0, 85.0)
    elif h <= 9.0:
        # 7–9h → 100 (optimal)
        return 100.0
    else:
        # > 9h → linear(100, 70)  at 11h → 70, beyond → capped at 70
        score = _lerp(h, 9.0, 11.0, 100.0, 70.0)
        return max(70.0, score)   # floor at 70 per spec intent


def calculate_deep_pct_score(deep_minutes: float, total_minutes: float) -> float:
    """
    Deep sleep % score.
    Target: 15–20% of total sleep → score = 100 at ≥20%.

    deep_pct_score = min(deep_pct / 0.20 × 100, 100)
    """
    if total_minutes <= 0:
        return 0.0
    deep_pct = deep_minutes / total_minutes
    # deep_pct_score = min(deep_pct / 0.20 × 100, 100)
    return min(deep_pct / DEEP_TARGET_PCT * 100.0, 100.0)


def calculate_rem_pct_score(rem_minutes: float, total_minutes: float) -> float:
    """
    REM sleep % score.
    Target: 20–25% of total sleep → score = 100 at ≥25%.

    rem_pct_score = min(rem_pct / 0.25 × 100, 100)
    """
    if total_minutes <= 0:
        return 0.0
    rem_pct = rem_minutes / total_minutes
    # rem_pct_score = min(rem_pct / 0.25 × 100, 100)
    return min(rem_pct / REM_TARGET_PCT * 100.0, 100.0)


def calculate_consistency_score(bedtimes_last_7_days: list[str]) -> float:
    """
    Bedtime consistency score.
    Penalizes deviation from regular bedtime schedule.

    bedtime_std = σ(bedtimes_last_7_days) [minutes from midnight]
    consistency_score = max(0, 100 - bedtime_std × 2)

    Benchmarks:
      ±0 min  → 100
      ±15 min → 70
      ±30 min → 40
      ±50 min → 0 (capped)

    Accepts ISO 8601 strings: "2026-05-25T23:30:00" or time strings "23:30"
    """
    if len(bedtimes_last_7_days) < 2:
        # Not enough data for consistency calculation → neutral score 70
        return 70.0

    minutes_list: list[float] = []
    for bt in bedtimes_last_7_days:
        minutes_list.append(_parse_bedtime_to_minutes(bt))

    # Unwrap circular bedtime values (handle midnight crossing)
    minutes_list = _unwrap_bedtimes(minutes_list)

    bedtime_std = statistics.stdev(minutes_list)
    # consistency_score = max(0, 100 - bedtime_std × 2)
    return max(0.0, 100.0 - bedtime_std * CONSISTENCY_PENALTY_FACTOR)


def _parse_bedtime_to_minutes(bedtime_str: str) -> float:
    """
    Parse bedtime string to minutes from midnight (0–1440).
    Supports ISO datetime ('2026-05-25T23:30:00') and time ('23:30').
    Bedtimes after noon are assumed to be evening (e.g. 23:30 → 1410).
    Bedtimes before noon are assumed to be early morning (e.g. 00:30 → 30).
    """
    if "T" in bedtime_str:
        dt = datetime.fromisoformat(bedtime_str)
        return dt.hour * 60.0 + dt.minute
    else:
        parts = bedtime_str.strip().split(":")
        return float(parts[0]) * 60.0 + float(parts[1])


def _unwrap_bedtimes(minutes_list: list[float]) -> list[float]:
    """
    Handle midnight crossings: if bedtime is before 6:00 (< 360 min),
    treat it as the next day (add 1440) to make std dev calculation correct
    for night owls sleeping after midnight.
    """
    # Separate "early morning" (< 360) and "evening" (≥ 360) bedtimes
    wrapped = []
    for m in minutes_list:
        # Bedtimes before 6 AM are after midnight; add 1440 to compare fairly
        if m < 360:
            wrapped.append(m + 1440.0)
        else:
            wrapped.append(m)
    return wrapped


def calculate_efficiency_score(total_sleep_minutes: float, time_in_bed_minutes: float) -> float:
    """
    Sleep efficiency score.
    efficiency = time_asleep / time_in_bed × 100  [%]
    efficiency_score = min(efficiency / 95 × 100, 100)

    Target: 95% efficiency → score = 100
    """
    if time_in_bed_minutes <= 0:
        return 0.0
    efficiency = (total_sleep_minutes / time_in_bed_minutes) * 100.0
    # efficiency_score = min(efficiency / 95 × 100, 100)
    return min(efficiency / EFFICIENCY_TARGET * 100.0, 100.0)


# ══════════════════════════════════════════════
#  Score tier
# ══════════════════════════════════════════════

def classify_sleep_tier(score: float) -> str:
    """
    90–100: Excellent
    75–89:  Good
    60–74:  Fair
    0–59:   Poor
    """
    for threshold, label in SCORE_TIERS:
        if score >= threshold:
            return label
    return "Poor"


# ══════════════════════════════════════════════
#  Insights generator (Vietnamese, Fitbit-style)
# ══════════════════════════════════════════════

def generate_sleep_insights(
    total_hours: float,
    deep_pct: float,
    rem_pct: float,
    consistency_score: float,
    efficiency_score: float,
    prev_deep_pct: Optional[float] = None,
    prev_consistency_score: Optional[float] = None,
) -> list[str]:
    """
    Generate natural language insights (Vietnamese).
    Returned list is ordered by relevance (worst first).
    """
    insights: list[str] = []

    # Duration insight
    if total_hours < 6.0:
        insights.append(
            f"Bạn chỉ ngủ {total_hours:.1f} tiếng — nên ngủ ít nhất 7 tiếng để phục hồi tốt nhất."
        )
    elif total_hours > 9.5:
        insights.append(
            f"Bạn ngủ {total_hours:.1f} tiếng — ngủ quá nhiều cũng ảnh hưởng đến chất lượng giấc ngủ."
        )

    # Deep sleep insight
    if prev_deep_pct is not None:
        change_pct = (deep_pct - prev_deep_pct) / max(prev_deep_pct, 0.01) * 100.0
        if change_pct >= 5.0:
            insights.append(
                f"Bạn ngủ sâu nhiều hơn {change_pct:.0f}% so với tuần trước — tuyệt vời!"
            )
        elif change_pct <= -10.0:
            insights.append(
                f"Giấc ngủ sâu giảm {abs(change_pct):.0f}% so với tuần trước — thử tránh caffeine sau 14:00."
            )
    elif deep_pct < 0.12:
        insights.append(
            "Giấc ngủ sâu thấp — thử tập thể dục nhẹ vào buổi chiều để cải thiện."
        )

    # Consistency insight
    if prev_consistency_score is not None:
        if consistency_score > prev_consistency_score + 5.0:
            insights.append(
                "Giờ ngủ nhất quán hơn — tiếp tục duy trì thói quen này!"
            )
    if consistency_score < 50.0:
        insights.append(
            "Giờ ngủ không đều — thử ngủ trước 23:00 mỗi đêm để tăng điểm nhất quán."
        )

    # Efficiency insight
    if efficiency_score < 70.0:
        insights.append(
            "Hiệu suất giấc ngủ thấp — hạn chế dùng điện thoại khi đã nằm xuống."
        )

    # REM insight
    if rem_pct < 0.15:
        insights.append(
            "% REM thấp — giảm rượu bia và cải thiện thời gian ngủ để tăng giấc mơ REM."
        )

    # Default positive message if no issues
    if not insights:
        insights.append("Giấc ngủ của bạn hôm nay rất tốt — tiếp tục duy trì!")

    return insights


# ══════════════════════════════════════════════
#  Public API
# ══════════════════════════════════════════════

def compute_sleep_score(
    total_sleep_minutes: float,
    deep_minutes: float,
    rem_minutes: float,
    time_in_bed_minutes: float,
    bedtimes_last_7_days: Optional[list[str]] = None,
    prev_deep_pct: Optional[float] = None,
    prev_consistency_score: Optional[float] = None,
) -> SleepScoreResult:
    """
    Main entry point for Phase 22 — Sleep Score Algorithm.

    Formula:
      Sleep_Score = 0.25 × duration_score
                  + 0.20 × deep_pct_score
                  + 0.15 × rem_pct_score
                  + 0.20 × consistency_score
                  + 0.20 × efficiency_score

    Input:
      total_sleep_minutes     : actual time asleep (not time in bed)
      deep_minutes            : deep sleep stage minutes
      rem_minutes             : REM stage minutes
      time_in_bed_minutes     : total time in bed (for efficiency)
      bedtimes_last_7_days    : list of ISO bedtime strings (for consistency)
      prev_deep_pct           : last week's deep % (for trend insight)
      prev_consistency_score  : last week's consistency score (for trend insight)

    Returns: SleepScoreResult
    """
    # ── Component scores ─────────────────────
    duration_score    = calculate_duration_score(total_sleep_minutes)
    deep_pct_score    = calculate_deep_pct_score(deep_minutes, total_sleep_minutes)
    rem_pct_score     = calculate_rem_pct_score(rem_minutes, total_sleep_minutes)
    consistency_score = (
        calculate_consistency_score(bedtimes_last_7_days)
        if bedtimes_last_7_days
        else 70.0   # neutral fallback when no history
    )
    efficiency_score  = calculate_efficiency_score(total_sleep_minutes, time_in_bed_minutes)

    # ── Composite sleep score ─────────────────
    # Sleep_Score = 0.25 × duration + 0.20 × deep + 0.15 × rem
    #             + 0.20 × consistency + 0.20 × efficiency
    sleep_score = (
        W_DURATION    * duration_score
        + W_DEEP_PCT  * deep_pct_score
        + W_REM_PCT   * rem_pct_score
        + W_CONSISTENCY * consistency_score
        + W_EFFICIENCY  * efficiency_score
    )
    sleep_score = round(min(100.0, max(0.0, sleep_score)), 1)

    tier = classify_sleep_tier(sleep_score)

    # ── Derived values for insights ──────────
    total_hours = total_sleep_minutes / 60.0
    deep_pct    = deep_minutes / total_sleep_minutes if total_sleep_minutes > 0 else 0.0
    rem_pct     = rem_minutes  / total_sleep_minutes if total_sleep_minutes > 0 else 0.0

    insights = generate_sleep_insights(
        total_hours=total_hours,
        deep_pct=deep_pct,
        rem_pct=rem_pct,
        consistency_score=consistency_score,
        efficiency_score=efficiency_score,
        prev_deep_pct=prev_deep_pct,
        prev_consistency_score=prev_consistency_score,
    )

    return SleepScoreResult(
        sleep_score=sleep_score,
        tier=tier,
        duration_score=round(duration_score, 1),
        deep_pct_score=round(deep_pct_score, 1),
        rem_pct_score=round(rem_pct_score, 1),
        consistency_score=round(consistency_score, 1),
        efficiency_score=round(efficiency_score, 1),
        total_sleep_hours=round(total_hours, 2),
        insights=insights,
    )
