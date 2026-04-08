/**
 * PART:   Types — Pose Landmark
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  5 — Exercise Tracker
 * TASK:   Định nghĩa kiểu dữ liệu landmark dùng chung giữa PoseDetector và useRepCounter
 */

/** Tọa độ 3D của một điểm keypoint (normalised 0–1) */
export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number; // 0–1 (confidence)
}

/**
 * 33 MediaPipe Pose landmark indices.
 * Tra cứu: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
 */
export interface PoseLandmarks {
  // Mặt
  nose:              Landmark;
  left_eye:          Landmark;
  right_eye:         Landmark;
  // Vai
  left_shoulder:     Landmark;
  right_shoulder:    Landmark;
  // Khuỷu tay
  left_elbow:        Landmark;
  right_elbow:       Landmark;
  // Cổ tay
  left_wrist:        Landmark;
  right_wrist:       Landmark;
  // Hông
  left_hip:          Landmark;
  right_hip:         Landmark;
  // Đầu gối
  left_knee:         Landmark;
  right_knee:        Landmark;
  // Mắt cá chân
  left_ankle:        Landmark;
  right_ankle:       Landmark;
}

/** Loại bài tập được hỗ trợ */
export type ExerciseType = 'push_up' | 'squat' | 'bicep_curl' | 'shoulder_press';

/** Kết quả phân tích góc khớp tại 1 frame */
export interface JointAngles {
  left_elbow:   number; // độ
  right_elbow:  number;
  left_knee:    number;
  right_knee:   number;
  left_hip:     number;
  right_hip:    number;
}
