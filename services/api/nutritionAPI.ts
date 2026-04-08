/**
 * PART:   Nutrition API service
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  7 — Nutrition Scanner
 * READS:  AGENTS.md §7, constants/api.ts ENDPOINTS.nutrition
 * TASK:   HTTP wrapper cho /nutrition/scan và /nutrition/history
 * SCOPE:  IN: API call, FormData upload
 *         OUT: image capture/compress (NutritionScanner.ts), Z-score formula (server)
 */

import APIClient from '@/services/api/APIClient';
import { ENDPOINTS } from '@/constants/api';
import type { NutritionScanResult } from '@/types/nutrition';

/**
 * Gửi ảnh lên server → server dùng GPT-4o phân tích hoá đơn / bữa ăn
 * @param imageBase64 JPEG base64 (đã nén 85%, không có prefix data: URI)
 */
export async function scanNutrition(imageBase64: string): Promise<NutritionScanResult> {
  const res = await APIClient.post<NutritionScanResult>(ENDPOINTS.nutrition.scan, {
    image_b64: imageBase64,
    format: 'jpeg',
  });
  return res.data;
}

/**
 * Lấy lịch sử quét trong N ngày gần nhất
 */
export async function getNutritionHistory(days = 7): Promise<NutritionScanResult[]> {
  const res = await APIClient.get<NutritionScanResult[]>(ENDPOINTS.nutrition.history, {
    params: { days },
  });
  return res.data;
}
