/**
 * PART:   PPGWaveform — real-time scrolling PPG chart
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  10 — Hackathon Polish
 * READS:  AGENTS.md §8, SONNET_PHASES.md §PHASE 10, constants/hardware.ts BLE.SAMPLE_RATE_HZ
 * TASK:   Rolling 200-sample SVG waveform fed by MockHardware.generatePPGSample() at 25 Hz
 * SCOPE:  IN: chart rendering, mock data subscription via setInterval
 *         OUT: real BLE notify (Phase 12 — subscribe CHAR_SENSOR_DATA)
 * HARDWARE STATUS: MOCK — data generated client-side using same Gaussian model as MockHardware
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '@/constants/theme';

// ── Constants ──────────────────────────────────────────────────────────────────
const SAMPLE_RATE_HZ = 25;        // matches BLE.SAMPLE_RATE_HZ
const BUFFER_SIZE    = 200;       // ~8 seconds of history
const UPDATE_INTERVAL_MS = 40;    // 25 Hz update loop
const CHART_H = 80;               // SVG chart height (px)
const HR_DEFAULT = 72;            // BPM used for mock waveform shape

// ── PPG Mock Generator (mirrors MockHardware.generatePPGSample) ──
// Systolic + dicrotic notch + diastolic Gaussian peaks
function generatePPGSample(t: number, hr: number): number {
  const T = 60 / hr;
  const phase = (t % T) / T;
  const systolic  =  1.0 * Math.exp(-Math.pow(phase - 0.15, 2) / (2 * 0.003 ** 2));
  const dicrotic  = -0.2 * Math.exp(-Math.pow(phase - 0.35, 2) / (2 * 0.002 ** 2));
  const diastolic =  0.4 * Math.exp(-Math.pow(phase - 0.42, 2) / (2 * 0.004 ** 2));
  const noise     = (Math.random() - 0.5) * 0.02;
  return systolic + dicrotic + diastolic + noise;
}

// ── Normalise buffer to [0, 1] for SVG rendering ──
function normalise(buf: number[]): number[] {
  const min = Math.min(...buf);
  const max = Math.max(...buf);
  const range = max - min || 1;
  return buf.map((v) => (v - min) / range);
}

// ── Build SVG path from normalised buffer ──
function buildPath(normalised: number[], w: number, h: number): string {
  if (normalised.length < 2) return '';
  const step = w / (normalised.length - 1);
  return normalised
    .map((v, i) => {
      const x = (i * step).toFixed(1);
      const y = (h - v * h * 0.85 - h * 0.075).toFixed(1); // 7.5% top + bottom margin
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');
}

// ── Pulsing dot indicator ──
function PulseDot({ active }: { active: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.6, duration: 600, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.0, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, scale]);

  return (
    <Animated.View
      style={[
        styles.pulseDot,
        { backgroundColor: active ? '#4ADE80' : colors.text.muted },
        active && { transform: [{ scale }] },
      ]}
    />
  );
}

// ── PPGWaveform Component ─────────────────────────────────────────────────────
interface PPGWaveformProps {
  /** Override HR used for waveform shape — defaults to 72 BPM */
  hr?: number;
  /** Whether the mock patch is active; controls pulse dot */
  isConnected?: boolean;
}

export function PPGWaveform({ hr = HR_DEFAULT, isConnected = true }: PPGWaveformProps) {
  const [buffer, setBuffer]   = useState<number[]>(() =>
    Array.from({ length: BUFFER_SIZE }, (_, i) =>
      generatePPGSample(i / SAMPLE_RATE_HZ, HR_DEFAULT)
    )
  );
  const tRef    = useRef(BUFFER_SIZE / SAMPLE_RATE_HZ);
  const svgWidth = useRef(320);

  // ── Advance the rolling buffer at 25 Hz ──
  const tick = useCallback(() => {
    tRef.current += 1 / SAMPLE_RATE_HZ;
    const sample = generatePPGSample(tRef.current, hr);
    setBuffer((prev) => {
      const next = [...prev];
      next.shift();
      next.push(sample);
      return next;
    });
  }, [hr]);

  useEffect(() => {
    const id = setInterval(tick, UPDATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [tick]);

  // ── Build SVG ──
  const norm = normalise(buffer);
  const w = svgWidth.current;
  const waveD = buildPath(norm, w, CHART_H);

  // Peak-fill path (close to bottom)
  const fillD = waveD
    ? `${waveD} L${w},${CHART_H} L0,${CHART_H} Z`
    : '';

  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <PulseDot active={isConnected} />
          <View>
            <Text style={styles.title}>Live PPG</Text>
            <Text style={styles.subtitle}>ARA-MOCK-0001 · {SAMPLE_RATE_HZ} Hz</Text>
          </View>
        </View>
        <View style={styles.hrBadge}>
          <Ionicons name="heart" size={12} color="#F87171" />
          <Text style={styles.hrText}>{hr} BPM</Text>
        </View>
      </View>

      {/* Waveform */}
      <View
        style={styles.svgWrapper}
        onLayout={(e) => {
          svgWidth.current = e.nativeEvent.layout.width;
        }}
      >
        <Svg
          width="100%"
          height={CHART_H}
          viewBox={`0 0 ${w} ${CHART_H}`}
          preserveAspectRatio="none"
        >
          <Defs>
            <LinearGradient id="ppgFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#4ADE80" stopOpacity="0.25" />
              <Stop offset="1" stopColor="#4ADE80" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          {/* Fill area under waveform */}
          {fillD ? <Path d={fillD} fill="url(#ppgFill)" /> : null}
          {/* Main waveform line */}
          {waveD ? (
            <Path
              d={waveD}
              stroke="#4ADE80"
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>

        {/* Horizontal mid-line */}
        <View style={styles.midLine} />
      </View>

      {/* Footer labels */}
      <View style={styles.footerRow}>
        <Text style={styles.footerLabel}>−8s</Text>
        <Text style={styles.footerLabel}>−4s</Text>
        <Text style={styles.footerLabel}>now</Text>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0E1F1E',   // dark teal-black matching camera bg
    borderRadius: radius.lg,
    padding: spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.15)',
    shadowColor: '#4ADE80',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: {
    color: '#E2FFEE',
    fontSize: fonts.sizes.md,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: 'rgba(226,255,238,0.5)',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
    letterSpacing: 0.5,
  },

  // Pulse dot
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // HR badge
  hrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    borderRadius: radius.full,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.25)',
  },
  hrText: { color: '#F87171', fontSize: 11, fontWeight: '700' },

  // SVG waveform
  svgWrapper: {
    height: CHART_H,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  midLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 1,
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
  },

  // Footer
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  footerLabel: {
    color: 'rgba(226,255,238,0.3)',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
