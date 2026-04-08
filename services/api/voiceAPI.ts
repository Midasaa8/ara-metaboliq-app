/**
 * PART:   Voice API service
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  4 — Voice AI Module
 * READS:  AGENTS.md §9, backend/routers/voice.py for exact schema
 * TASK:   Thin wrapper around POST /voice/analyze + GET /voice/history
 * SCOPE:  IN: HTTP calls, typed request/response
 *         OUT: recording lifecycle (useVoiceRecorder), state (healthStore)
 */

import APIClient from '@/services/api/APIClient';
import { ENDPOINTS } from '@/constants/api';

export interface VoiceSubScores {
  energy:            number; // 0–100
  stress:            number; // 0–100
  cardiac_recovery:  number; // 0–100
  respiratory:       number; // 0–100
}

export interface VoiceAnalyzeResponse {
  recovery_readiness_score: number;        // 0–100 composite
  sub_scores:               VoiceSubScores;
  condition_risks:          Record<string, number>; // 9 MARVEL condition probabilities 0–1
  overall_neurological:     number;        // 0–1
  overall_respiratory:      number;        // 0–1
  overall_voice_disorder:   number;        // 0–1
  snr_db:                   number;
  flags:                    string[];      // e.g. ['low_snr', 'high_stress']
  inference_ms:             number;
  model_version:            string;
  comparison:               Record<string, unknown> | null;
}

export interface VoiceHistoryResponse {
  trend_7d:         Record<string, unknown>;
  trend_30d:        Record<string, unknown>;
  trend_90d:        Record<string, unknown>;
  recent_analyses:  Record<string, unknown>[];
}

export const voiceAPI = {
  /**
   * Upload base64-encoded PCM (16kHz, 16-bit signed LE, mono) for MARVEL inference.
   */
  analyze: (
    audioBase64: string,
    sampleRate: number,
    durationMs: number,
    userId?: string,
  ) =>
    APIClient.post<VoiceAnalyzeResponse>(ENDPOINTS.voice.analyze, {
      audio:       audioBase64,
      sample_rate: sampleRate,
      duration_ms: durationMs,
      user_id:     userId ?? null,
    }),

  /**
   * Retrieve historical trend data for a given user.
   */
  getHistory: (userId: string) =>
    APIClient.get<VoiceHistoryResponse>(`${ENDPOINTS.voice.history}/${userId}`),
};
