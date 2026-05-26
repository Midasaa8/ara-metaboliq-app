/**
 * PART:   usePremium — subscription status + feature gate checks
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  34s — Premium / Monetization
 * TASK:   Expose isPremium, trialDaysLeft, canAccess(feature), startTrial, activate
 * SCOPE:  IN: PremiumService
 *         OUT: UpgradeGate, TrialBanner, all feature-gated components
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getPremiumState, startTrial, activatePremium, restorePurchases, hasAccess,
  type PremiumState, type SubscriptionStatus,
} from '@/services/monetization/PremiumService';

export interface UsePremiumResult {
  status: SubscriptionStatus;
  isPremium: boolean;
  trialDaysLeft: number | null;
  isLoading: boolean;
  startFreeTrial: () => Promise<void>;
  activate: () => Promise<void>;
  restore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function usePremium(): UsePremiumResult {
  const [state, setState] = useState<PremiumState>({
    status: 'free', trialStartDate: null, trialEndDate: null, subscriptionDate: null, expiresDate: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const s = await getPremiumState();
    setState(s);
    setIsLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const trialDaysLeft = state.trialEndDate
    ? Math.max(0, Math.ceil((new Date(state.trialEndDate).getTime() - Date.now()) / 86400_000))
    : null;

  return {
    status: state.status,
    isPremium: hasAccess(state.status),
    trialDaysLeft,
    isLoading,
    startFreeTrial: useCallback(async () => { const s = await startTrial(); setState(s); }, []),
    activate: useCallback(async () => { const s = await activatePremium(); setState(s); }, []),
    restore: useCallback(async () => { const s = await restorePurchases(); setState(s); }, []),
    refresh,
  };
}
