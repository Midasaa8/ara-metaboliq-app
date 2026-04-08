/**
 * PART:   NutritionScanner — camera capture + Z-score anomaly display
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  7 — Nutrition Scanner
 * READS:  AGENTS.md §7, SONNET_PHASES.md §PHASE 7, Tong_Hop_Thuat_Toan doc #20
 * TASK:   captureReceipt() mock, Z-score badge helper, useScanNutrition hook
 * SCOPE:  IN: image capture (mock), base64 compress, API call, Z-score display
 *         OUT: GPT-4o prompt engineering (server), real camera (Phase 11+expo-camera)
 *
 * Z-score formula (doc #20):
 *   zᵢ = (xᵢ - μ_market) / σ_market
 *   Server tính và trả về z_score per item
 *   Sonnet chỉ HIỂN THỊ badge dựa trên ngưỡng
 *
 * HARDWARE STATUS: MOCK — expo-camera thật ở Phase 11
 */

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { scanNutrition } from '@/services/api/nutritionAPI';
import type { NutritionScanResult, NutritionItem } from '@/types/nutrition';

// ── Mock data cho IS_HACKATHON=true ──
const IS_HACKATHON = true;

const MOCK_SCAN_RESULT: NutritionScanResult = {
  items: [
    {
      name: 'Phở bò tái',
      calories: 450, protein_g: 28, carb_g: 58, fat_g: 10,
      price_vnd: 65_000, price_per_100kcal: 14_444,
      z_score: 0.3, // hợp lý
    },
    {
      name: 'Nước ép cam',
      calories: 110, protein_g: 2, carb_g: 26, fat_g: 0,
      price_vnd: 35_000, price_per_100kcal: 31_818,
      z_score: 1.7, // cảnh báo — hơi đắt
    },
    {
      name: 'Chả giò (4 cái)',
      calories: 320, protein_g: 12, carb_g: 30, fat_g: 18,
      price_vnd: 45_000, price_per_100kcal: 14_062,
      z_score: 2.4, // bất thường — hàm lượng fat cao
    },
  ],
  total_calories: 880,
  total_protein_g: 42,
  total_carb_g: 114,
  total_fat_g: 28,
  total_cost_vnd: 145_000,
  market_avg_cost_vnd: 110_000,
  scan_ts: Date.now(),
};

// ── Z-score anomaly badge ──
// zᵢ = (xᵢ - μ_market) / σ_market (server trả về)
// Thresholds:
//   z > 2.0  → Bất thường (ngưỡng 2σ, ~2.3% outlier)
//   z > 1.5  → Cảnh báo (ngưỡng 1.5σ, ~6.7% outlier)
//   else     → Hợp lý
export interface AnomalyBadge {
  label: string;
  level: 'danger' | 'warning' | 'ok';
  emoji: string;
}

export function getAnomalyBadge(z: number): AnomalyBadge {
  if (z > 2.0) return { label: 'Bất thường', level: 'danger',  emoji: '🔴' };
  if (z > 1.5) return { label: 'Cảnh báo',  level: 'warning', emoji: '🟡' };
  return             { label: 'Hợp lý',     level: 'ok',      emoji: '✅' };
}

// ── Scan state ──
export type ScanState = 'IDLE' | 'CAPTURING' | 'UPLOADING' | 'RESULT' | 'ERROR';

export interface UseScanNutritionReturn {
  state: ScanState;
  result: NutritionScanResult | null;
  errorMsg: string;
  scan: () => Promise<void>;
  reset: () => void;
}

/**
 * useScanNutrition — hook điều phối scan flow
 * IDLE → CAPTURING (mock 500ms) → UPLOADING (API call) → RESULT | ERROR
 */
export function useScanNutrition(): UseScanNutritionReturn {
  const [state,     setState]    = useState<ScanState>('IDLE');
  const [result,    setResult]   = useState<NutritionScanResult | null>(null);
  const [errorMsg,  setErrorMsg] = useState('');
  const queryClient = useQueryClient();

  const scan = useCallback(async () => {
    try {
      setState('CAPTURING');

      // TODO Phase 11: thay bằng expo-camera capture + compress JPEG 85%
      // const photo = await cameraRef.current?.takePictureAsync({ quality: 0.85, base64: true });
      // const imageBase64 = photo.base64!;

      // Simulate capture delay (mock)
      await new Promise<void>((r) => setTimeout(r, 600));

      setState('UPLOADING');

      let scanResult: NutritionScanResult;
      if (IS_HACKATHON) {
        // Mock: simulate network delay giống thật
        await new Promise<void>((r) => setTimeout(r, 1200));
        scanResult = { ...MOCK_SCAN_RESULT, scan_ts: Date.now() };
      } else {
        // Production: gửi base64 lên server → GPT-4o analyze
        scanResult = await scanNutrition('MOCK_BASE64_PLACEHOLDER');
      }

      // Invalidate nutrition history query khi có kết quả mới
      queryClient.invalidateQueries({ queryKey: ['nutrition-history'] });

      setResult(scanResult);
      setState('RESULT');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể quét hoá đơn';
      setErrorMsg(msg);
      setState('ERROR');
    }
  }, [queryClient]);

  const reset = useCallback(() => {
    setState('IDLE');
    setResult(null);
    setErrorMsg('');
  }, []);

  return { state, result, errorMsg, scan, reset };
}
