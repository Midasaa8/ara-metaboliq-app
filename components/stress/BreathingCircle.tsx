/**
 * PART:   BreathingCircle — animated SVG circle with expand/contract breathing guide
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  29s — Stress Management
 * TASK:   4-7-8 and Box breathing techniques, Animated API (NOT Reanimated),
 *         haptic on phase transitions, phase labels, cycle counter
 * SCOPE:  IN: expo-haptics, Animated API
 *         OUT: startBreathing callback to useStress
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Play, Square } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

export type BreathingTechnique = 'box' | '4-7-8';

interface Props {
  technique: BreathingTechnique;
  onComplete: (durationMs: number, completed: boolean) => void;
}

interface Phase { label: string; durationMs: number; expand: boolean }

const TECHNIQUES: Record<BreathingTechnique, { name: string; phases: Phase[] }> = {
  box: {
    name: 'Box Breathing (4-4-4-4)',
    phases: [
      { label: 'Hít vào', durationMs: 4000, expand: true },
      { label: 'Giữ hơi', durationMs: 4000, expand: true },
      { label: 'Thở ra',  durationMs: 4000, expand: false },
      { label: 'Nghỉ',    durationMs: 4000, expand: false },
    ],
  },
  '4-7-8': {
    name: '4-7-8 Thở thư giãn',
    phases: [
      { label: 'Hít vào', durationMs: 4000,  expand: true },
      { label: 'Giữ hơi', durationMs: 7000,  expand: true },
      { label: 'Thở ra',  durationMs: 8000,  expand: false },
    ],
  },
};

const CIRCLE_SIZE = 180;
const R_MIN = 48;
const R_MAX = 80;

export function BreathingCircle({ technique, onComplete }: Props) {
  const { colors, fonts } = useTheme();
  const def = TECHNIQUES[technique];

  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [cycle, setCycle] = useState(0);

  const startMs = useRef(0);
  const animR = useRef(new Animated.Value(R_MIN)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseSince = useRef(0);

  const clearTimer = useCallback(() => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } }, []);

  const runPhase = useCallback((idx: number, cycleNum: number) => {
    const phase = def.phases[idx];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.timing(animR, {
      toValue: phase.expand ? R_MAX : R_MIN,
      duration: phase.durationMs,
      useNativeDriver: false,
    }).start();

    phaseSince.current = Date.now();
    timer.current = setTimeout(() => {
      const next = idx + 1;
      if (next < def.phases.length) {
        setPhaseIdx(next);
        runPhase(next, cycleNum);
      } else {
        const nextCycle = cycleNum + 1;
        setCycle(nextCycle);
        setPhaseIdx(0);
        runPhase(0, nextCycle);
      }
    }, phase.durationMs);
  }, [def.phases, animR]);

  const start = useCallback(() => {
    startMs.current = Date.now();
    setRunning(true);
    setPhaseIdx(0);
    setCycle(1);
    runPhase(0, 1);
  }, [runPhase]);

  const stop = useCallback(() => {
    clearTimer();
    animR.stopAnimation();
    animR.setValue(R_MIN);
    const elapsed = Date.now() - startMs.current;
    setRunning(false);
    setPhaseIdx(0);
    setCycle(0);
    onComplete(elapsed, false);
  }, [clearTimer, animR, onComplete]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const currentPhase = def.phases[phaseIdx];

  return (
    <View style={s.root}>
      <Text style={[s.techName, { color: colors.text.secondary, fontFamily: fonts.semibold }]}>
        {def.name}
      </Text>

      <View style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
          <SvgCircle cx={CIRCLE_SIZE / 2} cy={CIRCLE_SIZE / 2} r={R_MAX + 8} fill={colors.surfaceElevated} />
        </Svg>
        <Animated.View
          style={[s.breathCircle, {
            width: Animated.multiply(animR, 2),
            height: Animated.multiply(animR, 2),
            borderRadius: animR,
            backgroundColor: colors.primary + 'CC',
            position: 'absolute',
          }]}
        />
        {running && (
          <View style={s.labelWrap}>
            <Text style={[s.phaseLabel, { color: '#FFF', fontFamily: fonts.bold }]}>
              {currentPhase.label}
            </Text>
          </View>
        )}
      </View>

      {running && (
        <Text style={[s.cycleText, { color: colors.text.muted, fontFamily: fonts.regular }]}>
          Chu kỳ {cycle}
        </Text>
      )}

      <TouchableOpacity
        style={[s.btn, { backgroundColor: running ? colors.surfaceElevated : colors.primary }]}
        onPress={running ? stop : start}
      >
        {running
          ? <><Square size={20} color={colors.text.secondary} strokeWidth={2} /><Text style={[s.btnText, { color: colors.text.secondary, fontFamily: fonts.bold }]}>Dừng</Text></>
          : <><Play size={20} color="#FFF" strokeWidth={2.5} /><Text style={[s.btnText, { color: '#FFF', fontFamily: fonts.bold }]}>Bắt đầu</Text></>
        }
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: { alignItems: 'center', gap: 18 },
  techName: { fontSize: 14 },
  breathCircle: { alignItems: 'center', justifyContent: 'center' },
  labelWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: CIRCLE_SIZE, height: CIRCLE_SIZE },
  phaseLabel: { fontSize: 16 },
  cycleText: { fontSize: 13 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  btnText: { fontSize: 15 },
});
