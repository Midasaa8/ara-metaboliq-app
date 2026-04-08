/**
 * PART:   Insurance & HSA Screen — full UI
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  9 — Insurance / HSA Calculator
 * READS:  AGENTS.md §7, PLAN_B §4 Insurance Simulator, §5 HSA,
 *         SONNET_PHASES.md §PHASE 9, GEMINI_PHASES.md §PHASE 9
 * TASK:   Premium display, discount meter, potential savings,
 *         HSA auto-save, 5-year projection, anomaly alert
 * SCOPE:  IN: UI, useInsurance hook, display helpers
 *         OUT: Premium formula (server), HSA calculation (server)
 */

import { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Animated, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Svg, { Path, Line, Circle as SvgCircle } from 'react-native-svg';
import { colors, fonts, spacing, radius } from '@/constants/theme';
import {
  useInsurance,
  getDiscountBarPct,
  getPotentialSaving,
} from '@/services/core/InsuranceCalc';

function fmtVND(n: number, compact = false): string {
  if (compact && n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M₫';
  if (compact && n >= 1_000)     return (n / 1_000).toFixed(0) + 'K₫';
  return n.toLocaleString('vi-VN') + '₫';
}

// ── Discount meter (progress bar 0-30%) ──
function DiscountMeter({ discountPct }: { discountPct: number }) {
  const pct = getDiscountBarPct(discountPct);
  const barColor = discountPct >= 0.20 ? colors.health.good
    : discountPct >= 0.10 ? colors.secondary : colors.health.warning;
  return (
    <View style={styles.meterCard}>
      <View style={styles.meterHeader}>
        <Text style={styles.meterLabel}>Mức giảm giá</Text>
        <Text style={[styles.meterPct, { color: barColor }]}>{Math.round(discountPct * 100)}%</Text>
      </View>
      <View style={styles.meterTrack}>
        <View style={[styles.meterFill, { width: `${pct}%`, backgroundColor: barColor }]} />
        {/* Markers: 10%, 20%, 30% */}
        {[33, 66, 100].map((m) => (
          <View key={m} style={[styles.meterMarker, { left: `${m}%` as any }]} />
        ))}
      </View>
      <View style={styles.meterTicks}>
        <Text style={styles.meterTick}>0%</Text>
        <Text style={styles.meterTick}>10%</Text>
        <Text style={styles.meterTick}>20%</Text>
        <Text style={styles.meterTick}>30%</Text>
      </View>
    </View>
  );
}

// ── 5-year projection mini chart (SVG path) ──
function ProjectionChart({
  currentMonthly, healthyMonthly,
}: {
  currentMonthly: number; healthyMonthly: number;
}) {
  const W = 280; const H = 80;
  // Generate 5 points per year, 2 lines
  const years = [0, 1, 2, 3, 4, 5];
  const RATE = 1.08; // 8% interest

  const toY = (val: number, max: number) =>
    H - 8 - ((val / max) * (H - 16));

  const currentVals = years.map((y) => currentMonthly * 12 * ((RATE ** y - 1) / (RATE - 1)));
  const healthyVals = years.map((y) => healthyMonthly * 12 * ((RATE ** y - 1) / (RATE - 1)));
  const maxVal      = Math.max(...currentVals);

  const toX = (i: number) => 8 + (i / 5) * (W - 16);

  const currentPath = currentVals.map((v, i) =>
    `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v, maxVal).toFixed(1)}`).join(' ');
  const healthyPath = healthyVals.map((v, i) =>
    `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v, maxVal).toFixed(1)}`).join(' ');

  return (
    <View style={styles.chartCard}>
      <Text style={styles.sectionHeading}>DỰ PHÓNG 5 NĂM (Lãi kép 8%/năm)</Text>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Path d={currentPath} stroke={colors.health.warning} strokeWidth={2} fill="none" strokeDasharray="4,3" />
        <Path d={healthyPath} stroke={colors.health.good}    strokeWidth={2} fill="none" />
      </Svg>
      <View style={styles.chartLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: colors.health.warning }]} />
          <Text style={styles.legendText}>Hiện tại: {fmtVND(currentVals[5], true)}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: colors.health.good }]} />
          <Text style={styles.legendText}>Nếu điểm cao: {fmtVND(healthyVals[5], true)}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Main Screen ──
export default function FintechScreen() {
  const router = useRouter();
  const { premium, hsa, isLoading, refetch } = useInsurance();
  const [hsaEnabled, setHsaEnabled] = useState(true);

  const potentialAtScore90 = getPotentialSaving(premium, 90);

  // 5-year projection: current monthly save vs max-discount scenario
  const currentMonthlySave = premium.base_premium_vnd * premium.age_factor * premium.discount_pct;
  const healthyMonthlySave = premium.base_premium_vnd * premium.age_factor * 0.30;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Bảo hiểm & HSA</Text>
          <Text style={styles.subtitle}>Premium · Giảm giá · Tiết kiệm</Text>
        </View>
        <TouchableOpacity onPress={refetch} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Đang tải dữ liệu bảo hiểm…</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ── 1. Current Premium ── */}
          <View style={styles.premiumBanner}>
            <View>
              <Text style={styles.premiumLabel}>PHÍ HÀNG THÁNG</Text>
              <Text style={styles.premiumValue}>{fmtVND(premium.final_premium_vnd)}</Text>
              <Text style={styles.premiumBase}>
                Gốc: {fmtVND(premium.base_premium_vnd)} · AgeFactor ×{premium.age_factor}
              </Text>
            </View>
            <View style={styles.scoreChip}>
              <Text style={styles.scoreChipLabel}>H-Score</Text>
              <Text style={styles.scoreChipValue}>{premium.health_score}</Text>
            </View>
          </View>

          {/* ── 2. Discount Meter ── */}
          <DiscountMeter discountPct={premium.discount_pct} />

          {/* ── 3. Potential Savings ── */}
          <View style={styles.savingCard}>
            <View style={styles.savingHeader}>
              <Ionicons name="trending-up" size={18} color={colors.health.good} />
              <Text style={styles.savingTitle}>Tiết kiệm tiềm năng</Text>
            </View>
            <Text style={styles.savingDesc}>
              Nếu điểm cải thiện lên <Text style={{ fontWeight: '700', color: colors.primary }}>90/100</Text>:
            </Text>
            <Text style={styles.savingAmount}>
              +{fmtVND(potentialAtScore90.extraSavingPerMonth)}{' '}
              <Text style={styles.savingUnit}>/ tháng</Text>
            </Text>
            <Text style={styles.savingNote}>
              TODO Phase 9 server: Recalculate thực tế khi score thay đổi
            </Text>
          </View>

          {/* ── 4. HSA Auto-Save ── */}
          <View style={styles.hsaCard}>
            <View style={styles.hsaRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.hsaTitle}>HSA Auto-Save</Text>
                <Text style={styles.hsaDesc}>Tự động tiết kiệm phần giảm giá mỗi tháng</Text>
              </View>
              <Switch
                value={hsaEnabled}
                onValueChange={setHsaEnabled}
                trackColor={{ true: colors.health.good + '80', false: colors.border }}
                thumbColor={hsaEnabled ? colors.health.good : colors.text.muted}
              />
            </View>
            {hsaEnabled && (
              <View style={styles.hsaStats}>
                <View style={styles.hsaStat}>
                  <Text style={styles.hsaStatLabel}>Tiết kiệm/tháng</Text>
                  <Text style={styles.hsaStatValue}>{fmtVND(hsa.monthly_save_vnd, true)}</Text>
                </View>
                <View style={styles.hsaStat}>
                  <Text style={styles.hsaStatLabel}>Sau 1 năm</Text>
                  <Text style={styles.hsaStatValue}>{fmtVND(hsa.projected_1y_vnd, true)}</Text>
                </View>
                <View style={styles.hsaStat}>
                  <Text style={styles.hsaStatLabel}>Sau 5 năm</Text>
                  <Text style={[styles.hsaStatValue, { color: colors.health.good }]}>{fmtVND(hsa.projected_5y_vnd, true)}</Text>
                </View>
              </View>
            )}
          </View>

          {/* ── 5. 5-Year Projection Chart ── */}
          <ProjectionChart
            currentMonthly={currentMonthlySave}
            healthyMonthly={healthyMonthlySave}
          />

          {/* ── 6. Nutrition Anomaly Alert ── */}
          <TouchableOpacity style={styles.anomalyAlert} onPress={() => router.push('/nutrition')}>
            <View style={styles.anomalyAlertLeft}>
              <Ionicons name="receipt-outline" size={20} color={colors.health.warning} />
              <View>
                <Text style={styles.anomalyAlertTitle}>Quét hoá đơn dinh dưỡng</Text>
                <Text style={styles.anomalyAlertSub}>Phát hiện Z-score bất thường → ảnh hưởng điểm</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
          </TouchableOpacity>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm,
  },
  title:       { color: colors.text.primary, fontSize: fonts.sizes.xl, fontWeight: '700' },
  subtitle:    { color: colors.text.secondary, fontSize: fonts.sizes.sm, marginTop: 2 },
  refreshBtn:  { width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  loadingBox:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { color: colors.text.secondary, fontSize: fonts.sizes.sm },
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },

  // Premium banner
  premiumBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, marginTop: spacing.sm },
  premiumLabel:  { color: colors.text.secondary, fontSize: fonts.sizes.xs, textTransform: 'uppercase', letterSpacing: 1 },
  premiumValue:  { color: colors.text.primary, fontSize: fonts.sizes.xxl, fontWeight: '800', marginVertical: 4 },
  premiumBase:   { color: colors.text.muted, fontSize: fonts.sizes.xs },
  scoreChip:     { backgroundColor: colors.primary + '15', borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  scoreChipLabel:{ color: colors.primary, fontSize: fonts.sizes.xs, textTransform: 'uppercase', letterSpacing: 0.8 },
  scoreChipValue:{ color: colors.primary, fontSize: fonts.sizes.xxl, fontWeight: '800' },

  // Discount meter
  meterCard:   { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  meterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meterLabel:  { color: colors.text.secondary, fontSize: fonts.sizes.sm },
  meterPct:    { fontSize: fonts.sizes.xl, fontWeight: '800' },
  meterTrack:  { height: 12, backgroundColor: colors.surfaceElevated, borderRadius: radius.full, overflow: 'hidden', position: 'relative', marginVertical: 4 },
  meterFill:   { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: radius.full },
  meterMarker: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: colors.border },
  meterTicks:  { flexDirection: 'row', justifyContent: 'space-between' },
  meterTick:   { color: colors.text.muted, fontSize: fonts.sizes.xs },

  // Potential saving
  savingCard:   { backgroundColor: colors.health.good + '12', borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm, borderWidth: 1, borderColor: colors.health.good + '30' },
  savingHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  savingTitle:  { color: colors.health.good, fontSize: fonts.sizes.md, fontWeight: '700' },
  savingDesc:   { color: colors.text.secondary, fontSize: fonts.sizes.sm },
  savingAmount: { color: colors.health.good, fontSize: fonts.sizes.xxl, fontWeight: '800' },
  savingUnit:   { fontSize: fonts.sizes.sm, fontWeight: '400', color: colors.text.secondary },
  savingNote:   { color: colors.text.muted, fontSize: fonts.sizes.xs, fontStyle: 'italic' },

  // HSA
  hsaCard:     { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, gap: spacing.md },
  hsaRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  hsaTitle:    { color: colors.text.primary, fontSize: fonts.sizes.md, fontWeight: '700' },
  hsaDesc:     { color: colors.text.secondary, fontSize: fonts.sizes.xs, marginTop: 2 },
  hsaStats:    { flexDirection: 'row', gap: spacing.sm },
  hsaStat:     { flex: 1, backgroundColor: colors.surfaceElevated, borderRadius: radius.sm, padding: spacing.sm, alignItems: 'center', gap: 4 },
  hsaStatLabel:{ color: colors.text.muted, fontSize: fonts.sizes.xs, textAlign: 'center' },
  hsaStatValue:{ color: colors.text.primary, fontSize: fonts.sizes.md, fontWeight: '700' },

  // Chart
  sectionHeading: { color: colors.text.secondary, fontSize: fonts.sizes.xs, textTransform: 'uppercase', letterSpacing: 1 },
  chartCard:   { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  chartLegend: { flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap' },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendLine:  { width: 16, height: 2, borderRadius: 1 },
  legendText:  { color: colors.text.secondary, fontSize: fonts.sizes.xs },

  // Anomaly alert
  anomalyAlert: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.health.warning + '15', borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.health.warning + '40',
  },
  anomalyAlertLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  anomalyAlertTitle: { color: colors.text.primary, fontSize: fonts.sizes.sm, fontWeight: '600' },
  anomalyAlertSub:   { color: colors.text.secondary, fontSize: fonts.sizes.xs, marginTop: 2 },
});
 * READS:  AGENTS.md §7, PLAN_B §3 Nutrition AI, SONNET_PHASES.md §PHASE 7,
 *         GEMINI_PHASES.md §PHASE 7
 * TASK:   Camera button, image preview, nutrition breakdown table,
 *         Z-score anomaly badges, cost vs market avg
 * SCOPE:  IN: UI, useScanNutrition hook, getAnomalyBadge display
 *         OUT: GPT-4o call (server), expo-camera thật (Phase 11)
 */

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '@/constants/theme';
import {
  useScanNutrition,
  getAnomalyBadge,
  type ScanState,
} from '@/services/core/NutritionScanner';
import type { NutritionScanResult, NutritionItem } from '@/types/nutrition';

// ── Helpers ──
function fmtVND(n: number): string {
  return n.toLocaleString('vi-VN') + '₫';
}

// ── Camera Placeholder ──
function CameraPlaceholder({ onPress, disabled }: { onPress: () => void; disabled: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.cameraBox, disabled && styles.cameraBoxDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <View style={styles.cameraIconBox}>
        <Ionicons name="receipt-outline" size={40} color={colors.primary} />
      </View>
      <Text style={styles.cameraBtnLabel}>Chụp hoá đơn / bill</Text>
      <Text style={styles.cameraBtnSub}>TODO Phase 11: expo-camera thật</Text>
    </TouchableOpacity>
  );
}

// ── Anomaly Badge chip ──
function AnomalyChip({ z }: { z: number }) {
  const badge = getAnomalyBadge(z);
  const badgeColor =
    badge.level === 'danger'  ? colors.health.danger  :
    badge.level === 'warning' ? colors.health.warning : colors.health.good;
  return (
    <View style={[styles.anomalyChip, { backgroundColor: badgeColor + '20' }]}>
      <Text style={[styles.anomalyChipText, { color: badgeColor }]}>
        {badge.emoji} {badge.label}
      </Text>
    </View>
  );
}

// ── Nutrition Item Row ──
function NutritionRow({ item }: { item: NutritionItem }) {
  return (
    <View style={styles.itemRow}>
      <View style={styles.itemTop}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <AnomalyChip z={item.z_score} />
      </View>
      <View style={styles.itemStats}>
        <Text style={styles.itemStat}>
          <Text style={styles.itemStatVal}>{item.calories}</Text> kcal
        </Text>
        <Text style={styles.itemStat}>
          <Text style={styles.itemStatVal}>{item.protein_g}g</Text> protein
        </Text>
        <Text style={styles.itemStat}>
          <Text style={styles.itemStatVal}>{item.carb_g}g</Text> carb
        </Text>
        <Text style={styles.itemStat}>
          <Text style={styles.itemStatVal}>{item.fat_g}g</Text> fat
        </Text>
        <Text style={[styles.itemStat, { marginLeft: 'auto' }]}>
          <Text style={styles.itemStatVal}>{fmtVND(item.price_vnd)}</Text>
        </Text>
      </View>
    </View>
  );
}

// ── Result panel ──
function ScanResultPanel({ result }: { result: NutritionScanResult }) {
  const anomalyCount = result.items.filter((i) => i.z_score > 1.5).length;
  const costDiff     = result.total_cost_vnd - result.market_avg_cost_vnd;
  const costDiffPct  = Math.round((costDiff / result.market_avg_cost_vnd) * 100);

  return (
    <>
      {/* Summary banner */}
      <View style={styles.summaryBanner}>
        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>Tổng calo</Text>
          <Text style={styles.summaryVal}>{result.total_calories}</Text>
          <Text style={styles.summaryUnit}>kcal</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>Chi phí</Text>
          <Text style={[styles.summaryVal, { color: costDiff > 0 ? colors.health.warning : colors.health.good }]}>
            {fmtVND(result.total_cost_vnd)}
          </Text>
          <Text style={[styles.summaryUnit, { color: costDiff > 0 ? colors.health.warning : colors.health.good }]}>
            {costDiff > 0 ? `+${costDiffPct}%` : `${costDiffPct}%`} vs TB thị trường
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>Cảnh báo</Text>
          <Text style={[styles.summaryVal, { color: anomalyCount > 0 ? colors.health.danger : colors.health.good }]}>
            {anomalyCount}
          </Text>
          <Text style={styles.summaryUnit}>món bất thường</Text>
        </View>
      </View>

      {/* Items */}
      <Text style={styles.sectionHeading}>CHI TIẾT DINH DƯỠNG</Text>
      <View style={styles.itemsCard}>
        {result.items.map((item, i) => (
          <View key={i}>
            <NutritionRow item={item} />
            {i < result.items.length - 1 && <View style={styles.rowDivider} />}
          </View>
        ))}
      </View>

      {/* Cost analysis */}
      <Text style={styles.sectionHeading}>PHÂN TÍCH CHI PHÍ</Text>
      <View style={styles.costCard}>
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>Bữa này</Text>
          <Text style={styles.costValue}>{fmtVND(result.total_cost_vnd)}</Text>
        </View>
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>Trung bình thị trường (cùng calo)</Text>
          <Text style={[styles.costValue, { color: colors.text.secondary }]}>
            {fmtVND(result.market_avg_cost_vnd)}
          </Text>
        </View>
        <View style={[styles.costRow, styles.costDiffRow]}>
          <Text style={styles.costLabel}>Chênh lệch</Text>
          <Text style={[styles.costValue, { color: costDiff > 0 ? colors.health.warning : colors.health.good }]}>
            {costDiff > 0 ? '+' : ''}{fmtVND(costDiff)}
          </Text>
        </View>
        <Text style={styles.costNote}>
          TODO Phase 7 server: GPT-4o phân tích giá thị trường thực tế
        </Text>
      </View>
    </>
  );
}

// ── Main Screen ──
export default function FintechScreen() {
  const { state, result, errorMsg, scan, reset } = useScanNutrition();

  const isCapturing = state === 'CAPTURING';
  const isUploading = state === 'UPLOADING';
  const isLoading   = isCapturing || isUploading;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Dinh dưỡng</Text>
          <Text style={styles.subtitle}>Quét hoá đơn · Z-score · Chi phí</Text>
        </View>
        {state === 'RESULT' && (
          <TouchableOpacity onPress={reset} style={styles.resetBtn}>
            <Ionicons name="camera-outline" size={18} color={colors.primary} />
            <Text style={styles.resetBtnText}>Quét lại</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Camera capture button */}
        {(state === 'IDLE' || state === 'ERROR') && (
          <>
            <CameraPlaceholder onPress={scan} disabled={isLoading} />
            {state === 'ERROR' && (
              <View style={styles.errorBox}>
                <Ionicons name="warning-outline" size={18} color={colors.health.danger} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}
          </>
        )}

        {/* Loading states */}
        {isCapturing && (
          <View style={styles.statusBox}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.statusText}>Đang chụp ảnh…</Text>
          </View>
        )}
        {isUploading && (
          <View style={styles.statusBox}>
            <ActivityIndicator color={colors.secondary} size="large" />
            <Text style={styles.statusText}>AI đang phân tích hoá đơn…</Text>
            <Text style={styles.statusSub}>GPT-4o · Z-score · Chi phí thị trường</Text>
          </View>
        )}

        {/* Result */}
        {state === 'RESULT' && result && (
          <ScanResultPanel result={result} />
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ──
const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm,
  },
  title:    { color: colors.text.primary, fontSize: fonts.sizes.xl, fontWeight: '700' },
  subtitle: { color: colors.text.secondary, fontSize: fonts.sizes.sm, marginTop: 2 },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary + '15', borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: 8,
  },
  resetBtnText: { color: colors.primary, fontSize: fonts.sizes.sm, fontWeight: '600' },
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },

  // ── Camera box ──
  cameraBox: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 2, borderColor: colors.primary + '40', borderStyle: 'dashed',
    alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.md,
    marginTop: spacing.md,
  },
  cameraBoxDisabled: { opacity: 0.5 },
  cameraIconBox: {
    width: 80, height: 80, borderRadius: radius.full,
    backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center',
  },
  cameraBtnLabel: { color: colors.text.primary, fontSize: fonts.sizes.lg, fontWeight: '700' },
  cameraBtnSub:   { color: colors.text.muted,    fontSize: fonts.sizes.xs, fontStyle: 'italic' },

  // ── Status ──
  statusBox: { flex: 1, alignItems: 'center', paddingTop: 60, gap: spacing.md },
  statusText: { color: colors.text.primary, fontSize: fonts.sizes.lg, fontWeight: '600' },
  statusSub:  { color: colors.text.secondary, fontSize: fonts.sizes.sm },

  // ── Error ──
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.health.danger + '15', borderRadius: radius.md, padding: spacing.md,
  },
  errorText: { color: colors.health.danger, fontSize: fonts.sizes.sm, flex: 1 },

  // ── Summary banner ──
  summaryBanner: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center',
    marginTop: spacing.sm,
  },
  summaryCol:     { flex: 1, alignItems: 'center', gap: 4 },
  summaryDivider: { width: 1, height: 48, backgroundColor: colors.border, marginHorizontal: spacing.sm },
  summaryLabel:   { color: colors.text.secondary, fontSize: fonts.sizes.xs, textTransform: 'uppercase', letterSpacing: 0.8 },
  summaryVal:     { color: colors.text.primary, fontSize: fonts.sizes.xl, fontWeight: '800' },
  summaryUnit:    { color: colors.text.muted, fontSize: fonts.sizes.xs, textAlign: 'center' },

  // ── Section heading ──
  sectionHeading: { color: colors.text.secondary, fontSize: fonts.sizes.xs, textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.sm },

  // ── Items card ──
  itemsCard: { backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden' },
  itemRow:   { padding: spacing.md, gap: spacing.xs },
  itemTop:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  itemName:  { color: colors.text.primary, fontSize: fonts.sizes.md, fontWeight: '600', flex: 1 },
  itemStats: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  itemStat:  { color: colors.text.secondary, fontSize: fonts.sizes.xs },
  itemStatVal:{ color: colors.text.primary, fontWeight: '700', fontSize: fonts.sizes.xs },
  rowDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.md },

  // ── Anomaly chip ──
  anomalyChip:     { borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  anomalyChipText: { fontSize: fonts.sizes.xs, fontWeight: '700' },

  // ── Cost card ──
  costCard:    { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm },
  costRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  costDiffRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.xs },
  costLabel:   { color: colors.text.secondary, fontSize: fonts.sizes.sm, flex: 1 },
  costValue:   { color: colors.text.primary, fontSize: fonts.sizes.sm, fontWeight: '700' },
  costNote:    { color: colors.text.muted, fontSize: fonts.sizes.xs, fontStyle: 'italic', marginTop: spacing.sm },
});
