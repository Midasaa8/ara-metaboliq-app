/**
 * PART:   Health API service
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  3 — Home Dashboard
 * READS:  AGENTS.md §9 API Endpoints, constants/api.ts
 * TASK:   getScore(), getLatestReading(), getHistory(days)
 * SCOPE:  IN: HTTP calls for health endpoints
 *         OUT: score computation (server-side only — Phase 19)
 *
 * SECURITY: Health Score NEVER computed on client — POST to server returns result.
 */

import APIClient from '@/services/api/APIClient';
import { ENDPOINTS } from '@/constants/api';
import type { HealthScoreResponse } from '@/types/api';

export const healthAPI = {
  /** POST /health/score — server computes H_score from stored sub-scores */
  getScore: (userId: string) =>
    APIClient.post<HealthScoreResponse>(ENDPOINTS.health.score, { user_id: userId }),

  /** GET /health/readings — latest raw sensor snapshot */
  getLatestReading: () =>
    APIClient.get(ENDPOINTS.health.readings),

  /** GET /health/history?days=N — daily score history */
  getHistory: (days: number) =>
    APIClient.get(ENDPOINTS.health.history, { params: { days } }),

  /** POST /health/reading — ingest a sensor batch (Phase 11+) */
  ingestReading: (payload: Record<string, unknown>) =>
    APIClient.post(ENDPOINTS.health.reading, payload),
};
