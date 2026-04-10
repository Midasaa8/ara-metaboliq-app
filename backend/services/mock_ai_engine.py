# PART:   MockAIEngine — realistic AI responses for hackathon demo
# ACTOR:  Claude Opus 4.6
# PHASE:  15 — Mock AI for Hackathon
# TASK:   Trả kết quả AI giống thật nhưng rule-based (không cần model weights)
# SCOPE:  IN: all AI endpoints mock, deterministic demo mode
#         OUT: real model inference (Phase 19+ full product)
#
# Khi DemoDataSeeder.activate() → tất cả endpoints trả EXACT data
# Khi không activate → thêm noise để test UI edge cases

from __future__ import annotations

import random
import time
from dataclasses import dataclass, field
from typing import Any, Optional

# ══════════════════════════════════════════════
#  Deterministic Seeder
# ══════════════════════════════════════════════

_DEMO_MODE = False
_DEMO_SEED = 42


def activate_demo(seed: int = 42) -> None:
    """Activate deterministic demo mode. All results become reproducible."""
    global _DEMO_MODE, _DEMO_SEED
    _DEMO_MODE = True
    _DEMO_SEED = seed
    random.seed(seed)


def deactivate_demo() -> None:
    """Return to stochastic mode (adds noise for UI testing)."""
    global _DEMO_MODE
    _DEMO_MODE = False


def _noise(base: float, pct: float = 0.05) -> float:
    """Add Gaussian noise ±pct to value. In demo mode returns exact base."""
    if _DEMO_MODE:
        return base
    return base + random.gauss(0, base * pct)


def _clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(v, hi))


# ══════════════════════════════════════════════
#  Voice AI Mock
# ══════════════════════════════════════════════

@dataclass
class MockVoiceResult:
    burnout: float = 0.12
    anxiety: float = 0.38
    energy: float = 0.76
    stress: float = 0.29
    depression: float = 0.08
    fatigue: float = 0.22
    recovery: float = 0.82
    classification: str = "mild_stress"
    confidence: float = 0.87
    recovery_readiness: float = 0.78
    flags: list[str] = field(default_factory=list)


def mock_voice_analysis(audio_duration_s: float = 5.0) -> dict[str, Any]:
    """Return realistic voice AI result.

    MARVEL-style 9-condition output, simplified to key metrics.
    Adds ±5% noise in non-demo mode.
    """
    r = MockVoiceResult()

    if audio_duration_s < 3.0:
        return {
            "error": "audio_too_short",
            "min_duration_s": 3.0,
            "flags": ["insufficient_audio"],
        }

    result = {
        "conditions": {
            "burnout": round(_clamp(_noise(r.burnout)), 3),
            "anxiety": round(_clamp(_noise(r.anxiety)), 3),
            "energy": round(_clamp(_noise(r.energy)), 3),
            "stress": round(_clamp(_noise(r.stress)), 3),
            "depression": round(_clamp(_noise(r.depression)), 3),
            "fatigue": round(_clamp(_noise(r.fatigue)), 3),
        },
        "recovery_readiness": round(_clamp(_noise(r.recovery_readiness)), 3),
        "classification": r.classification,
        "confidence": round(_clamp(_noise(r.confidence)), 3),
        "flags": r.flags,
        "model": "mock_v1" if _DEMO_MODE else "mock_v1_noisy",
    }
    return result


# ══════════════════════════════════════════════
#  PPG / SpO₂ / HR / Temp Mock
# ══════════════════════════════════════════════

@dataclass
class MockVitals:
    hr_bpm: float = 72.0
    spo2_pct: float = 98.0
    temperature_c: float = 36.5
    hrv_sdnn_ms: float = 42.0
    hrv_rmssd_ms: float = 38.0
    systolic_bp: float = 118.0
    diastolic_bp: float = 76.0
    respiratory_rate: float = 16.0


def mock_vitals() -> dict[str, Any]:
    """Return realistic vital signs from Pod sensors.

    Wraps MockHardware.ts generated data into proper API format.
    """
    v = MockVitals()
    return {
        "hr_bpm": round(_noise(v.hr_bpm, 0.03), 1),
        "spo2_pct": round(_clamp(_noise(v.spo2_pct, 0.01), 85, 100), 1),
        "temperature_c": round(_noise(v.temperature_c, 0.005), 2),
        "hrv": {
            "sdnn_ms": round(_noise(v.hrv_sdnn_ms, 0.08), 1),
            "rmssd_ms": round(_noise(v.hrv_rmssd_ms, 0.08), 1),
        },
        "bp": {
            "systolic": round(_noise(v.systolic_bp, 0.02)),
            "diastolic": round(_noise(v.diastolic_bp, 0.02)),
        },
        "respiratory_rate": round(_noise(v.respiratory_rate, 0.05), 1),
        "quality": "excellent",
        "timestamp_ms": int(time.time() * 1000),
    }


# ══════════════════════════════════════════════
#  Insurance / HSA Mock
# ══════════════════════════════════════════════

def mock_insurance(health_score: int = 78) -> dict[str, Any]:
    """Return mock insurance premium and HSA data.

    Premium discount based on H_score:
      discount_pct = min(health_score * 0.25, 25)  [max 25%]
      premium = base_premium × (1 - discount_pct/100)
    """
    base_premium = 450_000  # VND/month
    discount_pct = min(health_score * 0.25, 25.0)
    premium = int(base_premium * (1 - discount_pct / 100))

    return {
        "monthly_premium_vnd": premium,
        "base_premium_vnd": base_premium,
        "discount_pct": round(discount_pct, 1),
        "health_score": health_score,
        "hsa": {
            "balance_vnd": 12_500_000,
            "monthly_contribution_vnd": 500_000,
            "employer_match_pct": 50,
        },
        "tier": "Gold" if health_score >= 75 else "Silver" if health_score >= 60 else "Bronze",
    }


# ══════════════════════════════════════════════
#  Sleep Mock
# ══════════════════════════════════════════════

def mock_sleep() -> dict[str, Any]:
    """Return realistic sleep data."""
    total = _noise(450, 0.05)  # ~7.5h
    deep = _noise(95, 0.1)
    rem = _noise(75, 0.1)
    light = total - deep - rem
    return {
        "total_min": round(total, 1),
        "deep_min": round(max(deep, 30), 1),
        "rem_min": round(max(rem, 20), 1),
        "light_min": round(max(light, 60), 1),
        "awake_min": round(_noise(15, 0.2), 1),
        "efficiency_pct": round(_clamp(_noise(0.92, 0.03), 0.5, 1.0) * 100, 1),
        "sleep_score": round(_clamp(_noise(82, 0.05), 0, 100)),
    }


# ══════════════════════════════════════════════
#  Full Demo Snapshot
# ══════════════════════════════════════════════

def mock_full_snapshot(user_id: str = "demo_user") -> dict[str, Any]:
    """Return all mock data in one snapshot (for demo mode initial load)."""
    vitals = mock_vitals()
    voice = mock_voice_analysis()
    sleep = mock_sleep()
    insurance = mock_insurance(78)

    return {
        "user_id": user_id,
        "vitals": vitals,
        "voice": voice,
        "sleep": sleep,
        "insurance": insurance,
        "timestamp_ms": int(time.time() * 1000),
        "demo_mode": _DEMO_MODE,
    }
