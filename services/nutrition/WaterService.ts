/**
 * PART:   WaterService — daily water intake tracking
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  24s — Food & Water Service
 * TASK:   Log water amounts, compute progress vs goal (30ml/kg), persist locally
 * SCOPE:  IN: water amounts in ml, user weight for goal
 *         OUT: push notifications (handled by useWater hook), long-term trend
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WaterEntry {
  id: string;
  amount_ml: number;
  logged_at: string; // ISO
}

const WATER_KEY = (date: string) => `water_log:${date}`;
const todayKey = () => WATER_KEY(new Date().toISOString().slice(0, 10));

/** Daily goal = 30 ml × weight_kg, clamped 1500-3500 ml */
export function computeWaterGoal(weight_kg: number): number {
  return Math.min(3500, Math.max(1500, Math.round(weight_kg * 30)));
}

export async function getTodayWater(): Promise<WaterEntry[]> {
  const raw = await AsyncStorage.getItem(todayKey());
  return raw ? (JSON.parse(raw) as WaterEntry[]) : [];
}

export async function addWater(amount_ml: number): Promise<WaterEntry> {
  const entries = await getTodayWater();
  const entry: WaterEntry = {
    id: `${Date.now()}`,
    amount_ml,
    logged_at: new Date().toISOString(),
  };
  entries.push(entry);
  await AsyncStorage.setItem(todayKey(), JSON.stringify(entries));
  return entry;
}

export async function removeWaterEntry(id: string): Promise<void> {
  const entries = await getTodayWater();
  await AsyncStorage.setItem(todayKey(), JSON.stringify(entries.filter((e) => e.id !== id)));
}

export function computeTotalMl(entries: WaterEntry[]): number {
  return entries.reduce((sum, e) => sum + e.amount_ml, 0);
}

/** pct 0-100 */
export function computeWaterPct(totalMl: number, goalMl: number): number {
  return Math.min(100, Math.round((totalMl / goalMl) * 100));
}

/** Fetch last 7 days totals → [{date, total_ml}] */
export async function getWeeklyWater(): Promise<{ date: string; total_ml: number }[]> {
  const results: { date: string; total_ml: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    const raw = await AsyncStorage.getItem(WATER_KEY(date));
    const entries: WaterEntry[] = raw ? JSON.parse(raw) : [];
    results.push({ date, total_ml: computeTotalMl(entries) });
  }
  return results;
}
