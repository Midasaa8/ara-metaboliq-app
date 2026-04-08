/**
 * PART:   useSleepData — React Query wrapper cho Sleep API
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  6 — Sleep Tracker
 * READS:  AGENTS.md §7, SONNET_PHASES.md §PHASE 6
 * TASK:   Fetch sleep data on mount, mock fallback khi server chưa có data,
 *         sync vào healthStore.setSleepData()
 * SCOPE:  IN: API call, mock fallback, Zustand sync
 *         OUT: HRV/ChronoOS computation (server-side, Phase 13 & 18)
 */

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { sleepAPI } from '@/services/api/sleepAPI';
import { useHealthStore } from '@/store/healthStore';
import type { SleepData } from '@/types/health';

// ── Mock fallback (IS_HACKATHON — server chưa có sleep endpoint) ──
export const MOCK_SLEEP_DATA: SleepData = {
  totalMin:   435,  // 7h 15m
  deepMin:     85,
  remMin:     105,
  awakeMin:    25,
  stages: [
    { stage: 'Light', durationMin: 45 },
    { stage: 'Deep',  durationMin: 55 },
    { stage: 'REM',   durationMin: 70 },
    { stage: 'Light', durationMin: 50 },
    { stage: 'Deep',  durationMin: 30 },
    { stage: 'REM',   durationMin: 35 },
    { stage: 'Light', durationMin: 80 },
    { stage: 'Awake', durationMin: 25 },
    { stage: 'Light', durationMin: 45 },
  ],
  hrv_sdnn:                 42,  // ms — tốt (> 40ms)
  predicted_tomorrow_score: 81,  // ChronoOS mock
  bio_age:                  27,  // Digital Twin mock
  sleep_score:              84,
  sleep_start_ts: Date.now() - 8 * 3600 * 1000,
  sleep_end_ts:   Date.now() - 30 * 60 * 1000,
};

export interface UseSleepDataReturn {
  data:      SleepData;
  isLoading: boolean;
  isError:   boolean;
  refetch:   () => void;
}

export function useSleepData(): UseSleepDataReturn {
  const setSleepData = useHealthStore((s) => s.setSleepData);

  const query = useQuery<SleepData>({
    queryKey:       ['sleep-last-night'],
    queryFn:        async () => {
      const res = await sleepAPI.getLastNight();
      return res.data;
    },
    staleTime:      5 * 60 * 1000,   // 5 phút — sleep data không thay đổi thường xuyên
    retry:          1,
    placeholderData: MOCK_SLEEP_DATA, // hiển thị mock khi server chưa xong
  });

  // Sync vào Zustand khi có data thật
  useEffect(() => {
    if (query.data && !query.isPlaceholderData) {
      setSleepData(query.data);
    }
  }, [query.data, query.isPlaceholderData]);

  return {
    data:      query.data ?? MOCK_SLEEP_DATA,
    isLoading: query.isLoading && !query.isPlaceholderData,
    isError:   query.isError,
    refetch:   query.refetch,
  };
}
