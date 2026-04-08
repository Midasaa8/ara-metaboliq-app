/**
 * PART:   useVoiceRecorder — record audio, check SNR, send to API
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  4 — Voice AI Module
 * READS:  AGENTS.md §7, PLAN_B §1 Voice Biomarker, SONNET_PHASES.md §PHASE 4
 * TASK:   Start/stop recording (Expo AV), SNR pre-check, call voiceAPI,
 *         save result to healthStore, invalidate health-score query
 * SCOPE:  IN: recording lifecycle, SNR pre-check, API call, state management
 *         OUT: MFCC / GeMAPS extraction (server-side via voiceAPI)
 *              XGBoost inference         (server-side via voiceAPI)
 */

import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { useQueryClient } from '@tanstack/react-query';
import { voiceAPI, type VoiceAnalyzeResponse } from '@/services/api/voiceAPI';
import { useHealthStore } from '@/store/healthStore';
import { useUserStore } from '@/store/userStore';

// ── Constants ──

const RECORD_DURATION_MS    = 5_000; // 5-second recording window (PLAN_B §1)
const SAMPLE_RATE           = 16_000; // required by backend MARVEL pipeline
const SNR_REJECT_THRESHOLD  = 10;    // dB — mirrors backend voice_feature_extractor.py
const METERING_UPDATE_MS    = 100;   // how often Expo AV reports amplitude (ms)

// ── State machine ──

export type RecordState = 'idle' | 'recording' | 'uploading' | 'result' | 'error';

export interface UseVoiceRecorderReturn {
  state:         RecordState;
  result:        VoiceAnalyzeResponse | null;
  errorMsg:      string | null;
  countdown:     number;         // 0–5 seconds remaining while recording
  amplitude:     number;         // 0–1 normalised real-time mic level
  startRecording: () => Promise<void>;
  reset:         () => void;
}

// ── Simple client-side SNR estimate ──
// Power of signal (captured dBFS values) vs estimated noise floor.
// This is a coarse pre-check — the authoritative SNR runs server-side.
function estimateSnrDb(meteringValues: number[]): number {
  if (meteringValues.length === 0) return 0;
  // Expo AV reports dBFS (−160 → 0). Convert to linear power.
  const toPower = (db: number) => Math.pow(10, db / 10);
  const powers  = meteringValues.map(toPower);
  const sorted  = [...powers].sort((a, b) => a - b);
  // Noise floor = average of quietest 20 %
  const noiseFloorCount = Math.max(1, Math.floor(sorted.length * 0.2));
  const noisePower      = sorted.slice(0, noiseFloorCount).reduce((s, x) => s + x, 0) / noiseFloorCount;
  const signalPower     = powers.reduce((s, x) => s + x, 0) / powers.length;
  if (noisePower <= 0) return 0;
  return 10 * Math.log10(signalPower / noisePower);
}

// ── Hook ──

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [state,     setState]     = useState<RecordState>('idle');
  const [result,    setResult]    = useState<VoiceAnalyzeResponse | null>(null);
  const [errorMsg,  setErrorMsg]  = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(RECORD_DURATION_MS / 1_000);
  const [amplitude, setAmplitude] = useState<number>(0);

  const recordingRef    = useRef<Audio.Recording | null>(null);
  const meteringValues  = useRef<number[]>([]);
  const countdownTimer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const meteringTimer   = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userId     = useUserStore((s) => s.profile?.id);
  const setVoice   = useHealthStore((s) => s.setVoiceAnalysis);
  const queryClient = useQueryClient();

  // ── Helpers ──

  function clearTimers() {
    if (countdownTimer.current) { clearInterval(countdownTimer.current);  countdownTimer.current = null; }
    if (meteringTimer.current)  { clearInterval(meteringTimer.current);   meteringTimer.current  = null; }
    if (autoStopTimer.current)  { clearTimeout(autoStopTimer.current);    autoStopTimer.current  = null; }
  }

  async function stopAndProcess(rec: Audio.Recording) {
    try {
      await rec.stopAndUnloadAsync();
      clearTimers();
      setState('uploading');

      // -- SNR pre-check --
      const snr = estimateSnrDb(meteringValues.current);
      if (snr < SNR_REJECT_THRESHOLD) {
        setState('error');
        setErrorMsg('Tiếng ồn quá lớn. Thử lại ở nơi yên tĩnh hơn.');
        recordingRef.current = null;
        return;
      }

      // -- Read audio file as base64 --
      const uri = rec.getURI();
      if (!uri) throw new Error('Recording URI is null');

      // Read audio URI as base64 using native fetch (no extra dependency)
      const fileResponse = await fetch(uri);
      const blob = await fileResponse.blob();
      const audioBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          // Strip "data:...;base64," prefix
          resolve(dataUrl.split(',')[1] ?? '');
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });

      // -- Send to backend MARVEL pipeline --
      const response = await voiceAPI.analyze(
        audioBase64,
        SAMPLE_RATE,
        RECORD_DURATION_MS,
        userId,
      );

      const analysis = response.data;
      setResult(analysis);

      // -- Persist into Zustand healthStore (simple mapping for now) --
      setVoice({
        class:      analysis.flags.length > 0 ? analysis.flags[0] : 'normal',
        confidence: analysis.recovery_readiness_score / 100,
        flags:      analysis.flags,
      });

      // -- Invalidate health score so the home dashboard refreshes --
      queryClient.invalidateQueries({ queryKey: ['health-score'] });

      setState('result');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed';
      setErrorMsg(msg);
      setState('error');
    } finally {
      recordingRef.current = null;
    }
  }

  // ── Public API ──

  const startRecording = useCallback(async () => {
    if (state !== 'idle' && state !== 'error' && state !== 'result') return;

    try {
      // Request mic permission
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        setErrorMsg('Microphone permission denied. Please allow access in Settings.');
        setState('error');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS:        true,
        playsInSilentModeIOS:      true,
        interruptionModeIOS:       1, // DO_NOT_MIX
        shouldDuckAndroid:         true,
        interruptionModeAndroid:   1, // DO_NOT_MIX
        playThroughEarpieceAndroid: false,
        staysActiveInBackground:    false,
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync({
        android: {
          extension:            '.wav',
          outputFormat:         2,  // THREE_GPP (Expo AV constant)
          audioEncoder:         3,  // AMR_NB
          sampleRate:           SAMPLE_RATE,
          numberOfChannels:     1,
          bitRate:              128_000,
        },
        ios: {
          extension:            '.wav',
          outputFormat:         'lpcm' as never,
          audioQuality:         127, // MAX
          sampleRate:           SAMPLE_RATE,
          numberOfChannels:     1,
          bitRate:              128_000,
          linearPCMBitDepth:    16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat:     false,
        },
        web: {
          mimeType:   'audio/webm',
          bitsPerSecond: 128_000,
        },
        isMeteringEnabled: true,
      });

      await rec.startAsync();
      recordingRef.current = rec;
      meteringValues.current = [];

      setState('recording');
      setResult(null);
      setErrorMsg(null);
      setAmplitude(0);

      // -- Countdown timer (1 Hz) --
      let remaining = RECORD_DURATION_MS / 1_000;
      setCountdown(remaining);
      countdownTimer.current = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);
        if (remaining <= 0 && countdownTimer.current) {
          clearInterval(countdownTimer.current);
          countdownTimer.current = null;
        }
      }, 1_000);

      // -- Metering timer (10 Hz) --
      meteringTimer.current = setInterval(async () => {
        const status = await rec.getStatusAsync();
        if (status.isRecording && status.metering !== undefined) {
          meteringValues.current.push(status.metering);
          // Normalise dBFS (−160 → 0) to 0–1
          const norm = Math.max(0, (status.metering + 60) / 60);
          setAmplitude(norm);
        }
      }, METERING_UPDATE_MS);

      // -- Auto-stop after RECORD_DURATION_MS --
      autoStopTimer.current = setTimeout(async () => {
        if (recordingRef.current) {
          await stopAndProcess(recordingRef.current);
        }
      }, RECORD_DURATION_MS);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not start recording';
      setErrorMsg(msg);
      setState('error');
    }
  }, [state, userId]);

  const reset = useCallback(() => {
    clearTimers();
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
    }
    setState('idle');
    setResult(null);
    setErrorMsg(null);
    setCountdown(RECORD_DURATION_MS / 1_000);
    setAmplitude(0);
    meteringValues.current = [];
  }, []);

  return {
    state,
    result,
    errorMsg,
    countdown,
    amplitude,
    startRecording,
    reset,
  };
}
