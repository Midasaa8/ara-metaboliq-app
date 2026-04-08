/**
 * PART:   Waveform — 5-bar animated amplitude visualizer
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  4 — Voice AI Module
 * READS:  PLAN_B §XI Design Language, theme.ts
 * TASK:   5 animated bars that react to real-time mic amplitude while recording,
 *         slow breathing animation while idle/uploading/result
 * SCOPE:  IN: pure visual component, amplitude prop drives bars
 *         OUT: recording logic (useVoiceRecorder), API calls
 */

import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

interface WaveformProps {
  amplitude: number;   // 0–1, real-time mic level from useVoiceRecorder
  isActive:  boolean;  // true while recording → reactive bars
  color?:    string;   // defaults to Signal Purple
}

const BAR_COUNT   = 5;
const BAR_WIDTH   = 6;
const BAR_GAP     = 6;
const MIN_HEIGHT  = 6;
const MAX_HEIGHT  = 48;

// Height multipliers per bar (centre bar tallest — waveform silhouette)
const HEIGHT_PROFILE = [0.55, 0.80, 1.0, 0.80, 0.55];

export default function Waveform({ amplitude, isActive, color = colors.primary }: WaveformProps) {
  const animatedValues = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(MIN_HEIGHT))
  ).current;

  // Idle breathing loop
  const breathingRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isActive) {
      // Stop any idle animation
      breathingRef.current?.stop();
      breathingRef.current = null;

      // Drive bar heights from amplitude
      const height = MIN_HEIGHT + amplitude * (MAX_HEIGHT - MIN_HEIGHT);
      animatedValues.forEach((val, i) => {
        Animated.spring(val, {
          toValue:         height * HEIGHT_PROFILE[i],
          useNativeDriver: false,
          speed:           40,
          bounciness:      4,
        }).start();
      });
    } else {
      // Idle: gentle breathing loop on all bars
      const pulses = animatedValues.map((val, i) => {
        const peakH = (MIN_HEIGHT + 12) * HEIGHT_PROFILE[i];
        return Animated.loop(
          Animated.sequence([
            Animated.timing(val, {
              toValue:         peakH,
              duration:        700 + i * 80,
              useNativeDriver: false,
            }),
            Animated.timing(val, {
              toValue:         MIN_HEIGHT * HEIGHT_PROFILE[i],
              duration:        700 + i * 80,
              useNativeDriver: false,
            }),
          ])
        );
      });
      breathingRef.current = Animated.parallel(pulses);
      breathingRef.current.start();
    }

    return () => {
      breathingRef.current?.stop();
    };
  }, [isActive, amplitude]);

  return (
    <View style={styles.container}>
      {animatedValues.map((val, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            {
              height:          val,
              backgroundColor: color,
              opacity:         isActive ? 1 : 0.5,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            BAR_GAP,
    height:         MAX_HEIGHT + 4, // fixed container height so layout doesn't shift
  },
  bar: {
    width:        BAR_WIDTH,
    borderRadius: BAR_WIDTH / 2,
    minHeight:    MIN_HEIGHT,
  },
});
