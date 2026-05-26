# PART:   Body Composition — BMI, BMR, TDEE, Body Fat%, Stride
# ACTOR:  Claude Opus 4.6
# PHASE:  20 — Body Composition Engine
# TASK:   Calculate body metrics from user profile data
# SCOPE:  IN: height_cm, weight_kg, age, sex, activity_level
#         OUT: bmi, bmi_class, bmr, tdee, body_fat_pct, stride_m, calorie_target
#
# Ref: Mifflin MD et al., Am J Clin Nutr 1990;51:241-247  (BMR)
#      Hodgdon & Beckett, 1984 / US Navy Method (Body Fat%)
#      Studenski SA et al., JAMA 2011 (Stride length 0.415)
#      WHO BMI classification 2023
#
# SECURITY: No raw health data in logs. Validate inputs at API layer.

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional

# ══════════════════════════════════════════════
#  Constants
# ══════════════════════════════════════════════

# TDEE activity multipliers (Harris-Benedict / standard values)
ACTIVITY_FACTORS: dict[str, float] = {
    "sedentary":    1.2,    # ít vận động, ngồi nhiều
    "light":        1.375,  # tập nhẹ 1-3 ngày/tuần
    "moderate":     1.55,   # tập vừa 3-5 ngày/tuần
    "active":       1.725,  # tập nặng 6-7 ngày/tuần
    "very_active":  1.9,    # vận động viên / lao động nặng
}

# BMI classification (WHO 2023)
BMI_CLASSES: list[tuple[float, str]] = [
    (18.5, "Underweight"),
    (25.0, "Normal"),
    (30.0, "Overweight"),
    (float("inf"), "Obese"),
]

# Stride length coefficient (Studenski 2003)
# stride_m = 0.415 × height_m
STRIDE_COEFF: float = 0.415

# US Navy Body Fat % constants
# Male:   BF% = 86.010 × log₁₀(waist-neck) - 70.041 × log₁₀(height) + 36.76
# Female: BF% = 163.205 × log₁₀(waist+hip-neck) - 97.684 × log₁₀(height) - 78.387
_BF_MALE_C1   = 86.010
_BF_MALE_C2   = 70.041
_BF_MALE_C3   = 36.76
_BF_FEM_C1    = 163.205
_BF_FEM_C2    = 97.684
_BF_FEM_C3    = 78.387

# Calorie deficit for weight change
# ~500 kcal/day deficit ≈ 0.45 kg/week loss
DEFICIT_PER_WEEK_KG: float = 0.45
KCAL_PER_WEEK: float = 500.0  # kcal/day

# ══════════════════════════════════════════════
#  Data classes
# ══════════════════════════════════════════════

@dataclass
class BodyCompositionResult:
    bmi:             float
    bmi_class:       str
    bmr:             float          # kcal/day
    tdee:            float          # kcal/day
    body_fat_pct:    Optional[float]  # None if measurements not provided
    stride_m:        float
    calorie_target:  Optional[float]  # None if daily_calorie_intake not provided


# ══════════════════════════════════════════════
#  Core functions
# ══════════════════════════════════════════════

def calculate_bmi(weight_kg: float, height_cm: float) -> float:
    """
    BMI = weight_kg / (height_m)²
    Unit: kg/m²
    """
    height_m = height_cm / 100.0
    # BMI = W / H²
    return weight_kg / (height_m ** 2)


def classify_bmi(bmi: float) -> str:
    """
    WHO BMI classification:
      <18.5        → Underweight
      18.5–24.99   → Normal
      25.0–29.99   → Overweight
      ≥30.0        → Obese
    """
    for threshold, label in BMI_CLASSES:
        if bmi < threshold:
            return label
    return "Obese"


def calculate_bmr(weight_kg: float, height_cm: float, age: int, sex: str) -> float:
    """
    Mifflin-St Jeor BMR (1990, gold standard):
      Male:   BMR = 10×W + 6.25×H - 5×A + 5     [kcal/day]
      Female: BMR = 10×W + 6.25×H - 5×A - 161   [kcal/day]
    where W = weight_kg, H = height_cm, A = age_years

    Ref: Mifflin MD et al., Am J Clin Nutr 1990;51:241-247
    """
    base = 10.0 * weight_kg + 6.25 * height_cm - 5.0 * age
    if sex.lower() in ("male", "m"):
        # Male: + 5
        return base + 5.0
    else:
        # Female: - 161
        return base - 161.0


def calculate_tdee(bmr: float, activity_level: str) -> float:
    """
    TDEE = BMR × activity_factor
    activity_level must be one of: sedentary, light, moderate, active, very_active
    """
    factor = ACTIVITY_FACTORS.get(activity_level.lower(), ACTIVITY_FACTORS["sedentary"])
    # TDEE = BMR × factor
    return bmr * factor


def calculate_body_fat_pct(
    sex: str,
    height_cm: float,
    waist_cm: float,
    neck_cm: float,
    hip_cm: Optional[float] = None,
) -> Optional[float]:
    """
    US Navy Body Fat % estimation.
    All measurements in cm.

    Male:   BF% = 86.010 × log₁₀(waist - neck)
                - 70.041 × log₁₀(height)
                + 36.76
    Female: BF% = 163.205 × log₁₀(waist + hip - neck)
                -  97.684 × log₁₀(height)
                -  78.387

    Returns None if required measurements are missing or invalid.
    """
    if sex.lower() in ("male", "m"):
        diff = waist_cm - neck_cm
        if diff <= 0:
            return None
        # BF%_male = 86.010 × log₁₀(waist-neck) - 70.041 × log₁₀(height) + 36.76
        bf = (
            _BF_MALE_C1 * math.log10(diff)
            - _BF_MALE_C2 * math.log10(height_cm)
            + _BF_MALE_C3
        )
    else:
        if hip_cm is None:
            return None
        combo = waist_cm + hip_cm - neck_cm
        if combo <= 0:
            return None
        # BF%_female = 163.205 × log₁₀(waist+hip-neck) - 97.684 × log₁₀(height) - 78.387
        bf = (
            _BF_FEM_C1 * math.log10(combo)
            - _BF_FEM_C2 * math.log10(height_cm)
            - _BF_FEM_C3
        )

    # Clamp to physiologically plausible range [1%, 60%]
    return max(1.0, min(60.0, round(bf, 2)))


def calculate_stride_m(height_cm: float) -> float:
    """
    Stride length (Studenski 2003):
      stride_m = 0.415 × height_m
    """
    height_m = height_cm / 100.0
    # stride_m = 0.415 × height_m
    return round(STRIDE_COEFF * height_m, 4)


def calculate_calorie_target(
    tdee: float,
    daily_calorie_intake: Optional[float],
) -> Optional[float]:
    """
    deficit_or_surplus = TDEE - daily_calorie_intake
    Positive  → deficit  (weight loss)
    Negative  → surplus  (weight gain)
    Zero      → maintenance

    Giảm cân: ~500 kcal/day deficit ≈ 0.45 kg/week
    Tăng cân: ~500 kcal/day surplus ≈ 0.45 kg/week
    """
    if daily_calorie_intake is None:
        return None
    # calorie_target = TDEE - intake  (positive = deficit, negative = surplus)
    return round(tdee - daily_calorie_intake, 2)


# ══════════════════════════════════════════════
#  Public API
# ══════════════════════════════════════════════

def compute_body_composition(
    height_cm: float,
    weight_kg: float,
    age: int,
    sex: str,
    activity_level: str,
    waist_cm: Optional[float] = None,
    hip_cm: Optional[float] = None,
    neck_cm: Optional[float] = None,
    daily_calorie_intake: Optional[float] = None,
) -> BodyCompositionResult:
    """
    Main entry point for Phase 20 — Body Composition Engine.

    Endpoint: POST /health/body-composition
    Body   : { height_cm, weight_kg, age, sex, activity_level,
               waist_cm?, hip_cm?, neck_cm?, daily_calorie_intake? }
    Returns: BodyCompositionResult

    All formulas are exact per OPUS_PHASES.md Phase 20 spec.
    """
    # ── BMI ──────────────────────────────────
    bmi = calculate_bmi(weight_kg, height_cm)
    bmi_class = classify_bmi(bmi)

    # ── BMR (Mifflin-St Jeor 1990) ───────────
    bmr = calculate_bmr(weight_kg, height_cm, age, sex)

    # ── TDEE ─────────────────────────────────
    tdee = calculate_tdee(bmr, activity_level)

    # ── Body Fat % (US Navy, optional) ───────
    body_fat_pct: Optional[float] = None
    if waist_cm is not None and neck_cm is not None:
        body_fat_pct = calculate_body_fat_pct(
            sex, height_cm, waist_cm, neck_cm, hip_cm
        )

    # ── Stride length (Studenski 2003) ───────
    stride_m = calculate_stride_m(height_cm)

    # ── Calorie target ────────────────────────
    calorie_target = calculate_calorie_target(tdee, daily_calorie_intake)

    return BodyCompositionResult(
        bmi=round(bmi, 2),
        bmi_class=bmi_class,
        bmr=round(bmr, 2),
        tdee=round(tdee, 2),
        body_fat_pct=body_fat_pct,
        stride_m=stride_m,
        calorie_target=calorie_target,
    )
