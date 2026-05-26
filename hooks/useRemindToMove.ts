/**
 * PART:   useRemindToMove — hourly activity circles state + settings
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  30s — Reminders to Move
 * TASK:   Load hourly circles, expose toggle per-hour and global enable/disable
 * SCOPE:  IN: RemindToMoveService
 *         OUT: HourlyProgress component
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getHourlyData, getSettings, saveSettings, getDailySummary, scheduleReminder,
  type HourData, type RemindSettings,
} from '@/services/activity/RemindToMoveService';
import * as Notifications from 'expo-notifications';

export interface UseRemindToMoveResult {
  hours: HourData[];
  settings: RemindSettings;
  summary: { met: number; total: number };
  isLoading: boolean;
  setEnabled: (v: boolean) => Promise<void>;
  toggleHour: (hour: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useRemindToMove(): UseRemindToMoveResult {
  const [hours, setHours] = useState<HourData[]>([]);
  const [settings, setSettings] = useState<RemindSettings>({ enabled: true, disabledHours: [] });
  const [summary, setSummary] = useState({ met: 0, total: 12 });
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [h, s, sum] = await Promise.all([getHourlyData(), getSettings(), getDailySummary()]);
    setHours(h);
    setSettings(s);
    setSummary(sum);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Request notification permission on mount
    Notifications.requestPermissionsAsync().catch(() => null);
    refresh();
    // Refresh every minute
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  const setEnabled = useCallback(async (v: boolean) => {
    const cur = await getSettings();
    const next = { ...cur, enabled: v };
    await saveSettings(next);
    if (v) {
      // Schedule next pending hour
      const nowH = new Date().getHours();
      const nextHour = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].find((h) => h > nowH);
      if (nextHour) await scheduleReminder(nextHour);
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
    await refresh();
  }, [refresh]);

  const toggleHour = useCallback(async (hour: number) => {
    const cur = await getSettings();
    const disabledHours = cur.disabledHours.includes(hour)
      ? cur.disabledHours.filter((h) => h !== hour)
      : [...cur.disabledHours, hour];
    await saveSettings({ ...cur, disabledHours });
    await refresh();
  }, [refresh]);

  return { hours, settings, summary, isLoading, setEnabled, toggleHour, refresh };
}
