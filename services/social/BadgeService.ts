/**
 * PART:   BadgeService — 10 achievement badge definitions + unlock logic
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  31s — Challenges & Social
 * TASK:   Check unlock conditions from local health data, persist badge state
 * SCOPE:  IN: AsyncStorage health counters
 *         OUT: useBadges hook, BadgeGrid component
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Badge {
  id: string;
  emoji: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;   // ISO
}

export interface BadgeCounters {
  maxDailySteps: number;       // for 10K Steps Club
  activityStreakDays: number;  // for 7-Day Streak
  voiceCheckInsThisWeek: number;
  sleepScoreHighNights: number;   // sleep > 85
  labScansTotal: number;
  totalKmThisMonth: number;
  breathingSessionsTotal: number;
  waterGoalDays: number;
  weeklyAZM: number;
  healthScore90Days: number;       // days health score ≥ 90
}

const BADGE_DEFS: Omit<Badge, 'unlocked' | 'unlockedAt'>[] = [
  { id: 'steps10k',    emoji: '🏆', title: '10.000 Steps Club',          description: 'Đi 10.000 bước trong một ngày' },
  { id: 'streak7',     emoji: '🔥', title: '7-Day Streak',               description: '7 ngày liên tiếp hoạt động' },
  { id: 'voiceWeekly', emoji: '🎤', title: 'Voice Check-in Champion',    description: '4 lần check-in giọng nói trong tuần' },
  { id: 'sleepNinja',  emoji: '🌙', title: 'Sleep Ninja',                description: '7 đêm Sleep Score > 85' },
  { id: 'ocrPioneer',  emoji: '📸', title: 'OCR Pioneer',                description: 'Hoàn thành lần quét xét nghiệm đầu tiên' },
  { id: 'marathon',    emoji: '💪', title: 'Marathon Month',             description: 'Đi/chạy 100km trong 30 ngày' },
  { id: 'breather',    emoji: '🫁', title: 'Deep Breather',              description: '10 phiên thở hướng dẫn' },
  { id: 'hydration',   emoji: '💧', title: 'Hydration Hero',             description: 'Đạt mục tiêu nước 7 ngày liên tiếp' },
  { id: 'azmStar',     emoji: '⚡', title: 'Active Zone Star',            description: 'Đạt 150 phút AZM trong tuần (WHO)' },
  { id: 'score90',     emoji: '🏅', title: 'Health Score 90+',           description: 'Duy trì Health Score ≥ 90 trong 7 ngày' },
];

const KEYS = { badges: 'user_badges', counters: 'badge_counters' };

export async function getBadges(): Promise<Badge[]> {
  const raw = await AsyncStorage.getItem(KEYS.badges);
  const saved: Badge[] = raw ? JSON.parse(raw) : [];
  const savedMap: Record<string, Badge> = Object.fromEntries(saved.map((b) => [b.id, b]));
  return BADGE_DEFS.map((def) => ({
    ...def,
    unlocked: savedMap[def.id]?.unlocked ?? false,
    unlockedAt: savedMap[def.id]?.unlockedAt,
  }));
}

export async function getCounters(): Promise<BadgeCounters> {
  const raw = await AsyncStorage.getItem(KEYS.counters);
  return raw ? JSON.parse(raw) : {
    maxDailySteps: 0, activityStreakDays: 0, voiceCheckInsThisWeek: 0,
    sleepScoreHighNights: 0, labScansTotal: 0, totalKmThisMonth: 0,
    breathingSessionsTotal: 0, waterGoalDays: 0, weeklyAZM: 0, healthScore90Days: 0,
  };
}

export async function saveCounters(c: BadgeCounters): Promise<void> {
  await AsyncStorage.setItem(KEYS.counters, JSON.stringify(c));
}

/** Returns newly unlocked badge IDs */
export async function checkAndUnlock(counters: BadgeCounters): Promise<string[]> {
  const badges = await getBadges();
  const CONDITIONS: Record<string, boolean> = {
    steps10k:    counters.maxDailySteps >= 10000,
    streak7:     counters.activityStreakDays >= 7,
    voiceWeekly: counters.voiceCheckInsThisWeek >= 4,
    sleepNinja:  counters.sleepScoreHighNights >= 7,
    ocrPioneer:  counters.labScansTotal >= 1,
    marathon:    counters.totalKmThisMonth >= 100,
    breather:    counters.breathingSessionsTotal >= 10,
    hydration:   counters.waterGoalDays >= 7,
    azmStar:     counters.weeklyAZM >= 150,
    score90:     counters.healthScore90Days >= 7,
  };
  const now = new Date().toISOString();
  const newlyUnlocked: string[] = [];
  const updated = badges.map((b) => {
    if (!b.unlocked && CONDITIONS[b.id]) {
      newlyUnlocked.push(b.id);
      return { ...b, unlocked: true, unlockedAt: now };
    }
    return b;
  });
  if (newlyUnlocked.length) {
    await AsyncStorage.setItem(KEYS.badges, JSON.stringify(updated));
  }
  return newlyUnlocked;
}
