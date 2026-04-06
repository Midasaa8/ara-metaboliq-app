# PART:   Temperature Server Processor — Steinhart-Hart + batch analysis
# ACTOR:  Claude Opus 4.6
# PHASE:  14 — Temperature Algorithm (server-side component)
# TASK:   Server-side temperature: validation, batch trend, fever detection,
#         circadian rhythm analysis
# SCOPE:  IN: raw ADC readings or pre-computed temperatures from database
#         OUT: validated temperatures, trends, fever alerts
#
# Sensor: NTC 10kΩ B=3950 thermistor in voltage divider (R_ref=10kΩ, Vcc=3.3V)
#
# Source: Tong_Hop_Thuat_Toan §6 — Temperature algorithms

from __future__ import annotations

import logging
import math
import time
from typing import Any, Optional

import numpy as np

logger = logging.getLogger(__name__)

# ══════════════════════════════════════════════
#  Constants
# ══════════════════════════════════════════════

# Steinhart-Hart coefficients (calibrated for B=3950 NTC)
SH_A = 1.009249522e-3
SH_B = 2.378405444e-4
SH_C = 2.019202697e-7

# Beta approximation
BETA = 3950           # K
R0 = 10_000           # Ω (nominal @ 25°C)
T0_K = 298.15         # 25°C in Kelvin

# Hardware
R_REF = 10_000        # Reference resistor (Ω)
VCC = 3.3             # Supply voltage (V)
ADC_MAX = 4095        # 12-bit ADC

# Skin-to-core offset
SKIN_TO_CORE_OFFSET = 0.7  # °C

# Valid range
TEMP_VALID_RANGE = (30.0, 42.0)  # °C

# Fever thresholds (core temperature)
FEVER_THRESHOLDS = {
    "normal": 37.0,
    "low_grade_fever": 37.5,
    "fever": 38.0,
    "high_fever": 39.0,
    "hyperpyrexia": 41.0,
}


# ══════════════════════════════════════════════
#  ADC → Temperature Conversion
# ══════════════════════════════════════════════

def adc_to_resistance(adc_raw: int) -> float:
    """Convert 12-bit ADC reading to NTC resistance.

    V_out = ADC_raw × (Vcc / ADC_max)
    NTC_R = R_ref × V_out / (Vcc − V_out)

    Parameters
    ----------
    adc_raw : int
        Raw 12-bit ADC value (0-4095).

    Returns
    -------
    float
        NTC resistance in Ω.
    """
    adc_clamped = max(1, min(adc_raw, ADC_MAX - 1))

    # V_out = ADC_raw × (Vcc / ADC_max)
    v_out = adc_clamped * (VCC / ADC_MAX)

    # NTC_R = R_ref × V_out / (Vcc − V_out)
    v_diff = max(VCC - v_out, 1e-6)
    return R_REF * v_out / v_diff


def steinhart_hart(resistance: float) -> float:
    """Steinhart-Hart equation: resistance → temperature (°C).

    1/T = A + B×ln(R) + C×(ln(R))³
    T°C = (1/T_kelvin) − 273.15

    Parameters
    ----------
    resistance : float
        NTC resistance in Ω.

    Returns
    -------
    float
        Temperature in °C.
    """
    ln_r = math.log(resistance)

    # 1/T = A + B×ln(R) + C×(ln(R))³
    inv_t = SH_A + SH_B * ln_r + SH_C * ln_r * ln_r * ln_r

    # T°C = (1/T_kelvin) − 273.15
    return 1.0 / inv_t - 273.15


def beta_approximation(resistance: float) -> float:
    """Beta (B-parameter) approximation: resistance → temperature (°C).

    1/T = 1/T₀ + (1/B)×ln(R/R₀)
    T°C = (1/T_kelvin) − 273.15

    Faster, < 0.05°C error compared to Steinhart-Hart.

    Parameters
    ----------
    resistance : float
        NTC resistance in Ω.

    Returns
    -------
    float
        Temperature in °C.
    """
    # 1/T = 1/T₀ + (1/B)×ln(R/R₀)
    inv_t = 1.0 / T0_K + (1.0 / BETA) * math.log(resistance / R0)

    # T°C = (1/T_kelvin) − 273.15
    return 1.0 / inv_t - 273.15


def adc_to_temperature(
    adc_raw: int,
    use_steinhart_hart: bool = True,
) -> dict[str, Any]:
    """Convert raw ADC value to temperature.

    Pipeline:
    1. ADC → Voltage → Resistance
    2. Resistance → Temperature (S-H or Beta)
    3. Skin → Core correction (+0.7°C)

    Parameters
    ----------
    adc_raw : int
        Raw 12-bit ADC value (0-4095).
    use_steinhart_hart : bool
        Use Steinhart-Hart (true) or Beta approximation (false).

    Returns
    -------
    dict
        Temperature result with skin, core, resistance, flags.
    """
    flags: list[str] = []

    if adc_raw <= 0 or adc_raw >= ADC_MAX:
        flags.append("adc_saturated")

    # Step 1: ADC → Resistance
    ntc_r = adc_to_resistance(adc_raw)

    if ntc_r < 1000 or ntc_r > 100_000:
        flags.append("resistance_invalid")

    # Step 2: Resistance → Temperature
    if use_steinhart_hart:
        skin_temp = steinhart_hart(ntc_r)
    else:
        skin_temp = beta_approximation(ntc_r)

    # Step 3: Skin → Core
    # T_core ≈ T_skin + 0.7
    core_temp = skin_temp + SKIN_TO_CORE_OFFSET

    if core_temp < TEMP_VALID_RANGE[0] or core_temp > TEMP_VALID_RANGE[1]:
        flags.append("out_of_range")

    return {
        "skin_temp_c": round(skin_temp, 2),
        "core_temp_c": round(core_temp, 2),
        "ntc_resistance_ohm": round(ntc_r, 1),
        "voltage_v": round(adc_raw * (VCC / ADC_MAX), 4),
        "flags": flags,
    }


# ══════════════════════════════════════════════
#  Fever Classification
# ══════════════════════════════════════════════

def classify_fever(core_temp_c: float) -> str:
    """Classify core temperature into fever category.

    - < 37.0°C → normal
    - 37.0–37.4°C → normal_high
    - 37.5–37.9°C → low_grade_fever
    - 38.0–38.9°C → fever
    - 39.0–40.9°C → high_fever
    - ≥ 41.0°C → hyperpyrexia (emergency)

    Parameters
    ----------
    core_temp_c : float
        Core body temperature in °C.

    Returns
    -------
    str
        Fever classification.
    """
    if core_temp_c >= FEVER_THRESHOLDS["hyperpyrexia"]:
        return "hyperpyrexia"
    if core_temp_c >= FEVER_THRESHOLDS["high_fever"]:
        return "high_fever"
    if core_temp_c >= FEVER_THRESHOLDS["fever"]:
        return "fever"
    if core_temp_c >= FEVER_THRESHOLDS["low_grade_fever"]:
        return "low_grade_fever"
    if core_temp_c >= FEVER_THRESHOLDS["normal"]:
        return "normal_high"
    return "normal"


# ══════════════════════════════════════════════
#  Batch Processing
# ══════════════════════════════════════════════

def process_temperature_batch(
    adc_readings: list[dict[str, Any]],
    iir_alpha: float = 0.1,
) -> dict[str, Any]:
    """Process a batch of ADC temperature readings.

    Applies IIR smoothing across the batch and computes statistics.

    Parameters
    ----------
    adc_readings : list[dict]
        List of { "adc_raw": int, "timestamp_ms": int }.
    iir_alpha : float
        IIR smoothing factor (0-1). Default: 0.1.

    Returns
    -------
    dict
        Batch processing result with smoothed temps, stats, fever events.
    """
    if not adc_readings:
        return {"error": "no_data"}

    t0 = time.monotonic()
    results: list[dict[str, Any]] = []
    smoothed = 0.0
    initialised = False

    for reading in adc_readings:
        raw = adc_to_temperature(reading["adc_raw"])
        core = raw["core_temp_c"]

        # IIR smoothing
        # T_f(t) = α × T_raw(t) + (1-α) × T_f(t-1)
        if not initialised:
            smoothed = core
            initialised = True
        else:
            smoothed = iir_alpha * core + (1 - iir_alpha) * smoothed

        results.append({
            "core_temp_c": core,
            "smoothed_temp_c": round(smoothed, 2),
            "fever_class": classify_fever(smoothed),
            "timestamp_ms": reading.get("timestamp_ms", 0),
            "flags": raw["flags"],
        })

    # Statistics
    temps = np.array([r["smoothed_temp_c"] for r in results], dtype=np.float64)

    # Fever event detection: consecutive readings ≥ 38.0°C
    fever_events = 0
    in_fever = False
    for r in results:
        if r["smoothed_temp_c"] >= FEVER_THRESHOLDS["fever"] and not in_fever:
            fever_events += 1
            in_fever = True
        elif r["smoothed_temp_c"] < FEVER_THRESHOLDS["fever"]:
            in_fever = False

    processing_ms = (time.monotonic() - t0) * 1000

    return {
        "readings": results,
        "stats": {
            "mean_temp_c": round(float(np.mean(temps)), 2),
            "min_temp_c": round(float(np.min(temps)), 2),
            "max_temp_c": round(float(np.max(temps)), 2),
            "std_temp_c": round(float(np.std(temps)), 2),
        },
        "fever_events": fever_events,
        "n_readings": len(results),
        "processing_ms": round(processing_ms, 2),
    }


# ══════════════════════════════════════════════
#  Circadian Temperature Analysis
# ══════════════════════════════════════════════

def analyze_circadian_temperature(
    readings: list[dict[str, Any]],
) -> dict[str, Any]:
    """Analyze 24-hour temperature pattern for circadian rhythm.

    Normal pattern: nadir ~04:00–06:00, peak ~18:00–20:00.
    Amplitude: ~0.5–1.0°C variation over 24h.

    Parameters
    ----------
    readings : list[dict]
        List of { "temp_c": float, "timestamp_ms": int }.

    Returns
    -------
    dict
        Circadian analysis: nadir hour, peak hour, amplitude, phase shift.
    """
    if len(readings) < 24:
        return {"error": "insufficient_data", "min_readings": 24}

    temps = np.array([r["temp_c"] for r in readings], dtype=np.float64)
    timestamps = np.array([r["timestamp_ms"] for r in readings], dtype=np.float64)

    # Convert timestamps to hours of day (0-23)
    hours = ((timestamps / 1000) % 86400) / 3600

    nadir_idx = int(np.argmin(temps))
    peak_idx = int(np.argmax(temps))

    nadir_hour = float(hours[nadir_idx])
    peak_hour = float(hours[peak_idx])
    amplitude = float(np.max(temps) - np.min(temps))

    # Expected nadir at ~04:00
    expected_nadir = 4.0
    phase_shift_hours = abs(nadir_hour - expected_nadir)
    if phase_shift_hours > 12:
        phase_shift_hours = 24 - phase_shift_hours

    flags: list[str] = []
    if phase_shift_hours > 2:
        flags.append("circadian_disruption")
    if amplitude < 0.3:
        flags.append("blunted_rhythm")
    if amplitude > 1.5:
        flags.append("exaggerated_rhythm")

    return {
        "nadir_hour": round(nadir_hour, 1),
        "peak_hour": round(peak_hour, 1),
        "amplitude_c": round(amplitude, 2),
        "phase_shift_hours": round(phase_shift_hours, 1),
        "mean_temp_c": round(float(np.mean(temps)), 2),
        "flags": flags,
    }
