/**
 * PART:   BMIGauge — half-circle gauge with WHO classification
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  25s — Weight & Body Composition
 * TASK:   SVG arc gauge displaying BMI value with 4-zone color coding
 * SCOPE:  IN: BMIResult from WeightService
 *         OUT: none (display only)
 */

import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';
import type { BMIResult } from '@/services/weight/WeightService';

interface Props {
  bmi: BMIResult;
}

const SIZE = 180;
const R = 72;
const CX = SIZE / 2;
const CY = SIZE / 2 + 20;
const START_ANG = -210;
const END_ANG   = 30;

function polarXY(deg: number) {
  const r = ((deg) * Math.PI) / 180;
  return { x: CX + R * Math.cos(r), y: CY + R * Math.sin(r) };
}

function arc(from: number, to: number): string {
  const s = polarXY(from);
  const e = polarXY(to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`;
}

// Zones: underweight 10-18.5, normal 18.5-25, overweight 25-30, obese 30-40+
// Map BMI 10-40 → angle -210 to 30 (240 degrees)
function bmiToAngle(bmi: number): number {
  const clamped = Math.min(40, Math.max(10, bmi));
  return START_ANG + ((clamped - 10) / 30) * (END_ANG - START_ANG);
}

const ZONES = [
  { from: START_ANG, to: bmiToAngle(18.5), color: '#3B82F6', label: 'Gầy' },
  { from: bmiToAngle(18.5), to: bmiToAngle(25), color: '#4ECFB5', label: 'Bình thường' },
  { from: bmiToAngle(25), to: bmiToAngle(30),   color: '#F59E0B', label: 'Thừa cân' },
  { from: bmiToAngle(30), to: END_ANG,          color: '#EF4444', label: 'Béo phì' },
];

const CLASS_LABELS: Record<BMIResult['classification'], string> = {
  underweight: 'Thiếu cân',
  normal: 'Bình thường',
  overweight: 'Thừa cân',
  obese: 'Béo phì',
};

export function BMIGauge({ bmi }: Props) {
  const { colors, fonts } = useTheme();
  const needleAngle = bmiToAngle(bmi.bmi);
  const needle = polarXY(needleAngle);

  return (
    <View style={s.root}>
      <Svg width={SIZE} height={SIZE * 0.7} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Zone arcs */}
        {ZONES.map(({ from, to, color }) => (
          <Path key={from} d={arc(from, to)} fill="none" stroke={color} strokeWidth={14} strokeLinecap="butt" />
        ))}
        {/* Track background */}
        {/* Needle */}
        <Circle cx={CX} cy={CY} r={6} fill={bmi.color} />
        <Path
          d={`M ${CX} ${CY} L ${needle.x} ${needle.y}`}
          stroke={bmi.color} strokeWidth={3} strokeLinecap="round"
        />
      </Svg>

      <View style={s.center}>
        <Text style={[s.value, { color: colors.text.primary, fontFamily: fonts.black }]}>
          {bmi.bmi}
        </Text>
        <Text style={[s.label, { color: bmi.color, fontFamily: fonts.bold }]}>
          {CLASS_LABELS[bmi.classification]}
        </Text>
      </View>

      <View style={s.zoneRow}>
        {ZONES.map(({ color, label }) => (
          <View key={label} style={s.zoneItem}>
            <View style={[s.zoneDot, { backgroundColor: color }]} />
            <Text style={[s.zoneText, { color: colors.text.muted, fontFamily: fonts.regular }]}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { alignItems: 'center', gap: 8 },
  center: { alignItems: 'center', gap: 2, marginTop: -24 },
  value: { fontSize: 32 },
  label: { fontSize: 14 },
  zoneRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 },
  zoneItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  zoneDot: { width: 8, height: 8, borderRadius: 4 },
  zoneText: { fontSize: 11 },
});
