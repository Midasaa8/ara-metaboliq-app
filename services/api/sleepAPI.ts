/**
 * PART:   Sleep API service
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  6 — Sleep Tracker
 * READS:  AGENTS.md §9, constants/api.ts cho endpoint paths
 * TASK:   Gọi GET /sleep/last-night + GET /sleep/history
 * SCOPE:  IN: HTTP call, typed request/response
 *         OUT: HRV computation (server, Phase 13), ChronoOS LSTM (Opus Phase 18)
 */

import APIClient from '@/services/api/APIClient';
import { ENDPOINTS } from '@/constants/api';
import type { SleepData } from '@/types/health';

export const sleepAPI = {
  /**
   * Lấy dữ liệu giấc ngủ đêm hôm trước.
   * Trả về stages, HRV SDNN, sleep score, ChronoOS prediction, bio age.
   */
  getLastNight: () =>
    APIClient.get<SleepData>(ENDPOINTS.sleep.last),

  /**
   * Lấy lịch sử ngủ n ngày gần nhất.
   */
  getHistory: (days = 7) =>
    APIClient.get<SleepData[]>(ENDPOINTS.sleep.history, { params: { days } }),
};
