/**
 * PART:   ChallengeService — weekly step challenges with friends
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  31s — Challenges & Social
 * TASK:   CRUD challenges, join/leave, track progress (local + API stub)
 * SCOPE:  IN: AsyncStorage for local; APIClient stub for remote
 *         OUT: useChallenges hook
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type ChallengeType = 'steps' | 'azm' | 'sleep' | 'streak';
export type ChallengeStatus = 'active' | 'completed' | 'pending' | 'expired';

export interface Participant {
  userId: string;
  displayName: string;
  avatarEmoji: string;
  progress: number;
}

export interface Challenge {
  id: string;
  type: ChallengeType;
  title: string;
  description: string;
  target: number;
  unit: string;
  startDate: string;   // ISO
  endDate: string;     // ISO
  status: ChallengeStatus;
  participants: Participant[];
  myProgress: number;
  createdBy: string;
}

const KEY = 'challenges_local';

const DEMO_CHALLENGES: Challenge[] = [
  {
    id: 'c1',
    type: 'steps',
    title: 'Thách thức bước chân tuần này',
    description: 'Ai đi được nhiều bước nhất trong 7 ngày?',
    target: 70000,
    unit: 'bước',
    startDate: new Date(Date.now() - 2 * 86400_000).toISOString(),
    endDate: new Date(Date.now() + 5 * 86400_000).toISOString(),
    status: 'active',
    participants: [
      { userId: 'me', displayName: 'Bạn', avatarEmoji: '🧑', progress: 32450 },
      { userId: 'u2', displayName: 'Minh', avatarEmoji: '🏃', progress: 41200 },
      { userId: 'u3', displayName: 'Lan', avatarEmoji: '🌸', progress: 28900 },
    ],
    myProgress: 32450,
    createdBy: 'u2',
  },
  {
    id: 'c2',
    type: 'azm',
    title: 'AZM Marathon tháng 5',
    description: 'Đạt 150 phút vùng hoạt động mỗi tuần',
    target: 600,
    unit: 'phút AZM',
    startDate: new Date(Date.now() - 10 * 86400_000).toISOString(),
    endDate: new Date(Date.now() + 20 * 86400_000).toISOString(),
    status: 'active',
    participants: [
      { userId: 'me', displayName: 'Bạn', avatarEmoji: '🧑', progress: 210 },
      { userId: 'u4', displayName: 'Tuấn', avatarEmoji: '💪', progress: 285 },
    ],
    myProgress: 210,
    createdBy: 'me',
  },
];

export async function getChallenges(): Promise<Challenge[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) {
    await AsyncStorage.setItem(KEY, JSON.stringify(DEMO_CHALLENGES));
    return DEMO_CHALLENGES;
  }
  return JSON.parse(raw);
}

export async function updateMyProgress(challengeId: string, progress: number): Promise<void> {
  const challenges = await getChallenges();
  const idx = challenges.findIndex((c) => c.id === challengeId);
  if (idx < 0) return;
  challenges[idx].myProgress = progress;
  challenges[idx].participants = challenges[idx].participants.map((p) =>
    p.userId === 'me' ? { ...p, progress } : p
  );
  await AsyncStorage.setItem(KEY, JSON.stringify(challenges));
}

export async function leaveChallenge(challengeId: string): Promise<void> {
  const challenges = await getChallenges();
  await AsyncStorage.setItem(KEY, JSON.stringify(challenges.filter((c) => c.id !== challengeId)));
}
