/**
 * PART:   MacroChart — SVG pie chart for Protein/Carb/Fat
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  24s — Food & Water Service
 * TASK:   Donut chart showing macro ratio, calorie total in center
 * SCOPE:  IN: DailyMacros object
 *         OUT: none (display only)
 */

import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';
import type { DailyMacros } from '@/services/nutrition/FoodService';

interface Props {
  macros: DailyMacros;
  size?: number;
}

const MACRO_COLORS = { protein: '#4ECFB5', carbs: '#F59E0B', fat: '#EF4444' } as const;
const R = 52;
const INNER_R = 34;
const CX = 64;
const CY = 64;

function polarToXY(deg: number, r: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function describeArc(startDeg: number, endDeg: number): string {
  if (endDeg - startDeg >= 360) endDeg = startDeg + 359.99;
  const s = polarToXY(startDeg, R);
  const e = polarToXY(endDeg, R);
  const si = polarToXY(startDeg, INNER_R);
  const ei = polarToXY(endDeg, INNER_R);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y} L ${ei.x} ${ei.y} A ${INNER_R} ${INNER_R} 0 ${large} 0 ${si.x} ${si.y} Z`;
}

export function MacroChart({ macros, size = 128 }: Props) {
  const { colors, fonts } = useTheme();
  const totalCals = macros.protein_g * 4 + macros.carbs_g * 4 + macros.fat_g * 9;

  const slices = [
    { key: 'protein', label: 'Protein', value: macros.protein_g * 4, color: MACRO_COLORS.protein },
    { key: 'carbs',   label: 'Carbs',   value: macros.carbs_g * 4,   color: MACRO_COLORS.carbs   },
    { key: 'fat',     label: 'Fat',     value: macros.fat_g * 9,     color: MACRO_COLORS.fat     },
  ].filter((s) => s.value > 0);

  let cursor = 0;

  return (
    <View style={s.root}>
      <Svg width={size} height={size} viewBox="0 0 128 128">
        {totalCals === 0
          ? <Circle cx={CX} cy={CY} r={R} fill="none" stroke={colors.border} strokeWidth={18} />
          : slices.map(({ key, value, color }) => {
              const deg = (value / totalCals) * 360;
              const path = describeArc(cursor, cursor + deg);
              cursor += deg;
              return <Path key={key} d={path} fill={color} />;
            })
        }
      </Svg>
      <View style={[s.center, { width: size, height: size }]}>
        <Text style={[s.kcal, { color: colors.text.primary, fontFamily: fonts.black, fontSize: size * 0.17 }]}>
          {Math.round(macros.calories)}
        </Text>
        <Text style={[s.unit, { color: colors.text.muted, fontFamily: fonts.regular, fontSize: size * 0.09 }]}>kcal</Text>
      </View>
      <View style={s.legend}>
        {[
          { label: 'Protein', g: macros.protein_g, color: MACRO_COLORS.protein },
          { label: 'Carbs',   g: macros.carbs_g,   color: MACRO_COLORS.carbs   },
          { label: 'Fat',     g: macros.fat_g,     color: MACRO_COLORS.fat     },
        ].map(({ label, g, color }) => (
          <View key={label} style={s.legendRow}>
            <View style={[s.dot, { backgroundColor: color }]} />
            <Text style={[s.legendText, { color: colors.text.secondary, fontFamily: fonts.regular }]}>
              {label} {Math.round(g)}g
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { alignItems: 'center', gap: 12 },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  kcal: {},
  unit: {},
  legend: { flexDirection: 'row', gap: 14, flexWrap: 'wrap', justifyContent: 'center' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12 },
});
