/**
 * PART:   PoseDetector — MediaPipe Pose wrapper (Hackathon Mock)
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  5 — Exercise Tracker
 * READS:  AGENTS.md §7, PLAN_B §2 AI Discipline Engine, SONNET_PHASES.md §PHASE 5
 * TASK:   Wrapper quanh react-native-mediapipe, extract 33 landmarks.
 *         IS_HACKATHON=true → MockPoseDetector mô phỏng chu kỳ push_up/squat
 *         IS_HACKATHON=false → RealPoseDetector gọi native MediaPipe (Phase 11+)
 * SCOPE:  IN: khởi tạo model, detect frame, trả landmark
 *         OUT: angle computation (useRepCounter), camera feed (exercise.tsx)
 */

import { IS_HACKATHON } from '@/constants/hardware';
import type { PoseLandmarks, ExerciseType, Landmark } from '@/types/pose';

// ── Interface chung ──

export interface IPoseDetector {
  start(exerciseType: ExerciseType): void;
  stop(): void;
  onLandmarks(callback: (landmarks: PoseLandmarks) => void): () => void;
}

// ── Helper tạo landmark ──
function lm(x: number, y: number, z = 0, visibility = 0.99): Landmark {
  return { x, y, z, visibility };
}

// ── MockPoseDetector: mô phỏng chu kỳ DOWN→UP thực tế ──
// Chu kỳ push_up: góc khuỷu tay 160° (UP) → 90° (DOWN) → 160° (UP), ~2s/rep
// Chu kỳ squat:   góc đầu gối 170° (UP) → 90° (DOWN) → 170° (UP), ~2s/rep
class MockPoseDetector implements IPoseDetector {
  private timer: ReturnType<typeof setInterval> | null = null;
  private callbacks: Array<(l: PoseLandmarks) => void> = [];
  private exerciseType: ExerciseType = 'push_up';
  private phase = 0; // tiến trình chu kỳ 0→1→0 (sin wave)

  start(exerciseType: ExerciseType): void {
    this.exerciseType = exerciseType;
    this.phase = 0;
    // Phát landmark @ 15 fps (hackathon — tiết kiệm CPU)
    this.timer = setInterval(() => this._tick(), 1000 / 15);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.callbacks = [];
  }

  onLandmarks(callback: (landmarks: PoseLandmarks) => void): () => void {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback);
    };
  }

  private _tick(): void {
    // phase tăng 0.05 mỗi tick @ 15fps → 1 chu kỳ ≈ 2s
    this.phase = (this.phase + 0.05) % (2 * Math.PI);
    // t ∈ [0,1] — 0 = UP, 1 = DOWN
    const t = (1 - Math.cos(this.phase)) / 2;
    const landmarks = this._buildLandmarks(t);
    for (const cb of this.callbacks) cb(landmarks);
  }

  private _buildLandmarks(t: number): PoseLandmarks {
    if (this.exerciseType === 'push_up' || this.exerciseType === 'bicep_curl' || this.exerciseType === 'shoulder_press') {
      return this._buildUpperBodyLandmarks(t);
    }
    return this._buildLowerBodyLandmarks(t); // squat
  }

  /**
   * Mô phỏng push-up/bicep_curl/shoulder_press:
   * - UP: khuỷu tay thẳng (~ góc 160°)
   * - DOWN: khuỷu tay gập (~ góc 90°)
   * Tạo landmark sao cho angle(shoulder–elbow–wrist) biến thiên theo t
   */
  private _buildUpperBodyLandmarks(t: number): PoseLandmarks {
    // t=0 (UP): wrist ở gần vai → góc 160°
    // t=1 (DOWN): wrist hạ xuống → góc 90°
    // Toạ độ normalised [0,1], gốc top-left
    const elbowYOffset = 0.25 + t * 0.15; // khuỷu tay hạ xuống lúc DOWN
    const wristYOffset = 0.45 + t * 0.20; // cổ tay hạ thêm

    return {
      nose:            lm(0.50, 0.08),
      left_eye:        lm(0.48, 0.07),
      right_eye:       lm(0.52, 0.07),
      left_shoulder:   lm(0.35, 0.25),
      right_shoulder:  lm(0.65, 0.25),
      left_elbow:      lm(0.20, elbowYOffset),
      right_elbow:     lm(0.80, elbowYOffset),
      left_wrist:      lm(0.15, wristYOffset),
      right_wrist:     lm(0.85, wristYOffset),
      left_hip:        lm(0.38, 0.60),
      right_hip:       lm(0.62, 0.60),
      left_knee:       lm(0.38, 0.78),
      right_knee:      lm(0.62, 0.78),
      left_ankle:      lm(0.38, 0.95),
      right_ankle:     lm(0.62, 0.95),
    };
  }

  /**
   * Mô phỏng squat:
   * - UP: đầu gối thẳng (~170°)
   * - DOWN: đầu gối gập (~90°)
   */
  private _buildLowerBodyLandmarks(t: number): PoseLandmarks {
    // t=0 (UP): hip cao, knee gần thẳng
    // t=1 (DOWN): hip hạ xuống, knee gập sâu
    const hipY    = 0.45 + t * 0.15;
    const kneeY   = 0.65 + t * 0.10;
    const ankleY  = 0.88;

    return {
      nose:            lm(0.50, 0.06),
      left_eye:        lm(0.48, 0.05),
      right_eye:       lm(0.52, 0.05),
      left_shoulder:   lm(0.35, 0.22),
      right_shoulder:  lm(0.65, 0.22),
      left_elbow:      lm(0.22, 0.38),
      right_elbow:     lm(0.78, 0.38),
      left_wrist:      lm(0.18, 0.50),
      right_wrist:     lm(0.82, 0.50),
      left_hip:        lm(0.38, hipY),
      right_hip:       lm(0.62, hipY),
      left_knee:       lm(0.36, kneeY),
      right_knee:      lm(0.64, kneeY),
      left_ankle:      lm(0.36, ankleY),
      right_ankle:     lm(0.64, ankleY),
    };
  }
}

// ── RealPoseDetector stub (TODO Phase 11) ──
class RealPoseDetector implements IPoseDetector {
  start(_exerciseType: ExerciseType): void {
    // TODO Phase 11: khởi tạo react-native-mediapipe PoseLandmarker
    // const landmarker = await PoseLandmarker.createFromOptions(...)
    console.warn('[PoseDetector] Real MediaPipe chưa impl — Phase 11');
  }
  stop(): void {}
  onLandmarks(_callback: (l: PoseLandmarks) => void): () => void { return () => {}; }
}

// ── Factory ──
export function getPoseDetector(): IPoseDetector {
  return IS_HACKATHON ? new MockPoseDetector() : new RealPoseDetector();
}
