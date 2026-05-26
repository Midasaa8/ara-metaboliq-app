/**
 * PART:   Activity Service — Steps, Distance, Calories, Active Zone Minutes
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  Phase 23s — Activity Service
 * TASK:   Pure-function algorithms for step-based metrics + AZM scoring.
 *         Phase 20 (Opus) formulas: stride from height, Butterworth peak detection.
 *         Designed to work with Health Connect data OR manual input.
 * SCOPE:  IN: step count, HR samples, user profile → out metrics
 *         OUT: real-time accelerometer polling (native, needs dev build)
 */

import { UserProfile } from '@/store/userStore';

// ── Constants ────────────────────────────────────────────────────────────────
export const DAILY_STEP_GOAL = 10_000;
export const WEEKLY_AZM_TARGET = 150; // WHO recommendation

export interface ActivityMetrics {
  steps: number;
  distance_m: number;
  calories_active: number;
  calories_total: number;   // active + BMR portion
  active_minutes: number;
  azm: number;              // Active Zone Minutes
  step_goal_pct: number;    // 0-100
  azm_goal_pct: number;     // 0-100 vs weekly target
}

export interface HRZoneMinutes {
  fat_burn: number;   // 50-69% max HR
  cardio: number;     // 70-84% max HR
  peak: number;       // 85-100% max HR
}

// ── HR Zone boundaries (% of max HR = 220 - age) ────────────────────────────
export function getHRZones(age: number): { fatBurnMin: number; cardioMin: number; peakMin: number } {
  const maxHR = 220 - age;
  return {
    fatBurnMin: Math.round(maxHR * 0.50),
    cardioMin:  Math.round(maxHR * 0.70),
    peakMin:    Math.round(maxHR * 0.85),
  };
}

/**
 * Compute Active Zone Minutes from HR time series.
 * Fitbit scoring: fat_burn=1pt/min, cardio=2pt/min, peak=2pt/min
 */
export function computeAZM(
  hrSamples: { bpm: number; timestamp: string }[],
  age: number,
  intervalMinutes = 5,
): { azm: number; zones: HRZoneMinutes } {
  if (!hrSamples.length) return { azm: 0, zones: { fat_burn: 0, cardio: 0, peak: 0 } };

  const { fatBurnMin, cardioMin, peakMin } = getHRZones(age);
  const zones: HRZoneMinutes = { fat_burn: 0, cardio: 0, peak: 0 };

  for (const s of hrSamples) {
    if (s.bpm >= peakMin) {
      zones.peak += intervalMinutes;
    } else if (s.bpm >= cardioMin) {
      zones.cardio += intervalMinutes;
    } else if (s.bpm >= fatBurnMin) {
      zones.fat_burn += intervalMinutes;
    }
  }

  const azm = zones.fat_burn * 1 + zones.cardio * 2 + zones.peak * 2;
  return { azm, zones };
}

/**
 * Compute stride length from height (Studenski 2003)
 * stride_m = 0.415 × height_m
 */
export function strideFromHeight(heightCm: number): number {
  return 0.415 * (heightCm / 100);
}

/**
 * Compute all activity metrics for a given step count.
 */
export function computeActivityMetrics(
  steps: number,
  hrSamples: { bpm: number; timestamp: string }[],
  profile: Pick<UserProfile, 'age' | 'heightCm' | 'weightKg'>,
  bmrCalories: number, // daily BMR from body_composition
): ActivityMetrics {
  const stride = strideFromHeight(profile.heightCm);
  const distance_m = Math.round(steps * stride);

  // MET-based calorie burn (walking avg MET ≈ 3.5)
  const hours = steps / 1800 / 60; // ~1800 steps/hour walking pace → hours
  const calories_active = Math.round(3.5 * profile.weightKg * hours);
  const calories_total = Math.round(calories_active + bmrCalories / 24); // hourly BMR slice

  const active_minutes = Math.round((steps / 1800)); // rough: 1800 steps ≈ 1 active minute

  const { azm } = computeAZM(hrSamples, profile.age);

  return {
    steps,
    distance_m,
    calories_active,
    calories_total,
    active_minutes,
    azm,
    step_goal_pct: Math.min(100, Math.round((steps / DAILY_STEP_GOAL) * 100)),
    azm_goal_pct:  Math.min(100, Math.round((azm / WEEKLY_AZM_TARGET) * 100 / 7)),
  };
}

/**
 * Format distance for display
 * < 1000m → "850 m", >= 1000m → "1.2 km"
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Compute weekly summary from array of daily step counts
 */
export function weeklyStepSummary(dailySteps: number[]): {
  total: number;
  avg: number;
  best: number;
  daysHitGoal: number;
} {
  if (!dailySteps.length) return { total: 0, avg: 0, best: 0, daysHitGoal: 0 };
  const total = dailySteps.reduce((a, b) => a + b, 0);
  return {
    total,
    avg: Math.round(total / dailySteps.length),
    best: Math.max(...dailySteps),
    daysHitGoal: dailySteps.filter((s) => s >= DAILY_STEP_GOAL).length,
  };
}
