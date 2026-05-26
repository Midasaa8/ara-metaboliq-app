/**
 * PART:   WaterRing — SVG progress ring for water intake
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  24s — Food & Water Service
 * TASK:   Animated circular progress showing ml consumed vs goal
 * SCOPE:  IN: totalMl, goalMl, onAdd callback
 *         OUT: wave animation (CSS-level only, native wave needs Reanimated 3)
 */

import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import { Droplets, Plus } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  totalMl: number;
  goalMl: number;
  pct: number;           // 0-100
  onAdd: () => void;
  size?: number;
}

const R = 70;
const CIRC = 2 * Math.PI * R;

export function WaterRing({ totalMl, goalMl, pct, onAdd, size = 180 }: Props) {
  const { colors, fonts } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const prevPct = useRef(0);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct,
      duration: 600,
      useNativeDriver: false,
    }).start();
    prevPct.current = pct;
  }, [pct, anim]);

  // Animate stroke-dashoffset via JS driver (SVG props via AnimatedComponent workaround: use static value)
  const dashOffset = CIRC * (1 - pct / 100);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <View style={s.root}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <SvgGrad id="waterGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#3B82F6" stopOpacity="1" />
              <Stop offset="1" stopColor="#60A5FA" stopOpacity="1" />
            </SvgGrad>
          </Defs>
          {/* Track */}
          <Circle cx={cx} cy={cy} r={R} stroke={colors.border} strokeWidth={14} fill="none" />
          {/* Fill */}
          <Circle
            cx={cx} cy={cy} r={R}
            stroke="url(#waterGrad)"
            strokeWidth={14} fill="none"
            strokeDasharray={CIRC}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        </Svg>
        <View style={[s.center, { width: size, height: size }]}>
          <Droplets size={22} color="#3B82F6" strokeWidth={2} />
          <Text style={[s.ml, { color: colors.text.primary, fontFamily: fonts.black }]}>
            {totalMl}
          </Text>
          <Text style={[s.goal, { color: colors.text.muted, fontFamily: fonts.regular }]}>
            / {goalMl} ml
          </Text>
          <Text style={[s.pctText, { color: '#3B82F6', fontFamily: fonts.bold }]}>
            {pct}%
          </Text>
        </View>
      </View>

      <TouchableOpacity style={[s.addBtn, { backgroundColor: '#3B82F6' }]} onPress={onAdd}>
        <Plus size={18} color="#FFF" strokeWidth={2.5} />
        <Text style={[s.addText, { fontFamily: fonts.bold }]}>+250 ml</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: { alignItems: 'center', gap: 16 },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center', gap: 2 },
  ml: { fontSize: 28, marginTop: 4 },
  goal: { fontSize: 12 },
  pctText: { fontSize: 13, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  addText: { color: '#FFF', fontSize: 15 },
});
