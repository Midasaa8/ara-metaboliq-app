/**
 * PART:   useWeight — weight log state + BMI + trend filter
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  25s — Weight & Body Composition
 * TASK:   Manage weight entries, period filter (7/30/90d), BMI, goal projection
 * SCOPE:  IN: WeightService CRUD, userStore for height/goalWeight
 *         OUT: server BMR/TDEE call, body fat % (needs waist/hip/neck — Phase 33s settings)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getWeightLog, addWeightEntry, removeWeightEntry, filterByDays, computeBMI, projectGoalDate,
  type WeightEntry, type BMIResult,
} from '@/services/weight/WeightService';
import { useUserStore } from '@/store/userStore';

export type PeriodFilter = 7 | 30 | 90;

export interface UseWeightResult {
  allEntries: WeightEntry[];
  filtered: WeightEntry[];
  period: PeriodFilter;
  setPeriod: (p: PeriodFilter) => void;
  latest: WeightEntry | null;
  bmi: BMIResult | null;
  projection: { date: string; days_remaining: number } | null;
  isLoading: boolean;
  addEntry: (kg: number, note?: string) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useWeight(goalWeight?: number): UseWeightResult {
  const profile = useUserStore((s) => s.profile);
  const [allEntries, setAllEntries] = useState<WeightEntry[]>([]);
  const [period, setPeriod] = useState<PeriodFilter>(30);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const entries = await getWeightLog();
    setAllEntries(entries);
    setIsLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addEntry = useCallback(async (kg: number, note?: string) => {
    await addWeightEntry(kg, note);
    await refresh();
  }, [refresh]);

  const removeEntry = useCallback(async (id: string) => {
    await removeWeightEntry(id);
    await refresh();
  }, [refresh]);

  const filtered = filterByDays(allEntries, period);
  const latest = allEntries.length > 0 ? allEntries[allEntries.length - 1] : null;

  const bmi = latest && profile
    ? computeBMI(latest.weight_kg, profile.heightCm)
    : null;

  const projection = goalWeight && allEntries.length >= 3
    ? projectGoalDate(allEntries, goalWeight)
    : null;

  return { allEntries, filtered, period, setPeriod, latest, bmi, projection, isLoading, addEntry, removeEntry, refresh };
}
