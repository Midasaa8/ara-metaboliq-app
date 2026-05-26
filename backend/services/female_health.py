# PART:   Female Health — menstrual cycle prediction
# ACTOR:  Claude Opus 4.6
# PHASE:  30 — Female Health
# TASK:   Cycle prediction, fertile window, PMS detection, voice-cycle correlation
# SCOPE:  IN: cycle history, mood scores, voice scores
#         OUT: { predicted_cycle, next_period, fertile_window, pms_risk, phase }
#
# ══════ CYCLE LENGTH PREDICTION ══════
# predicted_cycle = weighted_moving_average(last_6_cycles,
#   weights=[0.30, 0.25, 0.20, 0.10, 0.10, 0.05])
# Recency-weighted: recent cycles matter more
#
# ══════ NEXT PERIOD PREDICTION ══════
# next_period_start = last_period_start + predicted_cycle_length
# Confidence: ±2 days (narrow with more data)
#
# ══════ FERTILE WINDOW (Ogino-Knaus method) ══════
# ovulation_day = next_period_start - 14  (±2 days)
# fertile_window_start = ovulation_day - 5
# fertile_window_end = ovulation_day + 1
#
# ══════ PMS PREDICTION ══════
# Track correlation(mood_score_drop, days_before_period) over 3+ cycles
# pms_window = predicted_period_start - 7 to predicted_period_start
# If correlation > 0.5: "PMS likely in next 7 days"
#
# ══════ CYCLE PHASES ══════
# Menstrual:  day 1-5   (period)
# Follicular: day 6-13  (pre-ovulation, energy typically high)
# Ovulation:  day 14-16 (fertile window)
# Luteal:     day 17-28 (post-ovulation, PMS risk)
#
# ══════ VOICE-CYCLE CORRELATION ══════
# After 3+ cycles with voice recordings:
# Compute correlation between cycle phase and voice features
# "Mood score typically drops 15% in luteal phase for you"

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

# ── Cycle phase definitions ──
PHASE_MENSTRUAL = "menstrual"       # day 1-5
PHASE_FOLLICULAR = "follicular"     # day 6-13
PHASE_OVULATION = "ovulation"       # day 14-16
PHASE_LUTEAL = "luteal"             # day 17-28

PHASE_DAY_RANGES = {
    PHASE_MENSTRUAL: (1, 5),
    PHASE_FOLLICULAR: (6, 13),
    PHASE_OVULATION: (14, 16),
    PHASE_LUTEAL: (17, 28),
}

PHASE_DESCRIPTIONS = {
    PHASE_MENSTRUAL: "Kinh nguyệt (ngày 1-5)",
    PHASE_FOLLICULAR: "Nang noãn (ngày 6-13) — năng lượng cao",
    PHASE_OVULATION: "Rụng trứng (ngày 14-16) — cửa sổ thụ thai",
    PHASE_LUTEAL: "Hoàng thể (ngày 17-28) — nguy cơ PMS",
}

# ── Weighted moving average weights for cycle prediction ──
# [most_recent, ..., oldest]
CYCLE_WEIGHTS = [0.30, 0.25, 0.20, 0.10, 0.10, 0.05]

# ── PMS correlation threshold ──
PMS_CORRELATION_THRESHOLD = 0.5
PMS_WINDOW_DAYS = 7             # 7 days before period
MIN_CYCLES_FOR_PMS = 3          # need 3+ cycles for PMS detection
MIN_CYCLES_FOR_VOICE = 3        # need 3+ cycles for voice-cycle correlation

# ── Confidence ──
BASE_CONFIDENCE_DAYS = 2        # ±2 days base confidence


@dataclass
class CyclePrediction:
    """Predicted cycle information."""
    predicted_cycle_length: float       # days
    next_period_start: date
    confidence_days: int                # ±N days
    n_cycles_used: int


@dataclass
class FertileWindow:
    """Fertile window prediction (Ogino-Knaus method)."""
    ovulation_day: date                 # next_period_start - 14
    fertile_start: date                 # ovulation - 5
    fertile_end: date                   # ovulation + 1
    confidence_days: int                # ±2 days


@dataclass
class PMSPrediction:
    """PMS risk prediction."""
    pms_likely: bool
    correlation: Optional[float]        # mood-cycle correlation
    pms_window_start: Optional[date]
    pms_window_end: Optional[date]
    message: str


@dataclass
class CyclePhaseInfo:
    """Current cycle phase information."""
    current_phase: str
    cycle_day: int
    phase_description: str
    days_until_next_period: int


@dataclass
class VoiceCycleCorrelation:
    """Voice-cycle correlation analysis."""
    has_correlation: bool
    luteal_mood_drop_pct: Optional[float]
    follicular_mood_boost_pct: Optional[float]
    insight: Optional[str]


@dataclass
class FemaleHealthReport:
    """Complete female health cycle report."""
    cycle_prediction: Optional[CyclePrediction]
    fertile_window: Optional[FertileWindow]
    pms_prediction: PMSPrediction
    current_phase: Optional[CyclePhaseInfo]
    voice_correlation: VoiceCycleCorrelation


# ══════════════════════════════════════════════════════════════════
#  CYCLE LENGTH PREDICTION
# ══════════════════════════════════════════════════════════════════

def predict_cycle_length(cycle_lengths: list[int]) -> tuple[float, int]:
    """Predict next cycle length using weighted moving average.

    predicted_cycle = weighted_moving_average(last_6_cycles,
      weights=[0.30, 0.25, 0.20, 0.10, 0.10, 0.05])
    Recency-weighted: recent cycles matter more.

    Parameters
    ----------
    cycle_lengths : list[int]
        Historical cycle lengths in days (oldest first).

    Returns
    -------
    tuple[float, int]
        (predicted_length_days, n_cycles_used)
    """
    if not cycle_lengths:
        return 28.0, 0  # default average cycle

    # Use up to last 6 cycles
    recent = cycle_lengths[-6:]
    n = len(recent)

    if n == 1:
        return float(recent[0]), 1

    # Get appropriate weights (most recent first in weights list)
    weights = CYCLE_WEIGHTS[:n]

    # Normalize weights to sum to 1
    weight_sum = sum(weights)
    norm_weights = [w / weight_sum for w in weights]

    # Apply weights to cycles (most recent cycle gets highest weight)
    # recent list is oldest first, so reverse for weighting
    reversed_cycles = list(reversed(recent))
    predicted = sum(c * w for c, w in zip(reversed_cycles, norm_weights))

    return round(predicted, 1), n


def predict_next_period(
    last_period_start: date,
    cycle_lengths: list[int],
) -> CyclePrediction:
    """Predict next period start date.

    next_period_start = last_period_start + predicted_cycle_length
    Confidence: ±2 days

    Parameters
    ----------
    last_period_start : date
        Start date of most recent period.
    cycle_lengths : list[int]
        Historical cycle lengths in days.

    Returns
    -------
    CyclePrediction
    """
    predicted_length, n_used = predict_cycle_length(cycle_lengths)

    # next_period_start = last_period_start + predicted_cycle_length
    next_start = last_period_start + timedelta(days=int(round(predicted_length)))

    # Confidence narrows with more data (but spec says ±2 days)
    confidence = BASE_CONFIDENCE_DAYS

    return CyclePrediction(
        predicted_cycle_length=predicted_length,
        next_period_start=next_start,
        confidence_days=confidence,
        n_cycles_used=n_used,
    )


# ══════════════════════════════════════════════════════════════════
#  FERTILE WINDOW (Ogino-Knaus method)
# ══════════════════════════════════════════════════════════════════

def predict_fertile_window(next_period_start: date) -> FertileWindow:
    """Predict fertile window using Ogino-Knaus method.

    ovulation_day = next_period_start - 14  (±2 days)
    fertile_window_start = ovulation_day - 5
    fertile_window_end = ovulation_day + 1

    Parameters
    ----------
    next_period_start : date
        Predicted next period start date.

    Returns
    -------
    FertileWindow
    """
    # ovulation_day = next_period_start - 14
    ovulation = next_period_start - timedelta(days=14)

    # fertile_window_start = ovulation_day - 5
    fertile_start = ovulation - timedelta(days=5)

    # fertile_window_end = ovulation_day + 1
    fertile_end = ovulation + timedelta(days=1)

    return FertileWindow(
        ovulation_day=ovulation,
        fertile_start=fertile_start,
        fertile_end=fertile_end,
        confidence_days=BASE_CONFIDENCE_DAYS,
    )


# ══════════════════════════════════════════════════════════════════
#  PMS PREDICTION
# ══════════════════════════════════════════════════════════════════

def compute_pms_correlation(
    period_start_dates: list[date],
    daily_mood_scores: dict[date, float],
) -> Optional[float]:
    """Compute correlation between mood drop and days before period.

    Track correlation(mood_score_drop, days_before_period) over 3+ cycles.

    Parameters
    ----------
    period_start_dates : list[date]
        Historical period start dates (chronological).
    daily_mood_scores : dict[date, float]
        Daily mood scores keyed by date.

    Returns
    -------
    float or None
        Pearson correlation coefficient, or None if insufficient data.
    """
    if len(period_start_dates) < MIN_CYCLES_FOR_PMS:
        return None

    days_before_list = []
    mood_values = []

    for period_start in period_start_dates:
        # Look at 7 days before each period
        for days_before in range(1, PMS_WINDOW_DAYS + 1):
            check_date = period_start - timedelta(days=days_before)
            if check_date in daily_mood_scores:
                days_before_list.append(days_before)
                mood_values.append(daily_mood_scores[check_date])

    if len(days_before_list) < 5:
        return None

    # Correlation: as days_before decreases (closer to period), mood should drop
    # So we expect negative correlation between days_before and mood
    # (closer to period = lower mood)
    x = np.array(days_before_list, dtype=np.float64)
    y = np.array(mood_values, dtype=np.float64)

    # Pearson correlation
    if np.std(x) < 1e-10 or np.std(y) < 1e-10:
        return 0.0

    correlation = float(np.corrcoef(x, y)[0, 1])
    # Positive correlation means: further from period = higher mood = PMS pattern
    return correlation


def predict_pms(
    next_period_start: date,
    today: date,
    period_start_dates: list[date],
    daily_mood_scores: dict[date, float],
) -> PMSPrediction:
    """Predict PMS risk.

    PMS window = 7 days before predicted period.
    If correlation > 0.5: "PMS likely in next 7 days".

    Parameters
    ----------
    next_period_start : date
        Predicted next period start.
    today : date
        Current date.
    period_start_dates : list[date]
        Historical period starts.
    daily_mood_scores : dict[date, float]
        Historical daily mood scores.

    Returns
    -------
    PMSPrediction
    """
    pms_window_start = next_period_start - timedelta(days=PMS_WINDOW_DAYS)
    pms_window_end = next_period_start

    # Are we in the PMS window?
    in_pms_window = pms_window_start <= today <= pms_window_end

    # Compute correlation
    correlation = compute_pms_correlation(period_start_dates, daily_mood_scores)

    pms_likely = False
    message = "Chưa đủ dữ liệu để dự đoán PMS (cần 3+ chu kỳ)"

    if correlation is not None:
        # correlation > 0.5 means mood positively correlates with days_before
        # (i.e., mood drops as period approaches)
        if correlation > PMS_CORRELATION_THRESHOLD and in_pms_window:
            pms_likely = True
            message = "PMS likely in next 7 days"
        elif correlation > PMS_CORRELATION_THRESHOLD and not in_pms_window:
            days_until_pms = (pms_window_start - today).days
            if days_until_pms > 0:
                message = f"PMS window bắt đầu trong {days_until_pms} ngày"
            else:
                message = "Không trong cửa sổ PMS"
        else:
            message = "Không phát hiện mẫu PMS rõ ràng"

    return PMSPrediction(
        pms_likely=pms_likely,
        correlation=round(correlation, 3) if correlation is not None else None,
        pms_window_start=pms_window_start if correlation is not None else None,
        pms_window_end=pms_window_end if correlation is not None else None,
        message=message,
    )


# ══════════════════════════════════════════════════════════════════
#  CYCLE PHASE
# ══════════════════════════════════════════════════════════════════

def get_current_phase(
    last_period_start: date,
    today: date,
    predicted_cycle_length: float,
) -> CyclePhaseInfo:
    """Determine current cycle phase.

    Cycle Phases:
    Menstrual:  day 1-5   (period)
    Follicular: day 6-13  (pre-ovulation, energy typically high)
    Ovulation:  day 14-16 (fertile window)
    Luteal:     day 17-28 (post-ovulation, PMS risk)

    Parameters
    ----------
    last_period_start : date
        Start of most recent period.
    today : date
        Current date.
    predicted_cycle_length : float
        Predicted total cycle length.

    Returns
    -------
    CyclePhaseInfo
    """
    cycle_day = (today - last_period_start).days + 1  # day 1 = first day of period

    # Determine phase based on cycle day
    if cycle_day <= 0:
        cycle_day = 1

    if 1 <= cycle_day <= 5:
        phase = PHASE_MENSTRUAL
    elif 6 <= cycle_day <= 13:
        phase = PHASE_FOLLICULAR
    elif 14 <= cycle_day <= 16:
        phase = PHASE_OVULATION
    else:
        phase = PHASE_LUTEAL

    # Days until next period
    days_until = max(0, int(round(predicted_cycle_length)) - cycle_day + 1)

    return CyclePhaseInfo(
        current_phase=phase,
        cycle_day=cycle_day,
        phase_description=PHASE_DESCRIPTIONS[phase],
        days_until_next_period=days_until,
    )


# ══════════════════════════════════════════════════════════════════
#  VOICE-CYCLE CORRELATION
# ══════════════════════════════════════════════════════════════════

def analyze_voice_cycle_correlation(
    period_start_dates: list[date],
    cycle_lengths: list[int],
    daily_voice_mood: dict[date, float],
) -> VoiceCycleCorrelation:
    """Analyze correlation between voice mood scores and cycle phases.

    After 3+ cycles with voice recordings:
    Compute correlation between cycle phase and voice features.
    "Mood score typically drops 15% in luteal phase for you"

    Parameters
    ----------
    period_start_dates : list[date]
        Period start dates (chronological).
    cycle_lengths : list[int]
        Corresponding cycle lengths.
    daily_voice_mood : dict[date, float]
        Daily mood scores from voice analysis.

    Returns
    -------
    VoiceCycleCorrelation
    """
    if len(period_start_dates) < MIN_CYCLES_FOR_VOICE:
        return VoiceCycleCorrelation(
            has_correlation=False,
            luteal_mood_drop_pct=None,
            follicular_mood_boost_pct=None,
            insight=None,
        )

    # Collect mood scores per phase
    phase_moods: dict[str, list[float]] = {
        PHASE_MENSTRUAL: [],
        PHASE_FOLLICULAR: [],
        PHASE_OVULATION: [],
        PHASE_LUTEAL: [],
    }

    for i, period_start in enumerate(period_start_dates):
        cycle_len = cycle_lengths[i] if i < len(cycle_lengths) else 28
        for day_offset in range(cycle_len):
            check_date = period_start + timedelta(days=day_offset)
            if check_date in daily_voice_mood:
                cycle_day = day_offset + 1
                if 1 <= cycle_day <= 5:
                    phase_moods[PHASE_MENSTRUAL].append(daily_voice_mood[check_date])
                elif 6 <= cycle_day <= 13:
                    phase_moods[PHASE_FOLLICULAR].append(daily_voice_mood[check_date])
                elif 14 <= cycle_day <= 16:
                    phase_moods[PHASE_OVULATION].append(daily_voice_mood[check_date])
                else:
                    phase_moods[PHASE_LUTEAL].append(daily_voice_mood[check_date])

    # Need data in at least follicular and luteal phases
    if not phase_moods[PHASE_FOLLICULAR] or not phase_moods[PHASE_LUTEAL]:
        return VoiceCycleCorrelation(
            has_correlation=False,
            luteal_mood_drop_pct=None,
            follicular_mood_boost_pct=None,
            insight=None,
        )

    # Calculate phase averages
    follicular_avg = float(np.mean(phase_moods[PHASE_FOLLICULAR]))
    luteal_avg = float(np.mean(phase_moods[PHASE_LUTEAL]))
    overall_avg = float(np.mean(
        phase_moods[PHASE_MENSTRUAL] + phase_moods[PHASE_FOLLICULAR]
        + phase_moods[PHASE_OVULATION] + phase_moods[PHASE_LUTEAL]
    ))

    # Percentage changes
    luteal_drop_pct = None
    follicular_boost_pct = None
    insight = None

    if abs(overall_avg) > 1e-10:
        luteal_drop_pct = round((luteal_avg - overall_avg) / overall_avg * 100, 1)
        follicular_boost_pct = round((follicular_avg - overall_avg) / overall_avg * 100, 1)

        if luteal_drop_pct < -5:
            insight = f"Mood score typically drops {abs(luteal_drop_pct):.0f}% in luteal phase for you"
        elif follicular_boost_pct > 5:
            insight = f"Mood score typically improves {follicular_boost_pct:.0f}% in follicular phase"

    return VoiceCycleCorrelation(
        has_correlation=True,
        luteal_mood_drop_pct=luteal_drop_pct,
        follicular_mood_boost_pct=follicular_boost_pct,
        insight=insight,
    )


# ══════════════════════════════════════════════════════════════════
#  MAIN ANALYSIS FUNCTION
# ══════════════════════════════════════════════════════════════════

def analyze_female_health(
    last_period_start: date,
    cycle_lengths: list[int],
    today: Optional[date] = None,
    period_start_dates: Optional[list[date]] = None,
    daily_mood_scores: Optional[dict[date, float]] = None,
    daily_voice_mood: Optional[dict[date, float]] = None,
) -> FemaleHealthReport:
    """Complete female health cycle analysis.

    Parameters
    ----------
    last_period_start : date
        Most recent period start date.
    cycle_lengths : list[int]
        Historical cycle lengths in days (oldest first).
    today : date, optional
        Current date (defaults to today).
    period_start_dates : list[date], optional
        All period start dates for PMS analysis.
    daily_mood_scores : dict[date, float], optional
        Daily mood scores for PMS correlation.
    daily_voice_mood : dict[date, float], optional
        Daily voice mood scores for voice-cycle analysis.

    Returns
    -------
    FemaleHealthReport
    """
    if today is None:
        today = date.today()
    if period_start_dates is None:
        period_start_dates = []
    if daily_mood_scores is None:
        daily_mood_scores = {}
    if daily_voice_mood is None:
        daily_voice_mood = daily_mood_scores  # fallback to same source

    # ── Cycle prediction ──
    cycle_pred = predict_next_period(last_period_start, cycle_lengths)

    # ── Fertile window ──
    fertile = predict_fertile_window(cycle_pred.next_period_start)

    # ── Current phase ──
    phase_info = get_current_phase(
        last_period_start, today, cycle_pred.predicted_cycle_length
    )

    # ── PMS prediction ──
    pms = predict_pms(
        cycle_pred.next_period_start, today,
        period_start_dates, daily_mood_scores,
    )

    # ── Voice-cycle correlation ──
    voice_corr = analyze_voice_cycle_correlation(
        period_start_dates, cycle_lengths, daily_voice_mood,
    )

    return FemaleHealthReport(
        cycle_prediction=cycle_pred,
        fertile_window=fertile,
        pms_prediction=pms,
        current_phase=phase_info,
        voice_correlation=voice_corr,
    )
