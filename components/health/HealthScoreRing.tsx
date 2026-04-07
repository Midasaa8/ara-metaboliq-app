/**
 * PART:   HealthScoreRing — animated SVG circular progress ring
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  3 — Home Dashboard
 * READS:  PLAN_B §XI Home Screen Design, constants/theme.ts
 * TASK:   Animated ring (0 → score), score number count-up, Signal Purple gradient
 * SCOPE:  IN: ring rendering + number animation
 *         OUT: score computation (server-only), API calls
 */

import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Text } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, fonts } from '@/constants/theme';

interface HealthScoreRingProps {
  score: number;   // 0–100
  size?: number;   // outer diameter in px, default 200
  thickness?: number;  // stroke width, default 14
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function HealthScoreRing({ score, size = 200, thickness = 14 }: HealthScoreRingProps) {
  const center = size / 2;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  // Animated value drives both the SVG stroke and the number count-up
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: score,
      duration: 900,
      useNativeDriver: false, // SVG props require JS driver
    }).start();
  }, [score]);

  // strokeDashoffset: circumference → 0 as score 0 → 100
  const strokeDashoffset = animValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
    extrapolate: 'clamp',
  });

  // Display number: 0 → score, same animation
  const displayScore = animValue.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 100],
    extrapolate: 'clamp',
  });

  const scoreColor = score >= 80
    ? colors.health.good
    : score >= 60
      ? colors.secondary
      : colors.health.warning;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.primary} />
            <Stop offset="100%" stopColor={colors.secondary} />
          </LinearGradient>
        </Defs>

        {/* Background track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.surfaceElevated}
          strokeWidth={thickness}
          fill="none"
        />

        {/* Progress arc — starts at top (rotate -90°) */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#ringGrad)"
          strokeWidth={thickness}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>

      {/* Center content */}
      <View style={styles.center} pointerEvents="none">
        <AnimatedText
          style={[styles.scoreNumber, { color: scoreColor }]}
          value={displayScore}
        />
        <Text style={styles.scoreLabel}>/100</Text>
        <Text style={styles.scoreCaption}>Health Score</Text>
      </View>
    </View>
  );
}

// Helper: renders animated integer value
function AnimatedText({
  value,
  style,
}: {
  value: Animated.AnimatedInterpolation<number>;
  style: object;
}) {
  const ref = useRef<Text>(null);

  useEffect(() => {
    const id = value.addListener(({ value: v }) => {
      ref.current?.setNativeProps({ text: String(Math.round(v)) });
    });
    return () => value.removeListener(id);
  }, [value]);

  return <Text ref={ref} style={style}>0</Text>;
}

const styles = StyleSheet.create({
  container: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  scoreNumber: { fontSize: fonts.sizes.hero, fontWeight: '900', letterSpacing: -2, lineHeight: 56 },
  scoreLabel: { color: colors.text.secondary, fontSize: fonts.sizes.md, fontWeight: '500', marginTop: -4 },
  scoreCaption: { color: colors.text.muted, fontSize: fonts.sizes.xs, marginTop: 4, letterSpacing: 1, textTransform: 'uppercase' },
});
