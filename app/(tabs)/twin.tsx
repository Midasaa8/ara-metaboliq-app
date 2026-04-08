/**
 * PART:   Digital Twin / Sleep Screen
 * ACTOR:  Claude Sonnet 4.6 + Gemini 3.1
 * PHASE:  6 — Sleep Tracker
 * READS:  AGENTS.md §7, PLAN_B §6 Sleep Tracker, SONNET_PHASES.md §PHASE 6,
 *         GEMINI_PHASES.md §PHASE 6 UI elements
 * TASK:   Sleep timeline, HRV (SDNN), ChronoOS prediction, Digital Twin bio age,
 *         mini PPG waveform replay
 * SCOPE:  IN: UI, useSleepData hook, hiển thị kết quả
 *         OUT: LSTM inference (Opus Phase 18), HRV computation (server Phase 13)
 */

import { useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts, spacing, radius } from '@/constants/theme';
import { useSleepData } from '@/hooks/useSleepData';

// ── Helper: phút → "Xh Ym" ──
function fmtMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ── Mini PPG waveform (SVG sin-wave giả lập cho "Vitals Replay") ──
function MiniPPGWave() {
  const WAVE_W = 400;
  const WAVE_H = 100;
  const points: string[] = [];
  for (let x = 0; x <= WAVE_W; x += 3) {
    const y = WAVE_H / 2 - 14 * Math.sin((x / WAVE_W) * 12 * Math.PI)
      - 5 * Math.sin((x / WAVE_W) * 24 * Math.PI + 0.5);
    points.push(`${x === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const d = points.join(' ');

  return (
    <View style={styles.ppgCard}>
      <View style={styles.ppgHeader}>
        <View>
          <Text style={styles.ppgTitle}>Vitals Replay</Text>
          <Text style={styles.ppgSubtitle}>PPG Waveform • 03:24 AM</Text>
        </View>
        <TouchableOpacity style={styles.ppgPlayBtn} activeOpacity={0.8}>
          <Ionicons name="play" size={20} color={colors.secondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.ppgSvgWrapper}>
        <Svg width="100%" height={WAVE_H} viewBox={`0 0 ${WAVE_W} ${WAVE_H}`} preserveAspectRatio="none">
          <Path d={d} stroke={colors.primary} strokeWidth={2.5} fill="none" opacity={0.85} />
        </Svg>
        <View style={styles.ppgCursorLine} />
      </View>
    </View>
  );
}

// ── HRV Animated Bars ──
function HRVCard({ hrvValue }: { hrvValue: number }) {
  // Mock 6 cột height percentage cho HRV History bar chart
  const bars = [40, 60, 80, 100, 70, 50];

  return (
    <View style={styles.hrvCard}>
      <View>
        <Text style={styles.hrvLabel}>HRV (SDNN)</Text>
        <Text style={styles.hrvValue}>
          {hrvValue}<Text style={styles.hrvUnit}>ms</Text>
        </Text>
      </View>
      <View style={styles.hrvGraphWrap}>
        {bars.map((h, i) => (
          <View key={i} style={[styles.hrvBar, { height: `${h}%`, opacity: 0.2 + (h / 100) * 0.8 }]} />
        ))}
      </View>
    </View>
  );
}

// ── Main Screen ──
export default function TwinScreen() {
  const { data, isLoading, refetch } = useSleepData();

  // Animations
  const glowAnim = useRef(new Animated.Value(0.8)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.8, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, [glowAnim]);

  // Derived metrics
  const { lightMin, remMin, deepMin, awakeMin, lightPct, remPct, deepPct, awakePct } = useMemo(() => {
    if (!data) return { lightMin: 0, remMin: 0, deepMin: 0, awakeMin: 0, lightPct: 0, remPct: 0, deepPct: 0, awakePct: 0 };
    const getM = (sName: string) => data.stages.filter(s => s.stage === sName).reduce((a, b) => a + b.durationMin, 0);
    const l = getM('Light'), r = getM('REM'), d = getM('Deep'), a = getM('Awake');
    const tot = data.totalMin || 1;
    return {
      lightMin: l, remMin: r, deepMin: d, awakeMin: a,
      lightPct: (l / tot) * 100, remPct: (r / tot) * 100, deepPct: (d / tot) * 100, awakePct: (a / tot) * 100,
    };
  }, [data]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.topAppBar}>
        <View style={styles.topAppLeft}>
          <TouchableOpacity onPress={refetch} style={styles.menuIcon}>
            <Ionicons name="menu" size={26} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.topAppTitle}>Sleep Analysis</Text>
        </View>
        <TouchableOpacity style={styles.avatarWrap}>
          <Ionicons name="person-circle" size={32} color={colors.primary + '66'} />
        </TouchableOpacity>
      </View>

      {isLoading || !data ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Analyzing Sleep Data...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ── Sleep Timeline ── */}
          <View style={styles.timelineSection}>
            <View style={styles.timelineHeader}>
              <View>
                <Text style={styles.timelineOverline}>Last Night</Text>
                <Text style={styles.timelineTitle}>Sleep Cycles</Text>
              </View>
              <Text style={styles.timelineTotalTime}>{fmtMin(data.totalMin)}</Text>
            </View>

            <View style={[styles.timelineCard, styles.bentoGlow]}>
              <View style={styles.timelineBarWrap}>
                <View style={[styles.timelineSeg, { width: `${awakePct}%`, backgroundColor: colors.health.danger }]} />
                <View style={[styles.timelineSeg, { width: `${remPct}%`, backgroundColor: colors.tertiary }]} />
                <View style={[styles.timelineSeg, { width: `${lightPct}%`, backgroundColor: colors.surfaceElevated }]} />
                <View style={[styles.timelineSeg, { width: `${deepPct}%`, backgroundColor: colors.primary }]} />
              </View>

              <View style={styles.timelineLegend}>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.health.danger }]} /><Text style={styles.legendText}>Awake</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.tertiary }]} /><Text style={styles.legendText}>REM</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.surfaceElevated }]} /><Text style={styles.legendText}>Light</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.primary }]} /><Text style={styles.legendText}>Deep</Text></View>
              </View>
            </View>
          </View>

          {/* ── Bento Grid Wrapper ── */}
          <View style={styles.bentoGrid}>

            {/* CHRONOOS PREDICTION CARD */}
            <View style={[styles.chronoCard, styles.bentoGlow]}>
              {/* Fake a background flare using absolute Animated.View */}
              <Animated.View style={[styles.chronoFlare, { opacity: glowAnim, transform: [{ scale: glowAnim }] }]} />
              <View style={{ zIndex: 2 }}>
                <View style={styles.chronoHeader}>
                  <Ionicons name="sparkles" size={16} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.chronoOverline}>ChronoOS Prediction</Text>
                </View>
                <Text style={styles.chronoScore}>Tomorrow: {data.predicted_tomorrow_score}/100 predicted health</Text>
                <Text style={styles.chronoDesc}>
                  Your deep sleep consistency suggests high morning cognitive clarity. Optimal recovery expected by 8:00 AM.
                </Text>
              </View>
            </View>

            {/* TWIN STATUS CARD */}
            <View style={[styles.twinCard, styles.bentoGlow]}>
              <View>
                <Ionicons style={{ marginBottom: 12 }} name="happy" size={24} color={colors.tertiary} />
                <Text style={styles.twinOverline}>Biological Status</Text>
                <Text style={styles.twinAge}>Your biological twin age: {data.bio_age}</Text>
              </View>
              <View style={styles.twinTrend}>
                <Ionicons name="trending-down" size={16} color={colors.tertiary} />
                <Text style={styles.twinTrendText}>-2 years from actual</Text>
              </View>
            </View>

            {/* STATS ROW (3 Floating Cards) */}
            <View style={styles.statsFloatRow}>
              {/* Total Sleep */}
              <View style={[styles.statFloatCard, styles.bentoGlow]}>
                <Text style={styles.statFloatLabel}>TOTAL SLEEP</Text>
                <Text style={styles.statFloatValue}>7h 42m</Text>
                <Ionicons name="moon" size={24} color={colors.primary + '66'} style={{ marginTop: 8 }} />
              </View>
              {/* Deep Sleep */}
              <View style={[styles.statFloatCard, styles.bentoGlow]}>
                <Text style={styles.statFloatLabel}>DEEP SLEEP</Text>
                <Text style={[styles.statFloatValue, { color: colors.text.primary }]}>{fmtMin(deepMin)}</Text>
                <View style={styles.statFloatTrack}>
                  <View style={[styles.statFloatFill, { width: '70%', backgroundColor: colors.primary }]} />
                </View>
              </View>
              {/* REM Duration */}
              <View style={[styles.statFloatCard, styles.bentoGlow]}>
                <Text style={styles.statFloatLabel}>REM DURATION</Text>
                <Text style={[styles.statFloatValue, { color: colors.text.primary }]}>{fmtMin(remMin)}</Text>
                <View style={styles.statFloatTrack}>
                  <View style={[styles.statFloatFill, { width: '85%', backgroundColor: colors.tertiary }]} />
                </View>
              </View>
            </View>

            {/* HRV CARD */}
            <HRVCard hrvValue={data.hrv_sdnn} />

            {/* MINI PPG CARD */}
            <MiniPPGWave />

          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Styles (Ethereal Wellness Theme) ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topAppBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, height: 64,
    backgroundColor: 'rgba(244, 251, 253, 0.7)', // matches f4fbfd/70
  },
  topAppLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  menuIcon: { opacity: 0.8 },
  topAppTitle: { fontSize: fonts.sizes.xl, fontWeight: '800', color: colors.primary, fontFamily: fonts.bold, letterSpacing: -0.5 },
  avatarWrap: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: colors.primary + '66', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { color: colors.text.secondary, fontSize: fonts.sizes.sm },

  scroll: { flex: 1 },
  scrollContent: { paddingTop: spacing.xl, paddingHorizontal: spacing.lg, paddingBottom: 100 },

  bentoGlow: {
    shadowColor: '#273538', shadowOpacity: 0.08, shadowRadius: 32, shadowOffset: { width: 0, height: 12 }, elevation: 8,
  },

  // ── Sleep Timeline Section ──
  timelineSection: { marginBottom: spacing.xl },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 8, marginBottom: spacing.md },
  timelineOverline: { color: colors.text.secondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 },
  timelineTitle: { color: colors.text.primary, fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  timelineTotalTime: { color: colors.primary, fontSize: 20, fontWeight: '700' },
  timelineCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  timelineBarWrap: { height: 48, width: '100%', flexDirection: 'row', borderRadius: radius.full, overflow: 'hidden', marginBottom: spacing.lg },
  timelineSeg: { height: '100%' },
  timelineLegend: { flexDirection: 'row', justifyContent: 'space-between' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: colors.text.secondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: -0.5 },

  // ── Bento Grid Layout ──
  bentoGrid: { gap: spacing.lg },

  // ChronoOS Prediction
  chronoCard: {
    backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.xl,
    overflow: 'hidden', minHeight: 240, justifyContent: 'space-between', position: 'relative'
  },
  chronoFlare: {
    position: 'absolute', bottom: -50, right: -50,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  chronoHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.md },
  chronoOverline: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 },
  chronoScore: { color: '#FFF', fontSize: 36, fontWeight: '800', lineHeight: 42, marginBottom: spacing.md },
  chronoDesc: { color: 'rgba(255,255,255,0.9)', fontSize: 16, lineHeight: 24 },

  // Twin Status
  twinCard: {
    backgroundColor: '#e2fffa', // mapped from tertiary-container logic / teal pale
    borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: 'rgba(0,107,100,0.1)',
    justifyContent: 'space-between', minHeight: 180,
  },
  twinOverline: { color: colors.tertiary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  twinAge: { color: colors.tertiary, fontSize: 24, fontWeight: '800' },
  twinTrend: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.lg },
  twinTrendText: { color: colors.tertiary, opacity: 0.7, fontSize: 13, fontWeight: '700' },

  // STATS FLOATING ROW (3 Column)
  statsFloatRow: { flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  statFloatCard: {
    flex: 1, backgroundColor: '#ecf5f8', borderRadius: radius.lg, padding: spacing.lg,
    alignItems: 'center', justifyContent: 'center'
  },
  statFloatLabel: { color: colors.text.secondary, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  statFloatValue: { color: colors.primary, fontSize: 26, fontWeight: '800' },
  statFloatTrack: { width: '100%', height: 6, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden', marginTop: 16 },
  statFloatFill: { height: '100%', borderRadius: 4 },

  // HRV CARD
  hrvCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: 'rgba(214, 229, 233, 0.5)',
    flexDirection: 'row', justifyContent: 'space-between',
  },
  hrvLabel: { color: colors.text.secondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  hrvValue: { color: colors.text.primary, fontSize: 40, fontWeight: '800' },
  hrvUnit: { fontSize: 18, fontWeight: '600', color: colors.text.secondary },
  hrvGraphWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 48, marginTop: 16 },
  hrvBar: { width: 8, backgroundColor: colors.primary, borderRadius: 4 },

  // MINI PPG CARD
  ppgCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: 'rgba(214, 229, 233, 0.5)',
  },
  ppgHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  ppgTitle: { color: colors.text.primary, fontSize: 18, fontWeight: '800' },
  ppgSubtitle: { color: colors.text.secondary, fontSize: 12, marginTop: 4 },
  ppgPlayBtn: { backgroundColor: '#ffdbc9', padding: 12, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }, // secondaryContainer map
  ppgSvgWrapper: { height: 96, width: '100%', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  ppgCursorLine: { position: 'absolute', left: '25%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(182, 32, 72, 0.2)' } // primary/20
});
