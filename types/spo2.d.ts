/**
 * PART:   SpO2/HRV Types — data structures for Phase 13 processing
 * ACTOR:  Claude Opus 4.6
 * PHASE:  13 — SpO₂ / HR / HRV Algorithms
 * TASK:   Type definitions for SpO2Processor, HRV metrics, reliability flags
 * SCOPE:  IN: type-only definitions
 *         OUT: algorithm implementations (SpO2Processor.ts)
 */

// ══════════════════════════════════════════════
//  SpO₂ Types
// ══════════════════════════════════════════════

/** Dual-wavelength AC/DC components from Pod sensor. */
export interface DualChannelReading {
  /** RED 660nm raw 12-bit ADC values. */
  redSamples: number[];
  /** IR 940nm raw 12-bit ADC values. */
  irSamples: number[];
  /** Timestamp of the last sample (Unix ms). */
  timestampMs: number;
}

/** AC/DC components extracted from a single wavelength channel. */
export interface ACDCComponents {
  /** DC component: moving average of the signal. */
  dc: number;
  /** AC component: peak-to-peak amplitude within one cardiac cycle. */
  ac: number;
}

/** SpO₂ computation result. */
export interface SpO2Result {
  /** Raw SpO₂ from Beer-Lambert: 110 − 25R (%). */
  spo2Raw: number;
  /** Calibrated SpO₂ after neural correction (%). */
  spo2Calibrated: number;
  /** Perfusion ratio R = (AC_red/DC_red) / (AC_IR/DC_IR). */
  ratioR: number;
  /** RED channel AC/DC. */
  redACDC: ACDCComponents;
  /** IR channel AC/DC. */
  irACDC: ACDCComponents;
  /** Timestamp (Unix ms). */
  timestampMs: number;
}

// ══════════════════════════════════════════════
//  HRV Types
// ══════════════════════════════════════════════

/** Heart Rate Variability metrics (time-domain). */
export interface HRVMetrics {
  /**
   * SDNN: Standard Deviation of NN intervals (ms).
   * SDNN = √(1/N × Σ(IBI_i − IBI_mean)²)
   * Window: last 300 seconds (5 min), requires ≥ 50 IBI.
   */
  sdnn: number;

  /**
   * RMSSD: Root Mean Square of Successive Differences (ms).
   * RMSSD = √(1/(N−1) × Σ(IBI_{i+1} − IBI_i)²)
   * RMSSD > 40ms = good autonomic function.
   */
  rmssd: number;

  /** Number of IBI samples used in computation. */
  nSamples: number;

  /** Timestamp (Unix ms). */
  timestampMs: number;
}

// ══════════════════════════════════════════════
//  Full Phase 13 Output
// ══════════════════════════════════════════════

/** Complete output from SpO2Processor. */
export interface SpO2ProcessorOutput {
  /** SpO₂ result with raw + calibrated values. */
  spo2: SpO2Result;
  /** Heart rate from IBI (BPM), EMA-smoothed. */
  hrBpm: number;
  /** HRV metrics (SDNN, RMSSD) — null if insufficient data. */
  hrv: HRVMetrics | null;
  /** Reliability flags for this window. */
  flags: SpO2QualityFlag[];
  /** Processing latency in ms. */
  processingMs: number;
}

/** Quality/reliability flags for SpO₂ processor. */
export type SpO2QualityFlag =
  | 'motion_artifact'       // IMU + SDNN/RMSSD ratio > 5
  | 'insufficient_data'     // < 10 IBI in window
  | 'skin_contact_poor'     // DC_red below threshold
  | 'hypoxia_alert'         // SpO₂ < 85%
  | 'calibration_needed'    // Neural calibration model not loaded
  | 'out_of_range';         // SpO₂ outside [70, 100]%

/** Configuration for SpO₂ processing. */
export interface SpO2ProcessorConfig {
  /** Sample rate in Hz (Pod default: 25). */
  sampleRate: number;
  /** Moving average window for DC extraction (samples). */
  dcWindowSize: number;
  /** Minimum DC_red value to consider skin contact valid. */
  minDCRed: number;
  /** EMA alpha for HR smoothing (default: 0.3). */
  emaAlpha: number;
  /** Minimum IBI count for HRV computation. */
  minIBIForHRV: number;
  /** HRV window in seconds (default: 300 = 5 min). */
  hrvWindowS: number;
  /** Use neural calibration layer for SpO₂. */
  useNeuralCalibration: boolean;
}
