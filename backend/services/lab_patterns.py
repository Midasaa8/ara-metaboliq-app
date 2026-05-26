# PART:   Lab Patterns — LOINC mapping + physiological reference ranges
# ACTOR:  Claude Opus 4.6
# PHASE:  25 — Medical OCR Integration (PRIORITY #1)
# TASK:   Define LAB_PATTERNS: regex keys → LOINC codes, units, normal ranges
#
# All patterns, LOINC codes, units, and ranges are exact per OPUS_PHASES.md Phase 25 spec.
# Supports Vietnamese and English lab test names.
#
# SECURITY: No raw patient data in this module. Static reference data only.
# LEGAL: These ranges are wellness reference values, NOT medical diagnoses.
#        Always include disclaimer when displaying to users.

from __future__ import annotations

from typing import Optional

# ══════════════════════════════════════════════
#  Confidence threshold
# ══════════════════════════════════════════════

# Reject OCR cell if confidence < 85% (per spec)
MIN_OCR_CONFIDENCE: float = 0.85

# ══════════════════════════════════════════════
#  LAB_PATTERNS — LOINC mapping
# ══════════════════════════════════════════════
# Key: regex pattern (case-insensitive, pipe-separated alternatives)
# Value: dict with code, unit, and range boundaries
#
# Range tuple format: (low, high) where None = unbounded
#   'normal': (70, 100)    → 70 ≤ value ≤ 100 is normal
#   'high': (240, None)    → value ≥ 240 is high
#   'low_risk': (60, None) → value ≥ 60 is low risk (HDL)
#
# Sex-specific ranges: 'normal_m' / 'normal_f' keys

LAB_PATTERNS: dict[str, dict] = {
    # ── Metabolic ──────────────────────────────────────────────────
    "glucose|đường huyết|blood sugar": {
        "code":        "LOINC:2345-7",
        "unit":        "mg/dL",
        "normal":      (70, 100),
        "prediabetes": (100, 125),
        "diabetes":    (126, None),
    },
    "hba1c|a1c": {
        "code":        "LOINC:4548-4",
        "unit":        "%",
        "normal":      (4.0, 5.6),
        "prediabetes": (5.7, 6.4),
        "diabetes":    (6.5, None),
    },
    # ── Lipids ─────────────────────────────────────────────────────
    "cholesterol|total cholesterol|total chol": {
        "code":       "LOINC:2093-3",
        "unit":       "mg/dL",
        "normal":     (0, 200),
        "borderline": (200, 239),
        "high":       (240, None),
    },
    "ldl|ldl-c|ldl cholesterol": {
        "code":       "LOINC:2089-1",
        "unit":       "mg/dL",
        "normal":     (0, 100),
        "borderline": (100, 159),
        "high":       (160, None),
    },
    "hdl|hdl-c|hdl cholesterol": {
        "code":      "LOINC:2085-9",
        "unit":      "mg/dL",
        "low_risk":  (60, None),     # ≥ 60 = low risk
        "moderate":  (40, 59),       # 40–59 = moderate risk
        "high_risk": (0, 39),        # < 40 = high risk (inverted)
    },
    "triglyceride|tg|triglycerides|triglyxerit": {
        "code":       "LOINC:2571-8",
        "unit":       "mg/dL",
        "normal":     (0, 150),
        "borderline": (150, 199),
        "high":       (200, None),
    },
    # ── Kidney ─────────────────────────────────────────────────────
    "creatinine|creatinin|creatinin huyết thanh": {
        "code":     "LOINC:2160-0",
        "unit":     "mg/dL",
        "normal_m": (0.7, 1.3),
        "normal_f": (0.6, 1.1),
    },
    "uric acid|acid uric|axit uric": {
        "code":     "LOINC:3084-1",
        "unit":     "mg/dL",
        "normal_m": (3.4, 7.0),
        "normal_f": (2.4, 6.0),
    },
    # ── Liver ──────────────────────────────────────────────────────
    "alt|sgpt|alanine aminotransferase": {
        "code":   "LOINC:1742-6",
        "unit":   "U/L",
        "normal": (7, 56),
    },
    "ast|sgot|aspartate aminotransferase": {
        "code":   "LOINC:1920-8",
        "unit":   "U/L",
        "normal": (10, 40),
    },
    # ── CBC (Complete Blood Count) ─────────────────────────────────
    "wbc|bạch cầu|white blood cell|leukocyte": {
        "code":   "LOINC:6690-2",
        "unit":   "×10³/µL",
        "normal": (4.5, 11.0),
    },
    "rbc|hồng cầu|red blood cell|erythrocyte": {
        "code":     "LOINC:789-8",
        "unit":     "×10⁶/µL",
        "normal_m": (4.7, 6.1),
        "normal_f": (4.2, 5.4),
    },
    "hemoglobin|hb|hgb|huyết sắc tố": {
        "code":     "LOINC:718-7",
        "unit":     "g/dL",
        "normal_m": (13.5, 17.5),
        "normal_f": (12.0, 16.0),
    },
    # ── Thyroid ────────────────────────────────────────────────────
    "tsh|thyroid stimulating hormone|thyrotropin": {
        "code":   "LOINC:3016-3",
        "unit":   "mIU/L",
        "normal": (0.4, 4.0),
    },
}

# ══════════════════════════════════════════════
#  Status classification helpers
# ══════════════════════════════════════════════

# Human-readable display names for statuses
STATUS_DISPLAY: dict[str, str] = {
    "normal":      "Normal ✅",
    "low":         "Low ⚠️",
    "high":        "High ⚠️",
    "borderline":  "Borderline ⚠️",
    "prediabetes": "Pre-diabetic 🔶",
    "diabetes":    "High (diabetic range) 🔴",
    "low_risk":    "Low risk ✅",
    "moderate":    "Moderate risk ⚠️",
    "high_risk":   "High risk 🔴",
    "unknown":     "Unable to determine",
}

# Status severity (for sorting/alerting)
STATUS_SEVERITY: dict[str, int] = {
    "normal":      0,
    "low_risk":    0,
    "borderline":  1,
    "moderate":    1,
    "low":         2,
    "high":        2,
    "prediabetes": 2,
    "diabetes":    3,
    "high_risk":   3,
    "unknown":     -1,
}


def classify_value(
    value: float,
    pattern_info: dict,
    sex: Optional[str] = None,
) -> str:
    """
    Classify a lab value against reference ranges for a given test.

    Returns status string: 'normal', 'high', 'borderline', 'prediabetes',
    'diabetes', 'low_risk', 'moderate', 'high_risk', 'low', or 'unknown'.

    For sex-specific tests (RBC, Hgb, Creatinine, Uric Acid):
      sex should be 'male'/'m' or 'female'/'f'.
    """
    # ── Sex-specific range ───────────────────
    sex_key = None
    if sex and sex.lower() in ("male", "m"):
        sex_key = "normal_m"
    elif sex and sex.lower() in ("female", "f"):
        sex_key = "normal_f"

    # Resolve normal range (sex-specific or universal)
    if sex_key and sex_key in pattern_info:
        normal_range = pattern_info[sex_key]
        return _classify_against_range(value, normal_range, "normal", "low", "high")

    # ── HDL (inverted logic — higher is better) ──
    if "low_risk" in pattern_info:
        low_risk_range = pattern_info["low_risk"]      # (60, None)
        moderate_range = pattern_info["moderate"]       # (40, 59)
        high_risk_range = pattern_info["high_risk"]     # (0, 39)

        lo, hi = low_risk_range
        if lo is not None and value >= lo:
            return "low_risk"
        lo, hi = moderate_range
        if lo is not None and hi is not None and lo <= value < hi:
            return "moderate"
        lo, hi = high_risk_range
        if hi is not None and value < hi:
            return "high_risk"
        return "unknown"

    # ── Glucose / HbA1c — tiered ranges ────────
    if "diabetes" in pattern_info:
        # Check diabetes tier first (highest severity)
        lo, hi = pattern_info["diabetes"]
        if lo is not None and value >= lo:
            return "diabetes"
        if "prediabetes" in pattern_info:
            lo, hi = pattern_info["prediabetes"]
            if lo is not None and hi is not None and lo <= value < hi:
                return "prediabetes"
        lo, hi = pattern_info.get("normal", (None, None))
        if lo is not None and hi is not None and lo <= value <= hi:
            return "normal"
        if lo is not None and value < lo:
            return "low"
        return "unknown"

    # ── Cholesterol / LDL / TG — borderline/high ──
    if "high" in pattern_info and "borderline" in pattern_info:
        lo, hi = pattern_info["high"]
        if lo is not None and value >= lo:
            return "high"
        lo, hi = pattern_info["borderline"]
        if lo is not None and hi is not None and lo <= value < hi:
            return "borderline"
        lo, hi = pattern_info.get("normal", (None, None))
        if lo is not None and hi is not None and lo <= value < hi:
            return "normal"
        return "unknown"

    # ── Simple normal range ──────────────────────
    if "normal" in pattern_info:
        lo, hi = pattern_info["normal"]
        return _classify_against_range(value, (lo, hi), "normal", "low", "high")

    return "unknown"


def _classify_against_range(
    value: float,
    range_: tuple,
    label_in: str,
    label_low: str,
    label_high: str,
) -> str:
    """Helper: classify value as in-range, low, or high."""
    lo, hi = range_
    if lo is not None and value < lo:
        return label_low
    if hi is not None and value > hi:
        return label_high
    return label_in


def get_normal_range_display(pattern_info: dict, sex: Optional[str] = None) -> str:
    """Return a human-readable normal range string for display."""
    sex_key = None
    if sex and sex.lower() in ("male", "m"):
        sex_key = "normal_m"
    elif sex and sex.lower() in ("female", "f"):
        sex_key = "normal_f"

    if sex_key and sex_key in pattern_info:
        lo, hi = pattern_info[sex_key]
        return f"{lo}–{hi}"

    if "normal" in pattern_info:
        lo, hi = pattern_info["normal"]
        hi_str = str(hi) if hi is not None else "∞"
        return f"{lo}–{hi_str}"

    return "See breakdown"
