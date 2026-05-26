/**
 * PART:   VoiceRecorder — 20s recording screen with animated waveform + timer
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  27s — Voice AI Service Refactor
 * TASK:   Circular timer, animated bars, record/cancel controls
 * SCOPE:  IN: useVoiceCheckIn state machine
 *         OUT: result display (WellnessReport), permission request
 */

import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Mic, X, Loader } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { RECORD_DURATION_MS } from '@/services/voice/VoiceCheckInService';
import type { CheckInState } from '@/hooks/useVoiceCheckIn';

interface Props {
  state: CheckInState;
  elapsed_ms: number;
  errorMsg: string | null;
  onStart: () => void;
  onCancel: () => void;
}

const R = 64;
const CIRC = 2 * Math.PI * R;
const SIZE = 160;

export function VoiceRecorder({ state, elapsed_ms, errorMsg, onStart, onCancel }: Props) {
  const { colors, fonts } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state === 'recording') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [state, pulseAnim]);

  const progress = Math.min(1, elapsed_ms / RECORD_DURATION_MS);
  const remaining = Math.max(0, Math.ceil((RECORD_DURATION_MS - elapsed_ms) / 1000));
  const dashOffset = CIRC * (1 - progress);

  return (
    <View style={s.root}>
      {/* Circular progress ring */}
      <View style={{ alignItems: 'center', justifyContent: 'center', width: SIZE, height: SIZE }}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={colors.border} strokeWidth={8} fill="none" />
          {state === 'recording' && (
            <Circle
              cx={SIZE / 2} cy={SIZE / 2} r={R}
              stroke={colors.primary} strokeWidth={8} fill="none"
              strokeDasharray={CIRC}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            />
          )}
        </Svg>
        <Animated.View style={[s.micWrap, { backgroundColor: state === 'recording' ? colors.primary : colors.surfaceElevated, transform: [{ scale: pulseAnim }] }]}>
          {state === 'uploading'
            ? <Loader size={28} color="#FFF" strokeWidth={2} />
            : <Mic size={28} color={state === 'recording' ? '#FFF' : colors.text.muted} strokeWidth={2} />
          }
        </Animated.View>
      </View>

      {/* Timer / status */}
      {state === 'recording' && (
        <Text style={[s.timer, { color: colors.text.primary, fontFamily: fonts.black }]}>
          {remaining}s
        </Text>
      )}
      {state === 'uploading' && (
        <Text style={[s.status, { color: colors.text.secondary, fontFamily: fonts.regular }]}>
          Đang phân tích giọng nói...
        </Text>
      )}
      {state === 'error' && errorMsg && (
        <Text style={[s.error, { color: colors.health.danger, fontFamily: fonts.semibold }]}>
          {errorMsg}
        </Text>
      )}
      {state === 'idle' && (
        <Text style={[s.hint, { color: colors.text.muted, fontFamily: fonts.regular }]}>
          Nhấn để bắt đầu ghi âm 20 giây
        </Text>
      )}

      {/* Controls */}
      <View style={s.controls}>
        {(state === 'idle' || state === 'error') && (
          <TouchableOpacity style={[s.btn, { backgroundColor: colors.primary }]} onPress={onStart}>
            <Mic size={22} color="#FFF" strokeWidth={2.5} />
            <Text style={[s.btnText, { fontFamily: fonts.bold }]}>Bắt đầu Check-in</Text>
          </TouchableOpacity>
        )}
        {state === 'recording' && (
          <TouchableOpacity style={[s.cancelBtn, { backgroundColor: colors.surface }]} onPress={onCancel}>
            <X size={22} color={colors.text.secondary} strokeWidth={2.5} />
            <Text style={[s.cancelText, { color: colors.text.secondary, fontFamily: fonts.semibold }]}>Huỷ</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { alignItems: 'center', gap: 20, paddingVertical: 32 },
  micWrap: { position: 'absolute', width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  timer: { fontSize: 40 },
  status: { fontSize: 15 },
  error: { fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
  hint: { fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
  controls: { gap: 12 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 30 },
  btnText: { color: '#FFF', fontSize: 15 },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  cancelText: { fontSize: 15 },
});
