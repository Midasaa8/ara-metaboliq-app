/**
 * PART:   useActivity — Activity metrics hook
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  Phase 23s — Activity Service
 * TASK:   Combines Health Connect data + activityService algorithms into a
 *         single hook exposing steps, AZM, distance, calories, zone minutes.
 */

import { useMemo } from 'react';
import { useHealthConnect } from '@/hooks/useHealthConnect';
import { useUserStore } from '@/store/userStore';
import {
  computeActivityMetrics,
  computeAZM,
  type ActivityMetrics,
  type HRZoneMinutes,
} from '@/services/health/activityService';

export interface UseActivityResult {
  metrics: ActivityMetrics;
  zones: HRZoneMinutes;
  isLoading: boolean;
  isHealthConnectAvailable: boolean;
  refresh: () => Promise<void>;
}

export function useActivity(): UseActivityResult {
  const { data, hrStats, isAvailable, isLoading, refresh } = useHealthConnect();
  const profile = useUserStore((s) => s.profile);

  const { metrics, zones } = useMemo(() => {
    const steps     = data?.steps.count ?? 0;
    const hrSamples = data?.hrSamples ?? [];
    const p = profile ?? { age: 25, heightCm: 165, weightKg: 60 };
    // Rough BMR (Mifflin-St Jeor, default male)
    const bmr = Math.round(10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + 5);

    const m = computeActivityMetrics(steps, hrSamples, p, bmr);

    // Recompute zones for display
    const { zones: z } = computeAZM(hrSamples, p.age);

    return { metrics: m, zones: z };
  }, [data, profile]);

  return {
    metrics,
    zones,
    isLoading,
    isHealthConnectAvailable: isAvailable,
    refresh,
  };
}
