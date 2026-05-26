/**
 * PART:   useSleep — sleep session state + history
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  26s — Sleep Service
 * TASK:   Manage sleep log, expose last night, weekly history, bedtime consistency
 * SCOPE:  IN: SleepService CRUD, Health Connect via getLastNightSleep
 *         OUT: Smart alarm (Phase 33s notifications)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getSleepLog, getLastNightSleep, addManualSleep, filterSleepByDays, computeConsistency,
  type SleepSession, type SleepConsistency,
} from '@/services/sleep/SleepService';

export type SleepPeriod = 7 | 30;

export interface UseSleepResult {
  lastNight: SleepSession | null;
  history: SleepSession[];
  filtered: SleepSession[];
  period: SleepPeriod;
  setPeriod: (p: SleepPeriod) => void;
  consistency: SleepConsistency;
  isLoading: boolean;
  logManual: (date: string, bedtime: string, wakeTime: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useSleep(): UseSleepResult {
  const [lastNight, setLastNight] = useState<SleepSession | null>(null);
  const [history, setHistory] = useState<SleepSession[]>([]);
  const [period, setPeriod] = useState<SleepPeriod>(7);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const [last, log] = await Promise.all([getLastNightSleep(), getSleepLog()]);
    setLastNight(last);
    setHistory(log);
    setIsLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const logManual = useCallback(async (date: string, bedtime: string, wakeTime: string) => {
    await addManualSleep(date, bedtime, wakeTime);
    await refresh();
  }, [refresh]);

  const filtered = filterSleepByDays(history, period);
  const consistency = computeConsistency(history);

  return { lastNight, history, filtered, period, setPeriod, consistency, isLoading, logManual, refresh };
}
