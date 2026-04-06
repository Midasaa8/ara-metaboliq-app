# PART:   SpO2 Server Processor — Beer-Lambert + Neural Calibration + HRV batch
# ACTOR:  Claude Opus 4.6
# PHASE:  13 — SpO₂ / HR / HRV Algorithms (server-side component)
# TASK:   Server-side SpO₂ analysis: neural calibration training,
#         batch HRV computation, quality validation, skin tone correction
# SCOPE:  IN: dual-channel PPG segments + IBI arrays from database
#         OUT: calibrated SpO₂, HR, HRV metrics (SDNN, RMSSD)
#
# This file handles:
# 1. Beer-Lambert SpO₂ computation (server-side validation of mobile results)
# 2. Neural calibration MLP training pipeline (corrects skin tone bias)
# 3. Batch HRV computation over 5-min / 24-hour windows
# 4. SpO₂ trend analysis for overnight monitoring
#
# Source: Beer-Lambert law (Tong_Hop_Thuat_Toan §5)
# Source: Neural calibration for skin tone bias — internal protocol

from __future__ import annotations

import logging
import time
from typing import Any, Optional

import numpy as np

logger = logging.getLogger(__name__)

# ══════════════════════════════════════════════
#  Constants
# ══════════════════════════════════════════════

DEFAULT_SAMPLE_RATE = 25     # Hz (Pod MAX86176)
DC_WINDOW_SIZE = 50          # samples (2 seconds @ 25 Hz)
SPO2_VALID_RANGE = (70, 100)  # %
HYPOXIA_THRESHOLD = 85       # % — below this → alert


# ══════════════════════════════════════════════
#  Beer-Lambert SpO₂
# ══════════════════════════════════════════════

def extract_ac_dc(
    signal: np.ndarray,
    dc_window: int = DC_WINDOW_SIZE,
) -> tuple[float, float]:
    """Extract AC and DC components from a PPG channel.

    DC = moving average over dc_window samples.
    AC = peak-to-peak amplitude.

    Parameters
    ----------
    signal : np.ndarray
        Normalised PPG signal (RED or IR channel).
    dc_window : int
        Number of samples for DC moving average.

    Returns
    -------
    tuple[float, float]
        (ac, dc) components.
    """
    # DC = moving average of last dc_window samples
    window = signal[-dc_window:] if len(signal) >= dc_window else signal
    dc = float(np.mean(window))

    # AC = peak-to-peak within window
    ac = float(np.max(window) - np.min(window))

    return ac, dc


def compute_spo2_beer_lambert(
    red_samples: list[float],
    ir_samples: list[float],
) -> dict[str, Any]:
    """Compute SpO₂ from dual-wavelength PPG using Beer-Lambert law.

    R = (AC_red / DC_red) / (AC_IR / DC_IR)
    SpO₂% = 110 − 25 × R

    Valid range: SpO₂ ∈ [70, 100]%

    Parameters
    ----------
    red_samples : list[float]
        RED 660nm raw 12-bit ADC values (0-4095).
    ir_samples : list[float]
        IR 940nm raw 12-bit ADC values (0-4095).

    Returns
    -------
    dict
        SpO₂ result with raw value, ratio R, AC/DC components.
    """
    # Normalise ADC → [0, 1]
    red = np.array(red_samples, dtype=np.float64) / 4095.0
    ir = np.array(ir_samples, dtype=np.float64) / 4095.0

    # Extract AC/DC
    ac_red, dc_red = extract_ac_dc(red)
    ac_ir, dc_ir = extract_ac_dc(ir)

    # Guard division by zero
    dc_red = max(dc_red, 1e-6)
    dc_ir = max(dc_ir, 1e-6)
    ac_ir = max(ac_ir, 1e-6)

    # R = (AC_red / DC_red) / (AC_IR / DC_IR)
    ratio_r = (ac_red / dc_red) / (ac_ir / dc_ir)

    # Clamp R to physiological range [0.2, 1.5]
    ratio_r = float(np.clip(ratio_r, 0.2, 1.5))

    # SpO₂% = 110 − 25 × R
    spo2_raw = 110.0 - 25.0 * ratio_r

    # Clamp to valid range
    spo2_raw = float(np.clip(spo2_raw, SPO2_VALID_RANGE[0], SPO2_VALID_RANGE[1]))

    flags: list[str] = []
    if dc_red < 0.05:
        flags.append("skin_contact_poor")
    if spo2_raw < HYPOXIA_THRESHOLD:
        flags.append("hypoxia_alert")

    return {
        "spo2_raw": round(spo2_raw, 2),
        "ratio_r": round(ratio_r, 4),
        "ac_red": round(ac_red, 6),
        "dc_red": round(dc_red, 6),
        "ac_ir": round(ac_ir, 6),
        "dc_ir": round(dc_ir, 6),
        "flags": flags,
    }


# ══════════════════════════════════════════════
#  Neural Calibration Layer
# ══════════════════════════════════════════════
# Corrects for skin tone bias in the empirical 110−25R formula.
#
# Architecture (Hackathon: stub, Full product: trained MLP):
#   Input: [R_raw, DC_red, DC_IR, contact_quality, motion_energy]
#   MLP: 4 layers, 32 hidden, ReLU
#   Output: δ_nn scalar correction offset (typically −2 to +1%)
#   SpO₂_calibrated = SpO₂_raw + δ_nn
#
# Reason: Original 110−25R calibration data biased toward light skin tones
#         (Sjoding et al., NEJM 2020: SpO₂ overestimated by ~2% in dark skin)
#
# Training data needed:
#   Paired (pulse oximeter reference, Pod PPG) readings
#   Across diverse skin tones (Fitzpatrick I-VI)
#   ~500 participants minimum for robust calibration


def calibrate_spo2(
    spo2_raw: float,
    ratio_r: float,
    dc_red: float,
    dc_ir: float,
    contact_quality: float = 1.0,
    motion_energy: float = 0.0,
) -> float:
    """Apply neural calibration to raw SpO₂ (stub for hackathon).

    Full product:
      δ_nn = MLP([R_raw, DC_red, DC_IR, contact_quality, motion_energy])
      SpO₂_calibrated = SpO₂_raw + δ_nn

    Parameters
    ----------
    spo2_raw : float
        Raw Beer-Lambert SpO₂ (%).
    ratio_r : float
        Perfusion ratio R.
    dc_red, dc_ir : float
        DC components of RED/IR channels.
    contact_quality : float
        Skin contact quality score [0, 1].
    motion_energy : float
        IMU-derived motion energy.

    Returns
    -------
    float
        Calibrated SpO₂ (%).
    """
    # TODO: FULL_PRODUCT — Load trained MLP model for neural calibration
    # model = onnxruntime.InferenceSession("spo2_calibration.onnx")
    # features = np.array([[ratio_r, dc_red, dc_ir, contact_quality, motion_energy]])
    # delta_nn = model.run(None, {"input": features})[0][0]
    # return spo2_raw + delta_nn

    # Hackathon: no correction applied
    return spo2_raw


# ══════════════════════════════════════════════
#  HRV Computation (batch, server-side)
# ══════════════════════════════════════════════

def compute_sdnn(ibis_ms: np.ndarray) -> float:
    """Compute SDNN (Standard Deviation of NN intervals).

    SDNN = √(1/N × Σ(IBI_i − IBI_mean)²)  [ms]

    Reflects overall HRV (sympathetic + parasympathetic).

    Parameters
    ----------
    ibis_ms : np.ndarray
        IBI values in milliseconds.

    Returns
    -------
    float
        SDNN in ms, or 0 if insufficient data.
    """
    if len(ibis_ms) < 2:
        return 0.0

    # SDNN = √(1/N × Σ(IBI_i − IBI_mean)²)
    return float(np.std(ibis_ms, ddof=0))


def compute_rmssd(ibis_ms: np.ndarray) -> float:
    """Compute RMSSD (Root Mean Square of Successive Differences).

    RMSSD = √(1/(N−1) × Σ(IBI_{i+1} − IBI_i)²)  [ms]

    Primarily reflects parasympathetic (vagal) activity.
    RMSSD > 40ms = good autonomic function.

    Parameters
    ----------
    ibis_ms : np.ndarray
        IBI values in milliseconds.

    Returns
    -------
    float
        RMSSD in ms, or 0 if insufficient data.
    """
    if len(ibis_ms) < 2:
        return 0.0

    # Successive differences
    diffs = np.diff(ibis_ms)

    # RMSSD = √(1/(N−1) × Σ(IBI_{i+1} − IBI_i)²)
    return float(np.sqrt(np.mean(diffs ** 2)))


def compute_hrv_metrics(
    ibis_ms: list[float],
    min_ibi_count: int = 50,
) -> Optional[dict[str, Any]]:
    """Compute time-domain HRV metrics from IBI array.

    Parameters
    ----------
    ibis_ms : list[float]
        IBI values in milliseconds.
    min_ibi_count : int
        Minimum number of IBIs required for reliable HRV.

    Returns
    -------
    dict or None
        HRV metrics (sdnn, rmssd) or None if insufficient data.
    """
    arr = np.array(ibis_ms, dtype=np.float64)

    if len(arr) < min_ibi_count:
        return None

    sdnn = compute_sdnn(arr)
    rmssd = compute_rmssd(arr)

    return {
        "sdnn_ms": round(sdnn, 2),
        "rmssd_ms": round(rmssd, 2),
        "n_samples": len(arr),
        "mean_ibi_ms": round(float(np.mean(arr)), 2),
        "hr_bpm": round(60000.0 / float(np.mean(arr)), 1) if np.mean(arr) > 0 else 0,
        "autonomic_status": "good" if rmssd > 40 else "reduced",
    }


# ══════════════════════════════════════════════
#  HR from IBI (server-side batch)
# ══════════════════════════════════════════════

def compute_hr_from_ibi(ibis_ms: list[float]) -> float:
    """Compute heart rate from IBI array.

    HR = 60000 / mean(IBI)  [BPM]

    Parameters
    ----------
    ibis_ms : list[float]
        IBI values in milliseconds.

    Returns
    -------
    float
        HR in BPM, or 0 if no data.
    """
    if not ibis_ms:
        return 0.0
    mean_ibi = np.mean(ibis_ms)
    if mean_ibi <= 0:
        return 0.0
    return float(round(60000.0 / mean_ibi, 1))


# ══════════════════════════════════════════════
#  SpO₂ Overnight Trend Analysis
# ══════════════════════════════════════════════

def analyze_overnight_spo2(
    readings: list[dict[str, Any]],
) -> dict[str, Any]:
    """Analyze overnight SpO₂ trend for sleep apnea screening.

    Parameters
    ----------
    readings : list[dict]
        List of SpO₂ readings from overnight session.
        Each: { "spo2": float, "timestamp_ms": int }

    Returns
    -------
    dict
        Overnight analysis with desaturation events, mean SpO₂, nadir.
    """
    if not readings:
        return {"error": "no_data"}

    values = np.array([r["spo2"] for r in readings], dtype=np.float64)

    mean_spo2 = float(np.mean(values))
    min_spo2 = float(np.min(values))
    max_spo2 = float(np.max(values))

    # Count desaturation events: drop ≥ 3% from baseline for > 10 seconds
    baseline = np.percentile(values, 90)  # 90th percentile as baseline
    desaturation_threshold = baseline - 3.0

    # Simple event counter (no duration check in hackathon)
    desat_count = 0
    in_desat = False
    for v in values:
        if v < desaturation_threshold and not in_desat:
            desat_count += 1
            in_desat = True
        elif v >= desaturation_threshold:
            in_desat = False

    # ODI (Oxygen Desaturation Index) = events per hour
    # Approximate duration from timestamps
    duration_h = 0.0
    if len(readings) >= 2:
        duration_ms = readings[-1]["timestamp_ms"] - readings[0]["timestamp_ms"]
        duration_h = duration_ms / 3_600_000

    odi = desat_count / duration_h if duration_h > 0 else 0

    flags: list[str] = []
    if odi >= 15:
        flags.append("moderate_osa_risk")    # ODI ≥ 15 → moderate OSA
    elif odi >= 5:
        flags.append("mild_osa_risk")        # ODI ≥ 5 → mild OSA
    if min_spo2 < 85:
        flags.append("severe_desaturation")

    return {
        "mean_spo2": round(mean_spo2, 1),
        "min_spo2": round(min_spo2, 1),
        "max_spo2": round(max_spo2, 1),
        "baseline_spo2": round(float(baseline), 1),
        "desaturation_events": desat_count,
        "odi_per_hour": round(odi, 1),
        "duration_hours": round(duration_h, 2),
        "n_readings": len(readings),
        "flags": flags,
    }


# ══════════════════════════════════════════════
#  Full Processing Pipeline (server batch)
# ══════════════════════════════════════════════

def process_spo2_segment(
    red_samples: list[float],
    ir_samples: list[float],
    ibis_ms: list[float],
    timestamp_ms: int = 0,
) -> dict[str, Any]:
    """Process dual-channel PPG segment for SpO₂ + HR + HRV.

    Matches mobile SpO2Processor output for cross-validation.

    Parameters
    ----------
    red_samples : list[float]
        RED 660nm raw ADC values (0-4095).
    ir_samples : list[float]
        IR 940nm raw ADC values (0-4095).
    ibis_ms : list[float]
        IBI values in milliseconds from PPG peak detection.
    timestamp_ms : int
        Timestamp of last sample (Unix ms).

    Returns
    -------
    dict
        Complete SpO₂ + HR + HRV processing result.
    """
    t0 = time.monotonic()
    flags: list[str] = []

    # Step 1: Beer-Lambert SpO₂
    spo2_result = compute_spo2_beer_lambert(red_samples, ir_samples)
    flags.extend(spo2_result.get("flags", []))

    # Step 2: Neural calibration
    spo2_calibrated = calibrate_spo2(
        spo2_result["spo2_raw"],
        spo2_result["ratio_r"],
        spo2_result["dc_red"],
        spo2_result["dc_ir"],
    )

    # Step 3: HR from IBI
    hr_bpm = compute_hr_from_ibi(ibis_ms)

    # Step 4: HRV metrics
    hrv = compute_hrv_metrics(ibis_ms)

    if len(ibis_ms) < 10:
        flags.append("insufficient_data")

    processing_ms = (time.monotonic() - t0) * 1000

    return {
        "spo2_raw": spo2_result["spo2_raw"],
        "spo2_calibrated": round(spo2_calibrated, 2),
        "ratio_r": spo2_result["ratio_r"],
        "hr_bpm": hr_bpm,
        "hrv": hrv,
        "flags": list(set(flags)),  # deduplicate
        "processing_ms": round(processing_ms, 2),
        "timestamp_ms": timestamp_ms,
    }
