/**
 * PART:   RemindToMoveService — hourly 250-step nudge with notification scheduling
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  30s — Reminders to Move
 * TASK:   Track per-hour step totals, schedule :50 minute notifications when sedentary
 * SCOPE:  IN: hourly step data from HealthConnect
 *         OUT: expo-notifications, hour state persisted to AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

export type HourStatus = 'met' | 'missed' | 'pending' | 'disabled';

export interface HourData {
  hour: number;          // 9..20  (9AM–8PM, 12 active hours)
  steps: number;
  status: HourStatus;
}

export interface RemindSettings {
  enabled: boolean;
  disabledHours: number[];  // user-silenced individual hours
}

const KEYS = { hourly: 'remind_move_hourly', settings: 'remind_move_settings' };
const ACTIVE_HOURS = Array.from({ length: 12 }, (_, i) => i + 9); // 9..20
const STEP_TARGET = 250;

export async function getSettings(): Promise<RemindSettings> {
  const raw = await AsyncStorage.getItem(KEYS.settings);
  return raw ? JSON.parse(raw) : { enabled: true, disabledHours: [] };
}

export async function saveSettings(s: RemindSettings): Promise<void> {
  await AsyncStorage.setItem(KEYS.settings, JSON.stringify(s));
}

/** Update step count for a given hour and recompute status */
export async function updateHourSteps(hour: number, steps: number): Promise<void> {
  const today = new Date().toDateString();
  const key = `${KEYS.hourly}_${today}`;
  const raw = await AsyncStorage.getItem(key);
  const map: Record<number, number> = raw ? JSON.parse(raw) : {};
  map[hour] = steps;
  await AsyncStorage.setItem(key, JSON.stringify(map));
}

export async function getHourlyData(): Promise<HourData[]> {
  const today = new Date().toDateString();
  const key = `${KEYS.hourly}_${today}`;
  const raw = await AsyncStorage.getItem(key);
  const map: Record<number, number> = raw ? JSON.parse(raw) : {};
  const settings = await getSettings();
  const nowH = new Date().getHours();

  return ACTIVE_HOURS.map((h) => {
    const steps = map[h] ?? 0;
    let status: HourStatus = 'pending';
    if (settings.disabledHours.includes(h)) status = 'disabled';
    else if (steps >= STEP_TARGET) status = 'met';
    else if (h < nowH) status = 'missed';
    return { hour: h, steps, status };
  });
}

export async function scheduleReminder(hour: number): Promise<void> {
  const settings = await getSettings();
  if (!settings.enabled || settings.disabledHours.includes(hour)) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const now = new Date();
  const trigger = new Date(now);
  trigger.setHours(hour, 50, 0, 0);
  if (trigger <= now) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Thời gian đứng dậy! 🚶',
      body: 'Bạn đã ngồi 50 phút — đi lại 250 bước nhé!',
      sound: true,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger },
  });
}

export async function getDailySummary(): Promise<{ met: number; total: number }> {
  const hours = await getHourlyData();
  const met = hours.filter((h) => h.status === 'met').length;
  const total = hours.filter((h) => h.status !== 'disabled').length;
  return { met, total };
}
