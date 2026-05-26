/**
 * PART:   PremiumService — subscription state + feature gating logic
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  34s — Premium / Monetization
 * TASK:   Check subscription status, trial state, feature access
 *         Note: expo-in-app-purchases integration is a stub for now (no Play/App Store in dev)
 * SCOPE:  IN: AsyncStorage (local sub state)
 *         OUT: usePremium hook, UpgradeGate component
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type SubscriptionStatus = 'free' | 'trial' | 'premium' | 'expired';

export interface PremiumState {
  status: SubscriptionStatus;
  trialStartDate: string | null;    // ISO
  trialEndDate: string | null;      // ISO (7 days after start)
  subscriptionDate: string | null;  // ISO
  expiresDate: string | null;       // ISO
}

export type PremiumFeature =
  | 'voice_unlimited'
  | 'ocr_unlimited'
  | 'sleep_score_detail'
  | 'stress_breathing'
  | 'anomaly_alerts'
  | 'daily_readiness'
  | 'challenges_social'
  | 'bento_custom'
  | 'female_health';

const KEY = 'premium_state';
const TRIAL_DAYS = 7;

export async function getPremiumState(): Promise<PremiumState> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return { status: 'free', trialStartDate: null, trialEndDate: null, subscriptionDate: null, expiresDate: null };
  const state: PremiumState = JSON.parse(raw);
  // Auto-expire trial
  if (state.status === 'trial' && state.trialEndDate) {
    if (new Date(state.trialEndDate) < new Date()) {
      state.status = 'free';
      await AsyncStorage.setItem(KEY, JSON.stringify(state));
    }
  }
  return state;
}

export async function startTrial(): Promise<PremiumState> {
  const now = new Date();
  const end = new Date(now.getTime() + TRIAL_DAYS * 86400_000);
  const state: PremiumState = {
    status: 'trial',
    trialStartDate: now.toISOString(),
    trialEndDate: end.toISOString(),
    subscriptionDate: null,
    expiresDate: null,
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
  return state;
}

/** Stub: In production, this would verify with App Store / Google Play */
export async function activatePremium(): Promise<PremiumState> {
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 86400_000); // 30 days
  const state: PremiumState = {
    status: 'premium',
    trialStartDate: null,
    trialEndDate: null,
    subscriptionDate: now.toISOString(),
    expiresDate: expires.toISOString(),
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
  return state;
}

export async function restorePurchases(): Promise<PremiumState> {
  // Stub: In production, query IAP receipts
  return getPremiumState();
}

export function hasAccess(status: SubscriptionStatus): boolean {
  return status === 'premium' || status === 'trial';
}

/** Free tier limits */
export const FREE_LIMITS = {
  voiceCheckInsPerMonth: 1,
  ocrScansPerMonth: 2,
};
