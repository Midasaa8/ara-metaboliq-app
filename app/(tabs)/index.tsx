/**
 * PART:   Home Dashboard — Wellness Ethereal Elevation
 * ACTOR:  Gemini 3.1
 * PHASE:  UI Redesign — 60-30-10 Floating Cards
 * TASK:   Ivory canvas + floating wellness cards + peach CTAs
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
  const firstName = useUserStore((s) => s.profile?.fullName?.split(' ')[0] ?? 'there');
  const streakDays = useHealthStore((s) => s.streakDays);
  const { score, subScores, isLoading } = useHealthScore();
  const { isConnected, latestReading } = usePatchConnection();

  // Secret 5-tap on score ring → Demo Flow
  const [tapCount, setTapCount] = useState(0);
  function handleSecretTap() {
    if (tapCount + 1 >= 5) { setTapCount(0); router.push('/demo-flow'); }
    else setTapCount(tapCount + 1);
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <SafeAreaView style={s.root} edges={['top']}>

      {/* ── HEADER ── */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>{greeting} ☀️</Text>
          <Text style={s.name}>{firstName}</Text>
        </View>
        <TouchableOpacity
          style={[s.podChip, isConnected && s.podChipActive]}
          onPress={() => router.push('/patch-connect')}
        >
          <View style={[s.podDot, isConnected && s.podDotActive]} />
          <Text style={[s.podText, isConnected && { color: colors.health.good }]}>
            {isConnected ? 'Pod Connected' : 'Connect Pod'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── HERO: Score Card (floating) ── */}
        <TouchableOpacity activeOpacity={1} onPress={handleSecretTap}>
          <View style={s.heroCard}>
            <View style={s.heroLeft}>
              {isLoading
                ? <View style={s.ringPlaceholder} />
                : <HealthScoreRing score={score} size={150} thickness={12} subScores={subScores} />
              }
            </View>
            <View style={s.heroRight}>
              <Text style={s.heroLabel}>WELLNESS SCORE</Text>
              <Text style={s.heroScore}>{isLoading ? '—' : score}</Text>
              <Text style={s.heroStatus}>
                {score >= 80 ? '✨ Excellent' : score >= 60 ? '💪 Good' : '🌱 Improving'}
              </Text>
              {streakDays > 0 && (
                <View style={s.streakPill}>
                  <Text style={s.streakText}>🔥 {streakDays} day streak</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* ── LIVE VITALS (floating pills) ── */}
        {latestReading && (
          <View style={s.vitalsRow}>
            <VitalPill icon="heart" value={`${latestReading.hr}`} unit="bpm" color={colors.health.danger} />
            <VitalPill icon="water" value={`${latestReading.spo2}`} unit="SpO₂" color={colors.primary} />
            <VitalPill icon="thermometer" value={`${latestReading.temperature.toFixed(1)}`} unit="°C" color={colors.accent} />
          </View>
        )}

        {/* ── LIVE PPG (floating card) ── */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <Ionicons name="pulse" size={16} color={colors.primary} />
            <Text style={s.cardTitle}>Live Biosignal</Text>
            <View style={[s.liveDot, isConnected && s.liveDotOn]} />
          </View>
          <PPGWaveform hr={latestReading?.hr ?? 72} isConnected={isConnected} />
        </View>

        {/* ── WELLNESS ACTIONS (floating 2x2 grid) ── */}
        <Text style={s.sectionTitle}>Wellness Actions</Text>
        <View style={s.actionGrid}>
          <WellnessCard
            icon="mic" label="Voice" sub="5s check-in"
            bgColor="#EBF4FF" iconColor={colors.primary}
            onPress={() => router.push('/(tabs)/voice')}
          />
          <WellnessCard
            icon="fitness" label="Exercise" sub="Track workout"
            bgColor="#E8F5EC" iconColor={colors.secondary}
            onPress={() => router.push('/(tabs)/exercise')}
          />
          <WellnessCard
            icon="body" label="Digital Twin" sub="Body insights"
            bgColor="#F0ECFB" iconColor="#8B78D0"
            onPress={() => router.push('/(tabs)/twin')}
          />
          <WellnessCard
            icon="shield-checkmark" label="Insurance" sub="HSA savings"
            bgColor="#FFF4ED" iconColor={colors.accent}
            onPress={() => router.push('/(tabs)/fintech')}
          />
        </View>

        {/* ── HEALTH DIMENSIONS (floating card) ── */}
        <Text style={s.sectionTitle}>Health Dimensions</Text>
        <View style={s.card}>
          {(['exercise', 'sleep', 'voice', 'discipline'] as const).map((key, i) => {
            const meta = SUB_SCORE_META[key];
            const val = subScores?.[key] ?? 0;
            return (
              <View key={key} style={[s.dimRow, i > 0 && { marginTop: 14 }]}>
                <View style={s.dimLeft}>
                  <View style={[s.dimIcon, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name={meta.icon as any} size={12} color={colors.primary} />
                  </View>
                  <Text style={s.dimLabel}>{meta.label}</Text>
                </View>
                <View style={s.dimBarBg}>
                  <View style={[
                    s.dimBar,
                    {
                      width: `${val}%` as any,
                      backgroundColor: val > 70 ? colors.health.good : val > 40 ? colors.health.warning : colors.health.danger,
                    },
                  ]} />
                </View>
                <Text style={s.dimScore}>{val}</Text>
              </View>
            );
          })}
        </View>

        {/* ── CONNECT NUDGE (floating, peach accent) ── */}
        {!isConnected && (
          <TouchableOpacity style={s.nudge} onPress={() => router.push('/patch-connect')}>
            <View style={s.nudgeIconBox}>
              <Ionicons name="hardware-chip-outline" size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.nudgeTitle}>Connect ARA Pod</Text>
              <Text style={s.nudgeSub}>Real-time biometrics via BLE</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.accent} />
          </TouchableOpacity>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Inline Sub-components ────────────────────────────────────────────────────

function VitalPill({ icon, value, unit, color }: { icon: any; value: string; unit: string; color: string }) {
  return (
    <View style={[s.vitalPill, elevation.low]}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[s.vitalVal, { color }]}>{value}</Text>
      <Text style={s.vitalUnit}>{unit}</Text>
    </View>
  );
}

function WellnessCard({ icon, label, sub, bgColor, iconColor, onPress }: {
  icon: any; label: string; sub: string;
  bgColor: string; iconColor: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[s.wellnessCard, elevation.float]} onPress={onPress} activeOpacity={0.85}>
      <View style={[s.wellnessIcon, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={s.wellnessLabel}>{label}</Text>
      <Text style={s.wellnessSub}>{sub}</Text>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  greeting: { fontSize: fonts.sizes.sm, color: colors.text.secondary, fontWeight: '500' },
  name: { fontSize: fonts.sizes.xxl, color: colors.text.primary, fontWeight: '800', marginTop: 2 },

  podChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.full, backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border, ...elevation.low,
  },
  podChipActive: { borderColor: colors.health.good + '66', backgroundColor: '#F0FAF5' },
  podDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.text.muted },
  podDotActive: { backgroundColor: colors.health.good },
  podText: { fontSize: fonts.sizes.xs, fontWeight: '700', color: colors.text.muted },

  // Hero Score Card
  heroCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl,
    flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md,
    ...elevation.raised,
  },
  heroLeft: { flex: 0 },
  heroRight: { flex: 1, paddingLeft: spacing.lg },
  heroLabel: {
    fontSize: fonts.sizes.xs, fontWeight: '800', color: colors.primary,
    letterSpacing: 1.5, marginBottom: 4,
  },
  heroScore: { fontSize: 56, fontWeight: '900', color: colors.text.primary, lineHeight: 60 },
  heroStatus: { fontSize: fonts.sizes.sm, color: colors.text.secondary, marginTop: 2 },
  streakPill: {
    backgroundColor: colors.accent + '18', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.full, alignSelf: 'flex-start', marginTop: 8,
  },
  streakText: { fontSize: fonts.sizes.xs, color: colors.accent, fontWeight: '700' },
  ringPlaceholder: {
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: colors.surfaceElevated,
  },

  // Vital pills
  vitalsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  vitalPill: {
    flex: 1, alignItems: 'center', gap: 2, paddingVertical: 12,
    backgroundColor: colors.surface, borderRadius: radius.lg,
  },
  vitalVal: { fontSize: fonts.sizes.xl, fontWeight: '800' },
  vitalUnit: { fontSize: fonts.sizes.xs, color: colors.text.muted, fontWeight: '600' },

  // Generic floating card
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    marginBottom: spacing.md, ...elevation.float,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  cardTitle: { flex: 1, fontSize: fonts.sizes.md, fontWeight: '700', color: colors.text.primary },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  liveDotOn: { backgroundColor: colors.health.good },

  // Section title
  sectionTitle: {
    fontSize: fonts.sizes.sm, fontWeight: '700', color: colors.text.secondary,
    letterSpacing: 0.5, marginBottom: spacing.sm, marginTop: spacing.xs,
  },

  // 2x2 Wellness grid
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  wellnessCard: {
    width: (W - spacing.lg * 2 - spacing.sm) / 2,
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
  },
  wellnessIcon: {
    width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  wellnessLabel: { fontSize: fonts.sizes.md, fontWeight: '700', color: colors.text.primary },
  wellnessSub: { fontSize: fonts.sizes.xs, color: colors.text.muted, marginTop: 2 },

  // Dimension bars
  dimRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dimLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 100 },
  dimIcon: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  dimLabel: { fontSize: fonts.sizes.xs, color: colors.text.secondary, fontWeight: '600' },
  dimBarBg: { flex: 1, height: 6, backgroundColor: colors.surfaceElevated, borderRadius: radius.full, overflow: 'hidden' },
  dimBar: { height: 6, borderRadius: radius.full },
  dimScore: { fontSize: fonts.sizes.xs, fontWeight: '800', color: colors.text.primary, width: 28, textAlign: 'right' },

  // Nudge card
  nudge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1.5, borderColor: colors.accent + '30', ...elevation.float,
  },
  nudgeIconBox: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.accent + '15', alignItems: 'center', justifyContent: 'center',
  },
  nudgeTitle: { fontSize: fonts.sizes.md, fontWeight: '700', color: colors.text.primary },
  nudgeSub: { fontSize: fonts.sizes.xs, color: colors.text.muted, marginTop: 2 },
});
