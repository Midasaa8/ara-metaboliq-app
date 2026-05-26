/**
 * PART:   VoiceCheckInService — 20s recording + SNR check + upload + 5-signal mapping
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  27s — Voice AI Service Refactor
 * TASK:   Record 16kHz mono via expo-av, read as base64, call backend MARVEL endpoint,
 *         map response to 5 standardised health signals + overall score
 * SCOPE:  IN: expo-av + expo-file-system + voiceAPI
 *         OUT: SNR pre-processing (server does this), MFCC/XGBoost (Opus)
 */

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { voiceAPI, type VoiceAnalyzeResponse } from '@/services/api/voiceAPI';

export type SignalLevel = 'low' | 'moderate' | 'elevated';

export interface HealthSignal {
  key: string;
  label: string;
  emoji: string;
  score: number;    // 0-100
  level: SignalLevel;
  description: string;
}

export interface VoiceWellnessResult {
  signals: HealthSignal[];
  overall_score: number;
  snr_db: number;
  low_snr: boolean;
  recorded_at: string; // ISO
}

const RECORDING_OPTIONS: Audio.RecordingOptions = {
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.MEDIUM,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 64000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {},
};

export const RECORD_DURATION_MS = 20_000;

function toLevel(score: number): SignalLevel {
  if (score >= 70) return 'low';
  if (score >= 40) return 'moderate';
  return 'elevated';
}

function mapSignals(r: VoiceAnalyzeResponse): HealthSignal[] {
  const metabolic = Math.round(Math.max(0, Math.min(100, 100 - (r.condition_risks['metabolic_syndrome'] ?? 0) * 100)));
  const movement  = Math.round(Math.max(0, Math.min(100, r.sub_scores.energy)));
  const cognitive = Math.round(Math.max(0, Math.min(100, 100 - r.overall_neurological * 100)));
  const mood      = Math.round(Math.max(0, Math.min(100, 100 - r.sub_scores.stress)));
  const respiratory = Math.round(Math.max(0, Math.min(100, r.sub_scores.respiratory)));

  return [
    { key: 'metabolic', label: 'Metabolic Risk Signal', emoji: '🫀', score: metabolic, level: toLevel(metabolic), description: 'Tín hiệu rủi ro chuyển hóa từ giọng nói' },
    { key: 'movement',  label: 'Movement Stability',    emoji: '🧠', score: movement,  level: toLevel(movement),  description: 'Độ ổn định vận động & năng lượng' },
    { key: 'cognitive', label: 'Cognitive Trend',       emoji: '💭', score: cognitive, level: toLevel(cognitive), description: 'Xu hướng nhận thức & tâm thần' },
    { key: 'mood',      label: 'Mood Pattern',          emoji: '😊', score: mood,      level: toLevel(mood),      description: 'Mẫu cảm xúc & stress từ giọng nói' },
    { key: 'respiratory', label: 'Respiratory Health',  emoji: '🫁', score: respiratory, level: toLevel(respiratory), description: 'Sức khỏe hô hấp & chỉ số breathiness' },
  ];
}

export async function startRecording(): Promise<Audio.Recording> {
  await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
  const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
  return recording;
}

export async function stopAndAnalyze(
  recording: Audio.Recording,
  userId?: string,
): Promise<VoiceWellnessResult> {
  await recording.stopAndUnloadAsync();
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

  const uri = recording.getURI();
  if (!uri) throw new Error('No recording URI');

  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });

  const res = await voiceAPI.analyze(base64, 16000, RECORD_DURATION_MS, userId);
  const data = res.data;

  const signals = mapSignals(data);
  const overall = Math.round(signals.reduce((s, sig) => s + sig.score, 0) / signals.length);

  return {
    signals,
    overall_score: overall,
    snr_db: data.snr_db,
    low_snr: data.flags.includes('low_snr'),
    recorded_at: new Date().toISOString(),
  };
}
