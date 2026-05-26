/**
 * PART:   useReadiness — React hook for Daily Readiness Score
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  36s — Daily Readiness Score UI
 * TASK:   Expose today's score, breakdown, weekly history
 * SCOPE:  IN: ReadinessService
 *         OUT: ReadinessCard, ReadinessChart
 */

import { useState, useEffect, useCallback } from 'react';
import {
  computeReadiness,
  getReadinessHistory,
  type ReadinessResult,
  type ReadinessLevel,
  type ReadinessBreakdown,
} from '@/services/readiness/ReadinessService';

export interface UseReadinessResult {
  score: number;
  level: ReadinessLevel;
  message: string;
  breakdown: ReadinessBreakdown;
  weeklyHistory: ReadinessResult[];
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function useReadiness(): UseReadinessResult {
  const [result, setResult] = useState<ReadinessResult | null>(null);
  const [weeklyHistory, setWeeklyHistory] = useState<ReadinessResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const [today, history] = await Promise.all([
      computeReadiness(),
      getReadinessHistory(7),
    ]);
    setResult(today);
    setWeeklyHistory(history);
    setIsLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return {
    score: result?.score ?? 0,
    level: result?.level ?? 'moderate',
    message: result?.message ?? '',
    breakdown: result?.breakdown ?? { sleep: 0, recovery: 0, activity: 0, stress: 0 },
    weeklyHistory,
    isLoading,
    refresh,
  };
}
