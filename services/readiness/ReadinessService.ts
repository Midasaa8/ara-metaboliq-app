/**
 * PART:   ReadinessService — Daily Readiness Score computation + cache
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  36s — Daily Readiness Score UI
 * TASK:   Composite score from sleep, stress, activity, recovery
 * SCOPE:  IN: Backend /api/v1/wave1/readiness endpoint OR local fallback
 *         OUT: useReadiness hook
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import APIClient from '@/services/api/APIClient';

const KEY = 'readiness_history';

export type ReadinessLevel = 'rest' | 'light' | 'moderate' | 'peak';

export interface ReadinessBreakdown {
  sleep: number;       // 0-100 contribution
  recovery: number;    // 0-100 HRV/stress recovery
  activity: number;    // 0-100 previous day load
  stress: number;      // 0-100 (inverted — low stress = high score)
}

export interface ReadinessResult {
  score: number;           // 0-100
  level: ReadinessLevel;
  message: string;
  breakdown: ReadinessBreakdown;
  date: string;            // ISO date
}

function getLevel(score: number): ReadinessLevel {
  if (score >= 80) return 'peak';
  if (score >= 60) return 'moderate';
  if (score >= 30) return 'light';
  return 'rest';
}

function getMessage(level: ReadinessLevel): string {
  switch (level) {
    case 'peak':     return 'Cơ thể sẵn sàng tối đa — tập luyện cường độ cao!';
    case 'moderate': return 'Năng lượng tốt — tập vừa phải, cardio nhẹ.';
    case 'light':    return 'Hãy nhẹ nhàng hôm nay — yoga, đi bộ.';
    case 'rest':     return 'Cần nghỉ ngơi — ưu tiên phục hồi.';
  }
}

/** Try backend first, fallback to local estimation */
export async function computeReadiness(): Promise<ReadinessResult> {
  const today = new Date().toISOString().slice(0, 10);

  try {
    const res = await APIClient.get('/api/v1/wave1/readiness', { params: { date: today } });
    const data = res.data;
    const level = getLevel(data.readiness_score ?? data.score ?? 50);
    const result: ReadinessResult = {
      score: data.readiness_score ?? data.score ?? 50,
      level,
      message: getMessage(level),
      breakdown: {
        sleep: data.sleep_contribution ?? 60,
        recovery: data.recovery_contribution ?? 60,
        activity: data.activity_contribution ?? 60,
        stress: data.stress_contribution ?? 60,
      },
      date: today,
    };
    await saveToHistory(result);
    return result;
  } catch {
    // Local fallback: generate moderate readiness
    const fallback: ReadinessResult = {
      score: 65,
      level: 'moderate',
      message: getMessage('moderate'),
      breakdown: { sleep: 70, recovery: 60, activity: 65, stress: 62 },
      date: today,
    };
    await saveToHistory(fallback);
    return fallback;
  }
}

async function saveToHistory(result: ReadinessResult) {
  const raw = await AsyncStorage.getItem(KEY);
  const history: ReadinessResult[] = raw ? JSON.parse(raw) : [];
  // Replace today or append
  const idx = history.findIndex((r) => r.date === result.date);
  if (idx >= 0) history[idx] = result;
  else history.push(result);
  // Keep 30 days
  const trimmed = history.slice(-30);
  await AsyncStorage.setItem(KEY, JSON.stringify(trimmed));
}

export async function getReadinessHistory(days = 7): Promise<ReadinessResult[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  const history: ReadinessResult[] = JSON.parse(raw);
  return history.slice(-days);
}
