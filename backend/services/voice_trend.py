# PART:   VoiceTrend — historical trend analysis for voice biomarkers
# ACTOR:  Claude Opus 4.6
# PHASE:  4 — Voice AI Module
# TASK:   Moving average, day-over-day comparison, 7/30/90 day trends
# SCOPE:  IN: user_id + historical voice_logs from DB
#         OUT: trend data for frontend charts

from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Any, Optional

import numpy as np

logger = logging.getLogger(__name__)


def compute_trend(
    history: list[dict[str, Any]],
    window_days: int = 7,
) -> dict[str, Any]:
    """Compute moving average trend from voice analysis history.

    Parameters
    ----------
    history : list[dict]
        List of voice analysis results ordered by date (oldest first).
        Each dict must contain: "date", "recovery_readiness_score", "sub_scores".
    window_days : int
        Moving average window in days (7, 30, or 90).

    Returns
    -------
    dict
        {
            "current_score": int,
            "previous_score": int,
            "delta": int,
            "trend_direction": "improving" | "declining" | "stable",
            "moving_average": float,
            "daily_scores": [{"date": str, "score": int}, ...],
        }
    """
    if not history:
        return {
            "current_score": 0,
            "previous_score": 0,
            "delta": 0,
            "trend_direction": "stable",
            "moving_average": 0.0,
            "daily_scores": [],
        }

    scores = [h["recovery_readiness_score"] for h in history]
    dates = [h["date"] for h in history]

    current_score = scores[-1] if scores else 0
    previous_score = scores[-2] if len(scores) >= 2 else current_score
    delta = current_score - previous_score

    # Moving average over window
    window = scores[-window_days:] if len(scores) >= window_days else scores
    moving_avg = float(np.mean(window))

    # Trend direction based on linear slope
    if len(window) >= 3:
        x = np.arange(len(window), dtype=np.float64)
        y = np.array(window, dtype=np.float64)
        # slope = Σ((x-x̄)(y-ȳ)) / Σ((x-x̄)²)
        slope = np.polyfit(x, y, 1)[0]
        if slope > 1.0:
            trend = "improving"
        elif slope < -1.0:
            trend = "declining"
        else:
            trend = "stable"
    else:
        trend = "stable"

    daily_scores = [
        {"date": str(d), "score": s} for d, s in zip(dates, scores)
    ]

    return {
        "current_score": current_score,
        "previous_score": previous_score,
        "delta": delta,
        "trend_direction": trend,
        "moving_average": round(moving_avg, 1),
        "daily_scores": daily_scores[-window_days:],
    }


def compare_vs_yesterday(
    today_result: dict[str, Any],
    yesterday_result: dict[str, Any] | None,
) -> dict[str, Any]:
    """Compare today's voice analysis vs yesterday for display on result screen.

    Parameters
    ----------
    today_result : dict
        Today's voice analysis result.
    yesterday_result : dict or None
        Yesterday's result (None if first day).

    Returns
    -------
    dict
        Per sub-score delta comparison for the UI.
    """
    if yesterday_result is None:
        return {
            "has_comparison": False,
            "deltas": {},
        }

    today_subs = today_result.get("sub_scores", {})
    yesterday_subs = yesterday_result.get("sub_scores", {})

    deltas = {}
    for key in ["energy", "stress", "cardiac_recovery", "respiratory"]:
        t = today_subs.get(key, 0)
        y = yesterday_subs.get(key, 0)
        diff = t - y
        if diff > 0:
            direction = "better"
        elif diff < 0:
            direction = "worse"
        else:
            direction = "same"
        deltas[key] = {
            "today": t,
            "yesterday": y,
            "delta": diff,
            "direction": direction,
        }

    return {
        "has_comparison": True,
        "deltas": deltas,
    }
