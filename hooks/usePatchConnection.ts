/**
 * PART:   usePatchConnection — abstracts Mock vs Real BLE hardware
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  3 — Home Dashboard
 * READS:  AGENTS.md §8 Hardware Stubs, services/hardware/MockHardware.ts
 * TASK:   Auto-connect on mount, subscribe to readings, sync to healthStore
 * SCOPE:  IN: hardware lifecycle, subscription, store sync
 *         OUT: real BLE (BLEService.ts Phase 11)
 *
 * Phase 11: swap MockHardwareService → BLEService here — screens stay unchanged.
 * HARDWARE STATUS: MOCK
 */

import { useEffect, useState } from 'react';
import { getHardwareService } from '@/services/hardware/MockHardware';
import { useHealthStore } from '@/store/healthStore';
import type { IPatchInfo, ISensorReading } from '@/types/hardware';

interface PatchConnectionState {
  isConnected: boolean;
  latestReading: ISensorReading | null;
  patchInfo: IPatchInfo | null;
}

export function usePatchConnection(): PatchConnectionState {
  const setLatestReading = useHealthStore((s) => s.setLatestReading);

  const [state, setState] = useState<PatchConnectionState>({
    isConnected: false,
    latestReading: null,
    patchInfo: null,
  });

  useEffect(() => {
    const hw = getHardwareService();
    let unsubscribe: (() => void) | null = null;

    async function init() {
      const ok = await hw.connect();
      if (!ok) return;

      const info = await hw.getPatchInfo();
      setState((prev) => ({ ...prev, isConnected: true, patchInfo: info }));

      unsubscribe = hw.subscribe((reading) => {
        // Keep raw reading in local state for components that need full struct
        setState((prev) => ({ ...prev, latestReading: reading }));
        // Also push into global Zustand store so any screen can read vitals
        setLatestReading(reading);
      });
    }

    init();

    return () => {
      unsubscribe?.();
      hw.disconnect();
    };
  }, []);

  return state;
}
