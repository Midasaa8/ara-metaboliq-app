# PART:   VoiceAI — MARVEL dual-branch multi-task health screening
# ACTOR:  Claude Opus 4.6
# PHASE:  4 — Voice AI Module
# TASK:   Acoustic feature extraction + multi-condition classification (9 diseases)
# SCOPE:  IN: raw PCM audio bytes (16kHz, 16-bit mono, 5s)
#         OUT: {recovery_readiness_score, sub_scores, condition_risks, flags}
#
# Pipeline: Load PCM → SNR check → openSMILE GeMAPS → MARVEL heads
# Hackathon: Branch B only (GeMAPS 88-dim + XGBoost)
# Full Product: Branch A + B (HuBERT-768 + GeMAPS, late fusion)
#
# Source: MARVEL — Multi-task Acoustic Representations for Voice-based Health Analysis
#         Piao et al., arXiv:2508.20717, published Dec 2025
#
# IS_HACKATHON flag controls which branch to use.
# Sonnet calls this from the router — Opus owns the algorithm.

from __future__ import annotations

import logging
import os
import time
from dataclasses import asdict
from typing import Any

import numpy as np

from .voice_feature_extractor import (
    EXPECTED_SAMPLE_RATE,
    GEMAPS_FEATURE_DIM,
    SNR_THRESHOLD_DB,
    compute_snr_db,
    extract_gemaps_features,
    extract_marvel_fused_features,
    pcm_bytes_to_float32,
)
from .voice_classifier import (
    VoiceClassificationResult,
    classify_full_product,
    classify_hackathon,
)

logger = logging.getLogger(__name__)

# ── Mode flag ──
IS_HACKATHON = os.getenv("IS_HACKATHON", "true").lower() in ("true", "1", "yes")


def analyze_voice(
    pcm_bytes: bytes,
    sample_rate: int = EXPECTED_SAMPLE_RATE,
    user_id: str | None = None,
) -> dict[str, Any]:
    """Main entry point for voice analysis — the full MARVEL pipeline.

    Pipeline steps:
    1. Convert PCM bytes → float32 audio
    2. SNR pre-check (reject if SNR < 10 dB)
    3. Extract features (GeMAPS or MARVEL dual-branch)
    4. Multi-task classification → condition risks
    5. Compute Recovery Readiness Score
    6. Return structured result

    Parameters
    ----------
    pcm_bytes : bytes
        Raw PCM audio (16kHz, 16-bit signed LE, mono).
    sample_rate : int
        Audio sample rate in Hz.
    user_id : str, optional
        User ID for trend comparison (used by voice_trend module).

    Returns
    -------
    dict
        {
            "recovery_readiness_score": int (0-100),
            "sub_scores": {"energy": int, "stress": int, "cardiac_recovery": int, "respiratory": int},
            "condition_risks": {"alzheimers_mci": float, ...},
            "overall_neurological": float,
            "overall_respiratory": float,
            "overall_voice_disorder": float,
            "snr_db": float,
            "flags": ["low_snr", ...],
            "features_88d": [float, ...],
            "inference_ms": float,
            "model_version": str,
        }

    Raises
    ------
    ValueError
        If audio duration is outside [3s, 15s].
    """
    t_start = time.monotonic()
    flags: list[str] = []

    # ── Step 1: PCM → float32 ──
    audio = pcm_bytes_to_float32(pcm_bytes, sample_rate)
    duration_s = len(audio) / sample_rate
    logger.info(
        "Voice analysis: %.1fs audio, %d Hz, user=%s",
        duration_s,
        sample_rate,
        user_id or "anonymous",
    )

    # ── Step 2: SNR pre-check ──
    # SNR_dB = 10·log₁₀(σ²_signal / σ²_noise)
    # noise_segment = first 500ms (silence assumed)
    # REJECT if SNR_dB < 10 → return flags=['low_snr']
    snr_db = compute_snr_db(audio, sample_rate)
    logger.info("SNR: %.1f dB (threshold: %.1f dB)", snr_db, SNR_THRESHOLD_DB)

    if snr_db < SNR_THRESHOLD_DB:
        flags.append("low_snr")
        logger.warning(
            "Audio rejected: SNR %.1f dB < threshold %.1f dB",
            snr_db,
            SNR_THRESHOLD_DB,
        )
        # Return early with flags — still usable but quality warning
        return {
            "recovery_readiness_score": 0,
            "sub_scores": {
                "energy": 0,
                "stress": 0,
                "cardiac_recovery": 0,
                "respiratory": 0,
            },
            "condition_risks": {},
            "overall_neurological": 0.0,
            "overall_respiratory": 0.0,
            "overall_voice_disorder": 0.0,
            "snr_db": snr_db,
            "flags": flags,
            "features_88d": [],
            "inference_ms": (time.monotonic() - t_start) * 1000,
            "model_version": _get_model_version(),
        }

    # ── Step 3 + 4: Feature extraction + Classification ──
    if IS_HACKATHON:
        # Hackathon: GeMAPS 88-dim → XGBoost per condition head
        features = extract_gemaps_features(audio, sample_rate)
        result: VoiceClassificationResult = classify_hackathon(features)
    else:
        # Full Product: MARVEL dual-branch fusion → MLP → 9 heads
        features = extract_marvel_fused_features(audio, sample_rate)
        result = classify_full_product(features)

    # ── Step 5: Merge flags ──
    result.flags.extend(flags)

    # ── Confidence check ──
    # If all condition risks are very low, the model may not have enough signal
    max_risk = max(result.condition_risks.values()) if result.condition_risks else 0.0
    if max_risk < 0.05 and "low_snr" not in result.flags:
        result.flags.append("low_confidence")

    # ── Step 6: Build response ──
    inference_ms = (time.monotonic() - t_start) * 1000
    logger.info(
        "Voice analysis complete: RRS=%d, inference=%.0fms, flags=%s",
        result.recovery_readiness_score,
        inference_ms,
        result.flags,
    )

    return {
        "recovery_readiness_score": result.recovery_readiness_score,
        "sub_scores": result.sub_scores,
        "condition_risks": result.condition_risks,
        "overall_neurological": result.overall_neurological,
        "overall_respiratory": result.overall_respiratory,
        "overall_voice_disorder": result.overall_voice_disorder,
        "snr_db": round(snr_db, 1),
        "flags": result.flags,
        "features_88d": result.features_88d,
        "inference_ms": round(inference_ms, 1),
        "model_version": _get_model_version(),
    }


def _get_model_version() -> str:
    """Return current model version string."""
    if IS_HACKATHON:
        return "marvel-hackathon-gemaps-xgb-v0.1"
    return "marvel-full-hubert-gemaps-mlp-v0.1"
