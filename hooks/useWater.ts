/**
 * PART:   useWater — water intake state + 2-hour reminder
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  24s — Food & Water Service
 * TASK:   State for today's water log, goal progress, reminder scheduling
 * SCOPE:  IN: WaterService CRUD, userStore weight for goal
 *         OUT: Expo Notifications (needs dev build), long-term trend analytics
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getTodayWater, addWater, removeWaterEntry,
  computeTotalMl, computeWaterPct, computeWaterGoal,
  type WaterEntry,
} from '@/services/nutrition/WaterService';
import { useUserStore } from '@/store/userStore';

export interface UseWaterResult {
  entries: WaterEntry[];
  totalMl: number;
  goalMl: number;
  pct: number;         // 0-100
  isLoading: boolean;
  logWater: (amount_ml?: number) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const DEFAULT_AMOUNT = 250; // ml per quick-add

export function useWater(): UseWaterResult {
  const weightKg = useUserStore((s) => s.profile?.weightKg ?? 60);
  const goalMl = computeWaterGoal(weightKg);

  const [entries, setEntries] = useState<WaterEntry[]>([]);
  const [totalMl, setTotalMl] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const list = await getTodayWater();
    setEntries(list);
    setTotalMl(computeTotalMl(list));
    setIsLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const logWater = useCallback(async (amount_ml = DEFAULT_AMOUNT) => {
    await addWater(amount_ml);
    await refresh();
  }, [refresh]);

  const removeEntry = useCallback(async (id: string) => {
    await removeWaterEntry(id);
    await refresh();
  }, [refresh]);

  const pct = computeWaterPct(totalMl, goalMl);

  return { entries, totalMl, goalMl, pct, isLoading, logWater, removeEntry, refresh };
}
