/**
 * PART:   Voice AI Screen — Wellness Redesign
 * ACTOR:  Gemini 3.1
 * PHASE:  UI Redesign — Floating Cards
 * TASK:   Premium voice recording stage with Ivory bg and Soft Blue theme
 * SCOPE:  IN: UI, state transitions, result display
 *         OUT: recording logic (useVoiceRecorder)
 */

import { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, radius, elevation } from '@/constants/theme';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import Waveform from '@/components/health/Waveform';
import type { VoiceAnalyzeResponse } from '@/services/api/voiceAPI';

const W = Dimensions.get('window').width;

const VOICE_PROMPT =
  "Today I feel great. I had a good night's sleep and I am ready for a new day full of energy.";

const SUB_SCORE_CONFIG: Array<{
  key: keyof VoiceAnalyzeResponse['sub_scores'];
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}> = [
    { key: 'energy', label: 'Energy', icon: 'flash' },
    { key: 'stress', label: 'Stress', icon: 'fitness' },
    { key: 'cardiac_recovery', label: 'Heart', icon: 'heart' },
    { key: 'respiratory', label: 'Breath', icon: 'medical' },
  ];

function scoreColor(score: number): string {
  if (score >= 80) return colors.health.good;
  if (score >= 60) return colors.primary;
  if (score >= 40) return colors.health.warning;
  return colors.health.danger;
}

export default function VoiceScreen() {
  const {
    state, result, errorMsg, countdown, amplitude,
    startRecording, reset,
  } = useVoiceRecorder();

  const spinAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (state === 'uploading') {
      Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 1500, useNativeDriver: true })
      ).start();
    } else {
      spinAnim.stopAnimation();
      spinAnim.setValue(0);
    }
  }, [state]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const isRecording = state === 'recording';
  const isUploading = state === 'uploading';
  const hasResult = state === 'result' && result !== null;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* ── HEADER ── */}
      <View style={s.header}>
        <Text style={s.title}>Voice AI Check</Text>
        <Text style={s.subtitle}>Analyze your vocal biomarkers</Text>
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── RECORD STAGE (Idle / Recording) ── */}
        {(state === 'idle' || isRecording || state === 'error') && (
          <View style={s.recordSection}>
            <View style={s.instructionCard}>
              <Text style={s.instructionTitle}>Vocal Prompt</Text>
              <Text style={s.instructionText}>"{VOICE_PROMPT}"</Text>
              <Text style={s.instructionSub}>Read this aloud for 10 seconds</Text>
            </View>

            <View style={s.micContainer}>
              <View style={[s.micOuter, isRecording && s.micOuterActive]}>
                <View style={s.micInner}>
                  <TouchableOpacity
                    style={[s.micBtn, isRecording && s.micBtnActive, elevation.raised]}
                    onPress={startRecording}
                    disabled={isRecording}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isRecording ? 'stop' : 'mic'}
                      size={48}
                      color="#fff"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={s.waveformWrap}>
                <Waveform
                  amplitude={amplitude}
                  isActive={isRecording}
                  color={isRecording ? colors.accent : colors.primary}
                />
              </View>

              {isRecording && (
                <View style={[s.statusBadge, elevation.low]}>
                  <View style={s.dot} />
                  <Text style={s.statusText}>LISTENING ({countdown}s)</Text>
                </View>
              )}
            </View>

            {state === 'error' && errorMsg && (
              <View style={s.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.health.danger} />
                <Text style={s.errorText}>{errorMsg}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── ANALYZING STAGE ── */}
        {isUploading && (
          <View style={s.analyzingSection}>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Ionicons name="sparkles" size={64} color={colors.primary} />
            </Animated.View>
            <Text style={s.analyzingTitle}>Modeling Biomarkers...</Text>
            <Text style={s.analyzingSub}>Signal-to-noise check • Feature extraction</Text>
            <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
          </View>
        )}

        {/* ── RESULT STAGE ── */}
        {hasResult && result && (
          <View style={s.resultContainer}>
            {/* Main Score Card */}
            <View style={[s.mainCard, elevation.float]}>
              <View style={s.mainCardTop}>
                <View>
                  <Text style={s.cardLabel}>RECOVERY READINESS</Text>
                  <Text style={s.cardScoreTitle}>
                    {result.recovery_readiness_score >= 80 ? 'Harmonious' : 'Recovering'}
                  </Text>
                </View>
                <View style={[s.scoreCircle, { borderColor: scoreColor(result.recovery_readiness_score) }]}>
                  <Text style={[s.scoreNum, { color: scoreColor(result.recovery_readiness_score) }]}>
                    {result.recovery_readiness_score}
                  </Text>
                </View>
              </View>
              <Text style={s.analysisText}>
                Your vocal biomarkers indicate a state of
                <Text style={{ color: colors.primary, fontWeight: '700' }}> focus </Text>
                with mild respiratory stress detected. We recommend a 5-minute breathing exercise.
              </Text>
              <TouchableOpacity style={[s.cta, elevation.warmGlow]} onPress={reset}>
                <Text style={s.ctaText}>Retake Analysis</Text>
              </TouchableOpacity>
            </View>

            {/* Biomarker Grid */}
            <View style={s.biomarkerGrid}>
              {SUB_SCORE_CONFIG.map(({ key, label, icon }) => {
                const score = result.sub_scores[key];
                return (
                  <View key={key} style={[s.gridCard, elevation.float]}>
                    <View style={[s.iconBox, { backgroundColor: scoreColor(score) + '15' }]}>
                      <Ionicons name={icon} size={18} color={scoreColor(score)} />
                    </View>
                    <Text style={s.gridLabel}>{label}</Text>
                    <Text style={[s.gridValue, { color: scoreColor(score) }]}>{score}</Text>
                  </View>
                );
              })}
            </View>

            {/* Neuro Systems */}
            <View style={[s.systemsCard, elevation.float]}>
              <Text style={s.cardLabel}>NEURAL SYSTEMS</Text>
              <View style={s.systemsRow}>
                <SystemStat label="Neurological" val={Math.round(result.overall_neurological * 100)} />
                <View style={s.divider} />
                <SystemStat label="Respiratory" val={Math.round(result.overall_respiratory * 100)} />
                <View style={s.divider} />
                <SystemStat label="Disorder" val={Math.round((1 - result.overall_voice_disorder) * 100)} />
              </View>
            </View>

            <Text style={s.footer}>
              Inference: {Math.round(result.inference_ms)}ms • Model v{result.model_version}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SystemStat({ label, val }: { label: string; val: number }) {
  return (
    <View style={s.systemItem}>
      <Text style={s.systemVal}>{val}</Text>
      <Text style={s.systemLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  header: { padding: spacing.lg },
  title: { fontSize: fonts.sizes.xl, fontWeight: '800', color: colors.text.primary, letterSpacing: -0.5 },
  subtitle: { fontSize: fonts.sizes.sm, color: colors.text.secondary, marginTop: 2 },

  // Record Section
  recordSection: { alignItems: 'center', marginTop: spacing.md },
  instructionCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    alignItems: 'center', width: '100%', borderLeftWidth: 4, borderLeftColor: colors.primary,
    ...elevation.float,
  },
  instructionTitle: { fontSize: fonts.sizes.xs, fontWeight: '800', color: colors.primary, letterSpacing: 1.5, marginBottom: 8 },
  instructionText: { fontSize: fonts.sizes.lg, fontWeight: '700', color: colors.text.primary, textAlign: 'center', lineHeight: 28 },
  instructionSub: { fontSize: fonts.sizes.sm, color: colors.text.muted, marginTop: 8 },

  micContainer: { height: 400, alignItems: 'center', justifyContent: 'center', width: '100%', position: 'relative' },
  micOuter: {
    width: 240, height: 240, borderRadius: 120, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', ...elevation.float,
  },
  micOuterActive: { backgroundColor: colors.accent + '10' },
  micInner: {
    width: 180, height: 180, borderRadius: 90, backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  micBtn: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  micBtnActive: { backgroundColor: colors.accent },
  waveformWrap: { position: 'absolute', bottom: 40, width: '100%', height: 60 },

  statusBadge: {
    position: 'absolute', bottom: 0, flexDirection: 'row', alignItems: 'center',
    gap: 8, backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  statusText: { fontSize: 12, fontWeight: '800', color: colors.text.primary, letterSpacing: 1 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20,
    backgroundColor: colors.health.danger + '10', padding: 12, borderRadius: radius.md,
  },
  errorText: { color: colors.health.danger, fontSize: 12, fontWeight: '600' },

  // Analyzing
  analyzingSection: { flex: 1, minHeight: 400, alignItems: 'center', justifyContent: 'center' },
  analyzingTitle: { fontSize: fonts.sizes.lg, fontWeight: '800', color: colors.text.primary, marginTop: 24 },
  analyzingSub: { fontSize: fonts.sizes.sm, color: colors.text.secondary, marginTop: 4 },

  // Result Section
  resultContainer: { marginTop: spacing.md, gap: spacing.md },
  mainCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl },
  mainCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  cardLabel: { fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: 1.5, marginBottom: 4 },
  cardScoreTitle: { fontSize: fonts.sizes.xxl, fontWeight: '800', color: colors.text.primary, letterSpacing: -1 },
  scoreCircle: { width: 68, height: 68, borderRadius: 34, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  scoreNum: { fontSize: 24, fontWeight: '900' },
  analysisText: { fontSize: fonts.sizes.md, color: colors.text.secondary, lineHeight: 24, marginBottom: spacing.xl },
  cta: {
    backgroundColor: colors.accent, paddingVertical: 14, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaText: { color: '#fff', fontSize: fonts.sizes.md, fontWeight: '700' },

  biomarkerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  gridCard: {
    width: (W - spacing.lg * 2 - spacing.md) / 2,
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
    alignItems: 'center', gap: 6,
  },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  gridLabel: { fontSize: 12, color: colors.text.secondary, fontWeight: '600' },
  gridValue: { fontSize: 20, fontWeight: '800' },

  systemsCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  systemsRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  systemItem: { flex: 1, alignItems: 'center' },
  divider: { width: 1, height: 30, backgroundColor: colors.border },
  systemVal: { fontSize: fonts.sizes.lg, fontWeight: '800', color: colors.text.primary },
  systemLabel: { fontSize: 10, color: colors.text.muted, marginTop: 2 },
  footer: { fontSize: 10, color: colors.text.muted, textAlign: 'center', marginTop: spacing.md },
});
