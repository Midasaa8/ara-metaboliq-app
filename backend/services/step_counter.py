# PART:   Step Counter — accelerometer peak detection + distance
# ACTOR:  Claude Opus 4.6
# PHASE:  21 — Step Counter + Active Zone Minutes
# TASK:   Process raw accelerometer magnitude → step count → distance → active minutes
# SCOPE:  IN: accelerometer samples (ax, ay, az), fs, stride_m, weight_kg
#         OUT: steps, distance_m, active_minutes, calories_walking
#
# Algorithm: Butterworth bandpass (0.5–3.0 Hz, order 4) + peak detection
# Ref: Zhao et al. (2010), step detection on smartphones
#      Scipy signal processing
#
# NOTE: Phone accelerometer data is collected client-side (React Native).
#       This service processes the uploaded sample arrays server-side.
#
# SECURITY: No raw biometric data in logs.

from __future__ import annotations

import math
from typing import Optional

import numpy as np
from scipy import signal

# ══════════════════════════════════════════════
#  Constants
# ══════════════════════════════════════════════

# Butterworth bandpass filter parameters
# Step frequency in walking: 0.5–3.0 Hz (Zhao 2010)
FILTER_LOWCUT_HZ:   float = 0.5
FILTER_HIGHCUT_HZ:  float = 3.0
FILTER_ORDER:       int   = 4
DEFAULT_FS_HZ:      float = 50.0   # typical phone accelerometer sample rate

# Peak detection parameters (validated Zhao 2010)
PEAK_DISTANCE_SAMPLES: int   = 15    # min samples between peaks at 50 Hz
PEAK_PROMINENCE:       float = 0.5   # minimum peak prominence (g)

# MET threshold for "active minute"
ACTIVE_MET_THRESHOLD: float = 3.0

# Walking MET approximation (used when no exercise type provided)
# Normal walking ≈ 3.5 MET (Compendium 2024)
WALKING_MET: float = 3.5


# ══════════════════════════════════════════════
#  Core functions
# ══════════════════════════════════════════════

def compute_magnitude(ax: np.ndarray, ay: np.ndarray, az: np.ndarray) -> np.ndarray:
    """
    Resultant acceleration magnitude:
      mag = √(ax² + ay² + az²)
    Unit: same as input (typically g or m/s²)
    """
    # mag = √(ax² + ay² + az²)
    return np.sqrt(ax ** 2 + ay ** 2 + az ** 2)


def butter_bandpass(
    data: np.ndarray,
    lowcut: float = FILTER_LOWCUT_HZ,
    highcut: float = FILTER_HIGHCUT_HZ,
    fs: float = DEFAULT_FS_HZ,
    order: int = FILTER_ORDER,
) -> np.ndarray:
    """
    Butterworth bandpass filter (order 4, 0.5–3.0 Hz at 50 Hz sample rate).
    Isolates step-frequency band from raw accelerometer magnitude.

    Ref: Zhao (2010) — step detection in smartphones
    """
    nyq = 0.5 * fs
    low  = lowcut  / nyq
    high = highcut / nyq
    # Design Butterworth bandpass filter
    b, a = signal.butter(order, [low, high], btype="band")
    # Apply zero-phase forward-backward filter
    return signal.filtfilt(b, a, data)


def detect_peaks(filtered: np.ndarray) -> np.ndarray:
    """
    Peak detection on filtered signal.
    Parameters validated (Zhao 2010):
      distance=15 samples  (at 50 Hz → min 0.3 s between steps)
      prominence=0.5        (filters noise spikes)

    Returns array of peak indices.
    """
    peaks, _ = signal.find_peaks(
        filtered,
        distance=PEAK_DISTANCE_SAMPLES,
        prominence=PEAK_PROMINENCE,
    )
    return peaks


def count_steps(ax: np.ndarray, ay: np.ndarray, az: np.ndarray, fs: float = DEFAULT_FS_HZ) -> int:
    """
    Full step counting pipeline:
      1. mag = √(ax² + ay² + az²)
      2. filtered = Butterworth bandpass(mag, 0.5–3.0 Hz, order 4)
      3. peaks = find_peaks(filtered, distance=15, prominence=0.5)
      4. steps = len(peaks)
    """
    mag      = compute_magnitude(ax, ay, az)
    filtered = butter_bandpass(mag, fs=fs)
    peaks    = detect_peaks(filtered)
    return int(len(peaks))


def calculate_distance_m(steps: int, stride_m: float) -> float:
    """
    distance_m = steps × stride_m
    stride_m provided by Phase 20 body_composition.calculate_stride_m()
    """
    # distance_m = steps × stride_m
    return round(steps * stride_m, 2)


def calculate_active_minutes(
    steps: int,
    duration_seconds: float,
    met_value: float = WALKING_MET,
) -> int:
    """
    Count minutes where estimated MET > 3.0 (threshold for "active").
    For walking, uses WALKING_MET = 3.5 (normal walk, Compendium 2024).

    active_minutes = count_minutes_where(MET > 3.0)
    If met_value > ACTIVE_MET_THRESHOLD for the session → whole session is active.
    """
    total_minutes = duration_seconds / 60.0
    if met_value > ACTIVE_MET_THRESHOLD:
        # Full session qualifies as active
        return int(math.ceil(total_minutes))
    return 0


def calculate_walking_calories(steps: int, weight_kg: float, stride_m: float) -> float:
    """
    Estimate calories burned walking using MET method.
      distance_km = steps × stride_m / 1000
      speed_km_h  = distance_km / (steps × stride_m / avg_speed)  [approx]
      calories    = MET × weight_kg × duration_hours
    Simplified: assume 0.5 kcal per step per 70 kg → scaled by weight
    More accurate: use MET × weight × time from exercise_calculator (Phase 24).
    Here: calories = WALKING_MET × weight_kg × (distance_m / 1000 / 5.0)
    5.0 km/h = typical brisk walking speed
    """
    distance_km  = steps * stride_m / 1000.0
    # duration_h = distance_km / speed_km_h  (5 km/h assumption)
    duration_h   = distance_km / 5.0
    # calories = MET × weight_kg × duration_hours
    calories     = WALKING_MET * weight_kg * duration_h
    return round(calories, 2)


# ══════════════════════════════════════════════
#  Public API
# ══════════════════════════════════════════════

def process_step_data(
    ax: list[float],
    ay: list[float],
    az: list[float],
    stride_m: float,
    weight_kg: float,
    fs: float = DEFAULT_FS_HZ,
    duration_seconds: Optional[float] = None,
) -> dict:
    """
    Main entry point for Phase 21 Step Counter.

    Input:
      ax, ay, az     : accelerometer sample arrays (g)
      stride_m       : from Phase 20 body_composition.calculate_stride_m()
      weight_kg      : for calorie estimate
      fs             : sample rate in Hz (default 50 Hz)
      duration_seconds: total recording duration; inferred from samples if None

    Output dict:
      steps, distance_m, active_minutes, calories_walking
    """
    ax_arr = np.array(ax, dtype=np.float64)
    ay_arr = np.array(ay, dtype=np.float64)
    az_arr = np.array(az, dtype=np.float64)

    if duration_seconds is None:
        duration_seconds = len(ax_arr) / fs

    steps          = count_steps(ax_arr, ay_arr, az_arr, fs=fs)
    distance_m     = calculate_distance_m(steps, stride_m)
    active_minutes = calculate_active_minutes(steps, duration_seconds, WALKING_MET)
    calories       = calculate_walking_calories(steps, weight_kg, stride_m)

    return {
        "steps":          steps,
        "distance_m":     distance_m,
        "active_minutes": active_minutes,
        "calories_walking": calories,
    }
