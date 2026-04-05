/**
 * PART:   Zustand — Health data store
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  1 — Project Setup
 * READS:  AGENTS.md §10, types/health.d.ts, types/hardware.d.ts
 * TASK:   Global health state: score, vitals, voice result, PPG buffer
 * SCOPE:  IN: health data state + setters
 *         OUT: API calls (hooks handle that), computation (server-side only)
 */

import { create } from 'zustand';
import type { HealthData, VoiceAnalysis, SleepData } from '@/types/health';
import type { ISensorReading } from '@/types/hardware';

interface SubScores {
  exercise: number; // 0–100
  sleep: number; // 0–100
  voice: number; // 0–100
  nutrition: number; // 0–100
  discipline: number; // 0–100
}

interface HealthStore {
  // -- State --
  healthScore: number;
  subScores: SubScores;
  latestReading: ISensorReading | null;
  lastVoiceAnalysis: VoiceAnalysis | null;
  lastSleepData: SleepData | null;
  streakDays: number;
  isLoading: boolean;

  // -- Setters --
  setHealthScore: (score: number, sub: SubScores) => void;
  setLatestReading: (reading: ISensorReading) => void;
  setVoiceAnalysis: (v: VoiceAnalysis) => void;
  setSleepData: (s: SleepData) => void;
  setStreakDays: (days: number) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const defaultSubScores: SubScores = {
  exercise: 0, sleep: 0, voice: 0, nutrition: 0, discipline: 0,
};

export const useHealthStore = create<HealthStore>((set) => ({
  // -- Initial state --
  healthScore: 0,
  subScores: defaultSubScores,
  latestReading: null,
  lastVoiceAnalysis: null,
  lastSleepData: null,
  streakDays: 0,
  isLoading: false,

  // -- Setters --
  setHealthScore: (score, sub) => set({ healthScore: score, subScores: sub }),
  setLatestReading: (reading) => set({ latestReading: reading }),
  setVoiceAnalysis: (v) => set({ lastVoiceAnalysis: v }),
  setSleepData: (s) => set({ lastSleepData: s }),
  setStreakDays: (days) => set({ streakDays: days }),
  setLoading: (loading) => set({ isLoading: loading }),
  reset: () => set({
    healthScore: 0, subScores: defaultSubScores,
    latestReading: null, lastVoiceAnalysis: null,
    lastSleepData: null, streakDays: 0, isLoading: false,
  }),
}));
