export interface HealthData {
    healthScore: number;          // 0-100
    hr: number;                   // BPM
    spo2: number;                 // %
    temperature: number;          // °C
    ppgRaw: number[];             // 25Hz buffer
    timestamp: number;
}
export interface SleepStage {
    stage: 'Light' | 'Deep' | 'REM' | 'Awake';
    durationMin: number;
}
export interface SleepData {
    totalMin: number;
    deepMin: number;
    remMin: number;
    awakeMin: number;
    stages: SleepStage[];
    // HRV (SDNN) — tính từ IBI trong đêm (Tong_Hop_Thuat_Toan §5)
    hrv_sdnn: number;      // ms
    // ChronoOS prediction (Phase 18 Opus LSTM — server trả về)
    predicted_tomorrow_score: number; // 0–100
    // Digital Twin bio age (Phase 17)
    bio_age: number;       // năm
    // Sleep quality score tổng hợp (server tính)
    sleep_score: number;   // 0–100
    // Timestamp bắt đầu và kết thúc ngủ
    sleep_start_ts: number; // Unix ms
    sleep_end_ts: number;   // Unix ms
}
export interface VoiceAnalysis {
    class: string;
    confidence: number;
    flags: string[];
}
