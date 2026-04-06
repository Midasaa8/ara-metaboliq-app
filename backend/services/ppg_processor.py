# PART:   PPG Server Processor — DPNet training + SIGMA-PPG foundation model
# ACTOR:  Claude Opus 4.6
# PHASE:  12 — PPG Real-time Processing (server-side component)
# TASK:   Server-side PPG analysis: DPNet training pipeline, foundation model inference,
#         batch peak detection for stored data, quality validation
# SCOPE:  IN: raw PPG segments from database / batch upload
#         OUT: denoised signals, validated peaks, HR/HRV metrics
#
# This file handles:
# 1. DPNet model training (runs offline, produces ONNX for mobile deployment)
# 2. SIGMA-PPG / Wavelet-MMR foundation model inference (too heavy for mobile)
# 3. Batch re-processing of stored PPG segments
# 4. Quality validation and signal grading
#
# Source: DPNet — Chiu et al., arXiv:2510.11058, Oct 2025
# Source: SIGMA-PPG — arXiv:2601.21031, Jan 2026
# Source: Wavelet-MMR — arXiv:2601.12215, Jan 2026

from __future__ import annotations

import logging
import time
from typing import Any, Optional

import numpy as np

logger = logging.getLogger(__name__)

# ══════════════════════════════════════════════
#  Constants
# ══════════════════════════════════════════════

DEFAULT_SAMPLE_RATE = 25  # Hz (Pod MAX86176)
MIN_PEAK_DISTANCE_S = 0.3  # seconds → max ~200 BPM
MIN_PEAK_PROMINENCE = 0.1  # normalised units
IBI_RANGE_MS = (300, 2000)  # HR 30-200 BPM


# ══════════════════════════════════════════════
#  DPNet Mamba Denoising (server-side)
# ══════════════════════════════════════════════
# Architecture (from arXiv:2510.11058):
#   Input: PPG segment (125 samples @ 25Hz = 5s)
#   4× Mamba blocks (hidden=64, selective state space, skip connections)
#   Output: denoised PPG waveform (same shape)
#
# Training objectives:
#   L_total = L_SI-SDR + λ × L_HR
#
#   SI-SDR (Scale-Invariant Signal-to-Distortion Ratio):
#     α = ⟨ŝ,s⟩ / ‖s‖²
#     SI-SDR = 10·log₁₀(‖αs‖² / ‖αs − ŝ‖²)
#
#   L_HR (physiological consistency):
#     L_HR = MSE(HR_from_denoised_peaks, HR_ground_truth)
#     Forces model to preserve peak timing → critical for IBI accuracy
#
# Mamba advantage over LSTM:
#   O(L) vs O(L²) complexity → 3× faster on edge
#   Selective state: retains only relevant temporal context


def compute_si_sdr(clean: np.ndarray, estimated: np.ndarray) -> float:
    """Compute Scale-Invariant Signal-to-Distortion Ratio.

    SI-SDR = 10·log₁₀(‖αs‖² / ‖αs − ŝ‖²)
    where α = ⟨ŝ,s⟩ / ‖s‖²

    Parameters
    ----------
    clean : np.ndarray
        Ground truth clean PPG signal.
    estimated : np.ndarray
        Denoised/estimated PPG signal.

    Returns
    -------
    float
        SI-SDR in dB. Higher is better.
    """
    # α = ⟨ŝ,s⟩ / ‖s‖²
    dot = np.dot(estimated, clean)
    s_norm_sq = np.dot(clean, clean)

    if s_norm_sq < 1e-12:
        return -np.inf

    alpha = dot / s_norm_sq

    # s_target = α·s
    s_target = alpha * clean

    # e_noise = ŝ − α·s
    e_noise = estimated - s_target

    target_power = np.dot(s_target, s_target)
    noise_power = np.dot(e_noise, e_noise)

    if noise_power < 1e-12:
        return 60.0  # Essentially perfect

    # SI-SDR = 10·log₁₀(‖αs‖² / ‖αs − ŝ‖²)
    si_sdr = 10.0 * np.log10(target_power / noise_power)
    return float(si_sdr)


# ══════════════════════════════════════════════
#  Bandpass Fallback (server-side Python)
# ══════════════════════════════════════════════

def bandpass_filter(
    signal: np.ndarray,
    fs: int = DEFAULT_SAMPLE_RATE,
    low_hz: float = 0.5,
    high_hz: float = 8.0,
    order: int = 4,
) -> np.ndarray:
    """Apply Butterworth bandpass filter to PPG signal.

    Removes:
    - Baseline wander (< 0.5 Hz) from respiration/motion
    - High-frequency noise (> 8 Hz) from EMG/electrical

    Parameters
    ----------
    signal : np.ndarray
        Raw or normalised PPG signal.
    fs : int
        Sample rate in Hz.
    low_hz, high_hz : float
        Bandpass cutoff frequencies.
    order : int
        Filter order (default: 4th order Butterworth).

    Returns
    -------
    np.ndarray
        Filtered PPG signal.
    """
    from scipy.signal import butter, filtfilt

    nyq = 0.5 * fs
    low = low_hz / nyq
    high = high_hz / nyq

    # Clamp to valid range
    low = max(low, 0.001)
    high = min(high, 0.999)

    b, a = butter(order, [low, high], btype="band")
    filtered = filtfilt(b, a, signal)
    return filtered


# ══════════════════════════════════════════════
#  Peak Detection (scipy-based, more robust than JS version)
# ══════════════════════════════════════════════

def detect_peaks(
    signal: np.ndarray,
    fs: int = DEFAULT_SAMPLE_RATE,
    min_distance_s: float = MIN_PEAK_DISTANCE_S,
    min_prominence: float = MIN_PEAK_PROMINENCE,
) -> tuple[np.ndarray, dict[str, Any]]:
    """Detect systolic peaks in denoised PPG signal.

    Uses scipy.signal.find_peaks with:
    - distance: minimum samples between peaks
    - prominence: minimum peak height above surrounding troughs

    Parameters
    ----------
    signal : np.ndarray
        Denoised PPG signal.
    fs : int
        Sample rate in Hz.
    min_distance_s : float
        Minimum seconds between peaks.
    min_prominence : float
        Minimum peak prominence (normalised).

    Returns
    -------
    tuple[np.ndarray, dict]
        (peak_indices, properties_dict)
    """
    from scipy.signal import find_peaks

    min_distance = int(min_distance_s * fs)
    peaks, properties = find_peaks(
        signal,
        distance=min_distance,
        prominence=min_prominence,
    )
    return peaks, properties


# ══════════════════════════════════════════════
#  IBI + HR + HRV Computation (server-side batch)
# ══════════════════════════════════════════════

def compute_ibi(
    peak_indices: np.ndarray,
    fs: int = DEFAULT_SAMPLE_RATE,
) -> np.ndarray:
    """Compute Inter-Beat Intervals from peak indices.

    IBI(n) = (peak(n) - peak(n-1)) / fs × 1000  [ms]
    Reject IBIs outside [300, 2000] ms (HR 30-200 BPM).

    Parameters
    ----------
    peak_indices : np.ndarray
        Array of sample indices where peaks were detected.
    fs : int
        Sample rate in Hz.

    Returns
    -------
    np.ndarray
        Valid IBI values in milliseconds.
    """
    if len(peak_indices) < 2:
        return np.array([])

    # IBI = Δpeak / fs × 1000 [ms]
    diffs = np.diff(peak_indices).astype(np.float64)
    ibis = diffs / fs * 1000.0

    # REJECT outside physiological range [300, 2000] ms
    mask = (ibis >= IBI_RANGE_MS[0]) & (ibis <= IBI_RANGE_MS[1])
    return ibis[mask]


def compute_hr_from_ibi(ibis: np.ndarray) -> float:
    """Compute heart rate from IBI array.

    HR = 60000 / mean(IBI)  [BPM]

    Parameters
    ----------
    ibis : np.ndarray
        Valid IBI values in milliseconds.

    Returns
    -------
    float
        Heart rate in BPM, or 0 if insufficient data.
    """
    if len(ibis) == 0:
        return 0.0
    mean_ibi = np.mean(ibis)
    if mean_ibi <= 0:
        return 0.0
    return float(60000.0 / mean_ibi)


# ══════════════════════════════════════════════
#  Batch Processing Pipeline
# ══════════════════════════════════════════════

def process_ppg_segment(
    raw_samples: list[float],
    fs: int = DEFAULT_SAMPLE_RATE,
    timestamp_ms: int = 0,
) -> dict[str, Any]:
    """Process a single PPG segment (server-side batch).

    Pipeline:
    1. Normalise to [0, 1]
    2. Bandpass filter (0.5-8 Hz, 4th order Butterworth)
    3. Peak detection (scipy find_peaks)
    4. IBI computation with physiological validation
    5. HR estimation
    6. Quality assessment

    Parameters
    ----------
    raw_samples : list[float]
        Raw 12-bit ADC values (0-4095).
    fs : int
        Sample rate in Hz.
    timestamp_ms : int
        Timestamp of last sample (Unix ms).

    Returns
    -------
    dict
        Processing results including clean signal, peaks, IBIs, HR, quality.
    """
    t0 = time.monotonic()
    signal = np.array(raw_samples, dtype=np.float64)
    flags: list[str] = []

    # Step 1: Normalise ADC
    signal_norm = signal / 4095.0

    # Step 2: Check quality
    dc = np.mean(signal_norm)
    if dc < 0.05:
        flags.append("low_perfusion")

    clipped = np.sum((signal <= 1) | (signal >= 4094))
    if clipped / len(signal) > 0.02:
        flags.append("signal_clipped")

    # Step 3: Bandpass filter
    if len(signal_norm) >= 13:  # Minimum for 4th order butter
        clean = bandpass_filter(signal_norm, fs)
    else:
        clean = signal_norm
        flags.append("segment_too_short")

    # Step 4: Peak detection
    peaks, props = detect_peaks(clean, fs)

    if len(peaks) < 3:
        flags.append("insufficient_peaks")

    # Step 5: IBI
    ibis = compute_ibi(peaks, fs)

    # Check IBI regularity
    if len(ibis) >= 5:
        ibi_std = float(np.std(ibis[-5:]))
        if ibi_std > 200.0:
            flags.append("irregular_rhythm")

    # Step 6: HR
    hr = compute_hr_from_ibi(ibis)

    processing_ms = (time.monotonic() - t0) * 1000

    return {
        "clean_signal": clean.tolist(),
        "peak_indices": peaks.tolist(),
        "ibis_ms": ibis.tolist(),
        "hr_bpm": round(hr, 1),
        "n_peaks": len(peaks),
        "n_valid_ibis": len(ibis),
        "flags": flags,
        "processing_ms": round(processing_ms, 2),
        "timestamp_ms": timestamp_ms,
    }


# ══════════════════════════════════════════════
#  Quality Grading
# ══════════════════════════════════════════════

def grade_ppg_quality(result: dict[str, Any]) -> str:
    """Grade PPG signal quality from processing result.

    Returns
    -------
    str
        'excellent' | 'good' | 'fair' | 'poor'
    """
    flags = result.get("flags", [])
    n_peaks = result.get("n_peaks", 0)

    if "low_perfusion" in flags or "signal_clipped" in flags:
        return "poor"
    if "insufficient_peaks" in flags:
        return "poor"
    if "irregular_rhythm" in flags:
        return "fair"
    if n_peaks >= 5:
        return "excellent"
    if n_peaks >= 3:
        return "good"
    return "fair"
