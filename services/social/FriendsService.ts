/**
 * PART:   FriendsService — friends list + invite (local stub)
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  31s — Challenges & Social
 * TASK:   Friends list, search by email, friend activity feed (local mock)
 * SCOPE:  IN: AsyncStorage (local); backend /api/v1/social stub (future)
 *         OUT: useChallenges hook, FriendsFeed component
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Friend {
  id: string;
  displayName: string;
  email: string;
  avatarEmoji: string;
  lastActive: string;    // ISO
}

export interface FriendActivity {
  id: string;
  friendId: string;
  friendName: string;
  avatarEmoji: string;
  message: string;
  timestamp: string;    // ISO
  type: 'steps' | 'run' | 'sleep' | 'challenge' | 'badge';
}

const KEYS = { friends: 'friends_list', feed: 'friends_feed' };

const DEMO_FRIENDS: Friend[] = [
  { id: 'u2', displayName: 'Minh Nguyễn', email: 'minh@example.com', avatarEmoji: '🏃', lastActive: new Date(Date.now() - 3600_000).toISOString() },
  { id: 'u3', displayName: 'Lan Trần', email: 'lan@example.com', avatarEmoji: '🌸', lastActive: new Date(Date.now() - 7200_000).toISOString() },
  { id: 'u4', displayName: 'Tuấn Phạm', email: 'tuan@example.com', avatarEmoji: '💪', lastActive: new Date(Date.now() - 86400_000).toISOString() },
];

const DEMO_FEED: FriendActivity[] = [
  { id: 'f1', friendId: 'u2', friendName: 'Minh', avatarEmoji: '🏃', message: 'vừa hoàn thành chạy bộ 5km! 🎉', timestamp: new Date(Date.now() - 1800_000).toISOString(), type: 'run' },
  { id: 'f2', friendId: 'u3', friendName: 'Lan', avatarEmoji: '🌸', message: 'đạt 8.500 bước hôm nay', timestamp: new Date(Date.now() - 4200_000).toISOString(), type: 'steps' },
  { id: 'f3', friendId: 'u4', friendName: 'Tuấn', avatarEmoji: '💪', message: 'mở khóa huy hiệu "10.000 Steps Club"! 🏆', timestamp: new Date(Date.now() - 7200_000).toISOString(), type: 'badge' },
  { id: 'f4', friendId: 'u2', friendName: 'Minh', avatarEmoji: '🏃', message: 'ngủ 8 tiếng — Sleep Score 88 🌙', timestamp: new Date(Date.now() - 18000_000).toISOString(), type: 'sleep' },
];

export async function getFriends(): Promise<Friend[]> {
  const raw = await AsyncStorage.getItem(KEYS.friends);
  return raw ? JSON.parse(raw) : DEMO_FRIENDS;
}

export async function getFriendFeed(): Promise<FriendActivity[]> {
  const raw = await AsyncStorage.getItem(KEYS.feed);
  return raw ? JSON.parse(raw) : DEMO_FEED;
}

export async function removeFriend(friendId: string): Promise<void> {
  const list = await getFriends();
  await AsyncStorage.setItem(KEYS.friends, JSON.stringify(list.filter((f) => f.id !== friendId)));
}

/** Stub — actual invite would POST to /api/v1/social/invite */
export async function sendInvite(email: string): Promise<void> {
  // TODO: APIClient.post('/api/v1/social/invite', { email })
  await new Promise((r) => setTimeout(r, 500));  // mock network
}
