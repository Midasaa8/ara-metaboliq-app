/**
 * PART:   Exercise API service
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  5 — Exercise Tracker
 * READS:  AGENTS.md §9, constants/api.ts cho endpoint paths
 * TASK:   Gọi POST /exercise/session để lưu kết quả buổi tập
 * SCOPE:  IN: HTTP call, typed request/response
 *         OUT: logic đếm rep (useRepCounter), state (healthStore)
 */

import APIClient from '@/services/api/APIClient';
import { ENDPOINTS } from '@/constants/api';
import type { ExerciseType } from '@/types/pose';

export interface ExerciseSessionRequest {
  user_id:       string | null;
  exercise_type: ExerciseType;
  reps_completed: number;
  target_reps:   number;
  duration_s:    number;     // giây
  passed:        boolean;    // true nếu đạt target_reps
}

export interface ExerciseSessionResponse {
  session_id:    string;
  score:         number;     // 0–100, server tính dựa trên reps/target
  reps_completed: number;
  passed:        boolean;
  calories_est:  number;     // kcal ước tính (server-side)
  message:       string;     // "Xuất sắc! +15 HSA points"
}

export const exerciseAPI = {
  /**
   * Lưu kết quả 1 buổi tập.
   * Server trả về score + calories + thông báo HSA reward.
   */
  saveSession: (req: ExerciseSessionRequest) =>
    APIClient.post<ExerciseSessionResponse>(ENDPOINTS.exercise.session, req),

  /**
   * Lấy lịch sử các buổi tập gần đây.
   */
  getHistory: (userId: string, days = 7) =>
    APIClient.get<ExerciseSessionResponse[]>(ENDPOINTS.exercise.history, {
      params: { user_id: userId, days },
    }),
};
