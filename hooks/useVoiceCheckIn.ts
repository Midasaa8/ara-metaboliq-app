/**
 * PART:   useVoiceCheckIn — state machine for Voice Check-in flow
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  27s — Voice AI Service Refactor
 * TASK:   Manage recording state (idle→recording→uploading→result), persist history
 * SCOPE:  IN: VoiceCheckInService, userStore for userId
 *         OUT: premium gating (Phase 34s), push notifications (Phase 33s)
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startRecording, stopAndAnalyze, RECORD_DURATION_MS, type VoiceWellnessResult } from '@/services/voice/VoiceCheckInService';
import { useUserStore } from '@/store/userStore';

export type CheckInState = 'idle' | 'recording' | 'uploading' | 'result' | 'error';

const HISTORY_KEY = 'voice_checkin_history';

export interface UseVoiceCheckInResult {
  state: CheckInState;
  elapsed_ms: number;       // 0 → RECORD_DURATION_MS while recording
  result: VoiceWellnessResult | null;
  history: VoiceWellnessResult[];
  errorMsg: string | null;
  startCheckIn: () => Promise<void>;
  cancelRecording: () => Promise<void>;
  reset: () => void;
}

export function useVoiceCheckIn(): UseVoiceCheckInResult {
  const userId = useUserStore((s) => s.profile?.id);
  const [state, setState] = useState<CheckInState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<VoiceWellnessResult | null>(null);
  const [history, setHistory] = useState<VoiceWellnessResult[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY).then((raw) => {
      if (raw) setHistory(JSON.parse(raw));
    });
  }, []);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
  }, []);

  const finishRecording = useCallback(async () => {
    clearTimers();
    if (!recordingRef.current) return;
    setState('uploading');
    setElapsed(0);
    try {
      const res = await stopAndAnalyze(recordingRef.current, userId);
      recordingRef.current = null;

      if (res.low_snr) {
        setState('error');
        setErrorMsg('Môi trường quá ồn. Hãy thử ở nơi yên tĩnh hơn (SNR < 10dB).');
        return;
      }

      setResult(res);
      // Persist history
      const newHistory = [res, ...history].slice(0, 20);
      setHistory(newHistory);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      setState('result');
    } catch (e: unknown) {
      setState('error');
      setErrorMsg(e instanceof Error ? e.message : 'Lỗi kết nối — thử lại sau');
    }
  }, [userId, history, clearTimers]);

  const startCheckIn = useCallback(async () => {
    setErrorMsg(null);
    setResult(null);
    setElapsed(0);
    setState('recording');
    const rec = await startRecording();
    recordingRef.current = rec;

    // Elapsed ticker
    const start = Date.now();
    timerRef.current = setInterval(() => setElapsed(Date.now() - start), 100);

    // Auto-stop at 20 seconds
    autoStopRef.current = setTimeout(finishRecording, RECORD_DURATION_MS);
  }, [finishRecording]);

  const cancelRecording = useCallback(async () => {
    clearTimers();
    if (recordingRef.current) {
      try { await recordingRef.current.stopAndUnloadAsync(); } catch { /* ignore */ }
      recordingRef.current = null;
    }
    setState('idle');
    setElapsed(0);
  }, [clearTimers]);

  const reset = useCallback(() => {
    setState('idle');
    setResult(null);
    setErrorMsg(null);
    setElapsed(0);
  }, []);

  return { state, elapsed_ms: elapsed, result, history, errorMsg, startCheckIn, cancelRecording, reset };
}
