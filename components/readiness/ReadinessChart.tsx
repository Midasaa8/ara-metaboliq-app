/**
 * PART:   ReadinessChart — 7-day bar chart of daily readiness scores
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  36s — Daily Readiness Score UI
 * TASK:   Render weekly bars with color coding per readiness level
 * SCOPE:  IN: useReadiness hook (weeklyHistory)
 *         OUT: Dashboard / Readiness detail screen
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useReadiness } from '@/hooks/useReadiness';
import type { ReadinessLevel } from '@/services/readiness/ReadinessService';

const LEVEL_COLORS: Record<ReadinessLevel, string> = {
  rest: '#EF4444',
  light: '#F59E0B',
  moderate: '#10B981',
  peak: '#8B5CF6',
};

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function getShortDay(dateStr: string): string {
  const d = new Date(dateStr);
  return DAY_LABELS[d.getDay()] ?? '';
}

function getColor(score: number): string {
  if (score >= 80) return LEVEL_COLORS.peak;
  if (score >= 60) return LEVEL_COLORS.moderate;
  if (score >= 30) return LEVEL_COLORS.light;
  return LEVEL_COLORS.rest;
}

export function ReadinessChart() {
  const { colors, fonts } = useTheme();
  const { weeklyHistory, isLoading } = useReadiness();

  if (isLoading) {
    return <View style={s.container}><Text style={{ color: colors.text.muted }}>...</Text></View>;
  }

  // Pad to 7 days
  const bars = weeklyHistory.length > 0 ? weeklyHistory.slice(-7) : [];
  const maxH = 80;

  return (
    <View style={[s.container, { backgroundColor: colors.surface }]}>
      <Text style={[s.title, { color: colors.text.primary, fontFamily: fonts.semibold }]}>
        Readiness 7 ngày
      </Text>
      <View style={s.chartArea}>
        {bars.length === 0 && (
          <Text style={[s.empty, { color: colors.text.muted }]}>Chưa có dữ liệu</Text>
        )}
        {bars.map((r, idx) => {
          const h = (r.score / 100) * maxH;
          return (
            <View key={idx} style={s.barCol}>
              <View style={[s.bar, { height: h, backgroundColor: getColor(r.score) }]} />
              <Text style={[s.dayLabel, { color: colors.text.muted }]}>{getShortDay(r.date)}</Text>
              <Text style={[s.scoreLabel, { color: colors.text.muted }]}>{r.score}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { borderRadius: 16, padding: 16 },
  title: { fontSize: 14, marginBottom: 12 },
  chartArea: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 100 },
  empty: { fontSize: 12 },
  barCol: { alignItems: 'center', gap: 4 },
  bar: { width: 24, borderRadius: 6, minHeight: 4 },
  dayLabel: { fontSize: 10 },
  scoreLabel: { fontSize: 9 },
});
