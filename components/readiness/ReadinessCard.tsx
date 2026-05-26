/**
 * PART:   ReadinessCard — circular score + level badge + breakdown bars
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  36s — Daily Readiness Score UI
 * TASK:   Render readiness score with visual level indicator
 * SCOPE:  IN: useReadiness hook
 *         OUT: Dashboard BentoGrid widget slot
 */

import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';
import { useReadiness } from '@/hooks/useReadiness';
import type { ReadinessLevel } from '@/services/readiness/ReadinessService';

const LEVEL_COLORS: Record<ReadinessLevel, string> = {
  rest: '#EF4444',
  light: '#F59E0B',
  moderate: '#10B981',
  peak: '#8B5CF6',
};

const LEVEL_LABELS: Record<ReadinessLevel, string> = {
  rest: 'Nghỉ ngơi',
  light: 'Nhẹ nhàng',
  moderate: 'Tốt',
  peak: 'Tuyệt vời',
};

function BreakdownBar({ label, value, color }: { label: string; value: number; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={s.barRow}>
      <Text style={[s.barLabel, { color: colors.text.muted }]}>{label}</Text>
      <View style={[s.barTrack, { backgroundColor: colors.border }]}>
        <View style={[s.barFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
      <Text style={[s.barValue, { color: colors.text.muted }]}>{value}</Text>
    </View>
  );
}

export function ReadinessCard() {
  const { colors, fonts } = useTheme();
  const { score, level, message, breakdown, isLoading } = useReadiness();
  const levelColor = LEVEL_COLORS[level];
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  if (isLoading) {
    return <View style={s.container}><Text style={{ color: colors.text.muted }}>Đang tải...</Text></View>;
  }

  return (
    <View style={[s.container, { backgroundColor: colors.surface }]}>
      {/* Score circle */}
      <View style={s.scoreSection}>
        <Svg width={100} height={100}>
          <Circle cx={50} cy={50} r={radius} stroke={colors.border} strokeWidth={8} fill="none" />
          <Circle cx={50} cy={50} r={radius} stroke={levelColor} strokeWidth={8}
            fill="none" strokeDasharray={circumference} strokeDashoffset={circumference - progress}
            strokeLinecap="round" rotation={-90} origin="50,50" />
        </Svg>
        <View style={s.scoreOverlay}>
          <Text style={[s.scoreText, { color: colors.text.primary, fontFamily: fonts.bold }]}>{score}</Text>
          <View style={[s.badge, { backgroundColor: levelColor + '20' }]}>
            <Text style={[s.badgeText, { color: levelColor, fontFamily: fonts.semibold }]}>
              {LEVEL_LABELS[level]}
            </Text>
          </View>
        </View>
      </View>

      {/* Message */}
      <Text style={[s.message, { color: colors.text.secondary, fontFamily: fonts.regular }]}>{message}</Text>

      {/* Breakdown */}
      <View style={s.breakdownSection}>
        <BreakdownBar label="Giấc ngủ" value={breakdown.sleep} color="#6366F1" />
        <BreakdownBar label="Phục hồi" value={breakdown.recovery} color="#10B981" />
        <BreakdownBar label="Hoạt động" value={breakdown.activity} color="#F59E0B" />
        <BreakdownBar label="Căng thẳng" value={breakdown.stress} color="#EF4444" />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { borderRadius: 20, padding: 20 },
  scoreSection: { alignItems: 'center', marginBottom: 12 },
  scoreOverlay: { position: 'absolute', top: 25, alignItems: 'center' },
  scoreText: { fontSize: 28, lineHeight: 32 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 2 },
  badgeText: { fontSize: 10 },
  message: { fontSize: 13, textAlign: 'center', marginBottom: 16 },
  breakdownSection: { gap: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { fontSize: 11, width: 64 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  barValue: { fontSize: 10, width: 24, textAlign: 'right' },
});
