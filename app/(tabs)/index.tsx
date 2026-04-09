/**
 * PART:   Home Dashboard Screen — Ethereal Elevation Redesign
 * ACTOR:  Gemini 3.1
 * PHASE:  UI-Redesign — Full English + Ethereal Elevation floating cards
 * TASK:   Premium home with floating score ring, floating metric pills, action cards
 * SCOPE:  IN: layout, hooks, floating card system
 *         OUT: business logic, real BLE data
 */

import { useState } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity,
  StyleSheet, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { HealthScoreRing } from '@/components/health/HealthScoreRing';
import { PPGWaveform } from '@/components/health/PPGWaveform';
import { useHealthScore } from '@/hooks/useHealthScore';
import { usePatchConnection } from '@/hooks/usePatchConnection';
import { useUserStore } from '@/store/userStore';
import { useHealthStore } from '@/store/healthStore';
import { colors, fonts, spacing, radius, elevation } from '@/constants/theme';
import { getWeakestAreas, getScoreTier, SUB_SCORE_META } from '@/services/ai/HealthScore';

const W = Dimensions.get('window').width;

export default function HomeScreen() {
  const router = useRouter();
  const firstName = useUserStore((s) => s.profile?.fullName?.split(' ')[0] ?? 'Athlete');
  const streakDays = useHealthStore((s) => s.streakDays);
  const { score, subScores, isLoading } = useHealthScore();
  const { isConnected, latestReading } = usePatchConnection();

  // Secret 5-tap hero to open Demo Flow
  const [tapCount, setTapCount] = useState(0);
  function handleSecretTap() {
    if (tapCount + 1 >= 5) { setTapCount(0); router.push('/demo-flow'); }
    else setTapCount(tapCount + 1);
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const weakArea = !isLoading ? getWeakestAreas(subScores)[0] : null;
  const weakMeta = weakArea ? SUB_SCORE_META[weakArea] : null;
  const weakTier = weakArea ? getScoreTier(subScores[weakArea]) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting} ✦</Text>
          <Text style={styles.name}>{firstName}</Text>
        </View>
        <TouchableOpacity
          style={[styles.podBtn, isConnected && styles.podBtnActive]}
          onPress={() => router.push('/patch-connect')}
        >
          <Ionicons
            name={isConnected ? 'radio-button-on' : 'radio-button-off'}
            size={16}
            color={isConnected ? colors.health.good : colors.text.muted}
          />
          <Text style={[styles.podLabel, isConnected && { color: colors.health.good }]}>
            {isConnected ? 'Pod ·' : 'Connect'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── HERO CARD: Health Score ── */}
        <TouchableOpacity activeOpacity={1} onPress={handleSecretTap}>
          <LinearGradient
            colors={['#4F6EF7', '#9B8FFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            {/* Floating score ring */}
            <View style={styles.heroRing}>
              {isLoading
                ? <View style={styles.ringPlaceholder} />
                : <HealthScoreRing score={score} size={180} thickness={14} subScores={subScores} />
              }
            </View>

            {/* Insight text */}
            <View style={styles.heroInfo}>
              <Text style={styles.heroLabel}>BIOMETRIC SCORE</Text>
              <Text style={styles.heroScore}>{isLoading ? '—' : score}</Text>
              {!isLoading && weakMeta && (
                <View style={styles.insightChip}>
                  <Ionicons name={weakMeta.icon as any} size={11} color="#fff" />
                  <Text style={styles.insightChipText}>Focus: {weakMeta.label}</Text>
                </View>
              )}
            </View>

            {/* Streak */}
            {streakDays > 0 && (
              <View style={styles.streakBadge}>
                <Text style={styles.streakText}>🔥 {streakDays}d streak</Text>
              </View>
            )}

            {/* Top-right blur dot decorations */}
            <View style={[styles.blob, { top: -20, right: -20, width: 120, height: 120, opacity: 0.18 }]} />
            <View style={[styles.blob, { bottom: -30, left: 40, width: 80, height: 80, opacity: 0.14 }]} />
          </LinearGradient>
        </TouchableOpacity>

        {/* ── LIVE VITALS ROW ── */}
        {latestReading && (
          <View style={styles.vitalsRow}>
            <VitalPill icon="heart" value={`${latestReading.hr}`} unit="bpm" color="#F44C7F" />
            <VitalPill icon="water" value={`${latestReading.spo2}`} unit="% SpO₂" color={colors.secondary} />
            <VitalPill icon="thermometer" value={`${latestReading.temperature.toFixed(1)}`} unit="°C" color={colors.health.warning} />
          </View>
        )}

        {/* ── REALTIME PPG ── */}
        <View style={[styles.floatCard, styles.ppgCard]}>
          <View style={styles.cardHeader}>
            <Ionicons name="pulse" size={16} color={colors.primary} />
            <Text style={styles.cardTitle}>Live Biosignal</Text>
            <View style={[styles.liveDot, isConnected && styles.liveDotActive]} />
          </View>
          <PPGWaveform hr={latestReading?.hr ?? 72} isConnected={isConnected} />
        </View>

        {/* ── QUICK ACTION GRID ── */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <ActionCard
            icon="mic"
            label="Voice\nAnalysis"
            sub="~5 sec"
            gradient={['#4F6EF7', '#9B8FFF']}
            onPress={() => router.push('/(tabs)/voice')}
          />
          <ActionCard
            icon="fitness"
            label="Exercise\nTracker"
            sub="Live PPG"
            gradient={['#22D3A8', '#1AB99A']}
            onPress={() => router.push('/(tabs)/exercise')}
          />
          <ActionCard
            icon="body"
            label="Digital\nTwin"
            sub="3D Body"
            gradient={['#9B8FFF', '#4F6EF7']}
            onPress={() => router.push('/(tabs)/twin')}
          />
          <ActionCard
            icon="shield-checkmark"
            label="Insurance\nHSA"
            sub="−30% premium"
            gradient={['#F5A623', '#F44C7F']}
            onPress={() => router.push('/(tabs)/fintech')}
          />
        </View>

        {/* ── SUBSCORE BREAKDOWN ── */}
        <Text style={styles.sectionTitle}>Health Dimensions</Text>
        <View style={styles.floatCard}>
          {(['exercise', 'sleep', 'voice', 'discipline'] as const).map((key, i) => {
            const meta = SUB_SCORE_META[key];
            const val = subScores?.[key] ?? 0;
            const pct = val / 100;
            return (
              <View key={key} style={[styles.dimRow, i > 0 && { marginTop: 14 }]}>
                <View style={styles.dimLeft}>
                  <Ionicons name={meta.icon as any} size={14} color={colors.primary} />
                  <Text style={styles.dimLabel}>{meta.label}</Text>
                </View>
                <View style={styles.dimBarBg}>
                  <View style={[styles.dimBar, { width: `${val}%` as any, backgroundColor: pct > 0.7 ? colors.health.good : pct > 0.4 ? colors.health.warning : colors.health.danger }]} />
                </View>
                <Text style={styles.dimScore}>{val}</Text>
              </View>
            );
          })}
        </View>

        {/* ── CONNECT POD NUDGE ── */}
        {!isConnected && (
          <TouchableOpacity style={styles.nudgeCard} onPress={() => router.push('/patch-connect')}>
            <Ionicons name="hardware-chip-outline" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.nudgeTitle}>Connect ARA Pod</Text>
              <Text style={styles.nudgeSub}>Real-time biometrics via BLE</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Small inline components ───────────────────────────────────────────────────

function VitalPill({ icon, value, unit, color }: { icon: any; value: string; unit: string; color: string }) {
  return (
    <View style={[styles.vitalPill, elevation.low]}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.vitalValue, { color }]}>{value}</Text>
      <Text style={styles.vitalUnit}>{unit}</Text>
    </View>
  );
}

function ActionCard({ icon, label, sub, gradient, onPress }: {
  icon: any; label: string; sub: string;
  gradient: [string, string]; onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.actionCardWrap}>
      <LinearGradient colors={gradient} style={[styles.actionCard, elevation.mid]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Ionicons name={icon} size={24} color="#fff" />
        <Text style={styles.actionLabel}>{label}</Text>
        <Text style={styles.actionSub}>{sub}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  greeting: { fontSize: fonts.sizes.sm, color: colors.text.secondary, fontWeight: '600', letterSpacing: 0.5 },
  name: { fontSize: fonts.sizes.xl, color: colors.text.primary, fontWeight: '800', marginTop: 2 },

  podBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.full, backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    ...elevation.low,
  },
  podBtnActive: { borderColor: colors.health.good + '88', backgroundColor: '#F0FDF9' },
  podLabel: { fontSize: fonts.sizes.xs, fontWeight: '700', color: colors.text.muted },

  // Hero Card
  heroCard: {
    borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.lg,
    flexDirection: 'row', alignItems: 'center', overflow: 'hidden',
    ...elevation.high,
  },
  heroRing: { flex: 0 },
  heroInfo: { flex: 1, paddingLeft: spacing.lg },
  heroLabel: { fontSize: fonts.sizes.xs, color: 'rgba(255,255,255,0.7)', fontWeight: '800', letterSpacing: 1.5 },
  heroScore: { fontSize: fonts.sizes.hero, color: '#fff', fontWeight: '900', lineHeight: 58 },
  insightChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.20)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  insightChipText: { fontSize: fonts.sizes.xs, color: '#fff', fontWeight: '700' },
  streakBadge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.full,
  },
  streakText: { fontSize: fonts.sizes.xs, color: '#fff', fontWeight: '700' },
  blob: { position: 'absolute', borderRadius: 60, backgroundColor: '#fff' },
  ringPlaceholder: { width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.10)' },

  // Vital pills
  vitalsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  vitalPill: {
    flex: 1, flexDirection: 'column', alignItems: 'center', gap: 2, paddingVertical: 10,
    backgroundColor: colors.surface, borderRadius: radius.lg,
  },
  vitalValue: { fontSize: fonts.sizes.xl, fontWeight: '800' },
  vitalUnit: { fontSize: fonts.sizes.xs, color: colors.text.muted, fontWeight: '600' },

  // Floating cards
  floatCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg,
    marginBottom: spacing.md, ...elevation.mid,
  },
  ppgCard: { marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  cardTitle: { flex: 1, fontSize: fonts.sizes.md, fontWeight: '700', color: colors.text.primary },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  liveDotActive: { backgroundColor: colors.health.good },

  // Section titles
  sectionTitle: {
    fontSize: fonts.sizes.sm, fontWeight: '800', color: colors.text.secondary,
    letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.xs,
  },

  // Action grid
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  actionCardWrap: { width: (W - spacing.lg * 2 - spacing.sm) / 2 },
  actionCard: { borderRadius: radius.lg, padding: spacing.md, gap: 4 },
  actionLabel: { fontSize: fonts.sizes.md, color: '#fff', fontWeight: '800', marginTop: spacing.sm },
  actionSub: { fontSize: fonts.sizes.xs, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },

  // Dimension bars
  dimRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dimLeft: { flexDirection: 'row', alignItems: 'center', gap: 5, width: 90 },
  dimLabel: { fontSize: fonts.sizes.xs, color: colors.text.secondary, fontWeight: '600' },
  dimBarBg: { flex: 1, height: 6, backgroundColor: colors.surfaceElevated, borderRadius: radius.full, overflow: 'hidden' },
  dimBar: { height: 6, borderRadius: radius.full },
  dimScore: { fontSize: fonts.sizes.xs, fontWeight: '800', color: colors.text.primary, width: 28, textAlign: 'right' },

  // Nudge card
  nudgeCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.primary + '10', borderRadius: radius.xl,
    padding: spacing.lg, borderWidth: 1.5, borderColor: colors.primary + '30',
    ...elevation.low,
  },
  nudgeTitle: { fontSize: fonts.sizes.md, fontWeight: '700', color: colors.text.primary },
  nudgeSub: { fontSize: fonts.sizes.xs, color: colors.text.muted, marginTop: 2 },
});
