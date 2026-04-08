/**
 * PART:   Digital Twin / Sleep Screen
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  6 — Sleep Tracker
 * READS:  AGENTS.md §7, PLAN_B §6 Sleep Tracker, SONNET_PHASES.md §PHASE 6,
 *         GEMINI_PHASES.md §PHASE 6 UI elements
 * TASK:   Sleep timeline, HRV (SDNN), ChronoOS prediction, Digital Twin bio age,
 *         mini PPG waveform replay
 * SCOPE:  IN: UI, useSleepData hook, hiển thị kết quả
 *         OUT: LSTM inference (Opus Phase 18), HRV computation (server Phase 13)
 */

import { useRef, useEffect } from 'react';
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
import Svg, { Path, Rect } from 'react-native-svg';
import { colors, fonts, spacing, radius } from '@/constants/theme';
import { useSleepData } from '@/hooks/useSleepData';
import type { SleepStage } from '@/types/health';

// ── Màu từng giai đoạn giấc ngủ ──
const STAGE_COLORS: Record<SleepStage['stage'], string> = {
  Light: colors.secondary + 'BB', // Heal Green nhạt
  Deep:  colors.primary,           // Trust Blue
  REM:   colors.health.info,       // Info Blue
  Awake: colors.health.danger + '99',
};

const STAGE_LABELS: Record<SleepStage['stage'], string> = {
  Light: 'Ngủ nhẹ',
  Deep:  'Ngủ sâu',
  REM:   'REM',
  Awake: 'Thức',
};

// ── Helper: phút → "Xh Ym" ──
function fmtMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}p`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}p`;
}

// ── Sleep Timeline: stacked horizontal bar (SVG) ──
function SleepTimeline({ stages, totalMin }: { stages: SleepStage[]; totalMin: number }) {
  const BAR_H    = 32;
  const BAR_W    = 320; // sẽ bị scale bởi container
  let cursor = 0;

  return (
    <View style={styles.timelineCard}>
      <Text style={styles.timelineTitle}>TIMELINE ĐÊM QUA</Text>
      {/* Legend */}
      <View style={styles.legendRow}>
        {(Object.keys(STAGE_COLORS) as SleepStage['stage'][]).map((s) => (
          <View key={s} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: STAGE_COLORS[s] }]} />
            <Text style={styles.legendLabel}>{STAGE_LABELS[s]}</Text>
          </View>
        ))}
      </View>
      {/* Bar */}
      <View style={styles.timelineBarWrapper}>
        <Svg width="100%" height={BAR_H} viewBox={`0 0 ${BAR_W} ${BAR_H}`} preserveAspectRatio="none">
          {stages.map((stage, i) => {
            const pct = stage.durationMin / totalMin;
            const w   = pct * BAR_W;
            const x   = cursor;
            cursor   += w;
            return (
              <Rect
                key={i}
                x={x}
                y={0}
                width={w - 1}
                height={BAR_H}
                fill={STAGE_COLORS[stage.stage]}
                rx={i === 0 ? 6 : 0}
              />
            );
          })}
        </Svg>
        {/* Time labels */}
        <View style={styles.timelineLabels}>
          <Text style={styles.timelineTime}>
            {new Date(Date.now() - 8 * 3600 * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text style={styles.timelineTime}>
            {new Date(Date.now() - 30 * 60 * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Mini PPG waveform (SVG sin-wave giả lập) ──
function MiniPPGWave() {
  const WAVE_W = 320;
  const WAVE_H = 56;
  // Tạo đường SVG path hình sin với biến động nhỏ — mô phỏng PPG 30s
  const points: string[] = [];
  for (let x = 0; x <= WAVE_W; x += 3) {
    // sin chính + harmonic nhỏ để giống PPG thật
    const y = WAVE_H / 2 - 14 * Math.sin((x / WAVE_W) * 12 * Math.PI)
              - 5 * Math.sin((x / WAVE_W) * 24 * Math.PI + 0.5);
    points.push(`${x === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const d = points.join(' ');
  return (
    <View style={styles.ppgCard}>
      <View style={styles.ppgHeader}>
        <Text style={styles.timelineTitle}>PPG — ĐÊM QUA (30 giây)</Text>
        <View style={styles.ppgBadge}>
          <Text style={styles.ppgBadgeText}>REPLAY</Text>
        </View>
      </View>
      <Svg width="100%" height={WAVE_H} viewBox={`0 0 ${WAVE_W} ${WAVE_H}`} preserveAspectRatio="none">
        <Path d={d} stroke={colors.health.info} strokeWidth={1.8} fill="none" opacity={0.85} />
      </Svg>
      <Text style={styles.ppgNote}>
        TODO Phase 13: PPG thật từ ARA Pod · IBI → HR / SpO₂ / HRV
      </Text>
    </View>
  );
}

// ── Stats card nhỏ ──
function StatChip({
  label, value, unit, icon, color,
}: {
  label: string; value: string | number; unit?: string;
  icon: keyof typeof Ionicons.glyphMap; color: string;
}) {
  return (
    <View style={styles.statChip}>
      <View style={[styles.statIconBox, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}<Text style={styles.statUnit}>{unit}</Text></Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── Main Screen ──
export default function TwinScreen() {
  const { data, isLoading, refetch } = useSleepData();

  // Pulsing glow animation cho ChronoOS card
  const glowAnim = useRef(new Animated.Value(0.7)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.7, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const lightMin = data.stages.filter((s) => s.stage === 'Light').reduce((t, s) => t + s.durationMin, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Digital Twin</Text>
          <Text style={styles.subtitle}>Sleep · HRV · ChronoOS</Text>
        </View>
        <TouchableOpacity onPress={refetch} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Đang tải dữ liệu giấc ngủ…</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ── Sleep Score tổng hợp ── */}
          <View style={styles.scoreBanner}>
            <View style={styles.scoreBannerLeft}>
              <Text style={styles.scoreBannerLabel}>ĐIỂM GIẤC NGỦ</Text>
              <Text style={[styles.scoreBannerValue, { color: data.sleep_score >= 80 ? colors.health.good : data.sleep_score >= 60 ? colors.health.info : colors.health.warning }]}>
                {data.sleep_score}
              </Text>
              <Text style={styles.scoreBannerSub}>/ 100</Text>
            </View>
            <View style={styles.scoreBannerRight}>
              <Text style={styles.scoreBannerDuration}>{fmtMin(data.totalMin)}</Text>
              <Text style={styles.scoreBannerDurationLabel}>Tổng giờ ngủ</Text>
            </View>
          </View>

          {/* ── Stats row: Deep / REM / Thức / HRV ── */}
          <Text style={styles.sectionHeading}>THỐNG KÊ</Text>
          <View style={styles.statsRow}>
            <StatChip label="Ngủ sâu"  value={fmtMin(data.deepMin)}  icon="moon"    color={colors.primary}       />
            <StatChip label="REM"       value={fmtMin(data.remMin)}   icon="sparkles" color={colors.health.info}  />
            <StatChip label="Ngủ nhẹ"  value={fmtMin(lightMin)}       icon="partly-sunny" color={colors.secondary} />
            <StatChip label="HRV SDNN" value={data.hrv_sdnn} unit="ms" icon="heart"  color={data.hrv_sdnn >= 40 ? colors.health.good : colors.health.warning} />
          </View>

          {/* ── Sleep Timeline ── */}
          <SleepTimeline stages={data.stages} totalMin={data.totalMin} />

          {/* ── ChronoOS prediction ── */}
          <Animated.View style={[styles.chronosCard, { opacity: glowAnim }]}>
            <View style={styles.chronosHeader}>
              <Ionicons name="analytics" size={20} color={colors.primary} />
              <Text style={styles.chronosTitle}>ChronoOS Prediction</Text>
              <View style={styles.chronosBadge}>
                <Text style={styles.chronosBadgeText}>AI</Text>
              </View>
            </View>
            <Text style={styles.chronosScore}>{data.predicted_tomorrow_score}</Text>
            <Text style={styles.chronosLabel}>Health Score dự đoán ngày mai</Text>
            <Text style={styles.chronosTodo}>TODO Phase 18 (Opus): LSTM ChronoOS TFT thật</Text>
          </Animated.View>

          {/* ── Digital Twin Bio Age ── */}
          <View style={styles.bioAgeCard}>
            <View style={styles.bioAgeLeft}>
              <Text style={styles.bioAgeTitle}>🧬 Digital Twin</Text>
              <Text style={styles.bioAgeDesc}>Tuổi sinh học ước tính từ HRV, SpO₂, giấc ngủ</Text>
              <Text style={styles.bioAgeTodo}>TODO Phase 17: SVG avatar 2D</Text>
            </View>
            <View style={styles.bioAgeRight}>
              <Text style={styles.bioAgeValue}>{data.bio_age}</Text>
              <Text style={styles.bioAgeUnit}>tuổi</Text>
            </View>
          </View>

          {/* ── Mini PPG Waveform ── */}
          <MiniPPGWave />

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Styles ──
const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm,
  },
  title:    { color: colors.text.primary, fontSize: fonts.sizes.xl, fontWeight: '700' },
  subtitle: { color: colors.text.secondary, fontSize: fonts.sizes.sm, marginTop: 2 },
  refreshBtn: {
    width: 36, height: 36, borderRadius: radius.full,
    backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center',
  },
  loadingBox:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText:  { color: colors.text.secondary, fontSize: fonts.sizes.sm },
  scroll:       { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },

  // ── Score banner ──
  scoreBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl,
    marginTop: spacing.sm,
  },
  scoreBannerLeft:         { gap: 4 },
  scoreBannerLabel:        { color: colors.text.secondary, fontSize: fonts.sizes.xs, textTransform: 'uppercase', letterSpacing: 1 },
  scoreBannerValue:        { fontSize: fonts.sizes.hero, fontWeight: '800', lineHeight: 60 },
  scoreBannerSub:          { color: colors.text.muted, fontSize: fonts.sizes.md },
  scoreBannerRight:        { alignItems: 'flex-end', gap: 4 },
  scoreBannerDuration:     { color: colors.text.primary, fontSize: fonts.sizes.xxl, fontWeight: '700' },
  scoreBannerDurationLabel:{ color: colors.text.secondary, fontSize: fonts.sizes.xs },

  // ── Stats row ──
  sectionHeading: { color: colors.text.secondary, fontSize: fonts.sizes.xs, textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.sm },
  statsRow:       { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  statChip: {
    flex: 1, minWidth: '22%',
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.sm, alignItems: 'center', gap: 4,
  },
  statIconBox: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  statValue:   { fontSize: fonts.sizes.md, fontWeight: '800' },
  statUnit:    { fontSize: fonts.sizes.xs, fontWeight: '400' },
  statLabel:   { color: colors.text.secondary, fontSize: 9, textAlign: 'center' },

  // ── Sleep Timeline ──
  timelineCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, gap: spacing.sm,
  },
  timelineTitle: { color: colors.text.secondary, fontSize: fonts.sizes.xs, textTransform: 'uppercase', letterSpacing: 1 },
  legendRow:     { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  legendItem:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:     { width: 8, height: 8, borderRadius: 4 },
  legendLabel:   { color: colors.text.secondary, fontSize: fonts.sizes.xs },
  timelineBarWrapper: { borderRadius: radius.sm, overflow: 'hidden', gap: 4 },
  timelineLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  timelineTime:   { color: colors.text.muted, fontSize: fonts.sizes.xs },

  // ── ChronoOS ──
  chronosCard: {
    backgroundColor: colors.primary + '12',
    borderRadius: radius.lg, padding: spacing.xl,
    borderWidth: 1, borderColor: colors.primary + '40',
    gap: 4,
  },
  chronosHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  chronosTitle:  { color: colors.primary, fontSize: fonts.sizes.md, fontWeight: '700', flex: 1 },
  chronosBadge: {
    backgroundColor: colors.primary + '25', borderRadius: radius.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  chronosBadgeText: { color: colors.primary, fontSize: fonts.sizes.xs, fontWeight: '800' },
  chronosScore:     { color: colors.text.primary, fontSize: fonts.sizes.hero, fontWeight: '800', lineHeight: 56 },
  chronosLabel:     { color: colors.text.secondary, fontSize: fonts.sizes.sm },
  chronosTodo:      { color: colors.text.muted, fontSize: fonts.sizes.xs, marginTop: spacing.sm, fontStyle: 'italic' },

  // ── Bio Age ──
  bioAgeCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, gap: spacing.md,
  },
  bioAgeLeft:   { flex: 1, gap: 4 },
  bioAgeTitle:  { color: colors.text.primary, fontSize: fonts.sizes.lg, fontWeight: '700' },
  bioAgeDesc:   { color: colors.text.secondary, fontSize: fonts.sizes.xs, lineHeight: 18 },
  bioAgeTodo:   { color: colors.text.muted, fontSize: fonts.sizes.xs, fontStyle: 'italic', marginTop: 2 },
  bioAgeRight:  { alignItems: 'center' },
  bioAgeValue:  { color: colors.primary, fontSize: fonts.sizes.hero, fontWeight: '800', lineHeight: 56 },
  bioAgeUnit:   { color: colors.text.muted, fontSize: fonts.sizes.sm },

  // ── Mini PPG ──
  ppgCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, gap: spacing.sm, overflow: 'hidden',
  },
  ppgHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ppgBadge: {
    backgroundColor: colors.health.info + '25', borderRadius: radius.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  ppgBadgeText: { color: colors.health.info, fontSize: fonts.sizes.xs, fontWeight: '800' },
  ppgNote:      { color: colors.text.muted, fontSize: fonts.sizes.xs, fontStyle: 'italic' },
});
