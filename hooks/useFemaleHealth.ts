/**
 * PART:   useFemaleHealth — cycle state, calendar, symptoms
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  32s — Female Health UI
 * TASK:   Load cycles + symptoms, expose log actions, compute current phase + prediction
 * SCOPE:  IN: FemaleHealthService
 *         OUT: CycleCalendar, SymptomLogger, PhaseInsight
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getCycleLogs, getSymptoms, logPeriodStart, logPeriodEnd, logSymptoms,
  buildCalendarMonth, averageCycleLength, getPhaseForDay, isFertileDay,
  type CycleLog, type SymptomLog, type SymptomType, type CyclePhase, type DayInfo,
} from '@/services/health/FemaleHealthService';

export interface UseFemaleHealthResult {
  cycles: CycleLog[];
  symptoms: SymptomLog[];
  currentPhase: CyclePhase | null;
  currentDayOfCycle: number | null;
  avgCycleLength: number;
  nextPeriodDate: string | null;
  calendarMonth: DayInfo[];
  viewYear: number;
  viewMonth: number;
  isLoading: boolean;
  setViewMonth: (year: number, month: number) => void;
  startPeriod: (date: string) => Promise<void>;
  endPeriod: (startDate: string, endDate: string) => Promise<void>;
  logSymptomsForDate: (date: string, symptoms: SymptomType[], notes?: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useFemaleHealth(): UseFemaleHealthResult {
  const now = new Date();
  const [cycles, setCycles] = useState<CycleLog[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomLog[]>([]);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth_] = useState(now.getMonth());
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [c, s] = await Promise.all([getCycleLogs(), getSymptoms()]);
    setCycles(c);
    setSymptoms(s);
    setIsLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const setViewMonth = useCallback((year: number, month: number) => {
    setViewYear(year); setViewMonth_(month);
  }, []);

  const avgCycleLength = useMemo(() => averageCycleLength(cycles), [cycles]);

  const { currentPhase, currentDayOfCycle, nextPeriodDate } = useMemo(() => {
    if (!cycles.length) return { currentPhase: null, currentDayOfCycle: null, nextPeriodDate: null };
    const sorted = [...cycles].sort((a, b) => b.startDate.localeCompare(a.startDate));
    const lastStart = new Date(sorted[0].startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - lastStart.getTime()) / 86400_000);
    const dayOfCycle = (diffDays % avgCycleLength) + 1;
    const phase = getPhaseForDay(dayOfCycle);
    const daysUntilNext = avgCycleLength - dayOfCycle;
    const next = new Date(today.getTime() + daysUntilNext * 86400_000);
    return {
      currentPhase: phase,
      currentDayOfCycle: dayOfCycle,
      nextPeriodDate: next.toISOString().split('T')[0],
    };
  }, [cycles, avgCycleLength]);

  const calendarMonth = useMemo(
    () => buildCalendarMonth(viewYear, viewMonth, cycles),
    [cycles, viewYear, viewMonth]
  );

  const startPeriod = useCallback(async (date: string) => {
    await logPeriodStart(date);
    await refresh();
  }, [refresh]);

  const endPeriod = useCallback(async (startDate: string, endDate: string) => {
    await logPeriodEnd(startDate, endDate);
    await refresh();
  }, [refresh]);

  const logSymptomsForDate = useCallback(async (date: string, syms: SymptomType[], notes?: string) => {
    await logSymptoms(date, syms, notes);
    await refresh();
  }, [refresh]);

  return {
    cycles, symptoms, currentPhase, currentDayOfCycle, avgCycleLength, nextPeriodDate,
    calendarMonth, viewYear, viewMonth, isLoading,
    setViewMonth, startPeriod, endPeriod, logSymptomsForDate, refresh,
  };
}
