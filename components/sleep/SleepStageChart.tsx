/**
 * PART:   SleepStageChart — stacked bar chart (Deep/Light/REM/Awake)
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  26s — Sleep Service
 * TASK:   Weekly stacked bar showing sleep stage minutes per night
 * SCOPE:  IN: SleepSession[] (7 nights)
 *         OUT: none (display only)
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import type { SleepSession } from '@/services/sleep/SleepService';

interface Props {
  sessions: SleepSession[];
}

const STAGE_COLORS = {
  deep:  '#3B82F6',
  rem:   '#8B5CF6',
  light: '#93C5FD',
  awake: '#E5E7EB',
} as const;

const MAX_H = 100;
const MAX_MIN = 540; // 9h cap for chart scale

export function SleepStageChart({ sessions }: Props) {
  const { colors, fonts } = useTheme();
  const last7 = sessions.slice(0, 7).reverse();

  if (last7.length === 0) {
    return (
      <View style={[s.empty, { backgroundColor: colors.surfaceElevated }]}>
        <Text style={[s.emptyText, { color: colors.text.muted, fontFamily: fonts.regular }]}>
          Chưa có dữ liệu giấc ngủ
        </Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.bars}>
        {last7.map((session) => {
          const scale = Math.min(1, session.total_minutes / MAX_MIN);
          const totalPx = MAX_H * scale;
          const deep  = (session.deep_minutes  / (session.total_minutes || 1)) * totalPx;
          const rem   = (session.rem_minutes   / (session.total_minutes || 1)) * totalPx;
          const awake = (session.awake_minutes / (session.total_minutes || 1)) * totalPx;
          const light = totalPx - deep - rem - awake;
          const dayLabel = new Date(session.date).toLocaleDateString('vi-VN', { weekday: 'short' }).slice(0, 2);

          return (
            <View key={session.id} style={s.barCol}>
              <View style={[s.bar, { height: MAX_H }]}>
                {[
                  { h: deep,  color: STAGE_COLORS.deep  },
                  { h: rem,   color: STAGE_COLORS.rem   },
                  { h: light, color: STAGE_COLORS.light },
                  { h: awake, color: STAGE_COLORS.awake },
                ].reverse().map(({ h, color }) => (
                  <View key={color} style={{ height: Math.max(0, h), backgroundColor: color }} />
                ))}
              </View>
              <Text style={[s.dayLabel, { color: colors.text.muted, fontFamily: fonts.regular }]}>
                {dayLabel}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={s.legend}>
        {([
          { label: 'Deep', color: STAGE_COLORS.deep },
          { label: 'REM',  color: STAGE_COLORS.rem  },
          { label: 'Light',color: STAGE_COLORS.light },
          { label: 'Thức', color: STAGE_COLORS.awake },
        ] as const).map(({ label, color }) => (
          <View key={label} style={s.legendItem}>
            <View style={[s.dot, { backgroundColor: color, borderWidth: color === STAGE_COLORS.awake ? 1 : 0, borderColor: colors.border }]} />
            <Text style={[s.legendText, { color: colors.text.muted, fontFamily: fonts.regular }]}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 12 },
  empty: { height: 80, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 120 },
  barCol: { alignItems: 'center', gap: 4 },
  bar: { width: 28, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  dayLabel: { fontSize: 10 },
  legend: { flexDirection: 'row', gap: 12, justifyContent: 'center', flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 2 },
  legendText: { fontSize: 11 },
});
