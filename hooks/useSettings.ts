/**
 * PART:   useSettings — app-wide settings state management
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  33s — Settings Architecture
 * TASK:   Load/save settings, expose update helpers for each section
 * SCOPE:  IN: SettingsService
 *         OUT: all settings screens
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getSettings, saveSettings, updateGoals, updateNotifications,
  type AppSettings, type HealthGoals, type NotificationPrefs,
  type UnitSystem, type Language, type ThemeMode,
} from '@/services/settings/SettingsService';

export interface UseSettingsResult {
  settings: AppSettings;
  isLoading: boolean;
  setUnits: (v: UnitSystem) => Promise<void>;
  setLanguage: (v: Language) => Promise<void>;
  setTheme: (v: ThemeMode) => Promise<void>;
  setGoals: (g: Partial<HealthGoals>) => Promise<void>;
  setNotifications: (n: Partial<NotificationPrefs>) => Promise<void>;
  setFemaleHealth: (v: boolean) => Promise<void>;
  setShareWithFriends: (v: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useSettings(): UseSettingsResult {
  const [settings, setSettingsState] = useState<AppSettings>({
    units: 'metric', language: 'vi', theme: 'light',
    goals: { stepTarget: 10000, sleepTargetMin: 480, waterTargetMl: 2000, weightGoalKg: null, azmWeeklyTarget: 150 },
    notifications: { remindToMove: true, bedtimeReminder: true, voiceCheckIn: true, waterReminder: true, exerciseReminder: false, morningReadiness: true },
    femaleHealthEnabled: false, shareWithFriends: true, analyticsEnabled: true,
  });
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const s = await getSettings();
    setSettingsState(s);
    setIsLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const update = useCallback(async (partial: Partial<AppSettings>) => {
    const merged = await saveSettings(partial);
    setSettingsState(merged);
  }, []);

  return {
    settings,
    isLoading,
    setUnits: useCallback(async (v) => update({ units: v }), [update]),
    setLanguage: useCallback(async (v) => update({ language: v }), [update]),
    setTheme: useCallback(async (v) => update({ theme: v }), [update]),
    setGoals: useCallback(async (g) => { const s = await updateGoals(g); setSettingsState(s); }, []),
    setNotifications: useCallback(async (n) => { const s = await updateNotifications(n); setSettingsState(s); }, []),
    setFemaleHealth: useCallback(async (v) => update({ femaleHealthEnabled: v }), [update]),
    setShareWithFriends: useCallback(async (v) => update({ shareWithFriends: v }), [update]),
    refresh,
  };
}
