/**
 * PART:   InsuranceCalc — actuarial model display helpers + useInsurance hook
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  9 — Insurance / HSA
 * READS:  AGENTS.md §7, SONNET_PHASES.md §PHASE 9, Tong_Hop_Thuat_Toan doc
 * TASK:   Client-side display helpers, mock fallback, React Query hook
 * SCOPE:  IN: display formatting, mock data, API call orchestration
 *         OUT: Premium formula computation (SERVER-ONLY):
 *              Premium = Base × AgeFactor × (1 - Discount)
 *              Discount = min(S/100 × 0.30, 0.30)
 *              HSA Monthly = base_rate × H_factor
 *
 * SECURITY: Formulas live on server. Client NEVER recomputes premium.
 *           This file only formats + displays values returned by /insurance/premium
 */

import { useQuery } from '@tanstack/react-query';
import { insuranceAPI, type PremiumResponse, type HSAProjectionResponse } from '@/services/api/insuranceAPI';

// ── Mock data (IS_HACKATHON=true) ──
const IS_HACKATHON = true;

const MOCK_PREMIUM: PremiumResponse = {
  base_premium_vnd:   1_200_000,  // 1.2 triệu/tháng
  discount_pct:       0.18,        // 18% discount (H_score=78)
  final_premium_vnd:  984_000,
  health_score:       78,
  age_factor:         1.05,        // tuổi 20-25
  computed_at:        new Date().toISOString(),
};

const MOCK_HSA: HSAProjectionResponse = {
  monthly_save_vnd:  216_000,     // 1.2M × 0.18 = tiết kiệm/tháng
  projected_1y_vnd:  2_592_000,
  projected_5y_vnd:  16_848_000,  // tính có lãi kép 8%/năm
  health_factor:     0.78,
};

// ── Display helpers ──

/**
 * getDiscountBar — phần trăm thanh discount (0-100%)
 * Max discount = 30% (Discount = min(S/100 × 0.30, 0.30))
 */
export function getDiscountBarPct(discountPct: number): number {
  // discountPct là 0.0-0.30 → convert sang 0-100% của thanh (max 30%)
  return Math.round((discountPct / 0.30) * 100);
}

/**
 * getPotentialSaving — nếu điểm tăng lên targetScore, tiết kiệm thêm bao nhiêu
 * Chỉ là ước tính UI, server recalculate khi cần
 */
export function getPotentialSaving(
  currentPremium: PremiumResponse,
  targetScore: number,
): { newDiscount: number; extraSavingPerMonth: number } {
  // Discount = min(S/100 × 0.30, 0.30)
  const newDiscount = Math.min((targetScore / 100) * 0.30, 0.30);
  const newPremium  = currentPremium.base_premium_vnd * currentPremium.age_factor * (1 - newDiscount);
  const extraSavingPerMonth = currentPremium.final_premium_vnd - newPremium;
  return { newDiscount, extraSavingPerMonth: Math.round(extraSavingPerMonth) };
}

// ── React Query hook ──
export interface UseInsuranceReturn {
  premium:    PremiumResponse;
  hsa:        HSAProjectionResponse;
  isLoading:  boolean;
  refetch:    () => void;
}

export function useInsurance(): UseInsuranceReturn {
  const premiumQuery = useQuery({
    queryKey: ['insurance-premium'],
    queryFn: () => insuranceAPI.getPremium().then((r) => r.data),
    staleTime: 300_000,
    retry: 1,
    placeholderData: MOCK_PREMIUM,
  });

  const hsaQuery = useQuery({
    queryKey: ['hsa-projection'],
    queryFn: () => insuranceAPI.getHSAProjection().then((r) => r.data),
    staleTime: 300_000,
    retry: 1,
    placeholderData: MOCK_HSA,
  });

  return {
    premium:   premiumQuery.data  ?? MOCK_PREMIUM,
    hsa:       hsaQuery.data      ?? MOCK_HSA,
    isLoading: premiumQuery.isLoading || hsaQuery.isLoading,
    refetch:   () => { premiumQuery.refetch(); hsaQuery.refetch(); },
  };
}
