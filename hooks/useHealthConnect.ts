/**
 * PART:   useHealthConnect — React hook for Health Connect data
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  Phase 22s — Health Connect Integration
 * TASK:   Hook that initialises Health Connect on mount, auto-refreshes every
 *         15 minutes, exposes today's steps/HR/sleep + permission state.
 * SCOPE:  IN: read + expose data, handle init + refresh
 *         OUT: write-back, native permission dialog (call requestPermissions() manually)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  initHealthConnect,
  requestHealthPermissions,
  readTodayData,
  computeHRStats,
  type HealthConnectData,
} from '@/services/health/healthConnectService';

const REFRESH_MS = 15 * 60 * 1000; // 15 minutes

export interface UseHealthConnectResult {
  data: HealthConnectData | null;
  hrStats: { avg: number; min: number; max: number; resting: number };
  isAvailable: boolean;
  hasPermission: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  requestPermissions: () => Promise<boolean>;
}

export function useHealthConnect(): UseHealthConnectResult {
  const [data, setData] = useState<HealthConnectData | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await readTodayData();
      setData(result);
      setIsAvailable(result.available);
    } catch {
      // silent fail — keep last data
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestPermissions = useCallback(async () => {
    const granted = await requestHealthPermissions();
    setHasPermission(granted);
    if (granted) await refresh();
    return granted;
  }, [refresh]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    async function init() {
      setIsLoading(true);
      const available = await initHealthConnect();
      setIsAvailable(available);
      await refresh();
      // Auto-refresh every 15 min
      timer = setInterval(refresh, REFRESH_MS);
    }

    init();
    return () => clearInterval(timer);
  }, [refresh]);

  const hrStats = computeHRStats(data?.hrSamples ?? []);

  return { data, hrStats, isAvailable, hasPermission, isLoading, refresh, requestPermissions };
}
