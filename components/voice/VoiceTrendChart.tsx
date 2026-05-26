/**
 * PART:   VoiceTrendChart — weekly overall score over time
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  27s — Voice AI Service Refactor
 * TASK:   SVG polyline of weekly Voice Wellness Score history (up to 8 entries)
 * SCOPE:  IN: history from useVoiceCheckIn
 *         OUT: none (display only)
 */

import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polyline, Circle as SvgCircle, Line, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';
import type { VoiceWellnessResult } from '@/services/voice/VoiceCheckInService';

interface Props {
  history: VoiceWellnessResult[];
}

const W = Dimensions.get('window').width - 48;
const H = 120;
const PAD = { top: 12, right: 12, bottom: 24, left: 32 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

export function VoiceTrendChart({ history }: Props) {
  const { colors, fonts } = useTheme();
  const recent = [...history].reverse().slice(0, 8);

  if (recent.length < 2) {
    return (
      <View style={[s.empty, { backgroundColor: colors.surfaceElevated, borderRadius: 14 }]}>
        <Text style={[s.emptyText, { color: colors.text.muted, fontFamily: fonts.regular }]}>
          Cần ít nhất 2 lần check-in để xem xu hướng
        </Text>
      </View>
    );
  }

  const scores = recent.map((r) => r.overall_score);
  const maxS = Math.max(...scores, 60);
  const minS = Math.min(...scores, 40);
  const range = maxS - minS || 1;

  function toX(i: number) { return PAD.left + (i / (recent.length - 1)) * CW; }
  function toY(s: number) { return PAD.top + CH - ((s - minS) / range) * CH; }

  const points = recent.map((r, i) => `${toX(i)},${toY(r.overall_score)}`).join(' ');

  return (
    <Svg width={W} height={H}>
      {/* 50/70 guide lines */}
      {[50, 70].map((v) => {
        if (v < minS || v > maxS) return null;
        const y = toY(v);
        return (
          <Line key={v} x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
            stroke={colors.border} strokeWidth={1} strokeDasharray="4,3" />
        );
      })}

      <Polyline points={points} fill="none" stroke={colors.secondary} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

      {recent.map((r, i) => (
        <SvgCircle key={i} cx={toX(i)} cy={toY(r.overall_score)} r={4} fill={colors.secondary} />
      ))}

      {/* First / last date labels */}
      <SvgText x={PAD.left} y={H - 4} fontSize={9} fill={colors.text.muted}>
        {new Date(recent[0].recorded_at).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })}
      </SvgText>
      <SvgText x={W - PAD.right} y={H - 4} fontSize={9} fill={colors.text.muted} textAnchor="end">
        {new Date(recent[recent.length - 1].recorded_at).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })}
      </SvgText>
    </Svg>
  );
}

const s = StyleSheet.create({
  empty: { height: 70, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13 },
});
