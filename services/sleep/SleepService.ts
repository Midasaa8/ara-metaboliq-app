/**
 * PART:   SleepService — Health Connect sync + manual log + sleep metrics
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  26s — Sleep Service
 * TASK:   Read sleep sessions from Health Connect or manual bedtime/waketime,
 *         persist locally, compute stage breakdown, consistency analysis
 * SCOPE:  IN: Health Connect via healthConnectService, manual input
 *         OUT: ChronoOS LSTM sleep prediction (Wave 2 Phase 37s)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { readTodayData } from '@/services/health/healthConnectService';

const SLEEP_KEY = 'sleep_log';

export interface SleepSession {
  id: string;
  date: string;              // YYYY-MM-DD (night start date)
  start_time: string;        // ISO
  end_time: string;          // ISO
  total_minutes: number;
  deep_minutes: number;
  light_minutes: number;
  rem_minutes: number;
  awake_minutes: number;
  source: 'health_connect' | 'manual';
}

export interface SleepConsistency {
  bedtimes: string[];        // HH:mm strings, 7 nights
  avg_bedtime: string;
  std_minutes: number;       // stddev of bedtime in minutes
}

export async function getSleepLog(): Promise<SleepSession[]> {
  const raw = await AsyncStorage.getItem(SLEEP_KEY);
  const sessions: SleepSession[] = raw ? JSON.parse(raw) : [];
  return sessions.sort((a, b) => b.date.localeCompare(a.date));
}

export async function addManualSleep(
  date: string,
  bedtime: string,   // HH:mm
  wakeTime: string,  // HH:mm
): Promise<SleepSession> {
  const [bh, bm] = bedtime.split(':').map(Number);
  const [wh, wm] = wakeTime.split(':').map(Number);
  const start = new Date(`${date}T${bedtime}:00`);
  let end = new Date(`${date}T${wakeTime}:00`);
  if (end <= start) end.setDate(end.getDate() + 1);
  const total = Math.round((end.getTime() - start.getTime()) / 60000);

  // Estimate stages (rough heuristic when no sensor data)
  const deep   = Math.round(total * 0.20);
  const rem    = Math.round(total * 0.25);
  const awake  = Math.round(total * 0.05);
  const light  = total - deep - rem - awake;

  const session: SleepSession = {
    id: `${Date.now()}`,
    date,
    start_time: start.toISOString(),
    end_time:   end.toISOString(),
    total_minutes: total,
    deep_minutes: deep,
    light_minutes: light,
    rem_minutes: rem,
    awake_minutes: awake,
    source: 'manual',
  };

  const existing = await getSleepLog();
  const filtered = existing.filter((s) => s.date !== date); // replace same-night
  filtered.push(session);
  await AsyncStorage.setItem(SLEEP_KEY, JSON.stringify(filtered));
  return session;
}

/** Try reading last night from Health Connect; falls back to last stored session */
export async function getLastNightSleep(): Promise<SleepSession | null> {
  try {
    const hcData = await readTodayData();
    if (hcData.sleep.totalMinutes > 0) {
      return {
        id: 'hc_last_night',
        date: new Date().toISOString().slice(0, 10),
        start_time: hcData.sleep.startTime ?? new Date().toISOString(),
        end_time:   new Date().toISOString(),
        total_minutes: hcData.sleep.totalMinutes,
        deep_minutes:  hcData.sleep.deepMinutes,
        light_minutes: hcData.sleep.lightMinutes ?? (hcData.sleep.totalMinutes - hcData.sleep.deepMinutes - hcData.sleep.remMinutes),
        rem_minutes:   hcData.sleep.remMinutes,
        awake_minutes: hcData.sleep.awakeMinutes ?? 0,
        source: 'health_connect',
      };
    }
  } catch { /* fallback */ }

  const log = await getSleepLog();
  return log[0] ?? null;
}

export function filterSleepByDays(sessions: SleepSession[], days: number): SleepSession[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return sessions.filter((s) => new Date(s.date) >= cutoff);
}

/** Compute bedtime consistency for last 7 nights */
export function computeConsistency(sessions: SleepSession[]): SleepConsistency {
  const last7 = sessions.slice(0, 7);
  const toMins = (iso: string) => {
    const d = new Date(iso);
    let h = d.getHours(); const m = d.getMinutes();
    if (h < 12) h += 24; // treat midnight crossings
    return h * 60 + m;
  };
  const mins = last7.map((s) => toMins(s.start_time));
  const avg = mins.reduce((a, b) => a + b, 0) / (mins.length || 1);
  const std = Math.sqrt(mins.reduce((a, m) => a + Math.pow(m - avg, 2), 0) / (mins.length || 1));
  const avgH = Math.floor(avg / 60) % 24;
  const avgM = Math.round(avg % 60);
  return {
    bedtimes: last7.map((s) => new Date(s.start_time).toTimeString().slice(0, 5)),
    avg_bedtime: `${String(avgH).padStart(2, '0')}:${String(avgM).padStart(2, '0')}`,
    std_minutes: Math.round(std),
  };
}
