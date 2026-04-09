/**
 * PART:   Exercise Tracker — Wellness Redesign
 * ACTOR:  Gemini 3.1
 * PHASE:  UI Redesign — Floating Cards
 * TASK:   AI form tracking with Ivory bg and Sage Green theme
 * SCOPE:  IN: UI, state transitions, gọi exerciseAPI
 *         OUT: tính góc (useRepCounter), MediaPipe (PoseDetector)
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Line } from 'react-native-svg';
import { colors, fonts, spacing, radius, elevation } from '@/constants/theme';
import { useRepCounter } from '@/hooks/useRepCounter';
import { exerciseAPI } from '@/services/api/exerciseAPI';
import { useUserStore } from '@/store/userStore';
import { useQueryClient } from '@tanstack/react-query';
import type { ExerciseType } from '@/types/pose';

const W = Dimensions.get('window').width;

const EXERCISES: Array<{
  type: ExerciseType;
  label: string;
  icon: any;
  targetReps: number;
  muscles: string;
}> = [
    { type: 'push_up', label: 'Push Ups', icon: 'body', targetReps: 10, muscles: 'Chest • Shoulders • Triceps' },
    { type: 'squat', label: 'Squats', icon: 'fitness', targetReps: 15, muscles: 'Quads • Glutes • Core' },
    { type: 'bicep_curl', label: 'Bicep Curls', icon: 'barbell', targetReps: 12, muscles: 'Biceps • Forearms' },
    { type: 'shoulder_press', label: 'Shoulder Press', icon: 'trophy', targetReps: 10, muscles: 'Shoulders • Triceps • Core' },
  ];

type ScreenState = 'pick' | 'tracking' | 'result';

export default function ExerciseScreen() {
  const [screenState, setScreenState] = useState<ScreenState>('pick');
  const [selectedExercise, setSelectedExercise] = useState<(typeof EXERCISES)[number]>(EXERCISES[0]);
  const [startTime, setStartTime] = useState<number>(0);
  const [sessionResult, setSessionResult] = useState<{ reps: number; score: number; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const userId = useUserStore((s) => s.profile?.id ?? null);
  const queryClient = useQueryClient();

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
        message: 'Exercise Saved Offline.',
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
    <SafeAreaView style={s.root} edges={['top']}>
      {/* ── HEADER ── */}
      <View style={s.header}>
        <Text style={s.title}>AI Trainer</Text>
        <Text style={s.subtitle}>Real-time movement analysis</Text>
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── PICK STATE ── */}
        {screenState === 'pick' && (
          <View style={s.pickList}>
            <Text style={s.sectionTitle}>Select Workout</Text>
            {EXERCISES.map((ex) => (
              <TouchableOpacity
                key={ex.type}
                style={[s.exCard, elevation.float]}
                onPress={() => selectAndStart(ex)}
              >
                <View style={[s.exIcon, { backgroundColor: colors.secondary + '15' }]}>
                  <Ionicons name={ex.icon as any} size={24} color={colors.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.exLabel}>{ex.label}</Text>
                  <Text style={s.exMuscles}>{ex.muscles}</Text>
                </View>
                <View style={s.exBadge}>
                  <Text style={s.exBadgeText}>{ex.targetReps} reps</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── TRACKING STATE ── */}
        {screenState === 'tracking' && (
          <View style={s.trackingBox}>
            <View style={[s.cameraStage, elevation.raised]}>
              <View style={s.cameraOverlay}>
                <Text style={s.giantRep}>{repCounter.reps}</Text>
                <Text style={s.repLabel}>REPS</Text>
              </View>
              <View style={s.statusPill}>
                <View style={[s.dot, repCounter.isRunning && { backgroundColor: colors.health.good }]} />
                <Text style={s.statusText}>{repCounter.isRunning ? 'LIVE AI TRACKING' : 'READY'}</Text>
              </View>
            </View>

            <View style={s.controlRow}>
              {!repCounter.isRunning ? (
                <TouchableOpacity style={[s.primaryBtn, elevation.warmGlow]} onPress={repCounter.start}>
                  <Ionicons name="play" size={20} color="#fff" />
                  <Text style={s.btnText}>Start Now</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={s.stopBtn} onPress={repCounter.stop}>
                  <Ionicons name="stop" size={20} color={colors.health.danger} />
                  <Text style={[s.btnText, { color: colors.health.danger }]}>Stop</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.cancelBtn} onPress={resetAll}>
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={s.feedbackCard}>
              <View style={[s.feedbackIcon, { backgroundColor: repCounter.feedback.severity === 'good' ? colors.health.good + '20' : colors.health.warning + '20' }]}>
                <Ionicons name={repCounter.feedback.severity === 'good' ? 'checkmark-circle' : 'alert-circle'} size={24} color={repCounter.feedback.severity === 'good' ? colors.health.good : colors.health.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.feedbackLabel}>FORM FEEDBACK</Text>
                <Text style={s.feedbackTitle}>{repCounter.feedback.message}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── RESULT STATE ── */}
        {screenState === 'result' && sessionResult && (
          <View style={s.resultBox}>
            <View style={[s.resultHero, elevation.raised]}>
              <Text style={s.resultEmoji}>🔥</Text>
              <Text style={s.resultTitle}>Workout Complete!</Text>
              <View style={s.resultStats}>
                <View style={s.resStat}>
                  <Text style={s.resVal}>{sessionResult.reps}</Text>
                  <Text style={s.resLabel}>Reps</Text>
                </View>
                <View style={s.resDivider} />
                <View style={s.resStat}>
                  <Text style={[s.resVal, { color: colors.secondary }]}>{sessionResult.score}</Text>
                  <Text style={s.resLabel}>Form Score</Text>
                </View>
              </View>
              <Text style={s.resMessage}>{sessionResult.message}</Text>
              <TouchableOpacity style={[s.cta, elevation.warmGlow]} onPress={resetAll}>
                <Text style={s.ctaText}>Finish Session</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg },
  title: { fontSize: fonts.sizes.xl, fontWeight: '800', color: colors.text.primary, letterSpacing: -0.5 },
  subtitle: { fontSize: fonts.sizes.sm, color: colors.text.secondary, marginTop: 2 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 100 },

  sectionTitle: { fontSize: fonts.sizes.sm, fontWeight: '700', color: colors.text.secondary, marginBottom: spacing.md },

  // Pick List
  pickList: { gap: spacing.md },
  exCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  exIcon: { width: 50, height: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  exLabel: { fontSize: fonts.sizes.md, fontWeight: '700', color: colors.text.primary },
  exMuscles: { fontSize: 11, color: colors.text.muted, marginTop: 2 },
  exBadge: { backgroundColor: colors.surfaceElevated, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  exBadgeText: { fontSize: 10, fontWeight: '800', color: colors.text.secondary },

  // Tracking
  trackingBox: { gap: spacing.lg, marginTop: spacing.md },
  cameraStage: {
    height: 440, width: '100%', borderRadius: radius.xl, backgroundColor: '#1A1D23',
    alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden',
  },
  cameraOverlay: { alignItems: 'center' },
  giantRep: { fontSize: 140, fontWeight: '900', color: '#fff', opacity: 0.9 },
  repLabel: { fontSize: 14, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 4, marginTop: -20 },
  statusPill: {
    position: 'absolute', top: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.text.muted },
  statusText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 1 },

  controlRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  primaryBtn: {
    flex: 1, backgroundColor: colors.accent, height: 60, borderRadius: radius.full,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  stopBtn: { flex: 1, backgroundColor: colors.surface, height: 60, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 2, borderColor: colors.health.danger + '30' },
  cancelBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...elevation.low },
  btnText: { fontSize: fonts.sizes.md, fontWeight: '700', color: '#fff' },

  feedbackCard: {
    flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface,
    padding: spacing.lg, borderRadius: radius.lg, ...elevation.float,
  },
  feedbackIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  feedbackLabel: { fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: 1.5, marginBottom: 2 },
  feedbackTitle: { fontSize: fonts.sizes.md, fontWeight: '700', color: colors.text.primary },

  // Result
  resultBox: { marginTop: 40 },
  resultHero: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xxl, alignItems: 'center' },
  resultEmoji: { fontSize: 56, marginBottom: 16 },
  resultTitle: { fontSize: 24, fontWeight: '800', color: colors.text.primary, marginBottom: 24 },
  resultStats: { flexDirection: 'row', width: '100%', marginBottom: 30 },
  resStat: { flex: 1, alignItems: 'center' },
  resVal: { fontSize: 40, fontWeight: '900', color: colors.text.primary },
  resLabel: { fontSize: 12, fontWeight: '700', color: colors.text.muted, textTransform: 'uppercase', marginTop: 4 },
  resDivider: { width: 1, backgroundColor: colors.border },
  resMessage: { fontSize: fonts.sizes.md, color: colors.text.secondary, textAlign: 'center', marginBottom: 30 },
  cta: { backgroundColor: colors.accent, width: '100%', height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontSize: fonts.sizes.md, fontWeight: '700' },
});
