/**
 * PART:   FemaleHealthService — cycle logging, stage prediction, symptoms
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  32s — Female Health UI
 * TASK:   Persist cycle logs, compute current phase + fertile window, symptom log
 * SCOPE:  IN: AsyncStorage
 *         OUT: useFemaleHealth hook, CycleCalendar, PhaseInsight components
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

export type SymptomType = 'cramps' | 'mood' | 'energy' | 'bloating' | 'headache';

export interface CycleLog {
  id: string;
  startDate: string;    // YYYY-MM-DD
  endDate?: string;     // YYYY-MM-DD
  cycleLength?: number; // days to next period start
}

export interface SymptomLog {
  date: string;         // YYYY-MM-DD
  symptoms: SymptomType[];
  notes?: string;
}

export interface DayInfo {
  date: string;         // YYYY-MM-DD
  phase: CyclePhase | null;
  dayOfCycle: number | null;
  isFertile: boolean;
  isPredicted: boolean;
}

const KEYS = { cycles: 'female_cycles', symptoms: 'female_symptoms' };

export async function getCycleLogs(): Promise<CycleLog[]> {
  const raw = await AsyncStorage.getItem(KEYS.cycles);
  return raw ? JSON.parse(raw) : [];
}

export async function logPeriodStart(startDate: string): Promise<void> {
  const logs = await getCycleLogs();
  const existing = logs.find((l) => l.startDate === startDate);
  if (!existing) {
    logs.unshift({ id: `${Date.now()}`, startDate });
    await AsyncStorage.setItem(KEYS.cycles, JSON.stringify(logs));
  }
}

export async function logPeriodEnd(startDate: string, endDate: string): Promise<void> {
  const logs = await getCycleLogs();
  const idx = logs.findIndex((l) => l.startDate === startDate);
  if (idx >= 0) { logs[idx].endDate = endDate; }
  await AsyncStorage.setItem(KEYS.cycles, JSON.stringify(logs));
}

export async function getSymptoms(): Promise<SymptomLog[]> {
  const raw = await AsyncStorage.getItem(KEYS.symptoms);
  return raw ? JSON.parse(raw) : [];
}

export async function logSymptoms(date: string, symptoms: SymptomType[], notes?: string): Promise<void> {
  const logs = await getSymptoms();
  const idx = logs.findIndex((l) => l.date === date);
  if (idx >= 0) { logs[idx] = { date, symptoms, notes }; }
  else { logs.push({ date, symptoms, notes }); }
  await AsyncStorage.setItem(KEYS.symptoms, JSON.stringify(logs));
}

/** Average cycle length from last 6 cycles */
export function averageCycleLength(logs: CycleLog[]): number {
  if (logs.length < 2) return 28;
  const lengths: number[] = [];
  const sorted = [...logs].sort((a, b) => a.startDate.localeCompare(b.startDate));
  for (let i = 1; i < sorted.length && lengths.length < 6; i++) {
    const diff = (new Date(sorted[i].startDate).getTime() - new Date(sorted[i - 1].startDate).getTime()) / 86400_000;
    if (diff > 15 && diff < 45) lengths.push(diff);
  }
  return lengths.length ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length) : 28;
}

export function getPhaseForDay(dayOfCycle: number): CyclePhase {
  if (dayOfCycle <= 5) return 'menstrual';
  if (dayOfCycle <= 13) return 'follicular';
  if (dayOfCycle <= 16) return 'ovulation';
  return 'luteal';
}

export function isFertileDay(dayOfCycle: number): boolean {
  return dayOfCycle >= 12 && dayOfCycle <= 17;
}

export function buildCalendarMonth(year: number, month: number, logs: CycleLog[]): DayInfo[] {
  if (!logs.length) return [];
  const sorted = [...logs].sort((a, b) => b.startDate.localeCompare(a.startDate));
  const avgLen = averageCycleLength(logs);
  const lastStart = new Date(sorted[0].startDate);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const result: DayInfo[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateStr = date.toISOString().split('T')[0];
    const diffMs = date.getTime() - lastStart.getTime();
    const diffDays = Math.floor(diffMs / 86400_000);
    const dayOfCycle = ((diffDays % avgLen) + avgLen) % avgLen + 1;
    const isPredicted = diffDays > 0;
    result.push({
      date: dateStr,
      phase: getPhaseForDay(dayOfCycle),
      dayOfCycle,
      isFertile: isFertileDay(dayOfCycle),
      isPredicted,
    });
  }
  return result;
}
