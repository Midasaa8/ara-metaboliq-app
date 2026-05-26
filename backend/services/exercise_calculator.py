# PART:   MET Exercise Calculator — 25+ exercise types + GPS Haversine
# ACTOR:  Claude Opus 4.6
# PHASE:  24 — MET Exercise Calculator + GPS Activity
# TASK:   Calculate calories burned, GPS distance, pace, weekly stats
# SCOPE:  IN: activity_type, weight_kg, duration_min, gps_coords[]
#         OUT: calories, distance_km, pace_min_per_km, weekly_stats
#
# Ref: Ainsworth BE, Compendium of Physical Activities, Med Sci Sports Exerc 2024
#      Haversine formula (standard geodesic)
#
# NOTE: Pure Python, no HTTP layer. Sonnet handles routing.
# SECURITY: No raw health data in logs.

from __future__ import annotations

import math
from collections import Counter
from dataclasses import dataclass
from typing import Optional

# ══════════════════════════════════════════════
#  MET Table — Compendium 2024 (exact values from spec)
# ══════════════════════════════════════════════
# Ref: Ainsworth BE, Med Sci Sports Exerc, 2024

MET_TABLE: dict[str, float] = {
    # Walking
    "walking_slow":         2.5,
    "walking_normal":       3.5,
    "walking_brisk":        4.3,
    # Running
    "running_light":        7.0,
    "running_moderate":     9.8,
    "running_fast":        12.0,
    # Cycling
    "cycling_light":        4.0,
    "cycling_moderate":     6.8,
    "cycling_vigorous":    10.0,
    # Swimming
    "swimming_light":       5.0,
    "swimming_moderate":    7.0,
    "swimming_laps":        9.8,
    # Gym
    "yoga":                 2.5,
    "pilates":              3.0,
    "weight_training":      3.5,
    "hiit":                 8.0,
    "crossfit":             9.5,
    # Sports
    "basketball":           6.5,
    "football":             7.0,
    "tennis":               7.3,
    "badminton":            5.5,
    "table_tennis":         4.0,
    "volleyball":           4.0,
    # Daily activities
    "housework":            3.0,
    "gardening":            4.0,
    "stairs":               8.0,
}

# Earth radius for Haversine
EARTH_RADIUS_KM: float = 6371.0


# ══════════════════════════════════════════════
#  Data classes
# ══════════════════════════════════════════════

@dataclass
class GpsCoord:
    lat: float   # decimal degrees
    lon: float   # decimal degrees


@dataclass
class ExerciseSession:
    activity_type:  str
    duration_min:   float
    calories:       float
    distance_km:    Optional[float] = None
    pace_min_per_km: Optional[float] = None


@dataclass
class WeeklyStats:
    total_minutes:  float
    total_calories: float
    favorite_activity: Optional[str]   # mode of activity types


# ══════════════════════════════════════════════
#  Core functions
# ══════════════════════════════════════════════

def get_met(activity_type: str) -> float:
    """
    Look up MET value from Compendium 2024.
    Returns 3.5 (walking_normal) if activity not found (safe default).
    """
    return MET_TABLE.get(activity_type.lower(), MET_TABLE["walking_normal"])


def calculate_calories(
    activity_type: str,
    weight_kg: float,
    duration_min: float,
) -> float:
    """
    Calories = MET × weight_kg × duration_hours
    Ref: Ainsworth Compendium 2024

    duration_hours = duration_min / 60
    """
    met = get_met(activity_type)
    duration_hours = duration_min / 60.0
    # Calories = MET × weight_kg × duration_hours
    calories = met * weight_kg * duration_hours
    return round(calories, 2)


def haversine_distance(
    lat1: float, lon1: float,
    lat2: float, lon2: float,
) -> float:
    """
    Haversine formula:
    d = 2R × arcsin(√(sin²(Δφ/2) + cos(φ₁)cos(φ₂)sin²(Δλ/2)))
    R = 6371 km

    Returns distance in km.
    """
    # Convert degrees → radians
    phi1   = math.radians(lat1)
    phi2   = math.radians(lat2)
    dphi   = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    # a = sin²(Δφ/2) + cos(φ₁)×cos(φ₂)×sin²(Δλ/2)
    a = (
        math.sin(dphi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    )
    # d = 2R × arcsin(√a)
    c = 2.0 * math.asin(math.sqrt(a))
    return round(EARTH_RADIUS_KM * c, 4)


def calculate_gps_distance(coords: list[GpsCoord]) -> float:
    """
    Sum of Haversine distances between consecutive GPS waypoints.
    Returns total distance in km.
    """
    if len(coords) < 2:
        return 0.0

    total_km = 0.0
    for i in range(len(coords) - 1):
        total_km += haversine_distance(
            coords[i].lat, coords[i].lon,
            coords[i + 1].lat, coords[i + 1].lon,
        )
    return round(total_km, 4)


def calculate_pace(distance_m: float, duration_min: float) -> Optional[float]:
    """
    Pace = duration_minutes / distance_km  [min/km]
    Returns None if distance is zero.
    """
    if distance_m <= 0:
        return None
    distance_km = distance_m / 1000.0
    # Pace [min/km] = duration_min / distance_km
    return round(duration_min / distance_km, 2)


def compute_exercise_session(
    activity_type: str,
    weight_kg: float,
    duration_min: float,
    gps_coords: Optional[list[GpsCoord]] = None,
) -> ExerciseSession:
    """
    Compute full exercise session stats.

    For GPS activities: distance from Haversine, pace from distance/time.
    For non-GPS activities: distance is None.
    """
    calories = calculate_calories(activity_type, weight_kg, duration_min)

    distance_km:    Optional[float] = None
    pace_min_per_km: Optional[float] = None

    if gps_coords and len(gps_coords) >= 2:
        distance_km = calculate_gps_distance(gps_coords)
        if distance_km > 0:
            # Pace [min/km] = duration_min / distance_km
            pace_min_per_km = round(duration_min / distance_km, 2)

    return ExerciseSession(
        activity_type=activity_type,
        duration_min=duration_min,
        calories=calories,
        distance_km=distance_km,
        pace_min_per_km=pace_min_per_km,
    )


# ══════════════════════════════════════════════
#  Weekly/Monthly stats (Fitbit-style)
# ══════════════════════════════════════════════

def compute_weekly_stats(sessions: list[dict]) -> WeeklyStats:
    """
    Compute aggregate stats over a list of session dicts.
    Each dict must have: { activity_type, duration_min, calories }

    weekly_exercise_minutes = Σ(duration_min for sessions in 7 days)
    weekly_calories_burned  = Σ(calories for sessions in 7 days)
    favorite_activity       = mode(activity_types for sessions in 30 days)
    """
    total_minutes  = sum(s["duration_min"] for s in sessions)
    total_calories = sum(s["calories"] for s in sessions)

    activity_types = [s["activity_type"] for s in sessions]
    if activity_types:
        # favorite = mode (most frequent activity)
        counter = Counter(activity_types)
        favorite_activity = counter.most_common(1)[0][0]
    else:
        favorite_activity = None

    return WeeklyStats(
        total_minutes=round(total_minutes, 2),
        total_calories=round(total_calories, 2),
        favorite_activity=favorite_activity,
    )


def format_pace(pace_min_per_km: float) -> str:
    """
    Convert decimal min/km to mm:ss string.
    e.g. 5.0 → "5:00", 5.5 → "5:30"
    """
    minutes = int(pace_min_per_km)
    seconds = int(round((pace_min_per_km - minutes) * 60))
    return f"{minutes}:{seconds:02d}"
