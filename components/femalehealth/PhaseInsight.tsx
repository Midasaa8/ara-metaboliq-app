/**
 * PART:   PhaseInsight — phase-appropriate health recommendations
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  32s — Female Health UI
 * TASK:   Show current cycle phase card with emoji, name, exercise + nutrition tips
 * SCOPE:  IN: currentPhase, dayOfCycle, nextPeriodDate from useFemaleHealth
 *         OUT: none (display only)
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import type { CyclePhase } from '@/services/health/FemaleHealthService';

interface Props {
  phase: CyclePhase | null;
  dayOfCycle: number | null;
  nextPeriodDate: string | null;
  avgCycleLength: number;
}

const PHASE_INFO: Record<CyclePhase, {
  emoji: string; name: string; color: string;
  exerciseTip: string; nutritionTip: string; description: string;
}> = {
  menstrual: {
    emoji: '🔴', name: 'Chu kỳ kinh nguyệt', color: '#EF4444',
    exerciseTip: 'Nghỉ ngơi hoặc yoga nhẹ — hạn chế tập nặng',
    nutritionTip: 'Bổ sung sắt (thịt đỏ, rau xanh), magiê để giảm chuột rút',
    description: 'Cơ thể đang phục hồi. Hãy ưu tiên nghỉ ngơi và tự chăm sóc.',
  },
  follicular: {
    emoji: '🟢', name: 'Pha nang trứng', color: '#4ECFB5',
    exerciseTip: 'Năng lượng cao — tốt để tập mạnh, HIIT, strength training!',
    nutritionTip: 'Tăng protein và carb phức hợp để hỗ trợ năng lượng',
    description: 'Nội tiết tố tăng cao, năng lượng dồi dào. Thời điểm tốt nhất để tập luyện.',
  },
  ovulation: {
    emoji: '🟡', name: 'Pha rụng trứng', color: '#F59E0B',
    exerciseTip: 'Đỉnh sức mạnh — phù hợp tập nặng hoặc đua tranh',
    nutritionTip: 'Bổ sung kẽm và chất chống oxy hóa (rau củ màu sắc)',
    description: 'Cửa sổ màu mỡ. Nội tiết LH đỉnh cao, cơ thể mạnh mẽ nhất.',
  },
  luteal: {
    emoji: '🔵', name: 'Pha hoàng thể', color: '#6366F1',
    exerciseTip: 'Giảm cường độ — đi bộ, yoga, pilates phù hợp hơn',
    nutritionTip: 'Tránh caffeine và đường; tăng magiê để giảm PMS',
    description: 'Progesterone tăng, có thể cảm thấy mệt hoặc thay đổi tâm trạng.',
  },
};

export function PhaseInsight({ phase, dayOfCycle, nextPeriodDate, avgCycleLength }: Props) {
  const { colors, fonts } = useTheme();

  if (!phase || !dayOfCycle) {
    return (
      <View style={[s.empty, { backgroundColor: colors.surfaceElevated, borderRadius: 14 }]}>
        <Text style={[s.emptyText, { color: colors.text.muted, fontFamily: fonts.regular }]}>
          Hãy ghi lại chu kỳ để xem gợi ý sức khoẻ phù hợp
        </Text>
      </View>
    );
  }

  const info = PHASE_INFO[phase];
  const nextDays = nextPeriodDate
    ? Math.max(0, Math.ceil((new Date(nextPeriodDate).getTime() - Date.now()) / 86400_000))
    : null;

  return (
    <View style={[s.card, { backgroundColor: info.color + '12', borderColor: info.color + '30' }]}>
      {/* Phase header */}
      <View style={s.header}>
        <Text style={s.phaseEmoji}>{info.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[s.phaseName, { color: info.color, fontFamily: fonts.bold }]}>{info.name}</Text>
          <Text style={[s.cycleDay, { color: colors.text.muted, fontFamily: fonts.regular }]}>
            Ngày {dayOfCycle} / {avgCycleLength} của chu kỳ
          </Text>
        </View>
        {nextDays !== null && (
          <View style={[s.nextBadge, { backgroundColor: info.color + '22' }]}>
            <Text style={[s.nextText, { color: info.color, fontFamily: fonts.bold }]}>
              {nextDays}d
            </Text>
            <Text style={[s.nextSub, { color: info.color, fontFamily: fonts.regular }]}>đến kỳ</Text>
          </View>
        )}
      </View>

      <Text style={[s.desc, { color: colors.text.secondary, fontFamily: fonts.regular }]}>
        {info.description}
      </Text>

      {/* Tips */}
      <View style={s.tips}>
        <View style={s.tipRow}>
          <Text style={s.tipEmoji}>🏃</Text>
          <Text style={[s.tipText, { color: colors.text.primary, fontFamily: fonts.regular }]}>
            {info.exerciseTip}
          </Text>
        </View>
        <View style={s.tipRow}>
          <Text style={s.tipEmoji}>🥗</Text>
          <Text style={[s.tipText, { color: colors.text.primary, fontFamily: fonts.regular }]}>
            {info.nutritionTip}
          </Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  phaseEmoji: { fontSize: 32 },
  phaseName: { fontSize: 15 },
  cycleDay: { fontSize: 12, marginTop: 2 },
  nextBadge: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  nextText: { fontSize: 16, lineHeight: 20 },
  nextSub: { fontSize: 10 },
  desc: { fontSize: 13, lineHeight: 19 },
  tips: { gap: 10 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tipEmoji: { fontSize: 18, marginTop: -2 },
  tipText: { flex: 1, fontSize: 13, lineHeight: 18 },
  empty: { height: 80, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyText: { fontSize: 13, textAlign: 'center' },
});
