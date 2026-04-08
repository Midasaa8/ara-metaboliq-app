/**
 * PART:   useRepCounter — máy trạng thái đếm rep + tính góc khớp
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  5 — Exercise Tracker
 * READS:  AGENTS.md §7, SONNET_PHASES.md §PHASE 5, Tong_Hop_Thuat_Toan doc §6
 * TASK:   DOWN→UP state machine + tính góc theo công thức từ tài liệu thuật toán
 * SCOPE:  IN: PoseLandmarks stream, loại bài tập, số rep mục tiêu
 *         OUT: rep count, phase (UP/DOWN), góc hiện tại, feedback form
 *
 * ── CÔNG THỨC GÓC KHỚP (Tong_Hop_Thuat_Toan §6) ──
 *   θ = arccos(v1·v2 / (|v1|·|v2|)) × 180/π
 *   v1 = B − A  (vector từ khớp A đến điểm B)
 *   v2 = C − A  (vector từ khớp A đến điểm C)
 *   Ví dụ khuỷu tay: A=elbow, B=shoulder, C=wrist
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getPoseDetector } from '@/services/ai/PoseDetector';
import type { PoseLandmarks, ExerciseType, JointAngles, Landmark } from '@/types/pose';

// ── Ngưỡng góc cho từng bài tập (SONNET_PHASES.md §PHASE 5) ──
const ANGLE_THRESHOLDS: Record<ExerciseType, { low: number; high: number }> = {
  squat:          { low: 90,  high: 160 },
  bicep_curl:     { low: 40,  high: 160 },
  push_up:        { low: 90,  high: 160 },
  shoulder_press: { low: 80,  high: 160 },
};

// Joint chính đo góc theo từng bài tập
const PRIMARY_JOINT: Record<ExerciseType, keyof JointAngles> = {
  push_up:        'left_elbow',
  bicep_curl:     'left_elbow',
  shoulder_press: 'left_elbow',
  squat:          'left_knee',
};

// ── Trạng thái máy trạng thái rep ──
export type RepPhase = 'up' | 'down' | 'idle';

export interface FormFeedback {
  message: string;
  severity: 'good' | 'warn' | 'error';
}

export interface UseRepCounterReturn {
  reps:           number;
  phase:          RepPhase;
  angles:         JointAngles | null;
  feedback:       FormFeedback;
  isRunning:      boolean;
  start:          () => void;
  stop:           () => void;
  reset:          () => void;
}

// ── Hàm tính góc 2D (Tong_Hop_Thuat_Toan §6) ──
// θ = arccos((v1·v2) / (|v1|·|v2|)) × 180/π
// Chỉ dùng x,y (normalised) vì camera 2D
function calcAngle(A: Landmark, B: Landmark, C: Landmark): number {
  const v1x = B.x - A.x;
  const v1y = B.y - A.y;
  const v2x = C.x - A.x;
  const v2y = C.y - A.y;

  const dot  = v1x * v2x + v1y * v2y;
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);

  if (mag1 === 0 || mag2 === 0) return 0;

  const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.acos(cosTheta) * (180 / Math.PI);
}

// ── Tính tất cả góc từ landmarks ──
function extractAngles(lm: PoseLandmarks): JointAngles {
  return {
    // Khuỷu tay: A=elbow, B=shoulder, C=wrist
    left_elbow:  calcAngle(lm.left_elbow,  lm.left_shoulder,  lm.left_wrist),
    right_elbow: calcAngle(lm.right_elbow, lm.right_shoulder, lm.right_wrist),
    // Đầu gối:   A=knee, B=hip, C=ankle
    left_knee:   calcAngle(lm.left_knee,   lm.left_hip,       lm.left_ankle),
    right_knee:  calcAngle(lm.right_knee,  lm.right_hip,      lm.right_ankle),
    // Hông:      A=hip, B=shoulder, C=knee
    left_hip:    calcAngle(lm.left_hip,    lm.left_shoulder,  lm.left_knee),
    right_hip:   calcAngle(lm.right_hip,   lm.right_shoulder, lm.right_knee),
  };
}

// ── Tạo feedback form ──
function buildFeedback(
  exerciseType: ExerciseType,
  angles:       JointAngles,
  phase:        RepPhase,
): FormFeedback {
  const isPushUp = exerciseType === 'push_up';
  const isSquat  = exerciseType === 'squat';

  // Kiểm tra lưng thẳng (push_up/plank): góc hông nên < 20° lệch so với 180°
  if (isPushUp) {
    const hipAngle = (angles.left_hip + angles.right_hip) / 2;
    if (hipAngle < 155) return { message: 'Giữ lưng thẳng!', severity: 'warn' };
    const elbowAngle = (angles.left_elbow + angles.right_elbow) / 2;
    if (phase === 'down' && elbowAngle > 110) return { message: 'Hạ thấp hơn!', severity: 'warn' };
  }

  if (isSquat) {
    const kneeAngle = (angles.left_knee + angles.right_knee) / 2;
    if (phase === 'down' && kneeAngle > 110) return { message: 'Ngồi sâu hơn!', severity: 'warn' };
  }

  if (phase === 'down') return { message: 'Tốt lắm!', severity: 'good' };
  if (phase === 'up')   return { message: 'Đẩy lên nào!', severity: 'good' };
  return { message: 'Sẵn sàng', severity: 'good' };
}

// ── Hook chính ──
export function useRepCounter(
  exerciseType: ExerciseType,
  targetReps:   number,
  onComplete?:  (reps: number) => void,
): UseRepCounterReturn {
  const [reps,      setReps]      = useState(0);
  const [phase,     setPhase]     = useState<RepPhase>('idle');
  const [angles,    setAngles]    = useState<JointAngles | null>(null);
  const [feedback,  setFeedback]  = useState<FormFeedback>({ message: 'Nhấn Bắt Đầu', severity: 'good' });
  const [isRunning, setIsRunning] = useState(false);

  const detectorRef    = useRef(getPoseDetector());
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const phaseRef       = useRef<RepPhase>('idle');
  const repsRef        = useRef(0);

  const handleLandmarks = useCallback((lm: PoseLandmarks) => {
    const newAngles  = extractAngles(lm);
    const threshold  = ANGLE_THRESHOLDS[exerciseType];
    const primaryKey = PRIMARY_JOINT[exerciseType];
    const angle      = newAngles[primaryKey];

    // ── DOWN→UP state machine ──
    let newPhase = phaseRef.current;

    if (phaseRef.current !== 'down' && angle < threshold.low) {
      // Chạm ngưỡng thấp → chuyển sang DOWN
      newPhase = 'down';
      phaseRef.current = 'down';
      setPhase('down');
    } else if (phaseRef.current === 'down' && angle > threshold.high) {
      // Từ DOWN kéo lên qua ngưỡng cao → đếm 1 rep
      newPhase = 'up';
      phaseRef.current = 'up';
      repsRef.current  = repsRef.current + 1;
      setPhase('up');
      setReps(repsRef.current);

      if (repsRef.current >= targetReps) {
        onComplete?.(repsRef.current);
      }
    }

    setAngles(newAngles);
    setFeedback(buildFeedback(exerciseType, newAngles, newPhase));
  }, [exerciseType, targetReps, onComplete]);

  const start = useCallback(() => {
    if (isRunning) return;
    phaseRef.current = 'idle';
    repsRef.current  = 0;
    setReps(0);
    setPhase('idle');
    setAngles(null);
    setFeedback({ message: 'Sẵn sàng!', severity: 'good' });
    setIsRunning(true);

    detectorRef.current.start(exerciseType);
    unsubscribeRef.current = detectorRef.current.onLandmarks(handleLandmarks);
  }, [isRunning, exerciseType, handleLandmarks]);

  const stop = useCallback(() => {
    unsubscribeRef.current?.();
    detectorRef.current.stop();
    setIsRunning(false);
    setPhase('idle');
  }, []);

  const reset = useCallback(() => {
    stop();
    repsRef.current  = 0;
    phaseRef.current = 'idle';
    setReps(0);
    setPhase('idle');
    setAngles(null);
    setFeedback({ message: 'Nhấn Bắt Đầu', severity: 'good' });
  }, [stop]);

  // Dọn dẹp khi unmount
  useEffect(() => {
    return () => {
      unsubscribeRef.current?.();
      detectorRef.current.stop();
    };
  }, []);

  return { reps, phase, angles, feedback, isRunning, start, stop, reset };
}
