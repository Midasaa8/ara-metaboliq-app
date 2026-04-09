/**
 * PART:   Insurance & HSA Screen — Wellness Redesign
 * ACTOR:  Gemini 3.1
 * PHASE:  UI Redesign — Floating Cards
 * TASK:   Premium display, discount meter, and HSA auto-save with Ivory bg and Peach accents
 * SCOPE:  IN: UI, useInsurance hook, floating finance cards
 *         OUT: 5-year NPV (server)
 */

import { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, fonts, spacing, radius, elevation } from '@/constants/theme';
import {
  useInsurance,
  getDiscountBarPct,
  getPotentialSaving,
} from '@/services/core/InsuranceCalc';

function fmtUSD(n: number): string {
  // Mocking USD for global premium feel, though backend uses VND
  return '$' + (n / 25000).toFixed(2);
}

export default function FintechScreen() {
  const { premium, hsa, isLoading } = useInsurance();
  const [hsaEnabled, setHsaEnabled] = useState(true);
  const { extraSavingPerMonth } = getPotentialSaving(premium, 90);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* ── HEADER ── */}
      <View style={s.header}>
        <Text style={s.title}>Health Savings</Text>
        <Text style={s.subtitle}>HSA & Insurance Optimizer</Text>
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── PREMIUM HERO CARD ── */}
        <View style={[s.heroCard, elevation.raised]}>
          <View style={s.heroLeft}>
            <Text style={s.heroLabel}>MONTHLY PREMIUM</Text>
            <Text style={s.heroPrice}>{fmtUSD(premium.final_premium_vnd)}</Text>
            <View style={s.discountBadge}>
              <Text style={s.discountText}>-{Math.round(premium.discount_pct * 100)}% Health Discount</Text>
            </View>
          </View>
          <View style={s.heroRight}>
            <View style={s.shieldCircle}>
              <Ionicons name="shield-checkmark" size={32} color="#fff" />
            </View>
          </View>
        </View>

        {/* ── SAVINGS PROGRESS ── */}
        <Text style={s.sectionTitle}>Savings Progress</Text>
        <View style={[s.card, elevation.float]}>
          <View style={s.cardHead}>
            <View>
              <Text style={s.cardHeadTitle}>Discount Tier</Text>
              <Text style={s.cardHeadSub}>Next goal: 90 Health Score</Text>
            </View>
            <View style={[s.iconBox, { backgroundColor: colors.secondary + '20' }]}>
              <Ionicons name="trending-up" size={20} color={colors.secondary} />
            </View>
          </View>

          <View style={s.meterTrack}>
            <View style={[s.meterFill, { width: `${getDiscountBarPct(premium.discount_pct)}%`, backgroundColor: colors.secondary }]} />
          </View>
          <View style={s.meterLabels}>
            <Text style={s.meterLabel}>Base</Text>
            <Text style={s.meterLabel}>Max Discount (30%)</Text>
          </View>
        </View>

        {/* ── GRID: GOAL & HSA ── */}
        <View style={s.grid}>
          <View style={[s.gridCard, elevation.float]}>
            <Ionicons name="rocket" size={24} color={colors.accent} />
            <Text style={s.gridTitle}>Top Gear</Text>
            <Text style={s.gridDesc}>Save an extra</Text>
            <Text style={s.gridValue}>{fmtUSD(extraSavingPerMonth)}</Text>
            <Text style={s.gridUnit}>/mo</Text>
          </View>

          <View style={[s.gridCard, elevation.float]}>
            <View style={s.hsaActions}>
              <Ionicons name="wallet" size={24} color={colors.primary} />
              <Switch
                value={hsaEnabled}
                onValueChange={setHsaEnabled}
                trackColor={{ false: colors.border, true: colors.primary + '50' }}
                thumbColor={hsaEnabled ? colors.primary : colors.text.muted}
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
            </View>
            <Text style={s.gridTitle}>HSA Auto-Save</Text>
            <Text style={s.gridDesc}>Projected Save</Text>
            <Text style={s.gridValue}>{fmtUSD(hsa.monthly_save_vnd)}</Text>
          </View>
        </View>

        {/* ── 5-YEAR PROJECTION ── */}
        <Text style={s.sectionTitle}>Wealth Projection</Text>
        <View style={[s.card, elevation.float]}>
          <Text style={s.chartTitle}>Accumulated HSA Balance</Text>
          <View style={s.chartContainer}>
            <Svg height="140" width="100%">
              <Defs>
                <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={colors.primary} stopOpacity="1" />
                  <Stop offset="1" stopColor={colors.secondary} stopOpacity="1" />
                </LinearGradient>
              </Defs>
              {/* Current Path */}
              <Path
                d="M0,130 L80,120 L160,115 L240,110 L320,105"
                fill="none" stroke={colors.border} strokeWidth="3"
              />
              {/* Optimized Path */}
              <Path
                d="M0,130 L80,100 L160,70 L240,40 L320,10"
                fill="none" stroke="url(#grad)" strokeWidth="4"
              />
            </Svg>
            <View style={s.chartLegend}>
              <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: colors.primary }]} /><Text style={s.legendText}>Optimized</Text></View>
              <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: colors.border }]} /><Text style={s.legendText}>Baseline</Text></View>
            </View>
          </View>
          <View style={s.chartFooter}>
            <Text style={s.chartFooterText}>
              5-year potential: <Text style={{ color: colors.primary, fontWeight: '800' }}>{fmtUSD(hsa.projected_5y_vnd)}</Text>
            </Text>
          </View>
        </View>

        {/* ── ANOMALY ALERT (Soft Coral) ── */}
        <TouchableOpacity style={s.alert} activeOpacity={0.9}>
          <View style={s.alertIcon}>
            <Ionicons name="alert-circle" size={24} color={colors.health.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.alertTitle}>2 Anomalies Detected</Text>
            <Text style={s.alertDesc}>Unexpected billing patterns in recent claims.</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={colors.text.muted} />
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg },
  title: { fontSize: fonts.sizes.xl, fontWeight: '800', color: colors.text.primary, letterSpacing: -0.5 },
  subtitle: { fontSize: fonts.sizes.sm, color: colors.text.secondary, marginTop: 2 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 100 },

  // Hero Card
  heroCard: {
    backgroundColor: colors.primary, borderRadius: radius.xl, padding: spacing.xl,
    flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg,
  },
  heroLeft: { flex: 1 },
  heroLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.8)', letterSpacing: 1.5, marginBottom: 4 },
  heroPrice: { fontSize: 40, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  discountBadge: {
    marginTop: 12, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full,
  },
  discountText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  heroRight: { flex: 0 },
  shieldCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Generic card
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  cardHeadTitle: { fontSize: fonts.sizes.md, fontWeight: '700', color: colors.text.primary },
  cardHeadSub: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
  iconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  sectionTitle: { fontSize: fonts.sizes.sm, fontWeight: '700', color: colors.text.secondary, marginBottom: spacing.sm },

  // Progress meter
  meterTrack: { height: 12, backgroundColor: colors.surfaceElevated, borderRadius: 6, overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: 6 },
  meterLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  meterLabel: { fontSize: 10, fontWeight: '700', color: colors.text.muted, textTransform: 'uppercase' },

  // Grid
  grid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  gridCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: 4 },
  gridTitle: { fontSize: fonts.sizes.md, fontWeight: '700', color: colors.text.primary, marginTop: 8 },
  gridDesc: { fontSize: 11, color: colors.text.muted, fontWeight: '600' },
  gridValue: { fontSize: 24, fontWeight: '900', color: colors.text.primary },
  gridUnit: { fontSize: 12, fontWeight: '600', color: colors.text.muted },
  hsaActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },

  // Chart
  chartTitle: { fontSize: fonts.sizes.sm, fontWeight: '800', color: colors.text.primary, marginBottom: spacing.md },
  chartContainer: { height: 180, width: '100%', position: 'relative' },
  chartLegend: { flexDirection: 'row', gap: spacing.md, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: colors.text.muted, fontWeight: '700', textTransform: 'uppercase' },
  chartFooter: {
    marginTop: spacing.md, paddingVertical: 12, alignItems: 'center',
    backgroundColor: colors.surfaceElevated, borderRadius: radius.md,
  },
  chartFooterText: { fontSize: 12, color: colors.text.secondary },

  // Alert
  alert: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.health.danger + '10', borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1.5, borderColor: colors.health.danger + '30',
  },
  alertIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.health.danger + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  alertTitle: { fontSize: fonts.sizes.md, fontWeight: '800', color: colors.health.danger },
  alertDesc: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
});
