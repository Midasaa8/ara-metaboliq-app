/**
 * PART:   useSleepScore — compute sleep score from session data
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  26s — Sleep Service
 * TASK:   Apply Phase 22 Opus sleep_score algorithm client-side for instant display
 *         (mirrors backend services/sleep_score.py — same formula, no server round-trip)
 * SCOPE:  IN: SleepSession + consistency data
 *         OUT: server sync (for Health Score composite — Phase 32s backend update)
 */

import { useMemo } from 'react';
import type { SleepSession, SleepConsistency } from '@/services/sleep/SleepService';

export interface SleepScoreBreakdown {
  total: number;         // 0-100
  tier: string;
  duration: number;      // 0-100 sub-score
  deep_pct: number;
  rem_pct: number;
  consistency: number;
  efficiency: number;
  insights: string[];
}

// ── Mirrored from backend/services/sleep_score.py (Phase 22 Opus) ──
function scoreDuration(mins: number): number {
  if (mins >= 420 && mins <= 540) return 100;
  if (mins >= 360) return 70 + ((mins - 360) / 60) * 30;
  if (mins >= 300) return 40 + ((mins - 300) / 60) * 30;
  return Math.max(0, mins * 40 / 300);
}

function scoreDeepPct(deep: number, total: number): number {
  const pct = total > 0 ? (deep / total) * 100 : 0;
  if (pct >= 20) return 100;
  if (pct >= 13) return 60 + ((pct - 13) / 7) * 40;
  return Math.max(0, pct * 60 / 13);
}

function scoreRemPct(rem: number, total: number): number {
  const pct = total > 0 ? (rem / total) * 100 : 0;
  if (pct >= 20 && pct <= 30) return 100;
  if (pct >= 15) return 70 + ((pct - 15) / 5) * 30;
  return Math.max(0, pct * 70 / 15);
}

function scoreConsistency(stdMin: number): number {
  if (stdMin <= 15) return 100;
  if (stdMin <= 30) return 80 - ((stdMin - 15) / 15) * 20;
  if (stdMin <= 60) return 60 - ((stdMin - 30) / 30) * 20;
  return Math.max(0, 40 - (stdMin - 60));
}

function scoreEfficiency(total: number, inBed: number): number {
  if (inBed <= 0) return 0;
  const eff = total / inBed;
  if (eff >= 0.9) return 100;
  if (eff >= 0.8) return 70 + (eff - 0.8) * 300;
  return Math.max(0, eff * 700 / 0.8 - 600);
}

function buildInsights(s: SleepSession, score: SleepScoreBreakdown): string[] {
  const ins: string[] = [];
  if (s.deep_minutes / (s.total_minutes || 1) < 0.15)
    ins.push('Deep sleep thấp — thử ngủ sớm hơn 30 phút');
  if (s.total_minutes < 360)
    ins.push('Bạn ngủ dưới 6 tiếng — cơ thể cần thêm thời gian hồi phục');
  if (score.consistency < 60)
    ins.push('Giờ ngủ chưa nhất quán — cố gắng ngủ/dậy cùng giờ mỗi ngày');
  if (score.efficiency < 70)
    ins.push('Hiệu suất ngủ thấp — hạn chế thời gian nằm trên giường khi không ngủ');
  if (ins.length === 0) ins.push('Giấc ngủ của bạn nhìn chung ổn — duy trì thói quen hiện tại!');
  return ins.slice(0, 3);
}

function tierFromScore(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 40) return 'Poor';
  return 'Restless';
}

export function useSleepScore(
  session: SleepSession | null,
  consistency: SleepConsistency,
): SleepScoreBreakdown | null {
  return useMemo(() => {
    if (!session) return null;

    const inBed = session.total_minutes + session.awake_minutes;
    const dur   = scoreDuration(session.total_minutes);
    const deep  = scoreDeepPct(session.deep_minutes, session.total_minutes);
    const rem   = scoreRemPct(session.rem_minutes, session.total_minutes);
    const cons  = scoreConsistency(consistency.std_minutes);
    const eff   = scoreEfficiency(session.total_minutes, inBed);

    const total = Math.round(dur * 0.30 + deep * 0.20 + rem * 0.15 + cons * 0.20 + eff * 0.15);

    const result: SleepScoreBreakdown = {
      total, tier: tierFromScore(total),
      duration: Math.round(dur), deep_pct: Math.round(deep),
      rem_pct: Math.round(rem), consistency: Math.round(cons),
      efficiency: Math.round(eff), insights: [],
    };
    result.insights = buildInsights(session, result);
    return result;
  }, [session, consistency]);
}
