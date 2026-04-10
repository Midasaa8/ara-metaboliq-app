/**
 * PART:   Digital Twin / Sleep Screen — Wellness Redesign
 * ACTOR:  Gemini 3.1
 * PHASE:  UI Redesign — Floating Cards
 * TASK:   Premium sleep & bio-twin analysis with Ivory bg and Sage Green theme
 * SCOPE:  IN: UI, useSleepData hook, floating cardio cards
 *         OUT: HRV computation (server)
 */

import { useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  RefreshCcw,
  Dna,
  TrendingDown,
  Moon,
  Sparkles,
  ChevronRight,
  Heart,
  Activity,
  Play
} from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts, spacing, radius, elevation } from '@/constants/theme';
import { useSleepData } from '@/hooks/useSleepData';

function fmtMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function TwinScreen() {
  const { data, isLoading, refetch } = useSleepData();

  const glowAnim = useRef(new Animated.Value(0.8)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.8, duration: 2500, useNativeDriver: true }),
      ])
    ).start();
  }, [glowAnim]);

  const { lightPct, remPct, deepPct, awakePct } = useMemo(() => {
    if (!data) return { lightPct: 0, remPct: 0, deepPct: 0, awakePct: 0 };
    const getM = (sName: string) => data.stages.filter(s => s.stage === sName).reduce((a, b) => a + b.durationMin, 0);
    const l = getM('Light'), r = getM('REM'), d = getM('Deep'), a = getM('Awake');
    const tot = data.totalMin || 1;
    return {
      lightPct: (l / tot) * 100, remPct: (r / tot) * 100, deepPct: (d / tot) * 100, awakePct: (a / tot) * 100,
    };
  }, [data]);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* ── HEADER ── */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Bio-Twin</Text>
          <Text style={s.subtitle}>Biological Age & Sleep State</Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={refetch}>
          <RefreshCcw size={20} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {isLoading || !data ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={s.loadingText}>Synthesizing Digital Twin...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── TWIN AGE HERO (floating card) ── */}
          <View style={[s.heroCard, elevation.float]}>
            <View style={s.heroLeft}>
              <View style={s.avatarCircle}>
                <Dna size={48} color={colors.secondary} strokeWidth={1.5} />
                <Animated.View style={[s.glowRing, { opacity: glowAnim, transform: [{ scale: glowAnim }] }]} />
              </View>
            </View>
            <View style={s.heroRight}>
              <Text style={s.heroLabel}>BIOLOGICAL AGE</Text>
              <Text style={s.heroAge}>{data.bio_age} yrs</Text>
              <View style={s.trendPill}>
                <TrendingDown size={12} color={colors.health.good} strokeWidth={2.5} />
                <Text style={s.trendText}>2 years younger than actual</Text>
              </View>
            </View>
          </View>

          {/* ── SLEEP CYCLES ── */}
          <Text style={s.sectionTitle}>Sleep Cycles</Text>
          <View style={[s.card, elevation.float]}>
            <View style={s.cardHead}>
              <Moon size={18} color={colors.primary} strokeWidth={2} />
              <Text style={s.cardTitle}>Last Night's Analysis</Text>
              <Text style={s.totalTime}>{fmtMin(data.totalMin)}</Text>
            </View>

            <View style={s.timelineBar}>
              <View style={[s.barSeg, { width: `${awakePct}%`, backgroundColor: colors.health.danger }]} />
              <View style={[s.barSeg, { width: `${remPct}%`, backgroundColor: '#A88AFF' }]} />
              <View style={[s.barSeg, { width: `${lightPct}%`, backgroundColor: '#A8D4F0' }]} />
              <View style={[s.barSeg, { width: `${deepPct}%`, backgroundColor: colors.primary }]} />
            </View>

            <View style={s.legend}>
              <LegendItem dot="#F28B82" label="Awake" />
              <LegendItem dot="#A88AFF" label="REM" />
              <LegendItem dot="#A8D4F0" label="Light" />
              <LegendItem dot="#5B9BD5" label="Deep" />
            </View>
          </View>

          {/* ── CHRONOOS PREDICTION (Peach Accent) ── */}
          <TouchableOpacity style={[s.chronoCard, elevation.float]} activeOpacity={0.9}>
            <View style={s.chronoIconBox}>
              <Sparkles size={20} color={colors.accent} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.chronoTitle}>ChronoOS Forecast</Text>
              <Text style={s.chronoSub}>
                Prediction: <Text style={{ fontWeight: '700', color: colors.text.primary }}>{data.predicted_tomorrow_score}/100 </Text>
                health readiness for tomorrow morning.
              </Text>
            </View>
            <ChevronRight size={18} color={colors.accent} strokeWidth={2.5} />
          </TouchableOpacity>

          {/* ── HRV & VITALS REPLAY ── */}
          <View style={s.grid}>
            <View style={[s.gridCard, elevation.float]}>
              <Text style={s.gridLabel}>HRV (SDNN)</Text>
              <Text style={s.gridValue}>{data.hrv_sdnn}<Text style={s.gridUnit}>ms</Text></Text>
              <View style={s.hrvBars}>
                {[4, 7, 5, 9, 6, 8].map((h, i) => (
                  <View key={i} style={[s.hrvBar, { height: h * 3, opacity: 0.3 + (h / 10) }]} />
                ))}
              </View>
            </View>

            <View style={[s.gridCard, elevation.float]}>
              <Text style={s.gridLabel}>RESTING HR</Text>
              <Text style={s.gridValue}>58<Text style={s.gridUnit}>bpm</Text></Text>
              <View style={[s.iconCircle, { backgroundColor: colors.health.danger + '10' }]}>
                <Heart size={20} color={colors.health.danger} strokeWidth={2} />
              </View>
            </View>
          </View>

          {/* ── VITALS REPLAY SVG ── */}
          <View style={[s.card, elevation.float]}>
            <View style={s.cardHead}>
              <Activity size={18} color={colors.secondary} strokeWidth={2.5} />
              <Text style={s.cardTitle}>Vitals Replay</Text>
              <TouchableOpacity style={s.playBtn}>
                <Play size={14} color="#fff" strokeWidth={3} fill="#fff" />
              </TouchableOpacity>
            </View>
            <View style={s.svgWrap}>
              <Svg height="60" width="100%">
                <Path
                  d="M0,30 Q20,10 40,30 T80,30 T120,30 T160,30 T200,30 T240,30 T280,30 T320,30"
                  fill="none" stroke={colors.secondary} strokeWidth="2"
                  opacity={0.6}
                />
              </Svg>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function LegendItem({ dot, label }: { dot: string; label: string }) {
  return (
    <View style={s.legendItem}>
      <View style={[s.legendDot, { backgroundColor: dot }]} />
      <Text style={s.legendText}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  title: { fontSize: fonts.sizes.xl, fontWeight: '800', color: colors.text.primary, letterSpacing: -0.5 },
  subtitle: { fontSize: fonts.sizes.sm, color: colors.text.secondary },
  refreshBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', ...elevation.ambient,
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.text.secondary, fontSize: fonts.sizes.sm, fontWeight: '500' },

  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  // Hero Card
  heroCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl,
    flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg,
  },
  heroLeft: { flex: 0 },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: colors.secondary + '15',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  glowRing: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    borderWidth: 2, borderColor: colors.secondary + '30',
  },
  heroRight: { flex: 1, paddingLeft: spacing.xl },
  heroLabel: { fontSize: 10, fontWeight: '800', color: colors.secondary, letterSpacing: 1.5, marginBottom: 4 },
  heroAge: { fontSize: 32, fontWeight: '900', color: colors.text.primary },
  trendPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8,
    backgroundColor: colors.health.good + '15', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.full, alignSelf: 'flex-start',
  },
  trendText: { fontSize: 11, fontWeight: '700', color: colors.health.good },

  // Generic Card
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.lg },
  cardTitle: { flex: 1, fontSize: fonts.sizes.md, fontWeight: '700', color: colors.text.primary },
  totalTime: { fontSize: fonts.sizes.md, fontWeight: '800', color: colors.primary },

  sectionTitle: {
    fontSize: fonts.sizes.sm, fontWeight: '700', color: colors.text.secondary,
    marginBottom: spacing.sm, marginTop: spacing.xs,
  },

  // Timeline
  timelineBar: { height: 40, width: '100%', flexDirection: 'row', borderRadius: radius.md, overflow: 'hidden', marginBottom: spacing.md },
  barSeg: { height: '100%' },
  legend: { flexDirection: 'row', justifyContent: 'space-between' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: colors.text.secondary, fontWeight: '600' },

  // Chrono Card (Peach Accent)
  chronoCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md,
    borderWidth: 1.5, borderColor: colors.accent + '30',
  },
  chronoIconBox: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.accent + '15', alignItems: 'center', justifyContent: 'center',
  },
  chronoTitle: { fontSize: fonts.sizes.md, fontWeight: '700', color: colors.text.primary },
  chronoSub: { fontSize: fonts.sizes.xs, color: colors.text.secondary, marginTop: 2, lineHeight: 18 },

  // Grid
  grid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  gridCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: 4 },
  gridLabel: { fontSize: 10, fontWeight: '800', color: colors.text.muted, letterSpacing: 0.5 },
  gridValue: { fontSize: 24, fontWeight: '900', color: colors.text.primary },
  gridUnit: { fontSize: 12, fontWeight: '600', color: colors.text.muted, marginLeft: 2 },
  hrvBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 40, marginTop: 4 },
  hrvBar: { width: 6, backgroundColor: colors.primary, borderRadius: 3 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginTop: 8 },

  // SVG Wrap
  svgWrap: { height: 60, width: '100%', backgroundColor: colors.background, borderRadius: radius.sm, overflow: 'hidden' },
  playBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
});
