/**
 * PART:   DemoDataSeeder — hardcoded beautiful demo data for hackathon stage
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  13 — Demo Data Seeding
 * READS:  AGENTS.md §7, SONNET_PHASES.md §PHASE 13, PLAN_B §XI Demo Flow
 * TASK:   Seed all Zustand stores with curated data for stage day demo
 * SCOPE:  IN: store population, IS_HACKATHON guard
 *         OUT: data persistence (Phase 20+), real API data (Phase 15+)
 *
 * IMPORTANT: activate() is called once at app startup when IS_HACKATHON=true.
 *            Triple-tap build version text in Settings to refresh (Phase 14 gesture).
 *
 * Demo narrative (PLAN_B §XI):
 *   User = Nguyễn Minh Khôi, 28 tuổi, engineer.
 *   Has been using ARA for 5 days. Score went from 61 → 78.
 *   Main insight: Nutrition is weakest (60/100), Voice shows no burnout.
 */

import { useHealthStore } from '@/store/healthStore';
import { useUserStore } from '@/store/userStore';

const IS_HACKATHON = true;

// ── Demo Values (hardcoded for stage) ────────────────────────────────────────

const DEMO_PROFILE = {
  id: 'demo-user-001',
  email: 'minhhkoi@arahealth.vn',
  fullName: 'Nguyễn Minh Khôi',
  age: 28,
  gender: 'male' as const,
  heightCm: 174,
  weightKg: 68,
  timezone: 'Asia/Ho_Chi_Minh',
};

const DEMO_HEALTH_SCORE = 78;
const DEMO_SUB_SCORES = {
  exercise:   82,   // Strong point — gym 4x/week
  sleep:      71,   // OK — occasional late nights
  voice:      90,   // Great — no stress markers
  nutrition:  60,   // Weakest — irregular meals, high sodium
  discipline: 95,   // Consistent tracking streak
};

const DEMO_VITALS = {
  hr:          72,
  spo2:        98,
  temperature: 36.5,
  ppgRaw:      Array.from({ length: 125 }, (_, i) => {
    // Pre-computed PPG curve so no runtime math needed
    const T = 60 / 72;
    const phase = ((i / 25) % T) / T;
    const sys  =  1.0 * Math.exp(-Math.pow(phase - 0.15, 2) / (2 * 0.003 ** 2));
    const dic  = -0.2 * Math.exp(-Math.pow(phase - 0.35, 2) / (2 * 0.002 ** 2));
    const dia  =  0.4 * Math.exp(-Math.pow(phase - 0.42, 2) / (2 * 0.004 ** 2));
    return sys + dic + dia;
  }),
  imuAccel:  { x: 0.01, y: -0.02, z: 9.80 },
  timestamp: Date.now(),
  patchId:   'ARA-MOCK-0001',
  patchSku:  'ARA-P1' as const,
};

const DEMO_VOICE_RESULT = {
  id: 'demo-voice-001',
  user_id: 'demo-user-001',
  timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2h ago
  duration_ms: 5100,
  snr_db: 24.3,
  recovery_readiness_score: 82,
  predicted_condition: 'healthy',
  confidence: 0.91,
  sub_scores: {
    energy:           76,
    stress:           88,  // low stress = high score
    cardiac_recovery: 85,
    respiratory:      79,
  },
  flags: [],
  overall_neurological: 0.84,
  overall_respiratory:  0.79,
  overall_voice_disorder: 0.05,
  model_version: 'MARVEL-v2.1',
  inference_ms: 312,
};

const DEMO_SLEEP_DATA = {
  date: new Date().toISOString().split('T')[0],
  sleep_score: 84,
  total_min: 460,        // 7h 40m
  hrv_sdnn: 42,
  predicted_tomorrow_score: 81,
  bio_age: 26,           // 2 years younger than actual
  stages: [
    { stage: 'Awake',  start_time: '22:30', end_time: '22:42', durationMin: 12 },
    { stage: 'Light',  start_time: '22:42', end_time: '23:30', durationMin: 48 },
    { stage: 'Deep',   start_time: '23:30', end_time: '01:05', durationMin: 95 },
    { stage: 'Light',  start_time: '01:05', end_time: '01:50', durationMin: 45 },
    { stage: 'REM',    start_time: '01:50', end_time: '02:40', durationMin: 50 },
    { stage: 'Light',  start_time: '02:40', end_time: '03:30', durationMin: 50 },
    { stage: 'Deep',   start_time: '03:30', end_time: '04:25', durationMin: 55 },
    { stage: 'REM',    start_time: '04:25', end_time: '05:20', durationMin: 55 },
    { stage: 'Light',  start_time: '05:20', end_time: '06:10', durationMin: 50 },
  ],
};

const DEMO_STREAK_DAYS = 5;

// ── Seeder ────────────────────────────────────────────────────────────────────

export const DemoDataSeeder = {
  /**
   * Populate all stores with curated demo data.
   * Safe to call multiple times (idempotent).
   */
  activate(): void {
    if (!IS_HACKATHON) return;

    const health = useHealthStore.getState();
    const user   = useUserStore.getState();

    // Seed user profile
    user.setProfile(DEMO_PROFILE);
    user.setIsOnboarded(true);

    // Seed health data
    health.setHealthScore(DEMO_HEALTH_SCORE, DEMO_SUB_SCORES);
    health.setLatestReading(DEMO_VITALS);
    health.setVoiceAnalysis(DEMO_VOICE_RESULT as any);
    health.setSleepData(DEMO_SLEEP_DATA as any);
    health.setStreakDays(DEMO_STREAK_DAYS);

    console.log('[DemoDataSeeder] activated — score:', DEMO_HEALTH_SCORE);
  },

  /**
   * Reset stores back to empty (use when "resetting demo" during live show).
   */
  reset(): void {
    useHealthStore.getState().reset();
    useUserStore.getState().clearUser();
    console.log('[DemoDataSeeder] reset');
  },
};
