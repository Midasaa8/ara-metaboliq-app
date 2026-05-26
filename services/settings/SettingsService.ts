/**
 * PART:   SettingsService — persistent settings management
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  33s — Settings Architecture
 * TASK:   Central settings store with AsyncStorage, all app-wide preferences
 * SCOPE:  IN: AsyncStorage
 *         OUT: settings screens, notification schedules, units
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type UnitSystem = 'metric' | 'imperial';
export type Language = 'vi' | 'en';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface HealthGoals {
  stepTarget: number;        // default 10000
  sleepTargetMin: number;    // default 480 (8 hours)
  waterTargetMl: number;     // default from weight×30
  weightGoalKg: number | null;
  azmWeeklyTarget: number;   // default 150
}

export interface NotificationPrefs {
  remindToMove: boolean;
  bedtimeReminder: boolean;
  voiceCheckIn: boolean;
  waterReminder: boolean;
  exerciseReminder: boolean;
  morningReadiness: boolean;
}

export interface AppSettings {
  // General
  units: UnitSystem;
  language: Language;
  theme: ThemeMode;
  // Health Goals
  goals: HealthGoals;
  // Notifications
  notifications: NotificationPrefs;
  // Female Health
  femaleHealthEnabled: boolean;
  // Privacy
  shareWithFriends: boolean;
  analyticsEnabled: boolean;
}

const KEY = 'app_settings';

const DEFAULT_SETTINGS: AppSettings = {
  units: 'metric',
  language: 'vi',
  theme: 'light',
  goals: {
    stepTarget: 10000,
    sleepTargetMin: 480,
    waterTargetMl: 2000,
    weightGoalKg: null,
    azmWeeklyTarget: 150,
  },
  notifications: {
    remindToMove: true,
    bedtimeReminder: true,
    voiceCheckIn: true,
    waterReminder: true,
    exerciseReminder: false,
    morningReadiness: true,
  },
  femaleHealthEnabled: false,
  shareWithFriends: true,
  analyticsEnabled: true,
};

export async function getSettings(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const merged = { ...current, ...settings };
  await AsyncStorage.setItem(KEY, JSON.stringify(merged));
  return merged;
}

export async function updateGoals(goals: Partial<HealthGoals>): Promise<AppSettings> {
  const current = await getSettings();
  return saveSettings({ goals: { ...current.goals, ...goals } });
}

export async function updateNotifications(prefs: Partial<NotificationPrefs>): Promise<AppSettings> {
  const current = await getSettings();
  return saveSettings({ notifications: { ...current.notifications, ...prefs } });
}

export async function exportUserData(): Promise<string> {
  const keys = await AsyncStorage.getAllKeys();
  const data: Record<string, unknown> = {};
  for (const k of keys) {
    const v = await AsyncStorage.getItem(k);
    if (k && v) data[k] = JSON.parse(v);
  }
  return JSON.stringify(data, null, 2);
}

export async function deleteAllData(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  for (const k of keys) await AsyncStorage.removeItem(k);
}
