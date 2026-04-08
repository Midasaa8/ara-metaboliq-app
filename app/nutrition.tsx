/**
 * PART:   Nutrition Scanner Screen — camera capture + Z-score anomaly
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  7 — Nutrition Scanner (moved from fintech.tsx → separate route)
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
import { useRouter } from 'expo-router';
import { colors, fonts, spacing, radius } from '@/constants/theme';
import {
  useScanNutrition,
  getAnomalyBadge,
} from '@/services/core/NutritionScanner';
import type { NutritionScanResult, NutritionItem } from '@/types/nutrition';

function fmtVND(n: number): string {
  return n.toLocaleString('vi-VN') + '₫';
}

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

function NutritionRow({ item }: { item: NutritionItem }) {
  return (
    <View style={styles.itemRow}>
      <View style={styles.itemTop}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <AnomalyChip z={item.z_score} />
      </View>
      <View style={styles.itemStats}>
        <Text style={styles.itemStat}><Text style={styles.itemStatVal}>{item.calories}</Text> kcal</Text>
        <Text style={styles.itemStat}><Text style={styles.itemStatVal}>{item.protein_g}g</Text> protein</Text>
        <Text style={styles.itemStat}><Text style={styles.itemStatVal}>{item.carb_g}g</Text> carb</Text>
        <Text style={styles.itemStat}><Text style={styles.itemStatVal}>{item.fat_g}g</Text> fat</Text>
        <Text style={[styles.itemStat, { marginLeft: 'auto' }]}><Text style={styles.itemStatVal}>{fmtVND(item.price_vnd)}</Text></Text>
      </View>
    </View>
  );
}

function ScanResultPanel({ result }: { result: NutritionScanResult }) {
  const anomalyCount = result.items.filter((i) => i.z_score > 1.5).length;
  const costDiff     = result.total_cost_vnd - result.market_avg_cost_vnd;
  const costDiffPct  = Math.round((costDiff / result.market_avg_cost_vnd) * 100);
  return (
    <>
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
      <Text style={styles.sectionHeading}>CHI TIẾT DINH DƯỠNG</Text>
      <View style={styles.itemsCard}>
        {result.items.map((item, i) => (
          <View key={i}>
            <NutritionRow item={item} />
            {i < result.items.length - 1 && <View style={styles.rowDivider} />}
          </View>
        ))}
      </View>
      <Text style={styles.sectionHeading}>PHÂN TÍCH CHI PHÍ</Text>
      <View style={styles.costCard}>
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>Bữa này</Text>
          <Text style={styles.costValue}>{fmtVND(result.total_cost_vnd)}</Text>
        </View>
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>TB thị trường (cùng calo)</Text>
          <Text style={[styles.costValue, { color: colors.text.secondary }]}>{fmtVND(result.market_avg_cost_vnd)}</Text>
        </View>
        <View style={[styles.costRow, styles.costDiffRow]}>
          <Text style={styles.costLabel}>Chênh lệch</Text>
          <Text style={[styles.costValue, { color: costDiff > 0 ? colors.health.warning : colors.health.good }]}>
            {costDiff > 0 ? '+' : ''}{fmtVND(costDiff)}
          </Text>
        </View>
        <Text style={styles.costNote}>TODO Phase 7 server: GPT-4o phân tích giá thị trường thực tế</Text>
      </View>
    </>
  );
}

export default function NutritionScreen() {
  const router = useRouter();
  const { state, result, errorMsg, scan, reset } = useScanNutrition();
  const isCapturing = state === 'CAPTURING';
  const isUploading = state === 'UPLOADING';
  const isLoading   = isCapturing || isUploading;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
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
        {state === 'RESULT' && result && <ScanResultPanel result={result} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  backBtn:    { width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title:      { color: colors.text.primary, fontSize: fonts.sizes.xl, fontWeight: '700' },
  subtitle:   { color: colors.text.secondary, fontSize: fonts.sizes.sm, marginTop: 2 },
  resetBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary + '15', borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 8 },
  resetBtnText: { color: colors.primary, fontSize: fonts.sizes.sm, fontWeight: '600' },
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  cameraBox: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.primary + '40', borderStyle: 'dashed', alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.md, marginTop: spacing.md },
  cameraBoxDisabled: { opacity: 0.5 },
  cameraIconBox: { width: 80, height: 80, borderRadius: radius.full, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  cameraBtnLabel: { color: colors.text.primary, fontSize: fonts.sizes.lg, fontWeight: '700' },
  cameraBtnSub:   { color: colors.text.muted, fontSize: fonts.sizes.xs, fontStyle: 'italic' },
  statusBox: { flex: 1, alignItems: 'center', paddingTop: 60, gap: spacing.md },
  statusText: { color: colors.text.primary, fontSize: fonts.sizes.lg, fontWeight: '600' },
  statusSub:  { color: colors.text.secondary, fontSize: fonts.sizes.sm },
  errorBox:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.health.danger + '15', borderRadius: radius.md, padding: spacing.md },
  errorText:  { color: colors.health.danger, fontSize: fonts.sizes.sm, flex: 1 },
  summaryBanner: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', marginTop: spacing.sm },
  summaryCol:     { flex: 1, alignItems: 'center', gap: 4 },
  summaryDivider: { width: 1, height: 48, backgroundColor: colors.border, marginHorizontal: spacing.sm },
  summaryLabel:   { color: colors.text.secondary, fontSize: fonts.sizes.xs, textTransform: 'uppercase', letterSpacing: 0.8 },
  summaryVal:     { color: colors.text.primary, fontSize: fonts.sizes.xl, fontWeight: '800' },
  summaryUnit:    { color: colors.text.muted, fontSize: fonts.sizes.xs, textAlign: 'center' },
  sectionHeading: { color: colors.text.secondary, fontSize: fonts.sizes.xs, textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.sm },
  itemsCard:    { backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden' },
  itemRow:      { padding: spacing.md, gap: 4 },
  itemTop:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  itemName:     { color: colors.text.primary, fontSize: fonts.sizes.md, fontWeight: '600', flex: 1 },
  itemStats:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  itemStat:     { color: colors.text.secondary, fontSize: fonts.sizes.xs },
  itemStatVal:  { color: colors.text.primary, fontWeight: '700', fontSize: fonts.sizes.xs },
  rowDivider:   { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.md },
  anomalyChip:      { borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  anomalyChipText:  { fontSize: fonts.sizes.xs, fontWeight: '700' },
  costCard:    { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm },
  costRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  costDiffRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: 4 },
  costLabel:   { color: colors.text.secondary, fontSize: fonts.sizes.sm, flex: 1 },
  costValue:   { color: colors.text.primary, fontSize: fonts.sizes.sm, fontWeight: '700' },
  costNote:    { color: colors.text.muted, fontSize: fonts.sizes.xs, fontStyle: 'italic', marginTop: spacing.sm },
});
