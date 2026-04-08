/**
 * PART:   Voice AI Screen — Record → Analyzing → Result
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  4 — Voice AI Module
 * READS:  AGENTS.md §7, PLAN_B §1 Voice Biomarker, SONNET_PHASES.md §PHASE 4
 * TASK:   3-state UI: IDLE/RECORDING → UPLOADING → RESULT
 *         Uses useVoiceRecorder hook for full lifecycle
 * SCOPE:  IN: UI, state transitions, result display
 *         OUT: recording logic (useVoiceRecorder), inference (server-side)
 */

import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '@/constants/theme';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import Waveform from '@/components/health/Waveform';
import type { VoiceAnalyzeResponse } from '@/services/api/voiceAPI';

// ── Vietnamese prompt text (user reads aloud during recording) ──
const VOICE_PROMPT =
  'Hôm nay tôi cảm thấy khoẻ. Tôi đã ngủ đủ giấc và sẵn sàng cho một ngày mới đầy năng lượng.';

// ── Sub-score display config ──
const SUB_SCORE_CONFIG: Array<{
  key: keyof VoiceAnalyzeResponse['sub_scores'];
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
    { key: 'energy', label: 'Energy', icon: 'flash' },
    { key: 'stress', label: 'Stress Control', icon: 'fitness' },
    { key: 'cardiac_recovery', label: 'Cardiac Recovery', icon: 'heart' },
    { key: 'respiratory', label: 'Respiratory', icon: 'medical' },
  ];

function scoreColor(score: number): string {
  if (score >= 80) return colors.health.good;
  if (score >= 60) return colors.secondary;
  if (score >= 40) return colors.health.warning;
  return colors.health.danger;
}

// ── Sub-score card ──
function RiskCard({
  label,
  icon,
  score,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  score: number;
}) {
  const color = scoreColor(score);
  return (
    <View style={styles.riskCard}>
      <View style={[styles.riskIconBox, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.riskLabel}>{label}</Text>
      <Text style={[styles.riskScore, { color }]}>{score}</Text>
      <View style={styles.riskBarTrack}>
        <View style={[styles.riskBarFill, { width: `${score}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ── Main screen ──
export default function VoiceScreen() {
  const {
    state,
    result,
    errorMsg,
    countdown,
    amplitude,
    startRecording,
    reset,
  } = useVoiceRecorder();

  // Pulsing spinner animation for "uploading" state
  const spinAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (state === 'uploading') {
      Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
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
  const hasError = state === 'error';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Voice AI</Text>
        <Text style={styles.subtitle}>Recovery Readiness Check</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── RECORD / IDLE state ── */}
        {(state === 'idle' || isRecording || hasError) && (
          <View style={styles.recordSection}>
            <View style={styles.instructionBox}>
              <Text style={styles.instructionTitle}>How are you{"\n"}feeling today?</Text>
              <Text style={styles.instructionSub}>Speak naturally. I'm here to listen{"\n"}and guide your meditation.</Text>
            </View>

            <View style={styles.heroMicStage}>
              {/* SNR Pill Mockup */}
              {isRecording && (
                <View style={styles.snrPill}>
                  <Text style={styles.snrTitle}>VOICE CLARITY</Text>
                  <View style={styles.snrBarBg}>
                    <View style={styles.snrBarFill} />
                  </View>
                  <Text style={styles.snrValue}>75%</Text>
                </View>
              )}

              {/* Concentric Rings */}
              <View style={styles.micRingOuter}>
                <View style={styles.micRingMiddle}>
                  <TouchableOpacity
                    style={[styles.micHeroButton, isRecording && styles.micHeroButtonActive]}
                    onPress={startRecording}
                    disabled={isRecording}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isRecording ? 'stop-circle' : 'mic'}
                      size={56}
                      color="#fff"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Waveform overlapping bottom */}
              <View style={styles.heroWaveformBox}>
                <Waveform
                  amplitude={amplitude}
                  isActive={isRecording}
                  color={isRecording ? colors.health.danger : colors.primary}
                />
              </View>

              {/* Floating Listening Badge */}
              {isRecording && (
                <View style={styles.listeningBadge}>
                  <View style={styles.listeningBadgeDot} />
                  <Text style={styles.listeningBadgeText}>LISTENING ({countdown}s)...</Text>
                </View>
              )}
            </View>

            {hasError && errorMsg && (
              <View style={styles.errorBox}>
                <Ionicons name="warning" size={16} color={colors.health.danger} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── UPLOADING / ANALYZING state ── */}
        {isUploading && (
          <View style={styles.analyzingSection}>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Ionicons name="analytics" size={56} color={colors.secondary} />
            </Animated.View>
            <Text style={styles.analyzingTitle}>Đang phân tích…</Text>
            <Text style={styles.analyzingSubtitle}>
              MARVEL pipeline · GeMAPS 88-dim · XGBoost
            </Text>
            <ActivityIndicator color={colors.secondary} style={{ marginTop: spacing.md }} />
          </View>
        )}

        {/* ── RESULT state (Bento Layout) ── */}
        {hasResult && result && (
          <View style={styles.resultBento}>

            {/* Top Main Bento Card */}
            <View style={styles.bentoMainCard}>
              <Ionicons name="sparkles" size={40} color={colors.primary} style={styles.bentoIconTopRight} />
              <Text style={styles.bentoLabel}>CURRENT ANALYSIS</Text>
              <Text style={styles.bentoScoreTitle}>
                {result.recovery_readiness_score >= 80 ? 'Harmonious Balance' : 'Needs Recovery'}
              </Text>
              <Text style={styles.bentoText}>
                Your vocal patterns indicate a Readiness Score of
                <Text style={{ fontWeight: 'bold', color: colors.primary }}> {result.recovery_readiness_score}</Text>.
                {result.flags.length > 0
                  ? ` We detected ${result.flags[0].replace(/_/g, ' ')} in the lower frequencies.`
                  : ' Excellent state of recovery.'}
              </Text>
              <TouchableOpacity style={styles.bentoActionBtn} onPress={reset}>
                <Text style={styles.bentoActionBtnText}>Start Exercise</Text>
              </TouchableOpacity>
            </View>

            {/* Sub-grid Bento Row */}
            <View style={styles.bentoSubRow}>
              {/* History Stack Card */}
              <View style={styles.historyStackCard}>
                <Text style={styles.bentoLabel}>VOICE HISTORY</Text>

                <View style={styles.historyItem}>
                  <View style={[styles.historyIconBox, { backgroundColor: colors.tertiary + '20' }]}>
                    <Ionicons name="moon" size={14} color={colors.tertiary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyTitle}>Zen State</Text>
                    <Text style={styles.historyTime}>Yesterday</Text>
                  </View>
                </View>

                <View style={styles.historyItem}>
                  <View style={[styles.historyIconBox, { backgroundColor: colors.secondary + '20' }]}>
                    <Ionicons name="flash" size={14} color={colors.secondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyTitle}>High Vitality</Text>
                    <Text style={styles.historyTime}>Mon</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.viewInsightsBtn} onPress={reset}>
                  <Text style={styles.viewInsightsText}>Check Again</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {/* Sub-score Risk Vertical Card */}
              <View style={styles.riskVerticalStack}>
                <Text style={styles.bentoLabel}>BIOMARKERS</Text>
                <View style={{ gap: spacing.xs }}>
                  {SUB_SCORE_CONFIG.map(({ key, label, icon }) => (
                    <RiskCard key={key} label={label} icon={icon} score={result.sub_scores[key]} />
                  ))}
                </View>
              </View>
            </View>

            {/* System Row */}
            <View style={styles.systemRow}>
              <View style={styles.systemItem}>
                <Text style={styles.systemLabel}>Neurological</Text>
                <Text style={[styles.systemValue, { color: scoreColor(Math.round(result.overall_neurological * 100)) }]}>
                  {Math.round(result.overall_neurological * 100)}
                </Text>
              </View>
              <View style={styles.systemDivider} />
              <View style={styles.systemItem}>
                <Text style={styles.systemLabel}>Respiratory</Text>
                <Text style={[styles.systemValue, { color: scoreColor(Math.round(result.overall_respiratory * 100)) }]}>
                  {Math.round(result.overall_respiratory * 100)}
                </Text>
              </View>
              <View style={styles.systemDivider} />
              <View style={styles.systemItem}>
                <Text style={styles.systemLabel}>Voice Disorder</Text>
                <Text style={[styles.systemValue, { color: scoreColor(Math.round((1 - result.overall_voice_disorder) * 100)) }]}>
                  {Math.round((1 - result.overall_voice_disorder) * 100)}
                </Text>
              </View>
            </View>

            <Text style={styles.metaText}>
              Model {result.model_version} · {Math.round(result.inference_ms)}ms · SNR {result.snr_db.toFixed(1)}dB
            </Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title: { color: colors.text.primary, fontSize: fonts.sizes.xl, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: colors.text.secondary, fontSize: fonts.sizes.sm, marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },

  // Record Stage
  recordSection: { alignItems: 'center', paddingTop: spacing.xl, gap: spacing.xxl },
  instructionBox: { alignItems: 'center', gap: 6, paddingHorizontal: spacing.lg },
  instructionTitle: { color: colors.text.primary, fontSize: 32, fontWeight: '900', textAlign: 'center', letterSpacing: -1 },
  instructionSub: { color: colors.text.secondary, fontSize: fonts.sizes.md, textAlign: 'center', lineHeight: 22 },

  // Hero Mic Concentric Design
  heroMicStage: {
    height: 380, width: '100%', alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  snrPill: {
    position: 'absolute', left: 0, height: 140, alignItems: 'center', justifyContent: 'space-between',
  },
  snrTitle: {
    color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 2, transform: [{ rotate: '-90deg' }], marginBottom: 40,
  },
  snrBarBg: { width: 8, height: 60, backgroundColor: colors.surfaceElevated, borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end', marginBottom: 6 },
  snrBarFill: { width: '100%', height: '75%', backgroundColor: colors.primary, borderRadius: 4 },
  snrValue: { color: colors.text.primary, fontSize: 10, fontWeight: '800' },
  micRingOuter: {
    width: 260, height: 260, backgroundColor: colors.surface, borderRadius: 130, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 10 }, shadowRadius: 20, elevation: 10,
  },
  micRingMiddle: {
    width: 200, height: 200, backgroundColor: colors.background, borderRadius: 100, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 5 }, shadowRadius: 10, elevation: 5,
  },
  micHeroButton: {
    width: 140, height: 140, borderRadius: 70, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primaryDark, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.5, shadowRadius: 25, elevation: 15,
  },
  micHeroButtonActive: { backgroundColor: colors.health.danger, shadowColor: colors.health.danger },
  heroWaveformBox: { position: 'absolute', bottom: 20, left: 0, right: 0, height: 60, alignItems: 'center', justifyContent: 'center', opacity: 0.9, zIndex: 10 },
  listeningBadge: {
    position: 'absolute', bottom: -30, backgroundColor: colors.primary + '30', flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, gap: 8, borderWidth: 1, borderColor: colors.primary + '50',
  },
  listeningBadgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  listeningBadgeText: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.health.danger + '20', borderRadius: radius.md,
    padding: spacing.md, width: '100%', marginTop: spacing.lg,
  },
  errorText: { color: colors.health.danger, fontSize: fonts.sizes.sm, flex: 1 },

  // Analyzing Stage
  analyzingSection: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingTop: spacing.xxl },
  analyzingTitle: { color: colors.text.primary, fontSize: fonts.sizes.lg, fontWeight: '700' },
  analyzingSubtitle: { color: colors.text.secondary, fontSize: fonts.sizes.sm },

  // Bento Result Stage
  resultBento: { paddingTop: spacing.xl, gap: spacing.md },
  bentoMainCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, position: 'relative', overflow: 'hidden',
  },
  bentoIconTopRight: { position: 'absolute', top: spacing.lg, right: spacing.lg, opacity: 0.1 },
  bentoLabel: { fontSize: 10, fontWeight: '900', color: colors.primary, letterSpacing: 1.5, marginBottom: spacing.md },
  bentoScoreTitle: { fontSize: fonts.sizes.xxl, fontWeight: '800', color: colors.text.primary, letterSpacing: -1, marginBottom: 8 },
  bentoText: { color: colors.text.secondary, fontSize: fonts.sizes.sm, lineHeight: 22, marginBottom: spacing.lg },
  bentoActionBtn: { backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center' },
  bentoActionBtnText: { color: '#fff', fontSize: fonts.sizes.md, fontWeight: '700' },

  bentoSubRow: { flexDirection: 'row', gap: spacing.md },
  historyStackCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md },
  historyItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  historyIconBox: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  historyTitle: { color: colors.text.primary, fontSize: fonts.sizes.sm, fontWeight: '700' },
  historyTime: { color: colors.text.secondary, fontSize: 10 },
  viewInsightsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 'auto', paddingTop: spacing.sm },
  viewInsightsText: { color: colors.primary, fontSize: fonts.sizes.xs, fontWeight: '800' },

  riskVerticalStack: { flex: 1, flexShrink: 0, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md },
  riskCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  riskIconBox: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  riskLabel: { color: colors.text.secondary, fontSize: 10 },
  riskScore: { fontSize: fonts.sizes.md, fontWeight: '800' },
  riskBarTrack: { height: 3, backgroundColor: colors.surfaceElevated, borderRadius: 2, overflow: 'hidden', display: 'none' },
  riskBarFill: { height: 3, borderRadius: 2, display: 'none' },

  systemRow: {
    flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: spacing.md, marginTop: spacing.md
  },
  systemItem: { flex: 1, alignItems: 'center', gap: 4 },
  systemDivider: { width: 1, backgroundColor: colors.border },
  systemLabel: { color: colors.text.secondary, fontSize: fonts.sizes.xs },
  systemValue: { fontSize: fonts.sizes.lg, fontWeight: '700' },
  metaText: { color: colors.text.muted, fontSize: fonts.sizes.xs, textAlign: 'center', marginVertical: spacing.md },
});
