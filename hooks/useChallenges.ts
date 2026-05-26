/**
 * PART:   useChallenges — challenges + friends feed state
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  31s — Challenges & Social
 * TASK:   Load challenges + feed, expose update/leave actions
 * SCOPE:  IN: ChallengeService, FriendsService
 *         OUT: ChallengeCard, Leaderboard, FriendsFeed components
 */

import { useState, useEffect, useCallback } from 'react';
import { getChallenges, updateMyProgress, leaveChallenge, type Challenge } from '@/services/social/ChallengeService';
import { getFriendFeed, type FriendActivity } from '@/services/social/FriendsService';

export interface UseChallengesResult {
  challenges: Challenge[];
  feed: FriendActivity[];
  isLoading: boolean;
  updateProgress: (challengeId: string, progress: number) => Promise<void>;
  leave: (challengeId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useChallenges(): UseChallengesResult {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [feed, setFeed] = useState<FriendActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [c, f] = await Promise.all([getChallenges(), getFriendFeed()]);
    setChallenges(c);
    setFeed(f);
    setIsLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const updateProgress = useCallback(async (challengeId: string, progress: number) => {
    await updateMyProgress(challengeId, progress);
    await refresh();
  }, [refresh]);

  const leave = useCallback(async (challengeId: string) => {
    await leaveChallenge(challengeId);
    await refresh();
  }, [refresh]);

  return { challenges, feed, isLoading, updateProgress, leave, refresh };
}
