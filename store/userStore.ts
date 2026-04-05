/**
 * PART:   Zustand — User profile store
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  1 — Project Setup
 * TASK:   User profile: demographics, preferences, onboarding state
 * SCOPE:  IN: user data state + setters
 *         OUT: auth tokens (sessionStore), health data (healthStore)
 */

import { create } from 'zustand';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  heightCm: number;
  weightKg: number;
  timezone: string;
}

interface UserStore {
  // -- State --
  profile: UserProfile | null;
  isOnboarded: boolean;
  disciplineEnabled: boolean;

  // -- Setters --
  setProfile: (p: UserProfile) => void;
  setIsOnboarded: (v: boolean) => void;
  setDisciplineEnabled: (v: boolean) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  profile: null,
  isOnboarded: false,
  disciplineEnabled: false,

  setProfile: (p) => set({ profile: p }),
  setIsOnboarded: (v) => set({ isOnboarded: v }),
  setDisciplineEnabled: (v) => set({ disciplineEnabled: v }),
  clearUser: () => set({ profile: null, isOnboarded: false, disciplineEnabled: false }),
}));
