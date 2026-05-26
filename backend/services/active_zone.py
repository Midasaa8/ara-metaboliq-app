# PART:   Active Zone Minutes — HR zone scoring (Fitbit-inspired)
# ACTOR:  Claude Opus 4.6
# PHASE:  21 — Step Counter + Active Zone Minutes
# TASK:   Map heart rate samples → zone minutes → AZM score
# SCOPE:  IN: hr_samples (bpm), age, duration_minutes, exercise_type?, met_value?
#         OUT: fat_burn_min, cardio_min, peak_min, azm_score
#
# HR zones: % of max_HR (220 - age)
#   Fat Burn: 50–69% max HR → 1 point per minute
#   Cardio:   70–84% max HR → 2 points per minute
#   Peak:     85–100% max HR → 2 points per minute
#
# Weekly target: 150 AZM (WHO 150 min moderate exercise recommendation)
# Fallback (no HR): estimate zone from MET value
#
# SECURITY: No raw biometric data in logs.

from __future__ import annotations

from typing import Optional

# ══════════════════════════════════════════════
#  Constants
# ══════════════════════════════════════════════

# HR zone boundaries as fraction of max HR (220 - age)
# Fitbit zone definitions
HR_ZONES: dict[str, tuple[float, float]] = {
    "fat_burn": (0.50, 0.70),   # Zone 1: 50–69% max HR → 1 AZM point/min
    "cardio":   (0.70, 0.85),   # Zone 2: 70–84% max HR → 2 AZM points/min
    "peak":     (0.85, 1.00),   # Zone 3: 85–100% max HR → 2 AZM points/min
}

# AZM points per zone minute (Fitbit scoring)
AZM_POINTS: dict[str, int] = {
    "fat_burn": 1,
    "cardio":   2,
    "peak":     2,
}

# WHO weekly target
AZM_WEEKLY_TARGET: int = 150

# MET → zone fallback mapping (when HR not available)
# Compendium 2024 MET values mapped to HR zones
MET_ZONE_MAP: list[tuple[tuple[float, float], str]] = [
    ((3.0, 6.0),  "fat_burn"),   # MET 3–6  → Fat Burn
    ((6.0, 9.0),  "cardio"),     # MET 6–9  → Cardio
    ((9.0, 99.0), "peak"),       # MET 9+   → Peak
]


# ══════════════════════════════════════════════
#  Core functions
# ══════════════════════════════════════════════

def calculate_max_hr(age: int) -> float:
    """
    max_HR = 220 - age  (standard Fox & Haskell formula)
    """
    # max_HR = 220 - age
    return float(220 - age)


def classify_hr_zone(hr_bpm: float, max_hr: float) -> Optional[str]:
    """
    Classify a single HR sample into a zone.
    Returns zone name ('fat_burn', 'cardio', 'peak') or None if below fat_burn floor.

    Zones (% of max_HR):
      Fat Burn: 50–69%
      Cardio:   70–84%
      Peak:     85–100%
    """
    pct = hr_bpm / max_hr
    # Iterate zones in priority order: peak first to avoid overlap
    for zone, (low, high) in [
        ("peak",     (0.85, 1.00)),
        ("cardio",   (0.70, 0.85)),
        ("fat_burn", (0.50, 0.70)),
    ]:
        if low <= pct < high:
            return zone
    # pct == 1.00 exactly → peak
    if pct >= 1.00:
        return "peak"
    return None  # below fat_burn threshold


def compute_zone_minutes_from_hr(
    hr_samples: list[float],
    age: int,
    sampling_interval_seconds: float = 60.0,
) -> dict[str, float]:
    """
    Compute minutes spent in each zone from HR sample array.
    Each sample represents `sampling_interval_seconds` of time.

    Returns dict: {'fat_burn': float, 'cardio': float, 'peak': float}
    """
    max_hr = calculate_max_hr(age)
    interval_minutes = sampling_interval_seconds / 60.0

    zone_minutes: dict[str, float] = {"fat_burn": 0.0, "cardio": 0.0, "peak": 0.0}

    for hr in hr_samples:
        zone = classify_hr_zone(hr, max_hr)
        if zone is not None:
            zone_minutes[zone] += interval_minutes

    return {k: round(v, 2) for k, v in zone_minutes.items()}


def compute_zone_minutes_from_met(
    met_value: float,
    duration_minutes: float,
) -> dict[str, float]:
    """
    Fallback: estimate zone minutes from MET value when HR is unavailable.
    Mapping (OPUS_PHASES.md Phase 21):
      MET 3–6  → Fat Burn  (1 AZM/min)
      MET 6–9  → Cardio    (2 AZM/min)
      MET 9+   → Peak      (2 AZM/min)
    """
    zone_minutes: dict[str, float] = {"fat_burn": 0.0, "cardio": 0.0, "peak": 0.0}

    for (low, high), zone in MET_ZONE_MAP:
        if low <= met_value < high:
            zone_minutes[zone] = round(duration_minutes, 2)
            return zone_minutes

    # Below any active zone (MET < 3.0) → no AZM earned
    return zone_minutes


def calculate_azm_score(
    fat_burn_min: float,
    cardio_min: float,
    peak_min: float,
) -> float:
    """
    AZM_score = fat_burn_min × 1 + cardio_min × 2 + peak_min × 2

    Fitbit scoring (double credit for Cardio and Peak zones):
      Fat Burn → 1 point per minute
      Cardio   → 2 points per minute
      Peak     → 2 points per minute

    Weekly target: 150 AZM
    """
    # AZM = fat_burn_min × 1 + cardio_min × 2 + peak_min × 2
    return round(
        fat_burn_min * AZM_POINTS["fat_burn"]
        + cardio_min * AZM_POINTS["cardio"]
        + peak_min   * AZM_POINTS["peak"],
        2,
    )


def calculate_azm_progress_pct(azm_score: float, weekly: bool = False) -> float:
    """
    Percentage of weekly AZM target achieved.
    If weekly=False, assumes daily goal = 150 / 7 ≈ 21.4 AZM.
    """
    target = AZM_WEEKLY_TARGET if weekly else round(AZM_WEEKLY_TARGET / 7.0, 1)
    return round(min(azm_score / target * 100.0, 100.0), 1)


# ══════════════════════════════════════════════
#  Public API
# ══════════════════════════════════════════════

def process_active_zone_minutes(
    age: int,
    hr_samples: Optional[list[float]] = None,
    hr_sampling_interval_seconds: float = 60.0,
    met_value: Optional[float] = None,
    duration_minutes: Optional[float] = None,
) -> dict:
    """
    Main entry point for Phase 21 Active Zone Minutes.

    Priority:
      1. If hr_samples provided → compute zone minutes from HR data
      2. Else if met_value provided → estimate from MET fallback
      3. Else → return zero AZM (no data)

    Input:
      age                           : years (for max_HR = 220 - age)
      hr_samples                    : list of HR readings in bpm
      hr_sampling_interval_seconds  : time between HR readings (default 60s = 1 sample/min)
      met_value                     : fallback MET if no HR available
      duration_minutes              : session duration (required for MET fallback)

    Output dict:
      fat_burn_min, cardio_min, peak_min, azm_score,
      weekly_target, daily_target, progress_pct
    """
    if hr_samples and len(hr_samples) > 0:
        zone_min = compute_zone_minutes_from_hr(
            hr_samples, age, hr_sampling_interval_seconds
        )
    elif met_value is not None and duration_minutes is not None:
        zone_min = compute_zone_minutes_from_met(met_value, duration_minutes)
    else:
        zone_min = {"fat_burn": 0.0, "cardio": 0.0, "peak": 0.0}

    fat_burn_min = zone_min["fat_burn"]
    cardio_min   = zone_min["cardio"]
    peak_min     = zone_min["peak"]

    azm_score = calculate_azm_score(fat_burn_min, cardio_min, peak_min)

    return {
        "fat_burn_min":  fat_burn_min,
        "cardio_min":    cardio_min,
        "peak_min":      peak_min,
        "azm_score":     azm_score,
        "weekly_target": AZM_WEEKLY_TARGET,
        "daily_target":  round(AZM_WEEKLY_TARGET / 7.0, 1),
        "progress_pct":  calculate_azm_progress_pct(azm_score, weekly=False),
    }
