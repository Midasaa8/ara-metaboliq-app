/**
 * PART:   Exercise Tracker Screen — Chọn bài → Đếm rep → Kết quả
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  5 — Exercise Tracker
 * READS:  AGENTS.md §7, PLAN_B §2 AI Discipline Engine, SONNET_PHASES.md §PHASE 5
 * TASK:   3 trạng thái UI: PICK → TRACKING → RESULT
 *         IS_HACKATHON=true → MockPoseDetector; Phase 11 → camera thật
 * SCOPE:  IN: UI, state transitions, gọi exerciseAPI
 *         OUT: tính góc (useRepCounter), MediaPipe (PoseDetector)
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Line } from 'react-native-svg';
import { colors, fonts, spacing, radius } from '@/constants/theme';
import { useRepCounter } from '@/hooks/useRepCounter';
import { exerciseAPI } from '@/services/api/exerciseAPI';
import { useUserStore } from '@/store/userStore';
import { useQueryClient } from '@tanstack/react-query';
import type { ExerciseType } from '@/types/pose';

// ── Cấu hình các bài tập ──
const EXERCISES: Array<{
  type: ExerciseType;
  label: string;
  icon: any;
  targetReps: number;
  muscles: string;
}> = [
    { type: 'push_up', label: 'Chống Đẩy', icon: 'body', targetReps: 10, muscles: 'Ngực · Vai · Tay sau' },
    { type: 'squat', label: 'Squat', icon: 'fitness', targetReps: 15, muscles: 'Đùi · Mông · Core' },
    { type: 'bicep_curl', label: 'Bicep Curl', icon: 'barbell', targetReps: 12, muscles: 'Tay trước · Cánh tay' },
    { type: 'shoulder_press', label: 'Shoulder Press', icon: 'trophy', targetReps: 10, muscles: 'Vai · Tay sau · Core' },
  ];

type ScreenState = 'pick' | 'tracking' | 'result';

// ── Horizontal Exercise Selector ──
function ExerciseCard({
  exercise,
  onSelect,
  isActive
}: {
  exercise: (typeof EXERCISES)[number];
  onSelect: (ex: (typeof EXERCISES)[number]) => void;
  isActive?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.pebbleCard, isActive && styles.pebbleCardActive]}
      onPress={() => onSelect(exercise)}
      activeOpacity={0.8}
    >
      <Ionicons
        name={exercise.icon}
        size={24}
        color={isActive ? '#fff' : colors.text.secondary}
        style={{ marginBottom: 8 }}
      />
      <Text style={[styles.pebbleLabel, isActive && { color: '#fff' }]}>
        {exercise.label}
      </Text>
      <Text style={[styles.pebbleMuscles, isActive && { color: 'rgba(255,255,255,0.7)' }]}>
        {exercise.targetReps} reps
      </Text>
    </TouchableOpacity>
  );
}

// ── Static Normalised Skeleton ──
const JOINTS: Record<string, { x: number; y: number }> = {
  nose: { x: 0.50, y: 0.15 },
  left_shoulder: { x: 0.35, y: 0.28 },
  right_shoulder: { x: 0.65, y: 0.28 },
  left_elbow: { x: 0.22, y: 0.42 },
  right_elbow: { x: 0.78, y: 0.42 },
  left_wrist: { x: 0.16, y: 0.56 },
  right_wrist: { x: 0.84, y: 0.56 },
  left_hip: { x: 0.40, y: 0.58 },
  right_hip: { x: 0.60, y: 0.58 },
  left_knee: { x: 0.38, y: 0.74 },
  right_knee: { x: 0.62, y: 0.74 },
  left_ankle: { x: 0.38, y: 0.90 },
  right_ankle: { x: 0.62, y: 0.90 },
};

const BONES: [string, string][] = [
  ['nose', 'left_shoulder'], ['nose', 'right_shoulder'],
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'], ['right_knee', 'right_ankle'],
];

const PRIMARY_JOINTS: Record<ExerciseType, string[]> = {
  push_up: ['left_elbow', 'right_elbow', 'left_wrist', 'right_wrist', 'left_shoulder', 'right_shoulder'],
  bicep_curl: ['left_elbow', 'right_elbow', 'left_wrist', 'right_wrist'],
  shoulder_press: ['left_elbow', 'right_elbow', 'left_shoulder', 'right_shoulder'],
  squat: ['left_knee', 'right_knee', 'left_hip', 'right_hip', 'left_ankle', 'right_ankle'],
};

// ── Skeleton Overlay ──
function SkeletonOverlay({ exerciseType, w, h }: { exerciseType: ExerciseType; w: number; h: number }) {
  const primary = PRIMARY_JOINTS[exerciseType];
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
      {BONES.map(([a, b]) => {
        const jA = JOINTS[a]; const jB = JOINTS[b];
        if (!jA || !jB) return null;
        return (
          <Line
            key={`${a}-${b}`}
            x1={jA.x * w} y1={jA.y * h}
            x2={jB.x * w} y2={jB.y * h}
            stroke={colors.primary}
            strokeWidth={3}
            opacity={0.4}
          />
        );
      })}
      {Object.entries(JOINTS).map(([name, pos]) => {
        const isPrimary = primary.includes(name);
        return (
          <Circle
            key={name}
            cx={pos.x * w}
            cy={pos.y * h}
            r={isPrimary ? 8 : 4}
            fill={isPrimary ? colors.primary : colors.tertiary}
            opacity={isPrimary ? 1 : 0.6}
          />
        );
      })}
    </Svg>
  );
}

// ── Hero Camera view ──
function CameraPlaceholder({ exerciseType, isRunning, reps }: { exerciseType: ExerciseType; isRunning: boolean, reps: number }) {
  // Use a fixed width assuming standard mobile screen (or use onLayout, but skipping for simplicity)
  const W = 340;
  const H = 425; // 4:5 aspect ratio

  return (
    <View style={[styles.cameraBox, { height: H }]}>
      {/* Background (simulated camera feed using pure color stack) */}
      <View style={styles.cameraBg} />

      {/* Skeleton overlay */}
      <SkeletonOverlay exerciseType={exerciseType} w={W} h={H} />

      {/* Giant Overlay Rep Counter */}
      <View style={styles.giantRepOverlay}>
        <Text style={styles.giantRepText}>{reps}</Text>
        <Text style={styles.giantRepLabel}>REPS DONE</Text>
      </View>

      {/* Floating Status Badge */}
      <View style={styles.liveStatusBadge}>
        <View style={[styles.liveStatusDot, { backgroundColor: isRunning ? colors.tertiary : colors.text.muted }]} />
        <Text style={styles.liveStatusText}>{isRunning ? 'LIVE ANALYSIS' : 'POSE READY'}</Text>
      </View>

      <View style={styles.cameraPhaseLabel}>
        <Ionicons name="camera" size={14} color="#FFF" />
        <Text style={styles.cameraPhaseLabelText}>Hackathon Mock</Text>
      </View>
    </View>
  );
}

// ── Main Screen ──
export default function ExerciseScreen() {
  const [screenState, setScreenState] = useState<ScreenState>('pick');
  const [selectedExercise, setSelectedExercise] = useState<(typeof EXERCISES)[number]>(EXERCISES[0]);
  const [startTime, setStartTime] = useState<number>(0);
  const [sessionResult, setSessionResult] = useState<{ reps: number; score: number; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const userId = useUserStore((s) => s.profile?.id ?? null);
  const queryClient = useQueryClient();

  // ── Callback khi đủ rep ──
  const handleComplete = useCallback(async (doneReps: number) => {
    const durationS = Math.round((Date.now() - startTime) / 1000);
    setIsSaving(true);
    try {
      const res = await exerciseAPI.saveSession({
        user_id: userId,
        exercise_type: selectedExercise.type,
        reps_completed: doneReps,
        target_reps: selectedExercise.targetReps,
        duration_s: durationS,
        passed: doneReps >= selectedExercise.targetReps,
      });
      setSessionResult({
        reps: res.data.reps_completed,
        score: res.data.score,
        message: res.data.message,
      });
    } catch {
      setSessionResult({
        reps: doneReps,
        score: Math.round((doneReps / selectedExercise.targetReps) * 100),
        message: '🎉 Hoàn thành! Lưu offline.',
      });
    } finally {
      setIsSaving(false);
      repCounter.stop();
      setScreenState('result');
      queryClient.invalidateQueries({ queryKey: ['health-score'] });
    }
  }, [startTime, userId, selectedExercise, queryClient]);

  const repCounter = useRepCounter(
    selectedExercise.type,
    selectedExercise.targetReps,
    handleComplete,
  );

  function selectAndStart(ex: (typeof EXERCISES)[number]) {
    setSelectedExercise(ex);
    setStartTime(Date.now());
    setScreenState('tracking');
  }

  function resetAll() {
    repCounter.reset();
    setSessionResult(null);
    setScreenState('pick');
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>AI Trainer</Text>
        <TouchableOpacity style={styles.settingsBtn}>
          <Ionicons name="settings-outline" size={20} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Exercise Horizontal Selector (Pick / Tracking Header) ── */}
        {(screenState === 'pick' || screenState === 'tracking') && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pebblesContainer}
            style={styles.pebbleScrollArea}
          >
            {EXERCISES.map((ex) => (
              <ExerciseCard
                key={ex.type}
                exercise={ex}
                onSelect={selectAndStart}
                isActive={screenState === 'tracking' && selectedExercise.type === ex.type}
              />
            ))}
          </ScrollView>
        )}

        {screenState === 'pick' && (
          <View style={styles.idleStateBox}>
            <View style={styles.idleIconBox}>
              <Ionicons name="body-outline" size={48} color={colors.primary} />
            </View>
            <Text style={styles.idleTitle}>Select an Exercise</Text>
            <Text style={styles.idleSub}>Position your phone securely and follow the AI form tracking instructions.</Text>
          </View>
        )}

        {/* ── TRACKING ── */}
        {screenState === 'tracking' && (
          <View style={styles.trackingSection}>

            {/* Hero Camera View */}
            <CameraPlaceholder exerciseType={selectedExercise.type} isRunning={repCounter.isRunning} reps={repCounter.reps} />

            {/* CTA Interaction */}
            <View style={styles.ctaRow}>
              {!repCounter.isRunning ? (
                <TouchableOpacity style={styles.startBtn} onPress={repCounter.start} activeOpacity={0.85}>
                  <Ionicons name="play" size={20} color="#fff" />
                  <Text style={styles.startBtnText}>Start Tracking</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.stopBtn} onPress={repCounter.stop} activeOpacity={0.85}>
                  <Ionicons name="stop" size={20} color={colors.health.danger} />
                  <Text style={styles.stopBtnText}>Stop Tracking</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.backBtn} onPress={resetAll} activeOpacity={0.85}>
                <Ionicons name="refresh" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* Bento Grid Bottom Sections */}
            <View style={styles.bentoRow}>

              {/* Form Feedback Card */}
              <View style={styles.bentoCard}>
                <View style={styles.bentoHeaderRow}>
                  <View>
                    <Text style={styles.bentoMiniLabel}>FORM FEEDBACK</Text>
                    <Text style={styles.bentoTitle}>Posture</Text>
                  </View>
                  <View style={[styles.bentoIconDrop, { backgroundColor: repCounter.feedback.severity === 'good' ? colors.tertiary + '30' : colors.health.warning + '30' }]}>
                    <Ionicons name={repCounter.feedback.severity === 'good' ? 'checkmark-circle' : 'alert-circle'} size={24} color={repCounter.feedback.severity === 'good' ? colors.tertiary : colors.health.warning} />
                  </View>
                </View>
                <View style={[styles.feedbackHighlight, { backgroundColor: repCounter.feedback.severity === 'good' ? colors.tertiary + '15' : colors.health.warning + '15' }]}>
                  <Text style={[styles.feedbackText, { color: repCounter.feedback.severity === 'good' ? colors.tertiary : colors.health.warning }]}>
                    {repCounter.feedback.message}
                  </Text>
                </View>
              </View>

              {/* Session Summary Card */}
              <View style={styles.bentoCard}>
                <View style={styles.bentoHeaderRow}>
                  <View>
                    <Text style={styles.bentoMiniLabel}>PROGRESS</Text>
                    <Text style={styles.bentoTitle}>Tracker</Text>
                  </View>
                  <View style={[styles.bentoIconDrop, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons name="trending-up" size={24} color={colors.primary} />
                  </View>
                </View>
                <View style={styles.statsGrid}>
                  <View style={styles.statColumn}>
                    <Text style={styles.statLabel}>TARGET</Text>
                    <Text style={styles.statValue}>{selectedExercise.targetReps}</Text>
                  </View>
                  <View style={styles.statColumn}>
                    <Text style={styles.statLabel}>PHASE</Text>
                    <Text style={styles.statValue}>
                      {repCounter.phase === 'down' ? '↓' : repCounter.phase === 'up' ? '↑' : '—'}
                    </Text>
                  </View>
                  <View style={styles.statColumn}>
                    <Text style={styles.statLabel}>ANGLE</Text>
                    <Text style={[styles.statValue, { fontSize: 18 }]}>
                      {repCounter.angles
                        ? `${Math.round(repCounter.angles[
                            selectedExercise.type === 'squat' ? 'left_knee' : 'left_elbow'
                          ])}°`
                        : '—'}
                    </Text>
                  </View>
                </View>
              </View>

            </View>

            {isSaving && <Text style={styles.savingText}>Lưu buổi tập…</Text>}
          </View>
        )}

        {/* ── Màn hình RESULT ── */}
        {screenState === 'result' && sessionResult && (
          <View style={styles.resultSection}>
            <View style={styles.resultBanner}>
              <Text style={styles.resultEmoji}>🎉</Text>
              <Text style={styles.resultTitle}>Xuất sắc!</Text>
              <Text style={styles.resultSubtitle}>{selectedExercise.label}</Text>
            </View>

            <View style={styles.resultStatsRow}>
              <View style={styles.resultStat}>
                <Text style={styles.resultStatValue}>{sessionResult.reps}</Text>
                <Text style={styles.resultStatLabel}>Reps</Text>
              </View>
              <View style={styles.resultStatDivider} />
              <View style={styles.resultStat}>
                <Text style={[styles.resultStatValue, { color: colors.health.good }]}>
                  {sessionResult.score}
                </Text>
                <Text style={styles.resultStatLabel}>Điểm</Text>
              </View>
            </View>

            <View style={styles.resultMessageBox}>
              <Text style={styles.resultMessage}>{sessionResult.message}</Text>
            </View>

            <TouchableOpacity style={styles.startBtn} onPress={resetAll} activeOpacity={0.85}>
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.startBtnText}>Tập bài khác</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles (Ethereal Wellness System) ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  title: { color: colors.primary, fontSize: fonts.sizes.xl, fontWeight: '800', letterSpacing: -0.5 },
  settingsBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

  // Pebbles (Horizontal Cards)
  pebbleScrollArea: { marginHorizontal: -spacing.lg, marginBottom: spacing.lg },
  pebblesContainer: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.sm },
  pebbleCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  pebbleCardActive: {
    backgroundColor: colors.primary,
    transform: [{ scale: 1.05 }],
    shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  pebbleLabel: { color: colors.text.secondary, fontSize: fonts.sizes.sm, fontWeight: '700' },
  pebbleMuscles: { color: colors.text.muted, fontSize: 10, fontWeight: '600', marginTop: 2 },

  idleStateBox: { alignItems: 'center', justifyContent: 'center', marginTop: 100, paddingHorizontal: spacing.xl },
  idleIconBox: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  idleTitle: { color: colors.text.primary, fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginBottom: spacing.sm },
  idleSub: { color: colors.text.secondary, fontSize: fonts.sizes.md, textAlign: 'center', lineHeight: 22 },

  // Tracking
  trackingSection: { gap: spacing.lg },

  // Hero Camera Layer
  cameraBox: {
    width: '100%',
    borderRadius: 32, // High-Round radius.xl 
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
    position: 'relative',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 15,
  },
  cameraBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0A1118' },

  giantRepOverlay: { position: 'absolute', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  giantRepText: { color: '#FFF', fontSize: 160, fontWeight: '900', lineHeight: 170, opacity: 0.95, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 10 }, textShadowRadius: 20 },
  giantRepLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '800', letterSpacing: 4, marginTop: -20 },

  liveStatusBadge: {
    position: 'absolute', top: 24, right: 24, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.4)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
  },
  liveStatusDot: { width: 8, height: 8, borderRadius: 4 },
  liveStatusText: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 2 },

  cameraPhaseLabel: {
    position: 'absolute', bottom: 24, left: 24, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.4)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.full,
  },
  cameraPhaseLabelText: { color: '#FFF', fontSize: fonts.sizes.xs, fontWeight: '600' },

  // Bento Grids
  bentoRow: { flexDirection: 'row', gap: spacing.md },
  bentoCard: { flex: 1, backgroundColor: colors.surfaceElevated, borderRadius: radius.lg, padding: spacing.lg, justifyContent: 'space-between', height: 180 },
  bentoHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bentoMiniLabel: { color: colors.text.secondary, fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 4 },
  bentoTitle: { color: colors.text.primary, fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  bentoIconDrop: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  feedbackHighlight: { backgroundColor: colors.tertiary + '20', padding: spacing.sm, borderRadius: radius.md, marginTop: 'auto' },
  feedbackText: { fontSize: fonts.sizes.sm, fontWeight: '700', lineHeight: 18 },

  statsGrid: { flexDirection: 'row', gap: spacing.md, marginTop: 'auto' },
  statColumn: { flex: 1 },
  statLabel: { color: colors.text.secondary, fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 2 },
  statValue: { color: colors.text.primary, fontSize: 24, fontWeight: '900' },
  statMax: { color: colors.text.muted, fontSize: 14, fontWeight: '500' },

  ctaRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  startBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: spacing.lg, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15 },
  startBtnText: { color: '#fff', fontSize: fonts.sizes.md, fontWeight: '700' },
  stopBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.surfaceElevated, borderRadius: radius.full, paddingVertical: spacing.lg },
  stopBtnText: { color: colors.health.danger, fontSize: fonts.sizes.md, fontWeight: '700' },
  backBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  savingText: { color: colors.text.muted, fontSize: fonts.sizes.sm, textAlign: 'center', marginTop: spacing.sm },

  // ── Result ──
  resultSection: { paddingTop: spacing.xl, gap: spacing.lg, alignItems: 'center' },
  resultBanner: { backgroundColor: colors.surfaceElevated, borderRadius: 32, padding: spacing.xl, alignItems: 'center', gap: spacing.sm, width: '100%' },
  resultEmoji: { fontSize: 56 },
  resultTitle: { color: colors.text.primary, fontSize: fonts.sizes.xxl, fontWeight: '800' },
  resultSubtitle: { color: colors.text.secondary, fontSize: fonts.sizes.md },
  resultStatsRow: { flexDirection: 'row', backgroundColor: colors.surfaceElevated, borderRadius: radius.lg, paddingVertical: spacing.lg, width: '100%' },
  resultStat: { flex: 1, alignItems: 'center', gap: 4 },
  resultStatDivider: { width: 1, backgroundColor: colors.border },
  resultStatValue: { color: colors.text.primary, fontSize: 40, fontWeight: '900' },
  resultStatLabel: { color: colors.text.secondary, fontSize: fonts.sizes.sm, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  resultMessageBox: { backgroundColor: colors.primary + '15', borderRadius: radius.lg, padding: spacing.lg, width: '100%' },
  resultMessage: { color: colors.primary, fontSize: fonts.sizes.md, fontWeight: '700', textAlign: 'center' },
});
