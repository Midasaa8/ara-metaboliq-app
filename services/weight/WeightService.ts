/**
 * PART:   WeightService — manual weight log + BMI/goal projection
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  25s — Weight & Body Composition
 * TASK:   CRUD for weight entries, BMI calc, linear regression for goal date projection
 * SCOPE:  IN: user profile (height, age, gender), target weight
 *         OUT: BMR/TDEE server call (Phase 20 Opus backend already handles this)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const WEIGHT_KEY = 'weight_log';

export interface WeightEntry {
  id: string;
  weight_kg: number;
  logged_at: string; // ISO
  note?: string;
}

export interface BMIResult {
  bmi: number;
  classification: 'underweight' | 'normal' | 'overweight' | 'obese';
  color: string;
}

export async function getWeightLog(): Promise<WeightEntry[]> {
  const raw = await AsyncStorage.getItem(WEIGHT_KEY);
  const entries: WeightEntry[] = raw ? JSON.parse(raw) : [];
  return entries.sort((a, b) => a.logged_at.localeCompare(b.logged_at));
}

export async function addWeightEntry(weight_kg: number, note?: string): Promise<WeightEntry> {
  const entries = await getWeightLog();
  const entry: WeightEntry = {
    id: `${Date.now()}`,
    weight_kg,
    logged_at: new Date().toISOString(),
    note,
  };
  // Prevent duplicate same-day entries — replace instead
  const today = entry.logged_at.slice(0, 10);
  const filtered = entries.filter((e) => e.logged_at.slice(0, 10) !== today);
  filtered.push(entry);
  await AsyncStorage.setItem(WEIGHT_KEY, JSON.stringify(filtered));
  return entry;
}

export async function removeWeightEntry(id: string): Promise<void> {
  const entries = await getWeightLog();
  await AsyncStorage.setItem(WEIGHT_KEY, JSON.stringify(entries.filter((e) => e.id !== id)));
}

/** Filter entries to last N days */
export function filterByDays(entries: WeightEntry[], days: number): WeightEntry[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return entries.filter((e) => new Date(e.logged_at) >= cutoff);
}

/** BMI — WHO classification */
export function computeBMI(weight_kg: number, height_cm: number): BMIResult {
  const bmi = Math.round((weight_kg / Math.pow(height_cm / 100, 2)) * 10) / 10;
  if (bmi < 18.5) return { bmi, classification: 'underweight', color: '#3B82F6' };
  if (bmi < 25)   return { bmi, classification: 'normal',      color: '#4ECFB5' };
  if (bmi < 30)   return { bmi, classification: 'overweight',  color: '#F59E0B' };
  return           { bmi, classification: 'obese',       color: '#EF4444' };
}

/**
 * Project date to reach goal weight using simple linear regression on recent trend.
 * Returns null if insufficient data or going wrong direction.
 */
export function projectGoalDate(
  entries: WeightEntry[],
  goal_kg: number,
): { date: string; days_remaining: number } | null {
  const recent = filterByDays(entries, 30).slice(-14);
  if (recent.length < 3) return null;

  const n = recent.length;
  const xs = recent.map((_, i) => i);
  const ys = recent.map((e) => e.weight_kg);
  const sx = xs.reduce((a, b) => a + b, 0);
  const sy = ys.reduce((a, b) => a + b, 0);
  const sxy = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sxx = xs.reduce((a, x) => a + x * x, 0);
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  if (Math.abs(slope) < 0.001) return null;

  const current = ys[n - 1];
  const needDelta = goal_kg - current;
  if (needDelta * slope <= 0) return null; // wrong direction

  const daysBetween = (recent[1] ? (new Date(recent[1].logged_at).getTime() - new Date(recent[0].logged_at).getTime()) / 86400000 : 1);
  const daysRemaining = Math.round((needDelta / slope) * daysBetween);
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysRemaining);
  return { date: targetDate.toISOString().slice(0, 10), days_remaining: daysRemaining };
}
