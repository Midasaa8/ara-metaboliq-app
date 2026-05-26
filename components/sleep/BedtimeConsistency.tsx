/**
 * PART:   BedtimeConsistency — dot chart of bedtime deviation
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  26s — Sleep Service
 * TASK:   Display last 7 nights bedtimes as dots on a vertical axis,
 *         show average line + deviation per night (Fitbit-style)
 * SCOPE:  IN: SleepConsistency from SleepService.computeConsistency
 *         OUT: none (display only)
 */

import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line, Circle as SvgCircle, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';
import type { SleepConsistency } from '@/services/sleep/SleepService';

interface Props {
  consistency: SleepConsistency;
}

const W = 280;
const H = 100;
const PAD_L = 44;
const PAD_R = 12;
const CW = W - PAD_L - PAD_R;

function timeToMins(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h < 12 ? h + 24 : h) * 60 + m;
}

function minsToLabel(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function BedtimeConsistency({ consistency }: Props) {
  const { colors, fonts } = useTheme();
  const { bedtimes, avg_bedtime, std_minutes } = consistency;

  if (bedtimes.length === 0) return null;

  const mins = bedtimes.map(timeToMins);
  const avgMins = timeToMins(avg_bedtime);
  const allMins = [...mins, avgMins];
  const minVal = Math.min(...allMins) - 20;
  const maxVal = Math.max(...allMins) + 20;
  const range = maxVal - minVal || 1;

  function toX(i: number) { return PAD_L + (i / Math.max(bedtimes.length - 1, 1)) * CW; }
  function toY(m: number) { return 10 + ((m - minVal) / range) * (H - 20); }

  const avgY = toY(avgMins);

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={[s.title, { color: colors.text.primary, fontFamily: fonts.bold }]}>
          Giờ ngủ 7 đêm
        </Text>
        <Text style={[s.std, { color: std_minutes <= 20 ? colors.health.good : colors.health.warning, fontFamily: fonts.semibold }]}>
          ±{std_minutes} phút
        </Text>
      </View>

      <Svg width={W} height={H}>
        {/* Y-axis labels */}
        <SvgText x={PAD_L - 4} y={toY(minVal + 20) + 4} fontSize={9} fill={colors.text.muted} textAnchor="end">
          {minsToLabel(minVal + 20)}
        </SvgText>
        <SvgText x={PAD_L - 4} y={toY(maxVal - 20) + 4} fontSize={9} fill={colors.text.muted} textAnchor="end">
          {minsToLabel(maxVal - 20)}
        </SvgText>

        {/* Average line */}
        <Line x1={PAD_L} y1={avgY} x2={W - PAD_R} y2={avgY}
          stroke={colors.secondary} strokeWidth={1.5} strokeDasharray="5,3" />
        <SvgText x={PAD_L - 4} y={avgY + 4} fontSize={9} fill={colors.secondary} textAnchor="end">
          avg
        </SvgText>

        {/* Dots */}
        {mins.map((m, i) => {
          const deviation = Math.abs(m - avgMins);
          const dotColor = deviation <= 15 ? colors.health.good : deviation <= 30 ? colors.health.warning : colors.health.danger;
          return (
            <SvgCircle key={i} cx={toX(i)} cy={toY(m)} r={5} fill={dotColor} />
          );
        })}
      </Svg>

      <Text style={[s.caption, { color: colors.text.muted, fontFamily: fonts.regular }]}>
        Trung bình: {avg_bedtime} · {std_minutes <= 15 ? '🟢 Nhất quán' : std_minutes <= 30 ? '🟡 Khá nhất quán' : '🔴 Không đều'}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 14 },
  std: { fontSize: 13 },
  caption: { fontSize: 11 },
});
