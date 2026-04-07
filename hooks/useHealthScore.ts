/**
 * PART:   useHealthScore — React Query hook for Health Score
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  3 — Home Dashboard
 * READS:  AGENTS.md §9, services/api/healthAPI.ts, store/healthStore.ts
 * TASK:   Fetch score from server, sync to Zustand, return query state
 * SCOPE:  IN: API call, store sync, loading/error states
 *         OUT: score computation (server-only — Phase 19 FastAPI)
 *
 * HACKATHON: If backend is not running, falls back to mock score (78)
 *            so the dashboard always shows something in demo mode.
 */

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { healthAPI } from '@/services/api/healthAPI';
import { useHealthStore } from '@/store/healthStore';
import { useUserStore } from '@/store/userStore';

// Mock data used when backend is unreachable (hackathon fallback)
const MOCK_SCORE_RESPONSE = {
  score: 78,
  sub_scores: { exercise: 82, sleep: 71, voice: 90, nutrition: 60, discipline: 95 },
  computed_at: new Date().toISOString(),
};

export function useHealthScore() {
  const userId = useUserStore((s) => s.profile?.id ?? 'user-mock-001');
  const setHealthScore = useHealthStore((s) => s.setHealthScore);
  const setLoading = useHealthStore((s) => s.setLoading);

  const query = useQuery({
    queryKey: ['health-score', userId],
    queryFn: () => healthAPI.getScore(userId).then((r) => r.data),
    staleTime: 60_000,      // 1 minute before refetch
    refetchInterval: 300_000,   // background refresh every 5 min
    retry: 1,
    // On error (backend not running): keep showing cached/mock data
    placeholderData: MOCK_SCORE_RESPONSE,
  });

  // Sync server response into Zustand store
  useEffect(() => {
    const data = query.data ?? MOCK_SCORE_RESPONSE;
    setHealthScore(data.score, data.sub_scores);
    setLoading(query.isLoading);
  }, [query.data, query.isLoading]);

  return {
    score: query.data?.score ?? MOCK_SCORE_RESPONSE.score,
    subScores: query.data?.sub_scores ?? MOCK_SCORE_RESPONSE.sub_scores,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
