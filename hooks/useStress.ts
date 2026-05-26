/**
 * PART:   useStress — stress state, breathing + mindfulness session management
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  29s — Stress Management
 * TASK:   Expose stress score/level from latest voice result, session lists, action helpers
 * SCOPE:  IN: StressService, latest voice sub_scores.stress
 *         OUT: StressGauge, BreathingCircle, MindfulnessTimer components
 */

import { useState, useEffect, useCallback } from 'react';
import {
  computeStressLevel, recordBreathingSession, recordMindfulnessSession,
  getStressHistory, getBreathingSessions, getMindfulnessSessions,
  type StressLevel, type StressSnapshot, type BreathingSession, type MindfulnessSession,
} from '@/services/stress/StressService';

export interface UseStressResult {
  score: number;
  level: StressLevel;
  history: StressSnapshot[];
  breathingSessions: BreathingSession[];
  mindfulnessSessions: MindfulnessSession[];
  isLoading: boolean;
  startBreathing: (technique: BreathingSession['technique'], durationMs: number, completed: boolean) => Promise<void>;
  completeMindfulness: (durationMin: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useStress(latestStressScore?: number): UseStressResult {
  const score = latestStressScore ?? 0;
  const level = computeStressLevel(score);

  const [history, setHistory] = useState<StressSnapshot[]>([]);
  const [breathingSessions, setBreathingSessions] = useState<BreathingSession[]>([]);
  const [mindfulnessSessions, setMindfulnessSessions] = useState<MindfulnessSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const [hist, breathe, mindful] = await Promise.all([
      getStressHistory(),
      getBreathingSessions(),
      getMindfulnessSessions(),
    ]);
    setHistory(hist);
    setBreathingSessions(breathe);
    setMindfulnessSessions(mindful);
    setIsLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const startBreathing = useCallback(async (
    technique: BreathingSession['technique'],
    durationMs: number,
    completed: boolean,
  ) => {
    await recordBreathingSession({ technique, durationMs, completed });
    await refresh();
  }, [refresh]);

  const completeMindfulness = useCallback(async (durationMin: number) => {
    await recordMindfulnessSession({ durationMin, completed: true });
    await refresh();
  }, [refresh]);

  return { score, level, history, breathingSessions, mindfulnessSessions, isLoading, startBreathing, completeMindfulness, refresh };
}
