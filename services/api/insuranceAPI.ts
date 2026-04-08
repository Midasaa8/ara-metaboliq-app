/**
 * PART:   Insurance API service
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  9 — Insurance / HSA
 * READS:  AGENTS.md §7, constants/api.ts ENDPOINTS.insurance, ENDPOINTS.hsa
 * TASK:   HTTP wrappers cho /insurance/* và /hsa/* endpoints
 * SCOPE:  IN: API call only
 *         OUT: Premium formula (server), HSA calculation (server)
 */

import APIClient from '@/services/api/APIClient';
import { ENDPOINTS } from '@/constants/api';

export interface PremiumResponse {
  base_premium_vnd:    number;
  discount_pct:        number;  // 0.0 – 0.30
  final_premium_vnd:   number;
  health_score:        number;
  age_factor:          number;
  computed_at:         string;
}

export interface HSAProjectionResponse {
  monthly_save_vnd:    number;
  projected_1y_vnd:    number;
  projected_5y_vnd:    number;
  health_factor:       number;
}

export const insuranceAPI = {
  getPremium:   () => APIClient.get<PremiumResponse>(ENDPOINTS.insurance.premium),
  getDiscount:  () => APIClient.get<{ discount_pct: number }>(ENDPOINTS.insurance.discount),
  getHistory:   () => APIClient.get(ENDPOINTS.insurance.history),
  getSuggestions: () => APIClient.get(ENDPOINTS.insurance.suggestions),
  recalculate:  () => APIClient.post(ENDPOINTS.insurance.recalculate, {}),

  getHSAProjection: () => APIClient.get<HSAProjectionResponse>(ENDPOINTS.hsa.projection),
  getHSABalance:    () => APIClient.get(ENDPOINTS.hsa.balance),
  triggerHSASave:   () => APIClient.post(ENDPOINTS.hsa.trigger, {}),
};
