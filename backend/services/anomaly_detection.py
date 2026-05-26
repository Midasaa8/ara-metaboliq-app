# PART:   Anomaly Detection — Z-score + Isolation Forest smart alerts
# ACTOR:  Claude Opus 4.6
# PHASE:  28 — Anomaly Detection
# TASK:   Detect unusual health metric patterns and generate alerts
# SCOPE:  IN: 30-day rolling health metrics per user
#         OUT: { anomalies, isolation_forest_anomaly, combined_score }
#
# ══════ METHOD 1: Z-SCORE (univariate, per metric, rolling 30 days) ══════
# z = (x - μ₃₀d) / σ₃₀d
#
# alert_level:
#   |z| < 1.5  → normal
#   |z| < 2.0  → attention
#   |z| < 3.0  → warning
#   |z| ≥ 3.0  → alert (recommend action)
#
# ══════ METHOD 2: ISOLATION FOREST (multivariate) ══════
# features = [sleep_score, steps, voice_stress, weight_delta_7d,
#             exercise_min, food_completeness, mood_score,
#             respiratory_score, metabolic_risk]
#
# clf = IsolationForest(n_estimators=100, contamination=0.1, random_state=42)
# anomaly_score = clf.decision_function(today_vector)
# is_anomaly = anomaly_score < -0.5
#
# Trains on 30-day rolling window of user's own data
# Re-fit daily at midnight
#
# ══════ ENDPOINT ══════
# GET /health/anomalies
# Response: { anomalies: [{ metric, z_score, alert_level, message }],
#             isolation_forest_anomaly: bool, combined_score: float }

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Optional

import numpy as np
from sklearn.ensemble import IsolationForest

logger = logging.getLogger(__name__)

# ── Z-score alert thresholds ──
Z_THRESHOLD_NORMAL = 1.5
Z_THRESHOLD_ATTENTION = 2.0
Z_THRESHOLD_WARNING = 3.0

# ── Isolation Forest parameters ──
IF_N_ESTIMATORS = 100
IF_CONTAMINATION = 0.1
IF_RANDOM_STATE = 42
IF_ANOMALY_THRESHOLD = -0.5

# ── Feature names for Isolation Forest ──
IF_FEATURE_NAMES = [
    "sleep_score",
    "steps",
    "voice_stress",
    "weight_delta_7d",
    "exercise_min",
    "food_completeness",
    "mood_score",
    "respiratory_score",
    "metabolic_risk",
]

# ── Alert level definitions ──
ALERT_LEVELS = {
    "normal": "|z| < 1.5",
    "attention": "1.5 ≤ |z| < 2.0",
    "warning": "2.0 ≤ |z| < 3.0",
    "alert": "|z| ≥ 3.0",
}

# ── Natural language alert templates ──
ALERT_TEMPLATES = {
    "sleep_score": {
        "drop": "Sleep score dropped {pct:.0f}% this week — unusual for you",
        "rise": "Sleep score improved {pct:.0f}% — great progress!",
    },
    "steps": {
        "drop": "Daily steps significantly lower than usual — {value:.0f} vs avg {mean:.0f}",
        "rise": "Exceptional activity today — {value:.0f} steps!",
    },
    "voice_stress": {
        "drop": "Voice stress decreased — you sound more relaxed today",
        "rise": "Voice stress + sleep decline detected together — pattern alert",
    },
    "weight_delta_7d": {
        "drop": "Weight dropped {value:.1f}kg in 7 days — monitor hydration",
        "rise": "Weight gained {value:.1f}kg in {days} days — possible water retention",
    },
    "exercise_min": {
        "drop": "Exercise significantly below your usual level",
        "rise": "Great workout volume this week!",
    },
    "food_completeness": {
        "drop": "Food logging incomplete — try to maintain your tracking habit",
        "rise": "Excellent food tracking consistency!",
    },
    "mood_score": {
        "drop": "Mood score declining — consider relaxation activities",
        "rise": "Mood improving — keep up the positive patterns",
    },
    "respiratory_score": {
        "drop": "Respiratory health signal declining — monitor breathing",
        "rise": "Respiratory health signal improving",
    },
    "metabolic_risk": {
        "drop": "Metabolic risk signal decreased — positive trend",
        "rise": "Metabolic risk signal elevated {days} days in a row — consider blood work",
    },
}


# ══════════════════════════════════════════════════════════════════
#  DATA CLASSES
# ══════════════════════════════════════════════════════════════════

@dataclass
class AnomalyAlert:
    """Single anomaly detection result for one metric."""
    metric: str
    value: float
    mean_30d: float
    std_30d: float
    z_score: float
    alert_level: str          # "normal", "attention", "warning", "alert"
    message: str              # natural language alert
    direction: str            # "high" or "low" (relative to mean)


@dataclass
class AnomalyDetectionResult:
    """Complete anomaly detection result."""
    anomalies: list[AnomalyAlert]     # only non-normal alerts
    all_metrics: list[AnomalyAlert]   # all metrics including normal
    isolation_forest_anomaly: bool
    isolation_forest_score: float     # decision_function output
    combined_score: float             # 0-100, higher = more anomalous
    alert_count: int
    highest_alert_level: str


# ══════════════════════════════════════════════════════════════════
#  METHOD 1: Z-SCORE
# ══════════════════════════════════════════════════════════════════

def classify_z_alert(z_score: float) -> str:
    """Classify alert level from absolute z-score.

    |z| < 1.5  → normal
    |z| < 2.0  → attention
    |z| < 3.0  → warning
    |z| ≥ 3.0  → alert
    """
    abs_z = abs(z_score)
    if abs_z < Z_THRESHOLD_NORMAL:
        return "normal"
    elif abs_z < Z_THRESHOLD_ATTENTION:
        return "attention"
    elif abs_z < Z_THRESHOLD_WARNING:
        return "warning"
    else:
        return "alert"


def compute_z_score(
    current_value: float,
    history_30d: list[float],
) -> tuple[float, float, float]:
    """Compute z-score for a single metric.

    z = (x - μ₃₀d) / σ₃₀d

    Parameters
    ----------
    current_value : float
        Today's value for this metric.
    history_30d : list[float]
        Last 30 days of values (excluding today).

    Returns
    -------
    tuple[float, float, float]
        (z_score, mean_30d, std_30d)
    """
    if len(history_30d) < 3:
        # Not enough data for meaningful z-score
        return 0.0, current_value, 0.0

    arr = np.array(history_30d, dtype=np.float64)
    mean_30d = float(np.mean(arr))
    std_30d = float(np.std(arr, ddof=1))  # sample std

    if std_30d < 1e-10:
        # No variation in history → any change is notable
        if abs(current_value - mean_30d) > 1e-10:
            z_score = 3.0 * np.sign(current_value - mean_30d)
        else:
            z_score = 0.0
    else:
        # z = (x - μ₃₀d) / σ₃₀d
        z_score = (current_value - mean_30d) / std_30d

    return float(z_score), mean_30d, std_30d


def generate_alert_message(
    metric: str,
    z_score: float,
    value: float,
    mean_30d: float,
) -> str:
    """Generate natural language alert message.

    Parameters
    ----------
    metric : str
        Metric name.
    z_score : float
        Z-score value.
    value : float
        Current metric value.
    mean_30d : float
        30-day mean.

    Returns
    -------
    str
        Human-readable alert message.
    """
    direction = "rise" if z_score > 0 else "drop"

    # For metrics where "high = bad" (voice_stress, metabolic_risk, weight_delta)
    # positive z = concerning
    # For metrics where "high = good" (sleep_score, steps, exercise_min, mood_score)
    # negative z = concerning

    templates = ALERT_TEMPLATES.get(metric, {})
    template = templates.get(direction, f"{metric} is unusual — z-score: {z_score:.1f}")

    # Calculate percentage change
    if abs(mean_30d) > 1e-10:
        pct = abs(value - mean_30d) / abs(mean_30d) * 100
    else:
        pct = 0.0

    try:
        message = template.format(
            pct=pct,
            value=value,
            mean=mean_30d,
            days=7,
        )
    except (KeyError, ValueError):
        message = f"{metric}: z-score {z_score:.2f} (value={value:.1f}, mean={mean_30d:.1f})"

    return message


def detect_zscore_anomalies(
    today_metrics: dict[str, float],
    history_30d: dict[str, list[float]],
) -> list[AnomalyAlert]:
    """Run Z-score anomaly detection on all available metrics.

    Parameters
    ----------
    today_metrics : dict[str, float]
        Today's values for each metric.
    history_30d : dict[str, list[float]]
        Last 30 days of values per metric.

    Returns
    -------
    list[AnomalyAlert]
        All metric assessments (including normal).
    """
    alerts: list[AnomalyAlert] = []

    for metric, value in today_metrics.items():
        history = history_30d.get(metric, [])
        z_score, mean_30d, std_30d = compute_z_score(value, history)
        alert_level = classify_z_alert(z_score)
        direction = "high" if z_score > 0 else "low"

        message = ""
        if alert_level != "normal":
            message = generate_alert_message(metric, z_score, value, mean_30d)

        alerts.append(AnomalyAlert(
            metric=metric,
            value=round(value, 2),
            mean_30d=round(mean_30d, 2),
            std_30d=round(std_30d, 2),
            z_score=round(z_score, 3),
            alert_level=alert_level,
            message=message,
            direction=direction,
        ))

    return alerts


# ══════════════════════════════════════════════════════════════════
#  METHOD 2: ISOLATION FOREST
# ══════════════════════════════════════════════════════════════════

def train_isolation_forest(
    history_matrix: np.ndarray,
) -> IsolationForest:
    """Train Isolation Forest on user's 30-day rolling window.

    clf = IsolationForest(n_estimators=100, contamination=0.1, random_state=42)

    Parameters
    ----------
    history_matrix : np.ndarray
        Shape (n_days, 9) — 30 days × 9 features.

    Returns
    -------
    IsolationForest
        Fitted model.
    """
    clf = IsolationForest(
        n_estimators=IF_N_ESTIMATORS,
        contamination=IF_CONTAMINATION,
        random_state=IF_RANDOM_STATE,
    )
    clf.fit(history_matrix)
    return clf


def detect_isolation_forest_anomaly(
    today_vector: np.ndarray,
    history_matrix: np.ndarray,
) -> tuple[bool, float]:
    """Run Isolation Forest anomaly detection.

    anomaly_score = clf.decision_function(today_vector)
    is_anomaly = anomaly_score < -0.5

    Parameters
    ----------
    today_vector : np.ndarray
        Shape (9,) — today's 9 features.
    history_matrix : np.ndarray
        Shape (n_days, 9) — user's 30-day history.

    Returns
    -------
    tuple[bool, float]
        (is_anomaly, anomaly_score)
    """
    if history_matrix.shape[0] < 7:
        # Not enough data to train meaningfully
        return False, 0.0

    clf = train_isolation_forest(history_matrix)

    # decision_function: negative = more anomalous
    anomaly_score = float(clf.decision_function(today_vector.reshape(1, -1))[0])

    # is_anomaly = anomaly_score < -0.5
    is_anomaly = anomaly_score < IF_ANOMALY_THRESHOLD

    return is_anomaly, round(anomaly_score, 4)


# ══════════════════════════════════════════════════════════════════
#  COMBINED DETECTION
# ══════════════════════════════════════════════════════════════════

def compute_combined_score(
    z_alerts: list[AnomalyAlert],
    if_anomaly: bool,
    if_score: float,
) -> float:
    """Compute combined anomaly score [0-100].

    Combines Z-score severity across all metrics with Isolation Forest result.
    Higher = more anomalous.
    """
    # Z-score component: max absolute z-score normalized to [0, 50]
    max_abs_z = max((abs(a.z_score) for a in z_alerts), default=0.0)
    z_component = min(max_abs_z / 4.0 * 50.0, 50.0)  # z=4 → 50 points

    # Isolation Forest component: score mapped to [0, 50]
    # decision_function: typically in [-0.5, 0.5], more negative = more anomalous
    if_component = max(0.0, min(50.0, (-if_score + 0.5) * 50.0))

    # If IF says anomaly, boost the combined score
    if if_anomaly:
        if_component = max(if_component, 30.0)

    combined = z_component + if_component
    return round(min(100.0, max(0.0, combined)), 2)


def detect_anomalies(
    today_metrics: dict[str, float],
    history_30d: dict[str, list[float]],
) -> AnomalyDetectionResult:
    """Full anomaly detection pipeline: Z-score + Isolation Forest.

    Parameters
    ----------
    today_metrics : dict[str, float]
        Today's metric values. Keys should include the 9 IF features:
        sleep_score, steps, voice_stress, weight_delta_7d, exercise_min,
        food_completeness, mood_score, respiratory_score, metabolic_risk.
    history_30d : dict[str, list[float]]
        Last 30 days of each metric (key → list of daily values).

    Returns
    -------
    AnomalyDetectionResult
        Complete anomaly assessment.
    """
    # ── Method 1: Z-score for all metrics ──
    all_alerts = detect_zscore_anomalies(today_metrics, history_30d)

    # Filter to only non-normal alerts
    anomalies = [a for a in all_alerts if a.alert_level != "normal"]

    # ── Method 2: Isolation Forest (multivariate) ──
    # Build today's feature vector (9 features in specified order)
    today_vector = np.array([
        today_metrics.get(feat, 0.0) for feat in IF_FEATURE_NAMES
    ], dtype=np.float64)

    # Build history matrix
    n_days = min(
        len(history_30d.get(feat, [])) for feat in IF_FEATURE_NAMES
    ) if all(feat in history_30d for feat in IF_FEATURE_NAMES) else 0

    if_anomaly = False
    if_score = 0.0

    if n_days >= 7:
        history_matrix = np.zeros((n_days, len(IF_FEATURE_NAMES)), dtype=np.float64)
        for col_idx, feat in enumerate(IF_FEATURE_NAMES):
            feat_history = history_30d.get(feat, [])
            # Use last n_days entries
            history_matrix[:, col_idx] = feat_history[-n_days:]

        if_anomaly, if_score = detect_isolation_forest_anomaly(
            today_vector, history_matrix
        )

    # ── Combined score ──
    combined_score = compute_combined_score(all_alerts, if_anomaly, if_score)

    # Determine highest alert level
    alert_priority = {"normal": 0, "attention": 1, "warning": 2, "alert": 3}
    highest_level = "normal"
    for alert in all_alerts:
        if alert_priority.get(alert.alert_level, 0) > alert_priority.get(highest_level, 0):
            highest_level = alert.alert_level

    if if_anomaly and alert_priority.get(highest_level, 0) < 2:
        highest_level = "warning"

    return AnomalyDetectionResult(
        anomalies=anomalies,
        all_metrics=all_alerts,
        isolation_forest_anomaly=if_anomaly,
        isolation_forest_score=if_score,
        combined_score=combined_score,
        alert_count=len(anomalies),
        highest_alert_level=highest_level,
    )
