/**
 * PART:   useBadges — badge unlock state + counter management
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  31s — Challenges & Social
 * TASK:   Load badges, expose incrementCounter + checkUnlock
 * SCOPE:  IN: BadgeService
 *         OUT: BadgeGrid component
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getBadges, getCounters, saveCounters, checkAndUnlock,
  type Badge, type BadgeCounters,
} from '@/services/social/BadgeService';

export interface UseBadgesResult {
  badges: Badge[];
  counters: BadgeCounters;
  unlockedCount: number;
  newlyUnlocked: string[];
  isLoading: boolean;
  incrementCounter: (key: keyof BadgeCounters, value: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useBadges(): UseBadgesResult {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [counters, setCounters] = useState<BadgeCounters>({
    maxDailySteps: 0, activityStreakDays: 0, voiceCheckInsThisWeek: 0,
    sleepScoreHighNights: 0, labScansTotal: 0, totalKmThisMonth: 0,
    breathingSessionsTotal: 0, waterGoalDays: 0, weeklyAZM: 0, healthScore90Days: 0,
  });
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [b, c] = await Promise.all([getBadges(), getCounters()]);
    setBadges(b);
    setCounters(c);
    setIsLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const incrementCounter = useCallback(async (key: keyof BadgeCounters, value: number) => {
    const cur = await getCounters();
    const updated = { ...cur, [key]: Math.max(cur[key], value) };
    await saveCounters(updated);
    const newBadges = await checkAndUnlock(updated);
    setNewlyUnlocked(newBadges);
    await refresh();
  }, [refresh]);

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return { badges, counters, unlockedCount, newlyUnlocked, isLoading, incrementCounter, refresh };
}
