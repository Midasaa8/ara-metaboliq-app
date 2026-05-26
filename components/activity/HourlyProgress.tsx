/**
 * PART:   HourlyProgress — 12 activity circles 9AM–8PM (Fitbit-style)
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  30s — Reminders to Move
 * TASK:   Circle grid: green=met, grey=pending, red=missed, slash=disabled
 *         Tap to mute an hour, long-press to see steps
 * SCOPE:  IN: useRemindToMove hook
 *         OUT: none (display + toggle)
 */

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Bell, BellOff } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import type { HourData } from '@/services/activity/RemindToMoveService';

interface Props {
  hours: HourData[];
  summary: { met: number; total: number };
  enabled: boolean;
  onToggleGlobal: (v: boolean) => void;
  onToggleHour: (h: number) => void;
}

function formatHour(h: number): string {
  return h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h - 12}PM`;
}

function HourCircle({ data, onPress }: { data: HourData; onPress: () => void }) {
  const { colors } = useTheme();
  const bgColor = {
    met:      '#4ECFB5',
    missed:   '#EF4444',
    pending:  colors.surfaceElevated,
    disabled: colors.border,
  }[data.status];

  const textColor = (data.status === 'met' || data.status === 'missed') ? '#FFF' : colors.text.muted;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={s.circleWrap}>
      <View style={[s.circle, { backgroundColor: bgColor, borderColor: bgColor === colors.surfaceElevated ? colors.border : 'transparent' }]}>
        {data.status === 'disabled'
          ? <Text style={[s.slash, { color: colors.text.muted }]}>–</Text>
          : <Text style={[s.circleLabel, { color: textColor }]}>{formatHour(data.hour)}</Text>
        }
      </View>
      {data.status === 'met' && (
        <Text style={[s.steps, { color: '#4ECFB5' }]}>{data.steps}</Text>
      )}
    </TouchableOpacity>
  );
}

export function HourlyProgress({ hours, summary, enabled, onToggleGlobal, onToggleHour }: Props) {
  const { colors, fonts } = useTheme();

  return (
    <View style={[s.card, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={[s.title, { color: colors.text.primary, fontFamily: fonts.bold }]}>
            Nhắc đứng dậy
          </Text>
          <Text style={[s.sub, { color: colors.text.muted, fontFamily: fonts.regular }]}>
            {summary.met}/{summary.total} giờ hoạt động hôm nay
          </Text>
        </View>
        <TouchableOpacity
          style={[s.toggleBtn, { backgroundColor: enabled ? colors.primary + '22' : colors.surfaceElevated }]}
          onPress={() => onToggleGlobal(!enabled)}
        >
          {enabled
            ? <Bell size={18} color={colors.primary} strokeWidth={2} />
            : <BellOff size={18} color={colors.text.muted} strokeWidth={2} />
          }
        </TouchableOpacity>
      </View>

      {/* 12 circles grid */}
      <View style={s.grid}>
        {hours.map((h) => (
          <HourCircle key={h.hour} data={h} onPress={() => onToggleHour(h.hour)} />
        ))}
      </View>

      {/* Legend */}
      <View style={s.legend}>
        {([['#4ECFB5', 'Đạt 250 bước'], [colors.surfaceElevated, 'Chưa đến'], ['#EF4444', 'Bỏ lỡ']] as const).map(([c, label]) => (
          <View key={label} style={s.legendItem}>
            <View style={[s.dot, { backgroundColor: c }]} />
            <Text style={[s.legendText, { color: colors.text.muted, fontFamily: fonts.regular }]}>{label}</Text>
          </View>
        ))}
      </View>

      <Text style={[s.hint, { color: colors.text.muted, fontFamily: fonts.regular }]}>
        Nhấn vào giờ để tắt thông báo cho giờ đó
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 15 },
  sub: { fontSize: 13, marginTop: 2 },
  toggleBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  circleWrap: { alignItems: 'center', gap: 2 },
  circle: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  circleLabel: { fontSize: 11, fontWeight: '700' },
  slash: { fontSize: 18 },
  steps: { fontSize: 9, fontWeight: '600' },
  legend: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11 },
  hint: { fontSize: 11, textAlign: 'center' },
});
