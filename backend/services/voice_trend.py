# PART:   Voice Trend — longitudinal tracking + drift detection
# ACTOR:  Claude Opus 4.6
# PHASE:  29 — Voice Trend Analyzer
# TASK:   Detect longitudinal trends in voice scores + KL-divergence drift
# SCOPE:  IN: historical voice scores per head (4+ weeks)
#         OUT: { trends, drift_detected, insights }
#
# ══════ TREND DETECTION ══════
# V_trend = linear_regression_slope(V_scores, window=4_weeks)
# Positive slope for risk scores = worsening
# Negative slope for wellness scores = worsening
#
# ══════ DRIFT DETECTION (KL-Divergence) ══════
# drift = D_KL(P_current || P_baseline)
# D_KL(P || Q) = Σ P(x) × log(P(x) / Q(x))
#
# Baseline = first 2 weeks of recordings (enrollment period)
# Current = latest week recordings
# If drift > threshold → "Voice pattern has changed significantly"
# Threshold calibrated per user (start at 0.5, adapt)
#
# ══════ INSIGHTS ══════
# "Mood score declining 3 weeks in a row — consider talking to someone"
# "Respiratory health improved after you started walking regularly"
# "Cognitive score stable — no change detected"

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

# ── Constants ──
TREND_WINDOW_DAYS = 28          # 4 weeks
BASELINE_DAYS = 14              # first 2 weeks = enrollment period
CURRENT_WINDOW_DAYS = 7         # latest week for drift comparison
DEFAULT_DRIFT_THRESHOLD = 0.5   # KL-divergence threshold (start value)
KL_NUM_BINS = 10                # histogram bins for KL-divergence
KL_EPSILON = 1e-10              # avoid log(0)

# Score type classification:
# "risk" scores: higher = worse (metabolic_risk, voice_stress)
# "wellness" scores: higher = better (mood, cognitive, respiratory, stability)
RISK_SCORES = {"metabolic_risk", "voice_stress"}
WELLNESS_SCORES = {"mood_pattern", "movement_stability", "cognitive_trend", "respiratory_health"}

# Consecutive weeks threshold for insight generation
CONSECUTIVE_DECLINE_WEEKS = 3


@dataclass
class TrendResult:
    """Trend analysis for a single voice score."""
    score_name: str
    slope: float                # linear regression slope (per day)
    slope_per_week: float       # slope × 7
    direction: str              # "improving", "stable", "worsening"
    is_concerning: bool         # True if worsening
    n_datapoints: int


@dataclass
class DriftResult:
    """KL-divergence drift detection result."""
    score_name: str
    kl_divergence: float
    threshold: float
    drift_detected: bool
    baseline_mean: float
    current_mean: float
    change_pct: float           # percentage change from baseline


@dataclass
class VoiceTrendReport:
    """Complete voice trend analysis report."""
    trends: list[TrendResult]
    drifts: list[DriftResult]
    insights: list[str]
    any_drift_detected: bool
    any_concerning_trend: bool
    analysis_period_days: int


# ══════════════════════════════════════════════════════════════════
#  TREND DETECTION
# ══════════════════════════════════════════════════════════════════

def compute_linear_slope(scores: list[float]) -> float:
    """Compute linear regression slope of scores over time.

    V_trend = linear_regression_slope(V_scores, window=4_weeks)

    Parameters
    ----------
    scores : list[float]
        Daily score values (chronological order, oldest first).

    Returns
    -------
    float
        Slope of trend line (units per day).
    """
    if len(scores) < 3:
        return 0.0

    x = np.arange(len(scores), dtype=np.float64)
    y = np.array(scores, dtype=np.float64)

    # Linear regression: y = mx + b
    # m = (n*Σxy - Σx*Σy) / (n*Σx² - (Σx)²)
    n = len(x)
    sum_x = np.sum(x)
    sum_y = np.sum(y)
    sum_xy = np.sum(x * y)
    sum_x2 = np.sum(x * x)

    denominator = n * sum_x2 - sum_x * sum_x
    if abs(denominator) < 1e-10:
        return 0.0

    slope = float((n * sum_xy - sum_x * sum_y) / denominator)
    return slope


def classify_trend_direction(
    slope_per_week: float,
    score_name: str,
) -> tuple[str, bool]:
    """Classify trend direction and whether it's concerning.

    Positive slope for risk scores = worsening
    Negative slope for wellness scores = worsening

    Parameters
    ----------
    slope_per_week : float
        Slope per week.
    score_name : str
        Name of the score.

    Returns
    -------
    tuple[str, bool]
        (direction, is_concerning)
    """
    # Threshold for "stable" (less than 2 points per week change)
    stable_threshold = 2.0

    if abs(slope_per_week) < stable_threshold:
        return "stable", False

    if score_name in RISK_SCORES:
        # Risk scores: positive slope = worsening
        if slope_per_week > 0:
            return "worsening", True
        else:
            return "improving", False
    else:
        # Wellness scores: negative slope = worsening
        if slope_per_week < 0:
            return "worsening", True
        else:
            return "improving", False


def analyze_trend(
    score_name: str,
    scores: list[float],
    window_days: int = TREND_WINDOW_DAYS,
) -> TrendResult:
    """Analyze trend for a single voice score.

    Parameters
    ----------
    score_name : str
        Name of the voice score head.
    scores : list[float]
        Historical daily scores (oldest first). Uses last `window_days` entries.
    window_days : int
        Analysis window size.

    Returns
    -------
    TrendResult
    """
    # Use last window_days data points
    windowed = scores[-window_days:]

    slope = compute_linear_slope(windowed)
    slope_per_week = slope * 7.0
    direction, is_concerning = classify_trend_direction(slope_per_week, score_name)

    return TrendResult(
        score_name=score_name,
        slope=round(slope, 4),
        slope_per_week=round(slope_per_week, 2),
        direction=direction,
        is_concerning=is_concerning,
        n_datapoints=len(windowed),
    )


# ══════════════════════════════════════════════════════════════════
#  DRIFT DETECTION (KL-Divergence)
# ══════════════════════════════════════════════════════════════════

def compute_kl_divergence(p: np.ndarray, q: np.ndarray) -> float:
    """Compute KL-divergence D_KL(P || Q).

    D_KL(P || Q) = Σ P(x) × log(P(x) / Q(x))

    Parameters
    ----------
    p : np.ndarray
        Current distribution (probability mass function).
    q : np.ndarray
        Baseline distribution (probability mass function).

    Returns
    -------
    float
        KL-divergence value. Higher = more different.
    """
    # Add epsilon to avoid log(0)
    p = np.asarray(p, dtype=np.float64) + KL_EPSILON
    q = np.asarray(q, dtype=np.float64) + KL_EPSILON

    # Normalize to valid probability distributions
    p = p / np.sum(p)
    q = q / np.sum(q)

    # D_KL(P || Q) = Σ P(x) × log(P(x) / Q(x))
    kl = float(np.sum(p * np.log(p / q)))
    return kl


def scores_to_distribution(scores: list[float], bins: int = KL_NUM_BINS) -> np.ndarray:
    """Convert score list to probability distribution via histogram.

    Parameters
    ----------
    scores : list[float]
        Score values.
    bins : int
        Number of histogram bins.

    Returns
    -------
    np.ndarray
        Probability mass function (normalized histogram).
    """
    if len(scores) < 2:
        return np.ones(bins) / bins

    arr = np.array(scores, dtype=np.float64)
    # Use fixed bins [0, 100] for score range
    hist, _ = np.histogram(arr, bins=bins, range=(0.0, 100.0))
    # Normalize to probability
    total = hist.sum()
    if total == 0:
        return np.ones(bins) / bins
    return hist.astype(np.float64) / total


def detect_drift(
    score_name: str,
    all_scores: list[float],
    threshold: float = DEFAULT_DRIFT_THRESHOLD,
) -> DriftResult:
    """Detect voice pattern drift using KL-divergence.

    Baseline = first 2 weeks of recordings (enrollment period)
    Current = latest week recordings
    If drift > threshold → "Voice pattern has changed significantly"

    Parameters
    ----------
    score_name : str
        Name of the score.
    all_scores : list[float]
        All historical scores (chronological, oldest first).
    threshold : float
        KL-divergence threshold for drift detection.

    Returns
    -------
    DriftResult
    """
    if len(all_scores) < BASELINE_DAYS + CURRENT_WINDOW_DAYS:
        # Not enough data
        return DriftResult(
            score_name=score_name,
            kl_divergence=0.0,
            threshold=threshold,
            drift_detected=False,
            baseline_mean=float(np.mean(all_scores)) if all_scores else 0.0,
            current_mean=float(np.mean(all_scores)) if all_scores else 0.0,
            change_pct=0.0,
        )

    # Baseline = first 2 weeks
    baseline_scores = all_scores[:BASELINE_DAYS]
    # Current = latest week
    current_scores = all_scores[-CURRENT_WINDOW_DAYS:]

    # Convert to distributions
    p_current = scores_to_distribution(current_scores)
    q_baseline = scores_to_distribution(baseline_scores)

    # D_KL(P_current || P_baseline)
    kl = compute_kl_divergence(p_current, q_baseline)

    baseline_mean = float(np.mean(baseline_scores))
    current_mean = float(np.mean(current_scores))
    change_pct = 0.0
    if abs(baseline_mean) > 1e-10:
        change_pct = (current_mean - baseline_mean) / abs(baseline_mean) * 100.0

    return DriftResult(
        score_name=score_name,
        kl_divergence=round(kl, 4),
        threshold=threshold,
        drift_detected=kl > threshold,
        baseline_mean=round(baseline_mean, 2),
        current_mean=round(current_mean, 2),
        change_pct=round(change_pct, 1),
    )


# ══════════════════════════════════════════════════════════════════
#  INSIGHT GENERATION
# ══════════════════════════════════════════════════════════════════

def _check_consecutive_decline(
    scores: list[float],
    score_name: str,
    weeks: int = CONSECUTIVE_DECLINE_WEEKS,
) -> bool:
    """Check if score has been declining for N consecutive weeks."""
    if len(scores) < weeks * 7:
        return False

    # Compute weekly averages for last N+1 weeks
    weekly_avgs = []
    for w in range(weeks + 1):
        start = -(weeks + 1 - w) * 7
        end = start + 7
        if end == 0:
            end = None
        week_data = scores[start:end]
        if week_data:
            weekly_avgs.append(float(np.mean(week_data)))

    if len(weekly_avgs) < weeks + 1:
        return False

    # Check consecutive decline
    if score_name in RISK_SCORES:
        # Risk: consecutive increase = declining health
        return all(weekly_avgs[i] < weekly_avgs[i + 1] for i in range(len(weekly_avgs) - 1))
    else:
        # Wellness: consecutive decrease = declining health
        return all(weekly_avgs[i] > weekly_avgs[i + 1] for i in range(len(weekly_avgs) - 1))


def generate_insights(
    trends: list[TrendResult],
    drifts: list[DriftResult],
    score_histories: dict[str, list[float]],
) -> list[str]:
    """Generate natural language insights from trend and drift analysis.

    Parameters
    ----------
    trends : list[TrendResult]
        Trend results per score.
    drifts : list[DriftResult]
        Drift results per score.
    score_histories : dict[str, list[float]]
        Full score histories per head.

    Returns
    -------
    list[str]
        List of insight messages.
    """
    insights: list[str] = []

    for trend in trends:
        scores = score_histories.get(trend.score_name, [])

        # Check consecutive decline
        if _check_consecutive_decline(scores, trend.score_name):
            if trend.score_name == "mood_pattern":
                insights.append(
                    "Mood score declining 3 weeks in a row — consider talking to someone"
                )
            elif trend.score_name == "cognitive_trend":
                insights.append(
                    "Cognitive score declining — monitor and discuss with your doctor"
                )
            elif trend.score_name == "respiratory_health":
                insights.append(
                    "Respiratory health declining — consider breathing exercises"
                )
            elif trend.score_name == "metabolic_risk":
                insights.append(
                    "Metabolic risk increasing — consider diet and exercise adjustments"
                )

        # Improving trends
        if trend.direction == "improving" and abs(trend.slope_per_week) > 3.0:
            if trend.score_name == "respiratory_health":
                insights.append(
                    "Respiratory health improved after you started walking regularly"
                )
            elif trend.score_name == "mood_pattern":
                insights.append(
                    "Mood score improving — keep up the positive habits!"
                )

        # Stable scores
        if trend.direction == "stable" and len(scores) >= 21:
            if trend.score_name == "cognitive_trend":
                insights.append(
                    "Cognitive score stable — no change detected"
                )

    # Drift-specific insights
    for drift in drifts:
        if drift.drift_detected:
            insights.append(
                f"Voice pattern has changed significantly "
                f"({drift.score_name}: {drift.change_pct:+.1f}% from baseline)"
            )

    return insights


# ══════════════════════════════════════════════════════════════════
#  MAIN ANALYSIS FUNCTION
# ══════════════════════════════════════════════════════════════════

def analyze_voice_trends(
    score_histories: dict[str, list[float]],
    drift_thresholds: Optional[dict[str, float]] = None,
) -> VoiceTrendReport:
    """Full voice trend analysis: trends + drift + insights.

    Parameters
    ----------
    score_histories : dict[str, list[float]]
        Historical scores per head. Keys: "metabolic_risk", "movement_stability",
        "cognitive_trend", "mood_pattern", "respiratory_health".
        Values: daily scores in chronological order (oldest first).
    drift_thresholds : dict[str, float], optional
        Per-score KL-divergence thresholds. Defaults to 0.5 for all.

    Returns
    -------
    VoiceTrendReport
        Complete trend analysis with insights.
    """
    if drift_thresholds is None:
        drift_thresholds = {}

    trends: list[TrendResult] = []
    drifts: list[DriftResult] = []

    for score_name, scores in score_histories.items():
        if not scores:
            continue

        # Trend analysis (4-week window)
        trend = analyze_trend(score_name, scores)
        trends.append(trend)

        # Drift detection
        threshold = drift_thresholds.get(score_name, DEFAULT_DRIFT_THRESHOLD)
        drift = detect_drift(score_name, scores, threshold)
        drifts.append(drift)

    # Generate insights
    insights = generate_insights(trends, drifts, score_histories)

    # Summary flags
    any_drift = any(d.drift_detected for d in drifts)
    any_concerning = any(t.is_concerning for t in trends)

    # Total analysis period
    max_days = max(
        (len(scores) for scores in score_histories.values()),
        default=0,
    )

    return VoiceTrendReport(
        trends=trends,
        drifts=drifts,
        insights=insights,
        any_drift_detected=any_drift,
        any_concerning_trend=any_concerning,
        analysis_period_days=max_days,
    )
