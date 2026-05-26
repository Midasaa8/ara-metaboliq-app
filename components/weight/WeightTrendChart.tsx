/**
 * PART:   WeightTrendChart — line chart of weight over time
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  25s — Weight & Body Composition
 * TASK:   SVG polyline chart showing weight entries, goal line, trend fill
 * SCOPE:  IN: filtered WeightEntry[], optional goal_kg
 *         OUT: Victory Native XL (too heavy for now — using raw SVG polyline)
 */

import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polyline, Line, Text as SvgText, Circle as SvgCircle } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';
import type { WeightEntry } from '@/services/weight/WeightService';

interface Props {
  entries: WeightEntry[];
  goal_kg?: number;
}

const W = Dimensions.get('window').width - 48;
const H = 160;
const PAD = { top: 16, right: 16, bottom: 28, left: 40 };
const CHART_W = W - PAD.left - PAD.right;
const CHART_H = H - PAD.top - PAD.bottom;

export function WeightTrendChart({ entries, goal_kg }: Props) {
  const { colors, fonts } = useTheme();

  if (entries.length < 2) {
    return (
      <View style={[s.empty, { backgroundColor: colors.surfaceElevated, borderRadius: 16 }]}>
        <Text style={[s.emptyText, { color: colors.text.muted, fontFamily: fonts.regular }]}>
          Cần ít nhất 2 lần cân để xem biểu đồ
        </Text>
      </View>
    );
  }

  const weights = entries.map((e) => e.weight_kg);
  const minW = Math.min(...weights) - 1;
  const maxW = Math.max(...weights) + 1;
  const range = maxW - minW || 1;

  function toX(i: number) { return PAD.left + (i / (entries.length - 1)) * CHART_W; }
  function toY(w: number) { return PAD.top + CHART_H - ((w - minW) / range) * CHART_H; }

  const points = entries.map((e, i) => `${toX(i)},${toY(e.weight_kg)}`).join(' ');

  return (
    <Svg width={W} height={H}>
      {/* Gridlines */}
      {[0, 0.5, 1].map((t) => {
        const y = PAD.top + t * CHART_H;
        const label = (maxW - t * range).toFixed(1);
        return (
          <SvgText key={t} x={PAD.left - 6} y={y + 4} fontSize={10} fill={colors.text.muted} textAnchor="end">
            {label}
          </SvgText>
        );
      })}

      {/* Goal line */}
      {goal_kg && goal_kg >= minW && goal_kg <= maxW + 2 && (
        <Line
          x1={PAD.left} y1={toY(goal_kg)} x2={W - PAD.right} y2={toY(goal_kg)}
          stroke={colors.health.good} strokeWidth={1.5} strokeDasharray="5,4"
        />
      )}

      {/* Weight polyline */}
      <Polyline points={points} fill="none" stroke={colors.primary} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

      {/* Data dots */}
      {entries.map((e, i) => (
        <SvgCircle key={e.id} cx={toX(i)} cy={toY(e.weight_kg)} r={4} fill={colors.primary} />
      ))}

      {/* X-axis labels — first and last date */}
      <SvgText x={PAD.left} y={H - 4} fontSize={10} fill={colors.text.muted}>
        {entries[0].logged_at.slice(5, 10)}
      </SvgText>
      <SvgText x={W - PAD.right} y={H - 4} fontSize={10} fill={colors.text.muted} textAnchor="end">
        {entries[entries.length - 1].logged_at.slice(5, 10)}
      </SvgText>
    </Svg>
  );
}

const s = StyleSheet.create({
  empty: { height: 80, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13 },
});
