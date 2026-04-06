# PART:   VoiceFeatureExtractor — openSMILE GeMAPS v02 + HuBERT embeddings
# ACTOR:  Claude Opus 4.6
# PHASE:  4 — Voice AI Module
# TASK:   Extract 88-dim GeMAPS features (hackathon) + 768-dim HuBERT (full product)
# SCOPE:  IN: raw PCM audio bytes (16kHz, 16-bit mono)
#         OUT: feature vectors (88-dim or 856-dim fused)
#
# Source: MARVEL — Multi-task Acoustic Representations for Voice-based Health Analysis
#         Piao et al., arXiv:2508.20717, published Dec 2025
# GeMAPS: Eyben et al., "The Geneva Minimalistic Acoustic Parameter Set (GeMAPS)
#         for Voice Research and Affective Computing", IEEE TAC 2016
#
# Privacy: Only derived features transmitted to server, NEVER raw audio stored long-term

from __future__ import annotations

import io
import struct
import logging
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

# ── Constants ──
EXPECTED_SAMPLE_RATE = 16000  # Hz
EXPECTED_BIT_DEPTH = 16
MIN_DURATION_S = 3.0
MAX_DURATION_S = 15.0
GEMAPS_FEATURE_DIM = 88
HUBERT_FEATURE_DIM = 768
FUSED_FEATURE_DIM = GEMAPS_FEATURE_DIM + HUBERT_FEATURE_DIM  # 856


def pcm_bytes_to_float32(pcm_bytes: bytes, sample_rate: int = EXPECTED_SAMPLE_RATE) -> np.ndarray:
    """Convert raw PCM 16-bit signed LE bytes to float32 numpy array normalised to [-1, 1].

    Parameters
    ----------
    pcm_bytes : bytes
        Raw PCM audio (16-bit signed, little-endian, mono).
    sample_rate : int
        Expected sample rate (used for validation).

    Returns
    -------
    np.ndarray
        Audio signal as float32 in [-1, 1].

    Raises
    ------
    ValueError
        If audio is too short or too long.
    """
    n_samples = len(pcm_bytes) // 2
    duration_s = n_samples / sample_rate

    if duration_s < MIN_DURATION_S:
        raise ValueError(
            f"Audio too short: {duration_s:.1f}s < {MIN_DURATION_S}s minimum"
        )
    if duration_s > MAX_DURATION_S:
        raise ValueError(
            f"Audio too long: {duration_s:.1f}s > {MAX_DURATION_S}s maximum"
        )

    # Unpack 16-bit signed LE samples
    audio_int16 = np.array(
        struct.unpack(f"<{n_samples}h", pcm_bytes[:n_samples * 2]),
        dtype=np.float32,
    )
    # Normalise to [-1, 1]
    audio_float = audio_int16 / 32768.0
    return audio_float


# ══════════════════════════════════════════════
#  SNR Pre-check
# ══════════════════════════════════════════════
# SNR_dB = 10·log₁₀(σ²_signal / σ²_noise)
# noise_segment = first 500ms (assumed silence/ambient)
# REJECT if SNR_dB < 10

SNR_THRESHOLD_DB = 10.0
NOISE_SEGMENT_S = 0.5  # first 500ms assumed ambient noise


def compute_snr_db(
    audio: np.ndarray,
    sample_rate: int = EXPECTED_SAMPLE_RATE,
) -> float:
    """Estimate SNR in dB using first 500ms as noise reference.

    SNR_dB = 10·log₁₀(σ²_signal / σ²_noise)

    Parameters
    ----------
    audio : np.ndarray
        Float32 audio signal in [-1, 1].
    sample_rate : int
        Sample rate in Hz.

    Returns
    -------
    float
        Estimated SNR in dB.
    """
    noise_samples = int(NOISE_SEGMENT_S * sample_rate)
    noise_segment = audio[:noise_samples]
    signal_segment = audio[noise_samples:]

    if len(signal_segment) == 0 or len(noise_segment) == 0:
        return 0.0

    # σ² (variance = power for zero-mean signals)
    noise_power = np.var(noise_segment)
    signal_power = np.var(signal_segment)

    if noise_power < 1e-12:
        # Near-silent noise floor → excellent SNR
        return 60.0

    # SNR_dB = 10·log₁₀(σ²_signal / σ²_noise)
    snr_db = 10.0 * np.log10(signal_power / noise_power)
    return float(snr_db)


# ══════════════════════════════════════════════
#  Branch B: openSMILE GeMAPS v02 (Hackathon + Full Product)
# ══════════════════════════════════════════════
# GeMAPS = Geneva Minimalistic Acoustic Parameter Set
# 88 features including: F₀ mean/var, formant F1-F3 mean/var, jitter, shimmer,
# HNR, MFCC 1-4 mean/var, spectral flux, spectral tilt, RMS, ZCR
# Extract via: opensmile.Smile(feature_set='GeMAPSv02', feature_level='functionals')
# Privacy: derived features only, NOT raw audio transmitted to server

_smile_instance = None


def _get_smile():
    """Lazy-init openSMILE extractor (singleton, thread-safe enough for FastAPI)."""
    global _smile_instance
    if _smile_instance is None:
        import opensmile
        _smile_instance = opensmile.Smile(
            feature_set=opensmile.FeatureSet.GeMAPSv02,
            feature_level=opensmile.FeatureLevel.Functionals,
        )
    return _smile_instance


def extract_gemaps_features(
    audio: np.ndarray,
    sample_rate: int = EXPECTED_SAMPLE_RATE,
) -> np.ndarray:
    """Extract 88-dim GeMAPS v02 functional features via openSMILE.

    GeMAPS features include:
    - F₀ (fundamental frequency): mean, std, percentiles
    - Formants F1-F3: frequency and bandwidth mean/var
    - Jitter (local, RAP, PPQ5) — cycle-to-cycle pitch variation
    - Shimmer (local, dB, APQ3/5/11) — cycle-to-cycle amplitude variation
    - HNR (Harmonics-to-Noise Ratio)
    - MFCC 1-4: mean and variance
    - Spectral: centroid, flux, tilt, rolloff
    - Energy: RMS, loudness
    - Temporal: speech rate, pause ratio, ZCR

    Parameters
    ----------
    audio : np.ndarray
        Float32 audio [-1, 1], mono, 16kHz.
    sample_rate : int
        Sample rate.

    Returns
    -------
    np.ndarray
        88-dimensional feature vector (float64).
    """
    smile = _get_smile()
    # openSMILE expects float32 numpy array
    df = smile.process_signal(audio, sample_rate)
    features = df.values.flatten().astype(np.float64)

    if features.shape[0] != GEMAPS_FEATURE_DIM:
        logger.warning(
            "GeMAPS returned %d features (expected %d). Padding/truncating.",
            features.shape[0],
            GEMAPS_FEATURE_DIM,
        )
        if features.shape[0] < GEMAPS_FEATURE_DIM:
            features = np.pad(features, (0, GEMAPS_FEATURE_DIM - features.shape[0]))
        else:
            features = features[:GEMAPS_FEATURE_DIM]

    return features


# ══════════════════════════════════════════════
#  Branch A: HuBERT-base embeddings (Full Product only)
# ══════════════════════════════════════════════
# from transformers import HubertModel
# model = HubertModel.from_pretrained('facebook/hubert-base-ls960')
# with torch.no_grad(): features = model(audio_tensor).last_hidden_state.mean(dim=1)
# → 768-dim embedding that encodes F₀, prosody, breathiness, vocal tract shape

_hubert_model = None
_hubert_processor = None


def _get_hubert():
    """Lazy-load HuBERT-base model (requires GPU or decent CPU)."""
    global _hubert_model, _hubert_processor
    if _hubert_model is None:
        import torch
        from transformers import HubertModel, Wav2Vec2FeatureExtractor

        _hubert_processor = Wav2Vec2FeatureExtractor.from_pretrained(
            "facebook/hubert-base-ls960"
        )
        _hubert_model = HubertModel.from_pretrained("facebook/hubert-base-ls960")
        _hubert_model.eval()
        if torch.cuda.is_available():
            _hubert_model = _hubert_model.cuda()
    return _hubert_model, _hubert_processor


def extract_hubert_embeddings(
    audio: np.ndarray,
    sample_rate: int = EXPECTED_SAMPLE_RATE,
) -> np.ndarray:
    """Extract 768-dim HuBERT-base embeddings from audio.

    HuBERT (Hidden-Unit BERT) is a self-supervised speech model that encodes:
    - F₀ (fundamental frequency) and prosody patterns
    - Breathiness and voice quality
    - Vocal tract shape and formant structure
    - Temporal dynamics of speech production

    Parameters
    ----------
    audio : np.ndarray
        Float32 audio [-1, 1], mono, 16kHz.
    sample_rate : int
        Sample rate.

    Returns
    -------
    np.ndarray
        768-dimensional embedding vector (float64).
    """
    import torch

    model, processor = _get_hubert()
    device = next(model.parameters()).device

    inputs = processor(
        audio,
        sampling_rate=sample_rate,
        return_tensors="pt",
        padding=True,
    )
    input_values = inputs.input_values.to(device)

    with torch.no_grad():
        outputs = model(input_values)
        # Mean-pool across time → single 768-dim vector
        # outputs.last_hidden_state shape: (1, T, 768)
        embeddings = outputs.last_hidden_state.mean(dim=1).squeeze(0)

    return embeddings.cpu().numpy().astype(np.float64)


# ══════════════════════════════════════════════
#  MARVEL Fusion (Full Product)
# ══════════════════════════════════════════════
# Late fusion: concatenate HuBERT_768 + GeMAPS_88 → 856-dim

def extract_marvel_fused_features(
    audio: np.ndarray,
    sample_rate: int = EXPECTED_SAMPLE_RATE,
) -> np.ndarray:
    """Extract MARVEL dual-branch fused features (856-dim).

    Late fusion of:
    - Branch A: HuBERT-base 768-dim embeddings (self-supervised speech)
    - Branch B: openSMILE GeMAPS v02 88-dim (handcrafted acoustic)

    Parameters
    ----------
    audio : np.ndarray
        Float32 audio [-1, 1], mono, 16kHz.
    sample_rate : int
        Sample rate.

    Returns
    -------
    np.ndarray
        856-dimensional fused feature vector.
    """
    gemaps = extract_gemaps_features(audio, sample_rate)
    hubert = extract_hubert_embeddings(audio, sample_rate)
    # Late fusion: concatenate [HuBERT_768 | GeMAPS_88] → 856-dim
    fused = np.concatenate([hubert, gemaps])
    assert fused.shape[0] == FUSED_FEATURE_DIM, (
        f"Expected {FUSED_FEATURE_DIM}-dim, got {fused.shape[0]}-dim"
    )
    return fused
