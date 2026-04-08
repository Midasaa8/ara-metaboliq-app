/**
 * PART:   Insurance & HSA Screen — UI shell (Phase 9 complete redesign)
 * ACTOR:  Gemini 3.1
 * PHASE:  9 — Insurance / HSA Calculator
 * READS:  AGENTS.md §7, PLAN_B §4 Insurance Simulator, §5 HSA,
 *         GEMINI_PHASES.md §PHASE 9, mockup stitch_thi_t_k_giao_di_n_p(4)
 * TASK:   Premium display, discount meter, HSA auto-save toggle,
 *         5-year projection SVG chart, anomaly alert — Bento grid layout
 * SCOPE:  IN: all UI elements, charts, useInsurance hook display
 *         OUT: Premium formula calc (server), 5-year NPV (server)
 */

import { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, fonts, spacing, radius } from '@/constants/theme';
import {
  useInsurance,
  getDiscountBarPct,
  getPotentialSaving,
} from '@/services/core/InsuranceCalc';

// ── Helpers ──
function fmtVND(n: number, compact = false): string {
  if (compact && n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M₫';
  if (compact && n >= 1_000) return (n / 1_000).toFixed(0) + 'K₫';
  return n.toLocaleString('vi-VN') + '₫';
}

// ── Hero Premium Card ──
function HeroCard({ premium, discountPct }: { premium: number; discountPct: number; healthScore: number }) {
  const pulseAnim = useRef(new Animated.Value(0.85)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.85, duration: 2500, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={styles.heroCard}>
      {/* Decorative glow blob */}
      <Animated.View style={[styles.heroBlob, { transform: [{ scale: pulseAnim }] }]} />

      <View style={styles.heroContent}>
        {/* Label */}
        <View style={styles.heroBadgeRow}>
          <Ionicons name="shield-checkmark" size={14} color="rgba(255,255,255,0.9)" />
          <Text style={styles.heroBadgeText}>ACTIVE PLAN PREMIUM</Text>
        </View>

        {/* Premium amount */}
        <View style={styles.heroPriceRow}>
          <Text style={styles.heroPriceAmount}>{fmtVND(premium, true)}</Text>
          <Text style={styles.heroPricePeriod}>/tháng</Text>
        </View>

        {/* Score pill */}
        <View style={styles.heroScorePill}>
          <Text style={styles.heroScorePillText}>
            Dựa trên Health Score • Đã giảm {Math.round(discountPct * 100)}%
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Discount Meter ──
function DiscountMeter({ discountPct }: { discountPct: number }) {
  const barPct = getDiscountBarPct(discountPct);
  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: barPct / 100,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [barPct]);

  const barColor = discountPct >= 0.20 ? colors.health.good
    : discountPct >= 0.10 ? colors.secondary : colors.health.warning;

  return (
    <View style={[styles.card, styles.cardSpan2, styles.bentoGlow]}>
      <View style={styles.discountHeader}>
        <View>
          <Text style={styles.cardOverline}>TIẾN ĐỘ TIẾT KIỆM</Text>
          <Text style={styles.discountTitle}>
            Giảm giá hiện tại:{' '}
            <Text style={[styles.discountHighlight, { color: barColor }]}>
              {Math.round(discountPct * 100)}%
            </Text>
          </Text>
        </View>
        <View style={[styles.discountIconWrap, { backgroundColor: barColor + '20' }]}>
          <Ionicons name="trending-up" size={22} color={barColor} />
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: fillAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
      <View style={styles.progressLabels}>
        <Text style={styles.progressLabel}>0% Base</Text>
        <Text style={styles.progressLabel}>30% Max Tier</Text>
      </View>
    </View>
  );
}

// ── Goal Alert Card (Potential Savings) ──
function GoalAlertCard({ extraSaving }: { extraSaving: number }) {
  return (
    <View style={[styles.card, styles.cardSquare, styles.bentoGlow]}>
      <Ionicons name="rocket" size={24} color={colors.secondary} style={{ marginBottom: spacing.sm }} />
      <Text style={styles.cardOverline}>GOAL ALERT</Text>
      <Text style={styles.goalDesc}>
        Nếu score tăng lên <Text style={{ color: colors.secondary, fontWeight: '800' }}>90</Text>
      </Text>
      <Text style={styles.goalAmount}>
        {fmtVND(extraSaving, true)}
        <Text style={styles.goalAmountSub}>/tháng</Text>
      </Text>
    </View>
  );
}

// ── HSA Auto-Save Card ──
function HSACard({ monthlySave, enabled, onToggle }: {
  monthlySave: number;
  enabled: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={[styles.card, styles.cardSquare, styles.bentoGlow]}>
      <View style={styles.hsaHeader}>
        <Ionicons name="wallet" size={22} color={colors.primary} />
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.primary + '55' }}
          thumbColor={enabled ? colors.primary : colors.text.muted}
          style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
        />
      </View>
      <Text style={styles.cardOverline}>HSA AUTO-SAVE</Text>
      <Text style={styles.hsaDesc}>Tiết kiệm hàng tháng dự kiến:</Text>
      <Text style={styles.hsaAmount}>{fmtVND(monthlySave, true)}</Text>
    </View>
  );
}

// ── 5-Year Projection Chart ──
function ProjectionChart({ projected5y }: { projected5y: number }) {
  const W = 320;
  const H = 140;
  // Healthy path: steeper growth
  const healthyPath = `M0,${H} L${W * 0.25},${H * 0.86} L${W * 0.5},${H * 0.64} L${W * 0.75},${H * 0.43} L${W},${H * 0.21}`;
  // Current path: flatter
  const currentPath = `M0,${H} L${W * 0.25},${H * 0.93} L${W * 0.5},${H * 0.82} L${W * 0.75},${H * 0.79} L${W},${H * 0.75}`;

  return (
    <View style={[styles.card, styles.cardSpan2, styles.bentoGlow]}>
      <View style={styles.chartHeader}>
        <View>
          <Text style={styles.cardOverline}>5-YEAR PROJECTION</Text>
          <Text style={styles.chartTitle}>Tích lũy tài sản</Text>
        </View>
        <View style={{ gap: spacing.xs }}>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.legendText}>Healthy Path</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: colors.border }]} />
            <Text style={styles.legendText}>Current Path</Text>
          </View>
        </View>
      </View>

      <View style={styles.chartArea}>
        <Svg
          width="100%"
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
        >
          <Defs>
            <LinearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
              <Stop offset="100%" stopColor={colors.tertiary} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          {/* Current path — grey */}
          <Path d={currentPath} fill="none" stroke={colors.border} strokeWidth="3" strokeLinecap="round" />
          {/* Healthy path — gradient */}
          <Path d={healthyPath} fill="none" stroke="url(#lineGrad)" strokeWidth="4" strokeLinecap="round" />
        </Svg>

        {/* X-axis labels */}
        <View style={styles.chartXAxis}>
          {['Năm 1', 'Năm 2', 'Năm 3', 'Năm 4', 'Năm 5'].map((label) => (
            <Text key={label} style={styles.chartXLabel}>{label}</Text>
          ))}
        </View>
      </View>

      <View style={styles.chartFooter}>
        <Text style={styles.chartFooterText}>
          Dự phóng 5 năm (lãi kép 8%/năm):{' '}
          <Text style={{ color: colors.primary, fontWeight: '800' }}>{fmtVND(projected5y, true)}</Text>
        </Text>
      </View>
    </View>
  );
}

// ── Anomaly Alert Card ──
function AnomalyAlert({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <View style={[styles.card, styles.cardSpan2, styles.anomalyAlert]}>
      <View style={styles.anomalyIconWrap}>
        <Ionicons name="warning" size={24} color={colors.health.danger} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.anomalyTitle}>{count} Bill Anomalies detected</Text>
        <Text style={styles.anomalyDesc}>Được phát hiện trong lần quét bảo hiểm gần nhất.</Text>
      </View>
      <TouchableOpacity style={styles.anomalyBtn}>
        <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
      </TouchableOpacity>
    </View>
  );
}

// ── Main Screen ──
export default function FintechScreen() {
  const { premium, hsa, isLoading } = useInsurance();
  const [hsaEnabled, setHsaEnabled] = useState(true);

  const { extraSavingPerMonth } = getPotentialSaving(premium, 90);

  // Mock anomaly count from last nutrition scan
  const anomalyCount = 2; // TODO(Claude Sonnet Phase 9): pull from healthStore or nutritionStore

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.menuBtn}>
            <Ionicons name="menu" size={26} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Health Savings</Text>
        </View>
        <TouchableOpacity style={styles.avatarWrap}>
          <Ionicons name="person-circle" size={32} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Card ── */}
        <HeroCard
          premium={premium.final_premium_vnd}
          discountPct={premium.discount_pct}
          healthScore={premium.health_score}
        />

        {/* ── Bento Grid ── */}
        <View style={styles.bentoGrid}>

          {/* Discount Meter — full width */}
          <DiscountMeter discountPct={premium.discount_pct} />

          {/* Goal Alert + HSA Toggle — 2 col */}
          <View style={styles.twoColRow}>
            <GoalAlertCard extraSaving={extraSavingPerMonth} />
            <HSACard
              monthlySave={hsa.monthly_save_vnd}
              enabled={hsaEnabled}
              onToggle={setHsaEnabled}
            />
          </View>

          {/* 5-Year Projection — full width */}
          <ProjectionChart projected5y={hsa.projected_5y_vnd} />

          {/* Anomaly Alert — full width */}
          <AnomalyAlert count={anomalyCount} />

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, height: 60,
    backgroundColor: 'rgba(248,250,251,0.85)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(226,232,240,0.4)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  menuBtn: { opacity: 0.8 },
  headerTitle: { fontSize: fonts.sizes.lg, fontWeight: '800', color: colors.primary, letterSpacing: -0.5 },
  avatarWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 120, paddingTop: spacing.lg },

  // ── Hero Card ──
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: spacing.lg,
    shadowColor: colors.primary, shadowOpacity: 0.30, shadowRadius: 24, shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  heroBlob: {
    position: 'absolute', right: -32, bottom: -32,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroContent: { zIndex: 2 },
  heroBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  heroBadgeText: { color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  heroPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  heroPriceAmount: { color: '#FFF', fontSize: 48, fontWeight: '900', letterSpacing: -1 },
  heroPricePeriod: { color: 'rgba(255,255,255,0.75)', fontSize: 18, fontWeight: '500' },
  heroScorePill: {
    marginTop: spacing.md, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: 6,
  },
  heroScorePillText: { color: '#FFF', fontSize: 12, fontWeight: '600' },

  // ── Bento Grid ──
  bentoGrid: { gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  cardSpan2: { /* full width — handled by parent flex */ },
  cardSquare: { flex: 1 },
  bentoGlow: {
    shadowColor: '#273538', shadowOpacity: 0.06, shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 }, elevation: 5,
  },
  twoColRow: { flexDirection: 'row', gap: spacing.md },

  // ── Common ──
  cardOverline: {
    fontSize: 10, fontWeight: '800', letterSpacing: 1.2,
    color: colors.text.secondary, textTransform: 'uppercase', marginBottom: 4,
  },

  // ── Discount Meter ──
  discountHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  discountTitle: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
  discountHighlight: { fontWeight: '800' },
  discountIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { height: 14, backgroundColor: colors.surfaceElevated, borderRadius: radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.full },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  progressLabel: { fontSize: 9, fontWeight: '700', color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.5 },

  // ── Goal Alert ──
  goalDesc: { fontSize: 12, color: colors.text.secondary, fontWeight: '500', lineHeight: 17 },
  goalAmount: { fontSize: 22, fontWeight: '800', color: colors.text.primary, marginTop: spacing.xs },
  goalAmountSub: { fontSize: 11, fontWeight: '500', color: colors.text.secondary },

  // ── HSA Card ──
  hsaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  hsaDesc: { fontSize: 11, color: colors.text.secondary, fontWeight: '500', lineHeight: 16 },
  hsaAmount: { fontSize: 22, fontWeight: '800', color: colors.text.primary, marginTop: spacing.xs },

  // ── Projection Chart ──
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  chartTitle: { fontSize: 18, fontWeight: '800', color: colors.text.primary },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 9, fontWeight: '700', color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  chartArea: { position: 'relative' },
  chartXAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  chartXLabel: { fontSize: 9, fontWeight: '700', color: colors.text.muted, textTransform: 'uppercase' },
  chartFooter: {
    marginTop: spacing.md, backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, alignItems: 'center',
  },
  chartFooterText: { fontSize: 11, color: colors.text.secondary, textAlign: 'center' },

  // ── Anomaly Alert ──
  anomalyAlert: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.health.danger + '0D',
    borderWidth: 1, borderColor: colors.health.danger + '30',
  },
  anomalyIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.health.danger + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  anomalyTitle: { fontSize: 14, fontWeight: '800', color: colors.health.danger },
  anomalyDesc: { fontSize: 11, color: colors.text.secondary, marginTop: 2 },
  anomalyBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8,
  },
});
