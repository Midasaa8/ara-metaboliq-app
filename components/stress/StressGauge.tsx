/**
 * PART:   StressGauge — visual gauge for current stress level
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  29s — Stress Management
 * TASK:   Half-circle SVG gauge with 4 zones + emoji indicator pointer
 * SCOPE:  IN: score (0-100), level from useStress
 *         OUT: none (display only)
 */

import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle as SvgCircle, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';
import type { StressLevel } from '@/services/stress/StressService';

interface Props {
  score: number;
  level: StressLevel;
}

const LEVEL_CONFIG: Record<StressLevel, { label: string; emoji: string; color: string }> = {
  low:      { label: 'Thấp',      emoji: '😌', color: '#4ECFB5' },
  moderate: { label: 'Trung bình', emoji: '😐', color: '#F59E0B' },
  elevated: { label: 'Cao',       emoji: '😰', color: '#F97316' },
  high:     { label: 'Rất cao',   emoji: '😟', color: '#EF4444' },
};

const W = 220;
const CX = W / 2;
const CY = 110;
const R = 80;

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = (Math.PI / 180) * startDeg;
  const e = (Math.PI / 180) * endDeg;
  const x1 = cx + r * Math.cos(s);
  const y1 = cy + r * Math.sin(s);
  const x2 = cx + r * Math.cos(e);
  const y2 = cy + r * Math.sin(e);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

// Zones: 180°→270° (left→right) = score 0→100
// 180=0, 270=100  ← arc goes from left to right on bottom of circle
// We use 180° (left) to 0° (right) = half circle top arc
// score=0 → 180°, score=100 → 0° (going counter-clockwise), but let's use 180→0 clockwise via 360
// Actually: 180+180*score/100 going from left(180) to right(360=0)

const ZONES = [
  { from: 180, to: 225, color: '#4ECFB5' },
  { from: 225, to: 270, color: '#F59E0B' },
  { from: 270, to: 315, color: '#F97316' },
  { from: 315, to: 360, color: '#EF4444' },
];

export function StressGauge({ score, level }: Props) {
  const { colors, fonts } = useTheme();
  const cfg = LEVEL_CONFIG[level];

  const needleDeg = 180 + (score / 100) * 180;
  const nx = CX + (R - 14) * Math.cos((Math.PI / 180) * needleDeg);
  const ny = CY + (R - 14) * Math.sin((Math.PI / 180) * needleDeg);

  return (
    <View style={s.root}>
      <Svg width={W} height={130} viewBox={`0 0 ${W} 130`}>
        {ZONES.map((z, i) => (
          <Path
            key={i}
            d={describeArc(CX, CY, R, z.from, z.to)}
            fill="none"
            stroke={z.color}
            strokeWidth={18}
            strokeLinecap={i === 0 ? 'round' : i === ZONES.length - 1 ? 'round' : 'butt'}
          />
        ))}
        {/* Needle dot */}
        <SvgCircle cx={nx} cy={ny} r={7} fill={cfg.color} />
        <SvgCircle cx={CX} cy={CY} r={5} fill={colors.text.primary} />
        {/* Labels */}
        <SvgText x={18} y={CY + 24} fontSize={10} fill={colors.text.muted}>0</SvgText>
        <SvgText x={W - 26} y={CY + 24} fontSize={10} fill={colors.text.muted}>100</SvgText>
      </Svg>

      <Text style={s.emoji}>{cfg.emoji}</Text>
      <Text style={[s.score, { color: cfg.color, fontFamily: fonts.black }]}>{score}</Text>
      <View style={[s.badge, { backgroundColor: cfg.color + '22' }]}>
        <Text style={[s.badgeText, { color: cfg.color, fontFamily: fonts.bold }]}>
          Căng thẳng {cfg.label}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { alignItems: 'center', gap: 6 },
  emoji: { fontSize: 32, marginTop: -8 },
  score: { fontSize: 48, lineHeight: 56 },
  badge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 14 },
  badgeText: { fontSize: 14 },
});
