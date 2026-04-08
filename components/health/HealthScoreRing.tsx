/**
 * PART:   HealthScoreRing — animated SVG circular progress ring
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  8 — Health Score Engine (upgraded from Phase 3)
 * READS:  PLAN_B §XI Home Screen Design, GEMINI_PHASES §PHASE 8, constants/theme.ts
 * TASK:   Animated ring + color tiers + optional subScores breakdown bars
 * SCOPE:  IN: ring rendering, color tier logic, sub-score mini bars
 *         OUT: score computation (server-only — Phase 19 FastAPI)
 *
 * Color tiers (GEMINI Phase 8 spec):
 *   90-100 → colors.health.good    (green)
 *   75-89  → colors.health.good CC (green 80% opacity)
 *   60-74  → colors.health.warning (amber)
 *   0-59   → colors.health.danger  (red)
 */

import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Text } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, fonts, spacing, radius } from '@/constants/theme';
import {
  getScoreTier,
  SUB_SCORE_META,
  type SubScores,
  type SubScoreKey,
} from '@/services/ai/HealthScore';

// Size presets
const SIZE_MAP = { small: 120, medium: 160, large: 210 } as const;
const THICKNESS_MAP = { small: 10, medium: 12, large: 15 } as const;

interface HealthScoreRingProps {
  score: number;
  subScores?: SubScores;                        // optional breakdown bars
  size?: number | 'small' | 'medium' | 'large'; // px or preset, default 200
  thickness?: number;
  animated?: boolean;                           // disable animation for static previews
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function HealthScoreRing({
  score,
  subScores,
  size: sizeProp = 200,
  thickness: thicknessProp,
  animated: enableAnim = true,
}: HealthScoreRingProps) {
  // Resolve size
  const resolvedSize: number =
    typeof sizeProp === 'string' ? SIZE_MAP[sizeProp] : sizeProp;
  const thickness = thicknessProp ?? (
    typeof sizeProp === 'string' ? THICKNESS_MAP[sizeProp] : 14
  );

  const center = resolvedSize / 2;
  const ringRadius = (resolvedSize - thickness) / 2;
  const circumference = 2 * Math.PI * ringRadius;

  // Color tier
  const tier = getScoreTier(score);

  // Animated value drives both the SVG stroke and the number count-up
  const animValue = useRef(new Animated.Value(enableAnim ? 0 : score)).current;

  useEffect(() => {
    if (!enableAnim) { animValue.setValue(score); return; }
    Animated.timing(animValue, {
      toValue: score,
      duration: 900,
      useNativeDriver: false, // SVG props require JS driver
    }).start();
  }, [score, enableAnim]);

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

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, { width: resolvedSize, height: resolvedSize }]}>
        <Svg width={resolvedSize} height={resolvedSize} viewBox={`0 0 ${resolvedSize} ${resolvedSize}`}>
          <Defs>
            <LinearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={tier.color} />
              <Stop offset="100%" stopColor={colors.primary} />
            </LinearGradient>
          </Defs>

        {/* Background track */}
        <Circle
          cx={center}
          cy={center}
          r={ringRadius}
          stroke={colors.surfaceElevated}
          strokeWidth={thickness}
          fill="none"
        />

        {/* Progress arc — starts at top (rotate -90°) */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={ringRadius}
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
          style={[styles.scoreNumber, { color: tier.color }]}
          value={displayScore}
        />
        <Text style={styles.scoreLabel}>/100</Text>
        <Text style={[styles.scoreTierLabel, { color: tier.color }]}>
          {tier.emoji} {tier.label}
        </Text>
      </View>
    </View>

    {/* Sub-score breakdown bars (optional) */}
    {subScores && (
      <View style={styles.subScoreGrid}>
        {(Object.keys(subScores) as SubScoreKey[]).map((key) => (
          <SubScoreBar
            key={key}
            label={SUB_SCORE_META[key].label}
            value={subScores[key]}
          />
        ))}
      </View>
    )}
  </View>
  );
}

// ── Sub-score mini bar ──
function SubScoreBar({ label, value }: { label: string; value: number }) {
  const tier = getScoreTier(value);
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: value,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [value]);

  return (
    <View style={styles.subScoreRow}>
      <Text style={styles.subScoreLabel}>{label}</Text>
      <View style={styles.subScoreTrack}>
        <Animated.View
          style={[
            styles.subScoreFill,
            {
              backgroundColor: tier.color,
              width: widthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
            },
          ]}
        />
      </View>
      <Text style={[styles.subScoreValue, { color: tier.color }]}>{value}</Text>
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
  wrapper:    { alignItems: 'center', gap: spacing.md },
  container:  { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  center:         { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  scoreNumber:    { fontSize: fonts.sizes.hero, fontWeight: '900', letterSpacing: -2, lineHeight: 56 },
  scoreLabel:     { color: colors.text.secondary, fontSize: fonts.sizes.md, fontWeight: '500', marginTop: -4 },
  scoreTierLabel: { fontSize: fonts.sizes.xs, marginTop: 4, letterSpacing: 0.5 },

  // Sub-score bars
  subScoreGrid:   { width: '100%', gap: 6, paddingHorizontal: spacing.md },
  subScoreRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  subScoreLabel:  { color: colors.text.secondary, fontSize: fonts.sizes.xs, width: 72 },
  subScoreTrack:  { flex: 1, height: 6, backgroundColor: colors.surfaceElevated, borderRadius: radius.full, overflow: 'hidden' },
  subScoreFill:   { height: '100%', borderRadius: radius.full },
  subScoreValue:  { fontSize: fonts.sizes.xs, fontWeight: '700', width: 24, textAlign: 'right' },
});
