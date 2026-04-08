/**
 * PART:   Home Dashboard Screen
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  8 — Health Score Engine (upgraded from Phase 3)
 * READS:  AGENTS.md §7, PLAN_B §XI Home Screen, §3 Health Score Dashboard
 * TASK:   Health Score ring + sub-score breakdown + weakest-area insight
 * SCOPE:  IN: layout, useHealthScore hook, usePatchConnection, VitalCard, HealthScoreRing
 *         OUT: H_score formula (server Phase 19), real BLE data (Phase 11)
 */

import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { HealthScoreRing } from '@/components/health/HealthScoreRing';
import { VitalCard } from '@/components/health/VitalCard';
import { PPGWaveform } from '@/components/health/PPGWaveform';
import { useHealthScore } from '@/hooks/useHealthScore';
import { usePatchConnection } from '@/hooks/usePatchConnection';
import { useUserStore } from '@/store/userStore';
import { useHealthStore } from '@/store/healthStore';
import { colors, fonts, spacing, radius } from '@/constants/theme';
import { getWeakestAreas, getScoreTier, SUB_SCORE_META } from '@/services/ai/HealthScore';

export default function HomeScreen() {
  const router = useRouter();
  const firstName = useUserStore((s) => s.profile?.fullName?.split(' ')[0] ?? 'bạn');
  const streakDays = useHealthStore((s) => s.streakDays);

  const { score, subScores, isLoading } = useHealthScore();
  const { isConnected, latestReading } = usePatchConnection();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? '☀️ Chào buổi sáng' : hour < 18 ? '🌤️ Buổi chiều' : '🌙 Buổi tối';

  const [tapCount, setTapCount] = useState(0);

  function handleSecretTap() {
    if (tapCount + 1 >= 5) {
      setTapCount(0);
      router.push('/demo-flow');
    } else {
      setTapCount(tapCount + 1);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.name}>{firstName} 👋</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push('/patch-connect')}
          accessibilityLabel="Kết nối Pod"
        >
          <Ionicons
            name={isConnected ? 'radio-button-on' : 'radio-button-off'}
            size={20}
            color={isConnected ? colors.health.good : colors.text.muted}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Health Score Ring (Secret: 5-tap for Demo Flow) ── */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleSecretTap}
          style={styles.ringSection}
        >
          {isLoading
            ? <View style={styles.ringPlaceholder} />
            : <HealthScoreRing score={score} size={210} thickness={15} subScores={subScores} />
          }
        </TouchableOpacity>

        {/* ── Weakest-area insight (Phase 8) ── */}
        {!isLoading && (() => {
          const weak = getWeakestAreas(subScores);
          const meta = SUB_SCORE_META[weak[0]];
          const tier = getScoreTier(subScores[weak[0]]);
          return (
            <View style={[styles.insightBox, { borderColor: tier.color + '55', backgroundColor: tier.bgColor }]}>
              <Ionicons name={meta.icon as React.ComponentProps<typeof Ionicons>['name']} size={16} color={tier.color} />
              <Text style={[styles.insightText, { color: tier.color }]}>
                Cần cải thiện: <Text style={{ fontWeight: '700' }}>{meta.label}</Text> ({subScores[weak[0]]}/100)
              </Text>
            </View>
          );
        })()}

        {/* ── Streak Banner ── */}
        {streakDays > 0 && (
          <View style={styles.streakBanner}>
            <Text style={styles.streakText}>🔥 {streakDays} ngày liên tục</Text>
          </View>
        )}

        {/* ── Sub-score Cards ── */}
        <View style={styles.cardsRow}>
          <VitalCard icon="fitness-outline" score={subScores.exercise} label="Vận động" onPress={() => router.push('/(tabs)/exercise')} />
          <VitalCard icon="moon-outline" score={subScores.sleep} label="Giấc ngủ" onPress={() => router.push('/(tabs)/twin')} />
          <VitalCard icon="mic-outline" score={subScores.voice} label="Giọng nói" onPress={() => router.push('/(tabs)/voice')} />
          <VitalCard icon="shield-checkmark-outline" score={subScores.discipline} label="Kỷ luật" />
        </View>

        {/* ── Vitals row (live from patch) ── */}
        {latestReading && (
          <View style={styles.vitalsRow}>
            <VitalPill icon="heart-outline" value={`${latestReading.hr} BPM`} color={colors.health.danger} />
            <VitalPill icon="water-outline" value={`${latestReading.spo2}%`} color={colors.secondary} />
            <VitalPill icon="thermometer-outline" value={`${latestReading.temperature.toFixed(1)}°C`} color={colors.health.warning} />
          </View>
        )}

        {/* ── Live PPG Waveform (Phase 10) ── */}
        <PPGWaveform hr={latestReading?.hr ?? 72} isConnected={isConnected} />

        {/* ── Quick Actions ── */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>⚡ Hành động nhanh</Text>

          <TouchableOpacity
            style={styles.ctaPrimary}
            onPress={() => router.push('/(tabs)/voice')}
            accessibilityLabel="Ghi âm giọng nói"
          >
            <Ionicons name="mic" size={20} color={colors.text.primary} />
            <Text style={styles.ctaPrimaryText}>🎙️ Ghi âm sáng nay</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ctaSecondary}
            onPress={() => router.push('/(tabs)/exercise')}
            accessibilityLabel="Bắt đầu tập"
          >
            <Ionicons name="camera-outline" size={20} color={colors.primary} />
            <Text style={styles.ctaSecondaryText}>📷 Bắt đầu tập</Text>
          </TouchableOpacity>
        </View>

        {/* ── Patch status ── */}
        <View style={[styles.patchRow, isConnected && styles.patchRowConnected]}>
          <View style={[styles.patchDot, { backgroundColor: isConnected ? colors.health.good : colors.text.muted }]} />
          <Ionicons
            name="hardware-chip-outline"
            size={14}
            color={isConnected ? colors.health.good : colors.text.muted}
          />
          <Text style={[styles.patchLabel, { color: isConnected ? colors.health.good : colors.text.muted }]}>
            {isConnected ? 'ARA Pod · DEMO MODE · 25 Hz' : 'Pod chưa kết nối'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Small inline components ────────────────────────────────────────────────────

function VitalPill({ icon, value, color }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  color: string;
}) {
  return (
    <View style={[styles.pill, { borderColor: color + '44' }]}>
      <Ionicons name={icon} size={13} color={color} />
      <Text style={[styles.pillText, { color }]}>{value}</Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxl, paddingHorizontal: spacing.lg },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  greeting: { color: colors.text.secondary, fontSize: fonts.sizes.sm },
  name: { color: colors.text.primary, fontSize: fonts.sizes.xl, fontWeight: '700', marginTop: 2 },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Ring
  ringSection: { alignItems: 'center', paddingVertical: spacing.lg },
  ringPlaceholder: { width: 210, height: 210, borderRadius: 105, backgroundColor: colors.surface },

  // Streak
  streakBanner: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.health.warning + '55',
  },
  streakText: { color: colors.health.warning, fontSize: fonts.sizes.sm, fontWeight: '600' },

  // Sub-score cards
  cardsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },

  // Weakest-area insight box (Phase 8)
  insightBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, marginBottom: spacing.sm,
  },
  insightText: { fontSize: fonts.sizes.sm, flex: 1 },

  // Vitals row
  vitalsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
  },
  pillText: { fontSize: fonts.sizes.xs, fontWeight: '600' },

  // Actions
  actionsSection: { marginTop: spacing.sm, gap: spacing.sm },
  sectionTitle: { color: colors.text.secondary, fontSize: fonts.sizes.sm, fontWeight: '600', marginBottom: spacing.xs },
  ctaPrimary: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  ctaPrimaryText: { color: colors.text.primary, fontSize: fonts.sizes.lg, fontWeight: '700' },
  ctaSecondary: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary + '66',
  },
  ctaSecondaryText: { color: colors.primary, fontSize: fonts.sizes.lg, fontWeight: '600' },

  // Patch
  patchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.lg,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    alignSelf: 'center',
  },
  patchRowConnected: {
    backgroundColor: colors.health.good + '15',
    borderWidth: 1,
    borderColor: colors.health.good + '40',
  },
  patchDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  patchLabel: { fontSize: fonts.sizes.xs, fontWeight: '600' },
});



