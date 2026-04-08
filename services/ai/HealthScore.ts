/**
 * PART:   HealthScore — client-side display helper (score computed server-side)
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  8 — Health Score Engine
 * READS:  AGENTS.md §7, SONNET_PHASES.md §PHASE 8, PLAN_B §3 Health Score Dashboard
 * TASK:   Score tier mapping, sub-score labels, weakest-area detection
 * SCOPE:  IN: display helpers, color tiers, label formatting
 *         OUT: H_score formula (SERVER-ONLY — Phase 19 FastAPI)
 *
 * SECURITY: H_score = 0.25E + 0.20S + 0.25V + 0.15N + 0.15D
 *   - Formula lives ONLY on server — client NEVER recomputes
 *   - Client calls POST /health/score → receives pre-computed result
 *   - No sub-score arithmetic on client (prevents tampered data bypass)
 */

import { colors } from '@/constants/theme';

// ── Sub-score keys ──
export type SubScoreKey = 'exercise' | 'sleep' | 'voice' | 'nutrition' | 'discipline';

export interface SubScores {
  exercise:   number;  // 0-100 · Weight: 0.25 (server)
  sleep:      number;  // 0-100 · Weight: 0.20 (server)
  voice:      number;  // 0-100 · Weight: 0.25 (server)
  nutrition:  number;  // 0-100 · Weight: 0.15 (server)
  discipline: number;  // 0-100 · Weight: 0.15 (server)
}

// ── Score tier ──
export interface ScoreTier {
  color:   string;
  bgColor: string;  // color + opacity for backgrounds
  label:   string;
  emoji:   string;
}

/**
 * getScoreTier — map điểm → màu + nhãn hiển thị
 * Thresholds (GEMINI Phase 8 spec):
 *   90-100 → good (xanh lá đậm)
 *   75-89  → good + 60% opacity (xanh lá nhạt)
 *   60-74  → warning (vàng)
 *   0-59   → danger (đỏ)
 */
export function getScoreTier(score: number): ScoreTier {
  if (score >= 90) return {
    color:   colors.health.good,
    bgColor: colors.health.good + '20',
    label:   'Xuất sắc',
    emoji:   '🏆',
  };
  if (score >= 75) return {
    color:   colors.health.good + 'CC', // 80% opacity
    bgColor: colors.health.good + '15',
    label:   'Tốt',
    emoji:   '✅',
  };
  if (score >= 60) return {
    color:   colors.health.warning,
    bgColor: colors.health.warning + '20',
    label:   'Trung bình',
    emoji:   '⚠️',
  };
  return {
    color:   colors.health.danger,
    bgColor: colors.health.danger + '20',
    label:   'Cần cải thiện',
    emoji:   '🔴',
  };
}

// ── Sub-score metadata ──
export const SUB_SCORE_META: Record<SubScoreKey, { label: string; icon: string; unit: string }> = {
  exercise:   { label: 'Vận động',   icon: 'fitness-outline',          unit: 'E' },
  sleep:      { label: 'Giấc ngủ',   icon: 'moon-outline',             unit: 'S' },
  voice:      { label: 'Giọng nói',  icon: 'mic-outline',              unit: 'V' },
  nutrition:  { label: 'Dinh dưỡng', icon: 'nutrition-outline',        unit: 'N' },
  discipline: { label: 'Kỷ luật',    icon: 'shield-checkmark-outline', unit: 'D' },
};

/**
 * getWeakestArea — tìm sub-score thấp nhất → gợi ý cải thiện
 * Returns top 2 areas cần cải thiện nhất
 */
export function getWeakestAreas(subScores: SubScores): SubScoreKey[] {
  return (Object.keys(subScores) as SubScoreKey[])
    .sort((a, b) => subScores[a] - subScores[b])
    .slice(0, 2);
}

/**
 * getScoreImprovement — dự báo điểm nếu cải thiện vùng yếu nhất
 * NOTE: Chỉ ước tính UI — không thay thế server computation
 */
export function getScoreImprovement(
  currentScore: number,
  subScores: SubScores,
  targetSubScore: SubScoreKey,
  targetValue: number,
): number {
  // Weights (display only — server recalculates)
  const WEIGHTS: Record<SubScoreKey, number> = {
    exercise: 0.25, sleep: 0.20, voice: 0.25, nutrition: 0.15, discipline: 0.15,
  };
  const delta = (targetValue - subScores[targetSubScore]) * WEIGHTS[targetSubScore];
  return Math.min(100, Math.round(currentScore + delta));
}
