# PART:   VoiceClassifier — MARVEL multi-task classification heads
# ACTOR:  Claude Opus 4.6
# PHASE:  4 — Voice AI Module
# TASK:   Load trained models, run inference → per-condition risk scores
# SCOPE:  IN: 88-dim GeMAPS (hackathon) or 856-dim fused (full product)
#         OUT: condition probabilities, recovery readiness score, flags
#
# Source: MARVEL — Piao et al., arXiv:2508.20717, Dec 2025
#
# Pipeline:
#   Hackathon: GeMAPS 88-dim → XGBoost per condition head
#   Full Product: MLP fusion(HuBERT_768 + GeMAPS_88) → 9 task heads
#
# Multi-task Loss (training):
#   L = Σᵢ λᵢ × BCELoss_i   where λᵢ = inverse class frequency balancing
#
# Task Heads (conditions detected):
#   Neurological: Alzheimer's/MCI, Parkinson's, Stroke
#   Respiratory: COVID-19, Asthma, COPD
#   Voice disorders: Dysphonia, Vocal fold pathology, Hypernasality
#
# Hackathon Recovery Readiness mapping:
#   From 9 condition heads → 4 sub-scores → 1 composite Recovery Readiness Score

from __future__ import annotations

import os
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

# ── Model directory ──
MODEL_DIR = Path(os.getenv("VOICE_MODEL_DIR", "backend/models/voice"))

# ── Condition definitions ──
# 9 MARVEL task heads, grouped by domain
NEUROLOGICAL_CONDITIONS = ["alzheimers_mci", "parkinsons", "stroke_risk"]
RESPIRATORY_CONDITIONS = ["covid19", "asthma", "copd"]
VOICE_DISORDERS = ["dysphonia", "vocal_fold_pathology", "hypernasality"]
ALL_CONDITIONS = NEUROLOGICAL_CONDITIONS + RESPIRATORY_CONDITIONS + VOICE_DISORDERS

# ── Recovery Readiness sub-score mapping ──
# Maps 9 conditions → 4 sub-scores for hackathon display
READINESS_MAPPING = {
    "energy": {
        # Low energy correlates with neurological fatigue markers
        "conditions": ["parkinsons", "stroke_risk"],
        "weight": 0.25,
    },
    "stress": {
        # Stress shows in voice tremor, breathiness
        "conditions": ["dysphonia", "vocal_fold_pathology", "hypernasality"],
        "weight": 0.25,
    },
    "cardiac_recovery": {
        # Neurological + respiratory overlap → cardiovascular strain
        "conditions": ["alzheimers_mci", "stroke_risk", "copd"],
        "weight": 0.25,
    },
    "respiratory": {
        # Direct respiratory function
        "conditions": ["covid19", "asthma", "copd"],
        "weight": 0.25,
    },
}


@dataclass
class VoiceClassificationResult:
    """Result from MARVEL voice classification pipeline."""

    # Per-condition risk probabilities (0.0 - 1.0)
    condition_risks: dict[str, float] = field(default_factory=dict)

    # Domain-level aggregate scores (0.0 - 1.0)
    overall_neurological: float = 0.0
    overall_respiratory: float = 0.0
    overall_voice_disorder: float = 0.0

    # Recovery Readiness (hackathon display)
    recovery_readiness_score: int = 0  # 0-100, higher = better
    sub_scores: dict[str, int] = field(default_factory=dict)  # energy, stress, cardiac, respiratory (0-100)

    # Quality flags
    flags: list[str] = field(default_factory=list)

    # Raw feature vector for storage (encrypted in DB)
    features_88d: list[float] = field(default_factory=list)


# ══════════════════════════════════════════════
#  Hackathon: XGBoost per-condition heads
# ══════════════════════════════════════════════

_xgb_models: dict[str, object] = {}


def _load_xgb_model(condition: str):
    """Load a pickled XGBoost model for a specific condition.

    Model files expected at: backend/models/voice/{condition}_xgb.pkl
    Falls back to mock inference if model file not found (hackathon demo).
    """
    if condition in _xgb_models:
        return _xgb_models[condition]

    model_path = MODEL_DIR / f"{condition}_xgb.pkl"
    if model_path.exists():
        import joblib
        model = joblib.load(model_path)
        _xgb_models[condition] = model
        logger.info("Loaded XGBoost model: %s", model_path)
        return model

    logger.warning(
        "Model not found: %s — using mock inference for hackathon demo",
        model_path,
    )
    return None


def _mock_predict_proba(features: np.ndarray, condition: str) -> float:
    """Generate deterministic but realistic mock probability for hackathon demo.

    Uses feature statistics to produce consistent-looking results per recording.
    NOT medically meaningful — for demo purposes only.
    """
    # Deterministic seed from feature content + condition name
    seed = int(abs(np.sum(features * 1000))) % 10000 + hash(condition) % 10000
    rng = np.random.RandomState(seed)

    # Base probability influenced by energy metrics in GeMAPS
    # features[0] ≈ F0 mean, features[1] ≈ F0 std — higher variability = healthier
    f0_variability = float(np.std(features[:10])) if len(features) >= 10 else 0.5
    base_prob = 0.05 + 0.15 * (1.0 - min(f0_variability, 1.0))

    # Add controlled noise
    noise = rng.normal(0, 0.05)
    prob = np.clip(base_prob + noise, 0.01, 0.95)
    return float(prob)


def classify_hackathon(features_88d: np.ndarray) -> VoiceClassificationResult:
    """Run hackathon classification: GeMAPS 88-dim → XGBoost per head.

    For each of 9 conditions:
    1. Load XGBoost model (or use mock if not available)
    2. Predict probability
    3. Aggregate into domain scores and Recovery Readiness Score

    Parameters
    ----------
    features_88d : np.ndarray
        88-dimensional GeMAPS feature vector.

    Returns
    -------
    VoiceClassificationResult
        Complete classification with recovery readiness score.
    """
    result = VoiceClassificationResult()
    result.features_88d = features_88d.tolist()

    # ── Per-condition inference ──
    condition_probs: dict[str, float] = {}
    for condition in ALL_CONDITIONS:
        model = _load_xgb_model(condition)
        if model is not None:
            # XGBoost predict_proba returns [[p_neg, p_pos]]
            X = features_88d.reshape(1, -1)
            proba = model.predict_proba(X)[0][1]
            condition_probs[condition] = float(np.clip(proba, 0.0, 1.0))
        else:
            condition_probs[condition] = _mock_predict_proba(features_88d, condition)

    result.condition_risks = condition_probs

    # ── Domain-level aggregation ──
    # overall_neurological = max(neurological conditions) — conservative
    result.overall_neurological = max(
        condition_probs.get(c, 0.0) for c in NEUROLOGICAL_CONDITIONS
    )
    result.overall_respiratory = max(
        condition_probs.get(c, 0.0) for c in RESPIRATORY_CONDITIONS
    )
    result.overall_voice_disorder = max(
        condition_probs.get(c, 0.0) for c in VOICE_DISORDERS
    )

    # ── Recovery Readiness Score (hackathon display) ──
    # For each sub-score: 100 = healthy (low risk), 0 = concern (high risk)
    sub_scores: dict[str, int] = {}
    for sub_name, mapping in READINESS_MAPPING.items():
        related_risks = [
            condition_probs.get(c, 0.0) for c in mapping["conditions"]
        ]
        # Mean risk of related conditions → invert to get "readiness"
        mean_risk = np.mean(related_risks) if related_risks else 0.0
        # readiness = 100 × (1 - risk)
        readiness = int(round(100.0 * (1.0 - mean_risk)))
        sub_scores[sub_name] = max(0, min(100, readiness))

    result.sub_scores = sub_scores

    # Composite Recovery Readiness Score = weighted sum of sub-scores
    composite = sum(
        sub_scores[name] * mapping["weight"]
        for name, mapping in READINESS_MAPPING.items()
    )
    result.recovery_readiness_score = max(0, min(100, int(round(composite))))

    return result


# ══════════════════════════════════════════════
#  Full Product: MLP fusion heads (Phase 4 Full Product)
# ══════════════════════════════════════════════

_mlp_model = None


def _load_mlp_model():
    """Load MARVEL MLP fusion model for full product inference."""
    global _mlp_model
    if _mlp_model is not None:
        return _mlp_model

    model_path = MODEL_DIR / "marvel_mlp_fusion.onnx"
    if model_path.exists():
        import onnxruntime as ort
        _mlp_model = ort.InferenceSession(str(model_path))
        logger.info("Loaded MARVEL MLP fusion model: %s", model_path)
        return _mlp_model

    logger.warning(
        "MARVEL MLP model not found at %s — falling back to hackathon XGBoost",
        model_path,
    )
    return None


def classify_full_product(features_856d: np.ndarray) -> VoiceClassificationResult:
    """Run full product classification: fused 856-dim → MLP → 9 heads.

    Multi-task architecture:
    - Input: [HuBERT_768 | GeMAPS_88] concatenated
    - MLP: Dense(512, ReLU) → Dropout(0.3) → Dense(256, ReLU) → 9 sigmoid heads
    - Loss: Σᵢ λᵢ × BCELoss_i (λᵢ = inverse class frequency)

    Falls back to hackathon XGBoost if MLP model not available.

    Parameters
    ----------
    features_856d : np.ndarray
        856-dimensional fused feature vector (HuBERT + GeMAPS).

    Returns
    -------
    VoiceClassificationResult
        Complete classification result.
    """
    mlp = _load_mlp_model()

    if mlp is not None:
        # ONNX inference
        input_name = mlp.get_inputs()[0].name
        X = features_856d.reshape(1, -1).astype(np.float32)
        outputs = mlp.run(None, {input_name: X})
        # Output shape: (1, 9) — sigmoid probabilities for each condition
        probs = outputs[0].flatten()

        result = VoiceClassificationResult()
        result.features_88d = features_856d[HUBERT_DIM:].tolist()  # Store only GeMAPS portion

        for i, condition in enumerate(ALL_CONDITIONS):
            result.condition_risks[condition] = float(np.clip(probs[i], 0.0, 1.0))

        # Aggregate same as hackathon
        result.overall_neurological = max(
            result.condition_risks.get(c, 0.0) for c in NEUROLOGICAL_CONDITIONS
        )
        result.overall_respiratory = max(
            result.condition_risks.get(c, 0.0) for c in RESPIRATORY_CONDITIONS
        )
        result.overall_voice_disorder = max(
            result.condition_risks.get(c, 0.0) for c in VOICE_DISORDERS
        )

        # Recovery Readiness Score
        sub_scores: dict[str, int] = {}
        for sub_name, mapping in READINESS_MAPPING.items():
            related_risks = [
                result.condition_risks.get(c, 0.0) for c in mapping["conditions"]
            ]
            mean_risk = np.mean(related_risks) if related_risks else 0.0
            sub_scores[sub_name] = max(0, min(100, int(round(100.0 * (1.0 - mean_risk)))))
        result.sub_scores = sub_scores

        composite = sum(
            sub_scores[name] * mapping["weight"]
            for name, mapping in READINESS_MAPPING.items()
        )
        result.recovery_readiness_score = max(0, min(100, int(round(composite))))
        return result

    # Fallback: use hackathon XGBoost on GeMAPS portion only
    from .voice_feature_extractor import GEMAPS_FEATURE_DIM, HUBERT_FEATURE_DIM
    gemaps_features = features_856d[HUBERT_FEATURE_DIM:]
    return classify_hackathon(gemaps_features)


# ── Constant re-export for full product path ──
HUBERT_DIM = 768
