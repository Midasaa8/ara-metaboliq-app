/**
 * PART:   SleepScoreRing — circular score + 5-component breakdown bars
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  26s — Sleep Service
 * TASK:   Display sleep score 0-100 in SVG ring + 5 sub-score progress bars
 * SCOPE:  IN: SleepScoreBreakdown from useSleepScore
 *         OUT: none (display only)
 */

import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Moon } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import type { SleepScoreBreakdown } from '@/hooks/useSleepScore';

interface Props {
  score: SleepScoreBreakdown;
}

const R = 56;
const CIRC = 2 * Math.PI * R;
const SIZE = 140;
const CX = SIZE / 2;

const TIER_COLORS: Record<string, string> = {
  Excellent: '#4ECFB5',
  Good:      '#3B82F6',
  Fair:      '#F59E0B',
  Poor:      '#EF4444',
  Restless:  '#8B5CF6',
};

const TIER_VI: Record<string, string> = {
  Excellent: 'Xuất sắc',
  Good:      'Tốt',
  Fair:      'Trung bình',
  Poor:      'Kém',
  Restless:  'Thất thường',
};

export function SleepScoreRing({ score }: Props) {
  const { colors, fonts } = useTheme();
  const ringColor = TIER_COLORS[score.tier] ?? colors.secondary;
  const dashOffset = CIRC * (1 - score.total / 100);

  const bars = [
    { label: 'Thời lượng',  value: score.duration   },
    { label: 'Deep sleep',  value: score.deep_pct   },
    { label: 'REM sleep',   value: score.rem_pct    },
    { label: 'Nhất quán',   value: score.consistency},
    { label: 'Hiệu suất',   value: score.efficiency },
  ];

  return (
    <View style={s.root}>
      {/* Ring */}
      <View style={{ alignItems: 'center' }}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Circle cx={CX} cy={CX} r={R} stroke={colors.border} strokeWidth={10} fill="none" />
          <Circle
            cx={CX} cy={CX} r={R}
            stroke={ringColor} strokeWidth={10} fill="none"
            strokeDasharray={CIRC}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${CX} ${CX})`}
          />
        </Svg>
        <View style={[s.center, { width: SIZE, height: SIZE }]}>
          <Moon size={18} color={ringColor} strokeWidth={2} />
          <Text style={[s.scoreNum, { color: colors.text.primary, fontFamily: fonts.black }]}>
            {score.total}
          </Text>
          <Text style={[s.tier, { color: ringColor, fontFamily: fonts.bold }]}>
            {TIER_VI[score.tier] ?? score.tier}
          </Text>
        </View>
      </View>

      {/* Sub-score bars */}
      <View style={s.bars}>
        {bars.map(({ label, value }) => (
          <View key={label} style={s.barRow}>
            <Text style={[s.barLabel, { color: colors.text.muted, fontFamily: fonts.regular }]}>{label}</Text>
            <View style={[s.track, { backgroundColor: colors.border }]}>
              <View style={[s.fill, { width: `${value}%`, backgroundColor: ringColor }]} />
            </View>
            <Text style={[s.barVal, { color: colors.text.secondary, fontFamily: fonts.semibold }]}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 16, alignItems: 'center' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center', gap: 2 },
  scoreNum: { fontSize: 30, marginTop: 2 },
  tier: { fontSize: 12 },
  bars: { width: '100%', gap: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { fontSize: 12, width: 82 },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  barVal: { fontSize: 12, width: 26, textAlign: 'right' },
});
