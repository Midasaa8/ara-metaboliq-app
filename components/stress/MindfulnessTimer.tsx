/**
 * PART:   MindfulnessTimer — countdown with preset durations + session summary
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  29s — Stress Management
 * TASK:   Preset 2/5/10/15/20 min selector, countdown, session complete summary card
 * SCOPE:  IN: none (standalone timer)
 *         OUT: completeMindfulness callback to useStress
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Play, Square, Check } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

const PRESETS = [2, 5, 10, 15, 20];

interface Props {
  onComplete: (durationMin: number) => void;
}

export function MindfulnessTimer({ onComplete }: Props) {
  const { colors, fonts } = useTheme();
  const [selectedMin, setSelectedMin] = useState(5);
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(5 * 60);
  const [done, setDone] = useState(false);

  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => { if (interval.current) { clearInterval(interval.current); interval.current = null; } }, []);

  const start = useCallback(() => {
    setRemaining(selectedMin * 60);
    setDone(false);
    setRunning(true);
  }, [selectedMin]);

  useEffect(() => {
    if (!running) return;
    interval.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearTimer();
          setRunning(false);
          setDone(true);
          onComplete(selectedMin);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return clearTimer;
  }, [running, clearTimer, onComplete, selectedMin]);

  const stop = useCallback(() => {
    clearTimer();
    setRunning(false);
    setRemaining(selectedMin * 60);
  }, [clearTimer, selectedMin]);

  const reset = useCallback(() => {
    setDone(false);
    setRemaining(selectedMin * 60);
  }, [selectedMin]);

  const mm = Math.floor(remaining / 60).toString().padStart(2, '0');
  const ss = (remaining % 60).toString().padStart(2, '0');
  const pct = running ? ((selectedMin * 60 - remaining) / (selectedMin * 60)) * 100 : 0;

  if (done) {
    return (
      <View style={[s.doneCard, { backgroundColor: '#4ECFB5' + '18', borderColor: '#4ECFB5' + '40' }]}>
        <View style={[s.doneIcon, { backgroundColor: '#4ECFB5' }]}>
          <Check size={28} color="#FFF" strokeWidth={3} />
        </View>
        <Text style={[s.doneTitle, { color: colors.text.primary, fontFamily: fonts.bold }]}>
          Hoàn thành {selectedMin} phút thiền!
        </Text>
        <Text style={[s.doneSub, { color: colors.text.secondary, fontFamily: fonts.regular }]}>
          Tuyệt vời! Hãy duy trì thói quen mỗi ngày.
        </Text>
        <TouchableOpacity style={[s.btn, { backgroundColor: colors.primary }]} onPress={reset}>
          <Text style={[s.btnText, { color: '#FFF', fontFamily: fonts.bold }]}>Làm lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Preset chips */}
      {!running && (
        <View style={s.presets}>
          {PRESETS.map((m) => (
            <TouchableOpacity
              key={m}
              style={[s.chip, { backgroundColor: selectedMin === m ? colors.primary : colors.surfaceElevated }]}
              onPress={() => { setSelectedMin(m); setRemaining(m * 60); }}
            >
              <Text style={[s.chipText, { color: selectedMin === m ? '#FFF' : colors.text.secondary, fontFamily: fonts.semibold }]}>
                {m}p
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Countdown display */}
      <View style={[s.clockWrap, { backgroundColor: colors.surfaceElevated }]}>
        <Text style={[s.clock, { color: colors.text.primary, fontFamily: fonts.black }]}>
          {mm}:{ss}
        </Text>
        {running && (
          <Text style={[s.progress, { color: colors.text.muted, fontFamily: fonts.regular }]}>
            {Math.round(pct)}% hoàn thành
          </Text>
        )}
      </View>

      {/* Controls */}
      <View style={s.controls}>
        {!running
          ? (
            <TouchableOpacity style={[s.btn, { backgroundColor: colors.primary }]} onPress={start}>
              <Play size={20} color="#FFF" strokeWidth={2.5} />
              <Text style={[s.btnText, { color: '#FFF', fontFamily: fonts.bold }]}>Bắt đầu</Text>
            </TouchableOpacity>
          )
          : (
            <TouchableOpacity style={[s.btn, { backgroundColor: colors.surfaceElevated }]} onPress={stop}>
              <Square size={20} color={colors.text.secondary} strokeWidth={2} />
              <Text style={[s.btnText, { color: colors.text.secondary, fontFamily: fonts.semibold }]}>Dừng</Text>
            </TouchableOpacity>
          )
        }
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { alignItems: 'center', gap: 20 },
  presets: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  chip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  chipText: { fontSize: 13 },
  clockWrap: { width: 180, height: 180, borderRadius: 90, alignItems: 'center', justifyContent: 'center', gap: 4 },
  clock: { fontSize: 48 },
  progress: { fontSize: 12 },
  controls: {},
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  btnText: { fontSize: 15 },
  doneCard: { alignItems: 'center', gap: 14, padding: 28, borderRadius: 20, borderWidth: 1 },
  doneIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontSize: 18, textAlign: 'center' },
  doneSub: { fontSize: 14, textAlign: 'center' },
});
