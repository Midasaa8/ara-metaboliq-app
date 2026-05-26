/**
 * PART:   StressService — persist stress sessions, compute stress score
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  29s — Stress Management
 * TASK:   Map voice sub_scores.stress → StressLevel, persist breathing/mindfulness sessions
 * SCOPE:  IN: Voice AI sub_scores.stress (0-100)
 *         OUT: breathing sessions, mindfulness sessions, stress history
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type StressLevel = 'low' | 'moderate' | 'elevated' | 'high';

export interface StressSnapshot {
  id: string;
  timestamp: string;    // ISO
  score: number;        // 0-100 (from voice)
  level: StressLevel;
  source: 'voice';
}

export interface BreathingSession {
  id: string;
  timestamp: string;
  technique: 'box' | '4-7-8';
  durationMs: number;
  completed: boolean;
}

export interface MindfulnessSession {
  id: string;
  timestamp: string;
  durationMin: number;   // preset: 2|5|10|15|20
  completed: boolean;
}

const KEYS = {
  stress:       'stress_history',
  breathing:    'breathing_sessions',
  mindfulness:  'mindfulness_sessions',
};

export function computeStressLevel(score: number): StressLevel {
  if (score < 30) return 'low';
  if (score < 60) return 'moderate';
  if (score < 75) return 'elevated';
  return 'high';
}

async function load<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

async function save<T extends { timestamp: string }>(key: string, item: T): Promise<void> {
  const list = await load<T>(key);
  list.unshift(item);
  await AsyncStorage.setItem(key, JSON.stringify(list.slice(0, 90)));
}

export async function recordStressSnapshot(score: number): Promise<StressSnapshot> {
  const snap: StressSnapshot = {
    id: `${Date.now()}`,
    timestamp: new Date().toISOString(),
    score,
    level: computeStressLevel(score),
    source: 'voice',
  };
  await save(KEYS.stress, snap);
  return snap;
}

export async function getStressHistory(): Promise<StressSnapshot[]> {
  return load<StressSnapshot>(KEYS.stress);
}

export async function recordBreathingSession(session: Omit<BreathingSession, 'id' | 'timestamp'>): Promise<void> {
  await save(KEYS.breathing, { id: `${Date.now()}`, timestamp: new Date().toISOString(), ...session });
}

export async function getBreathingSessions(): Promise<BreathingSession[]> {
  return load<BreathingSession>(KEYS.breathing);
}

export async function recordMindfulnessSession(session: Omit<MindfulnessSession, 'id' | 'timestamp'>): Promise<void> {
  await save(KEYS.mindfulness, { id: `${Date.now()}`, timestamp: new Date().toISOString(), ...session });
}

export async function getMindfulnessSessions(): Promise<MindfulnessSession[]> {
  return load<MindfulnessSession>(KEYS.mindfulness);
}
