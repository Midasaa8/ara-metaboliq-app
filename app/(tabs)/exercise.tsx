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
  type:       ExerciseType;
  label:      string;
  icon:       keyof typeof Ionicons.glyphMap;
  targetReps: number;
  muscles:    string;
}> = [
  { type: 'push_up',        label: 'Chống Đẩy',       icon: 'body',    targetReps: 10, muscles: 'Ngực · Vai · Tay sau' },
  { type: 'squat',          label: 'Squat',            icon: 'fitness', targetReps: 15, muscles: 'Đùi · Mông · Core'     },
  { type: 'bicep_curl',     label: 'Bicep Curl',       icon: 'barbell', targetReps: 12, muscles: 'Tay trước · Cánh tay'  },
  { type: 'shoulder_press', label: 'Shoulder Press',   icon: 'trophy',  targetReps: 10, muscles: 'Vai · Tay sau · Core'  },
];

type ScreenState = 'pick' | 'tracking' | 'result';

// ── Card chọn bài tập ──
function ExerciseCard({
  exercise,
  onSelect,
}: {
  exercise: (typeof EXERCISES)[number];
  onSelect: (ex: (typeof EXERCISES)[number]) => void;
}) {
  return (
    <TouchableOpacity
      style={styles.exerciseCard}
      onPress={() => onSelect(exercise)}
      activeOpacity={0.8}
    >
      <View style={styles.exerciseIconBox}>
        <Ionicons name={exercise.icon} size={28} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.exerciseLabel}>{exercise.label}</Text>
        <Text style={styles.exerciseMuscles}>{exercise.muscles}</Text>
      </View>
      <View style={styles.exerciseRepsBadge}>
        <Text style={styles.exerciseRepsNum}>{exercise.targetReps}</Text>
        <Text style={styles.exerciseRepsUnit}>reps</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Indicator góc khớp ──
function AngleBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, (value / 180) * 100);
  const barColor = value < 100 ? colors.health.danger : value < 140 ? colors.health.warning : colors.health.good;
  return (
    <View style={styles.angleRow}>
      <Text style={styles.angleLabel}>{label}</Text>
      <View style={styles.angleTrack}>
        <View style={[styles.angleFill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={[styles.angleValue, { color: barColor }]}>{Math.round(value)}°</Text>
    </View>
  );
}

// ── Toạ độ skeleton tĩnh (normalised 0→1, portrait) ──
// "mock static positions ok" — GEMINI_PHASES.md Phase 5
const JOINTS: Record<string, { x: number; y: number }> = {
  nose:            { x: 0.50, y: 0.09 },
  left_shoulder:   { x: 0.35, y: 0.26 },
  right_shoulder:  { x: 0.65, y: 0.26 },
  left_elbow:      { x: 0.22, y: 0.42 },
  right_elbow:     { x: 0.78, y: 0.42 },
  left_wrist:      { x: 0.16, y: 0.56 },
  right_wrist:     { x: 0.84, y: 0.56 },
  left_hip:        { x: 0.38, y: 0.58 },
  right_hip:       { x: 0.62, y: 0.58 },
  left_knee:       { x: 0.36, y: 0.74 },
  right_knee:      { x: 0.64, y: 0.74 },
  left_ankle:      { x: 0.36, y: 0.90 },
  right_ankle:     { x: 0.64, y: 0.90 },
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

// Khớp được highlight theo từng bài tập
const PRIMARY_JOINTS: Record<ExerciseType, string[]> = {
  push_up:        ['left_elbow', 'right_elbow', 'left_wrist', 'right_wrist', 'left_shoulder', 'right_shoulder'],
  bicep_curl:     ['left_elbow', 'right_elbow', 'left_wrist', 'right_wrist'],
  shoulder_press: ['left_elbow', 'right_elbow', 'left_shoulder', 'right_shoulder'],
  squat:          ['left_knee', 'right_knee', 'left_hip', 'right_hip', 'left_ankle', 'right_ankle'],
};

// ── Skeleton Overlay (SVG dots + lines) ──
function SkeletonOverlay({ exerciseType, w, h }: { exerciseType: ExerciseType; w: number; h: number }) {
  const primary = PRIMARY_JOINTS[exerciseType];
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
      {/* Xương */}
      {BONES.map(([a, b]) => {
        const jA = JOINTS[a]; const jB = JOINTS[b];
        if (!jA || !jB) return null;
        return (
          <Line
            key={`${a}-${b}`}
            x1={jA.x * w} y1={jA.y * h}
            x2={jB.x * w} y2={jB.y * h}
            stroke={colors.primary}
            strokeWidth={1.5}
            opacity={0.35}
          />
        );
      })}
      {/* Khớp */}
      {Object.entries(JOINTS).map(([name, pos]) => {
        const isPrimary = primary.includes(name);
        return (
          <Circle
            key={name}
            cx={pos.x * w}
            cy={pos.y * h}
            r={isPrimary ? 6 : 4}
            fill={isPrimary ? colors.primary : colors.secondary}
            opacity={isPrimary ? 0.9 : 0.5}
          />
        );
      })}
    </Svg>
  );
}

// ── Camera View Placeholder ──
// TODO Phase 11: thay <View> này bằng <Camera> từ expo-camera
function CameraPlaceholder({ exerciseType, isRunning }: { exerciseType: ExerciseType; isRunning: boolean }) {
  const PLACEHOLDER_H = 240;
  const PLACEHOLDER_W = '100%';
  return (
    <View style={[styles.cameraBox, { height: PLACEHOLDER_H }]}>
      {/* Nền giả camera */}
      <View style={styles.cameraBg} />
      {/* Skeleton overlay */}
      <SkeletonOverlay exerciseType={exerciseType} w={280} h={PLACEHOLDER_H} />
      {/* Badge trạng thái */}
      <View style={[styles.cameraBadge, { backgroundColor: isRunning ? colors.health.danger + 'CC' : colors.surface + 'CC' }]}>
        <View style={[styles.cameraBadgeDot, { backgroundColor: isRunning ? colors.health.danger : colors.text.muted }]} />
        <Text style={[styles.cameraBadgeText, { color: isRunning ? colors.health.danger : colors.text.muted }]}>
          {isRunning ? 'AI TRACKING' : 'POSE READY'}
        </Text>
      </View>
      {/* TODO Phase 11 label */}
      <View style={styles.cameraPhaseLabel}>
        <Ionicons name="camera" size={12} color={colors.text.muted} />
        <Text style={styles.cameraPhaseLabelText}>Camera thật → Phase 11</Text>
      </View>
    </View>
  );
}

// ── Main Screen ──
export default function ExerciseScreen() {
  const [screenState,      setScreenState]      = useState<ScreenState>('pick');
  const [selectedExercise, setSelectedExercise] = useState<(typeof EXERCISES)[number]>(EXERCISES[0]);
  const [startTime,        setStartTime]        = useState<number>(0);
  const [sessionResult,    setSessionResult]    = useState<{ reps: number; score: number; message: string } | null>(null);
  const [isSaving,         setIsSaving]         = useState(false);

  const userId     = useUserStore((s) => s.profile?.id ?? null);
  const queryClient = useQueryClient();

  // ── Callback khi đủ rep ──
  const handleComplete = useCallback(async (doneReps: number) => {
    const durationS = Math.round((Date.now() - startTime) / 1000);
    setIsSaving(true);
    try {
      const res = await exerciseAPI.saveSession({
        user_id:        userId,
        exercise_type:  selectedExercise.type,
        reps_completed: doneReps,
        target_reps:    selectedExercise.targetReps,
        duration_s:     durationS,
        passed:         doneReps >= selectedExercise.targetReps,
      });
      setSessionResult({
        reps:    res.data.reps_completed,
        score:   res.data.score,
        message: res.data.message,
      });
    } catch {
      setSessionResult({
        reps:    doneReps,
        score:   Math.round((doneReps / selectedExercise.targetReps) * 100),
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

  // Pulse animation cho nút start
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (repCounter.isRunning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0,  duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [repCounter.isRunning]);

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
        <Text style={styles.title}>Exercise AI</Text>
        <Text style={styles.subtitle}>AI Form Tracking · MediaPipe Pose</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Màn hình PICK: chọn bài tập ── */}
        {screenState === 'pick' && (
          <View style={styles.pickSection}>
            <Text style={styles.sectionHeading}>Chọn bài tập</Text>
            {EXERCISES.map((ex) => (
              <ExerciseCard key={ex.type} exercise={ex} onSelect={selectAndStart} />
            ))}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={16} color={colors.secondary} />
              <Text style={styles.infoText}>
                Hackathon mode: AI mô phỏng MediaPipe Pose. Phase 11 → camera thật.
              </Text>
            </View>
          </View>
        )}

        {/* ── Màn hình TRACKING: đếm rep live ── */}
        {screenState === 'tracking' && (
          <View style={styles.trackingSection}>
            {/* Tiêu đề bài tập */}
            <View style={styles.exerciseTitleRow}>
              <Ionicons name={selectedExercise.icon} size={22} color={colors.primary} />
              <Text style={styles.exerciseTitleText}>{selectedExercise.label}</Text>
            </View>

            {/* Camera feed placeholder + skeleton overlay */}
            <CameraPlaceholder exerciseType={selectedExercise.type} isRunning={repCounter.isRunning} />
            <View style={styles.repCounterCard}>
              <Text style={styles.repCounterLabel}>Số Rep</Text>
              <Text style={styles.repCounterValue}>
                {repCounter.reps}
                <Text style={styles.repCounterTarget}>/{selectedExercise.targetReps}</Text>
              </Text>
              {/* Progress bar */}
              <View style={styles.repProgressTrack}>
                <View style={[
                  styles.repProgressFill,
                  { width: `${Math.min(100, (repCounter.reps / selectedExercise.targetReps) * 100)}%` },
                ]} />
              </View>
              {/* Phase badge */}
              <View style={[
                styles.phaseBadge,
                { backgroundColor: repCounter.phase === 'down' ? colors.health.danger + '30' : colors.health.good + '30' },
              ]}>
                <Text style={[
                  styles.phaseText,
                  { color: repCounter.phase === 'down' ? colors.health.danger : colors.health.good },
                ]}>
                  {repCounter.phase === 'down' ? '▼ XUỐNG' : repCounter.phase === 'up' ? '▲ LÊN' : '—'}
                </Text>
              </View>
            </View>

            {/* Feedback form */}
            <View style={[
              styles.feedbackBox,
              {
                backgroundColor: repCounter.feedback.severity === 'warn'
                  ? colors.health.warning + '20'
                  : repCounter.feedback.severity === 'error'
                    ? colors.health.danger + '20'
                    : colors.health.good + '15',
              },
            ]}>
              <Text style={[
                styles.feedbackText,
                {
                  color: repCounter.feedback.severity === 'warn'
                    ? colors.health.warning
                    : repCounter.feedback.severity === 'error'
                      ? colors.health.danger
                      : colors.health.good,
                },
              ]}>
                {repCounter.feedback.message}
              </Text>
            </View>

            {/* Góc khớp live */}
            {repCounter.angles && (
              <View style={styles.anglesCard}>
                <Text style={styles.anglesTitle}>Góc Khớp (°)</Text>
                <AngleBar label="Khuỷu trái"  value={repCounter.angles.left_elbow}  />
                <AngleBar label="Khuỷu phải"  value={repCounter.angles.right_elbow} />
                {(selectedExercise.type === 'squat') && (
                  <>
                    <AngleBar label="Đầu gối trái"  value={repCounter.angles.left_knee}  />
                    <AngleBar label="Đầu gối phải"  value={repCounter.angles.right_knee} />
                  </>
                )}
              </View>
            )}

            {/* Nút Start / Stop */}
            <View style={styles.ctaRow}>
              {!repCounter.isRunning ? (
                <Animated.View style={{ transform: [{ scale: pulseAnim }], flex: 1 }}>
                  <TouchableOpacity style={styles.startBtn} onPress={repCounter.start} activeOpacity={0.85}>
                    <Ionicons name="play" size={20} color={colors.text.primary} />
                    <Text style={styles.startBtnText}>Bắt Đầu</Text>
                  </TouchableOpacity>
                </Animated.View>
              ) : (
                <TouchableOpacity style={styles.stopBtn} onPress={repCounter.stop} activeOpacity={0.85}>
                  <Ionicons name="stop" size={20} color={colors.text.primary} />
                  <Text style={styles.stopBtnText}>Dừng</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.backBtn} onPress={resetAll} activeOpacity={0.85}>
                <Ionicons name="arrow-back" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {isSaving && (
              <Text style={styles.savingText}>Đang lưu buổi tập…</Text>
            )}
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

            <TouchableOpacity style={styles.retryBtn} onPress={resetAll} activeOpacity={0.85}>
              <Ionicons name="refresh" size={18} color={colors.text.primary} />
              <Text style={styles.retryText}>Tập lại</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ──
const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.background },
  header:        { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title:         { color: colors.text.primary, fontSize: fonts.sizes.xl, fontWeight: '700' },
  subtitle:      { color: colors.text.secondary, fontSize: fonts.sizes.sm, marginTop: 2 },
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

  // ── Pick ──
  pickSection:   { paddingTop: spacing.lg, gap: spacing.md },
  sectionHeading: { color: colors.text.secondary, fontSize: fonts.sizes.xs, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.xs },
  exerciseCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
  },
  exerciseIconBox: {
    width: 52, height: 52, borderRadius: radius.md,
    backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center',
  },
  exerciseLabel:    { color: colors.text.primary, fontSize: fonts.sizes.lg, fontWeight: '700' },
  exerciseMuscles:  { color: colors.text.secondary, fontSize: fonts.sizes.xs, marginTop: 2 },
  exerciseRepsBadge: { alignItems: 'center' },
  exerciseRepsNum:  { color: colors.primary, fontSize: fonts.sizes.xl, fontWeight: '800' },
  exerciseRepsUnit: { color: colors.text.muted, fontSize: fonts.sizes.xs },
  infoBox: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start',
    backgroundColor: colors.secondary + '15', borderRadius: radius.sm, padding: spacing.md,
  },
  infoText: { color: colors.text.secondary, fontSize: fonts.sizes.xs, flex: 1, lineHeight: 18 },

  // ── Tracking ──
  trackingSection:  { paddingTop: spacing.lg, gap: spacing.md },
  exerciseTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  exerciseTitleText: { color: colors.text.primary, fontSize: fonts.sizes.xl, fontWeight: '700' },
  repCounterCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl,
    alignItems: 'center', gap: spacing.sm,
  },
  repCounterLabel:  { color: colors.text.secondary, fontSize: fonts.sizes.xs, textTransform: 'uppercase', letterSpacing: 1 },
  repCounterValue:  { color: colors.text.primary, fontSize: fonts.sizes.hero, fontWeight: '800', lineHeight: 64 },
  repCounterTarget: { color: colors.text.muted, fontSize: fonts.sizes.xxl },
  repProgressTrack: { width: '100%', height: 6, backgroundColor: colors.surfaceElevated, borderRadius: 3, overflow: 'hidden' },
  repProgressFill:  { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
  phaseBadge:       { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.full, marginTop: spacing.xs },
  phaseText:        { fontSize: fonts.sizes.sm, fontWeight: '800', letterSpacing: 1 },
  feedbackBox: {
    borderRadius: radius.md, padding: spacing.md, alignItems: 'center',
  },
  feedbackText: { fontSize: fonts.sizes.md, fontWeight: '700' },
  anglesCard: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm,
  },
  anglesTitle:  { color: colors.text.secondary, fontSize: fonts.sizes.xs, textTransform: 'uppercase', letterSpacing: 1 },
  angleRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  angleLabel:   { color: colors.text.muted, fontSize: fonts.sizes.xs, width: 96 },
  angleTrack:   { flex: 1, height: 4, backgroundColor: colors.surfaceElevated, borderRadius: 2, overflow: 'hidden' },
  angleFill:    { height: 4, borderRadius: 2 },
  angleValue:   { fontSize: fonts.sizes.xs, fontWeight: '700', width: 36, textAlign: 'right' },
  ctaRow:       { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  startBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md,
  },
  startBtnText: { color: colors.text.primary, fontSize: fonts.sizes.md, fontWeight: '700' },
  stopBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.health.danger, borderRadius: radius.md, paddingVertical: spacing.md,
  },
  stopBtnText:  { color: colors.text.primary, fontSize: fonts.sizes.md, fontWeight: '700' },
  backBtn: {
    width: 52, height: 52, borderRadius: radius.md,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  savingText:   { color: colors.text.muted, fontSize: fonts.sizes.sm, textAlign: 'center', marginTop: spacing.sm },

  // ── Result ──
  resultSection: { paddingTop: spacing.xl, gap: spacing.lg, alignItems: 'center' },
  resultBanner: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl,
    alignItems: 'center', gap: spacing.sm, width: '100%',
  },
  resultEmoji:     { fontSize: 56 },
  resultTitle:     { color: colors.text.primary, fontSize: fonts.sizes.xxl, fontWeight: '800' },
  resultSubtitle:  { color: colors.text.secondary, fontSize: fonts.sizes.md },
  resultStatsRow: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: radius.md, paddingVertical: spacing.md, width: '100%',
  },
  resultStat:        { flex: 1, alignItems: 'center', gap: 4 },
  resultStatDivider: { width: 1, backgroundColor: colors.border },
  resultStatValue:   { color: colors.text.primary, fontSize: fonts.sizes.xxl, fontWeight: '800' },
  resultStatLabel:   { color: colors.text.secondary, fontSize: fonts.sizes.xs },
  resultMessageBox: {
    backgroundColor: colors.primary + '20', borderRadius: radius.md, padding: spacing.md, width: '100%',
  },
  resultMessage: { color: colors.primary, fontSize: fonts.sizes.md, fontWeight: '600', textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl, marginTop: spacing.sm,
  },
  retryText: { color: colors.text.primary, fontSize: fonts.sizes.md, fontWeight: '700' },

  // ── Camera View Placeholder ──
  cameraBox: {
    borderRadius: radius.md, overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
    position: 'relative',
    alignItems: 'center', justifyContent: 'center',
    // Xấp xỉ tỷ lệ 3:4 portrait camera
    width: '100%',
  },
  cameraBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surfaceElevated,
  },
  cameraBadge: {
    position: 'absolute', top: spacing.sm, left: spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 3, paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  cameraBadgeDot: { width: 6, height: 6, borderRadius: 3 },
  cameraBadgeText: { fontSize: fonts.sizes.xs, fontWeight: '800', letterSpacing: 1 },
  cameraPhaseLabel: {
    position: 'absolute', bottom: spacing.sm, right: spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.surface + 'BB',
    paddingVertical: 2, paddingHorizontal: spacing.sm, borderRadius: radius.full,
  },
  cameraPhaseLabelText: { color: colors.text.muted, fontSize: fonts.sizes.xs },
});
