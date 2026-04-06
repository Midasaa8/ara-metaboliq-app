/**
 * PART:   PPG Types — data structures for PPG processing pipeline
 * ACTOR:  Claude Opus 4.6
 * PHASE:  12 — PPG Real-time Processing
 * TASK:   Type definitions shared between PPGProcessor, SpO2Processor, HREstimator
 * SCOPE:  IN: type-only definitions
 *         OUT: algorithm implementations (separate files)
 */

/** Single detected systolic peak in the PPG signal. */
export interface PPGPeak {
  /** Sample index within the buffer. */
  index: number;
  /** Timestamp in milliseconds (Unix). */
  timestampMs: number;
  /** Amplitude of the peak (normalised 0-1). */
  amplitude: number;
}

/** Inter-Beat Interval derived from consecutive peaks. */
export interface IBIEntry {
  /** IBI duration in milliseconds. */
  durationMs: number;
  /** Timestamp of the second beat. */
  timestampMs: number;
}

/**
 * Output of the PPGProcessor pipeline per processing window.
 *
 * Passed to Phase 13 (SpO2Processor) and Phase 14 (TemperatureProcessor).
 */
export interface PPGProcessorOutput {
  /** Denoised PPG signal (same length as input). */
  cleanSignal: number[];
  /** Detected systolic peaks on the clean signal. */
  peaks: PPGPeak[];
  /** Inter-Beat Intervals from consecutive peaks. */
  ibis: IBIEntry[];
  /** Instantaneous HR estimated from peak-counting (BPM). */
  hrPeakCount: number;
  /** HR from knowledge-distilled edge model (BPM), if available. */
  hrEdgeModel: number | null;
  /** Quality flags for this window. */
  flags: PPGQualityFlag[];
  /** Processing latency in ms. */
  processingMs: number;
  /** Timestamp when this window was processed. */
  timestampMs: number;
}

/** Quality flags emitted by the PPG processor. */
export type PPGQualityFlag =
  | 'motion_artifact'       // IMU detected significant motion during window
  | 'insufficient_peaks'    // < 3 peaks detected in window
  | 'irregular_rhythm'      // IBI variance too high (σ > 200ms)
  | 'signal_clipped'        // ADC saturation detected
  | 'low_perfusion'         // DC component too low (poor skin contact)
  | 'model_unavailable';    // DPNet ONNX model not loaded, using fallback

/**
 * Configuration for the PPG processing pipeline.
 */
export interface PPGProcessorConfig {
  /** Sample rate in Hz (Pod default: 25). */
  sampleRate: number;
  /** Processing window size in samples (default: 125 = 5s @ 25Hz). */
  windowSize: number;
  /** Minimum distance between peaks in seconds (default: 0.3). */
  minPeakDistanceS: number;
  /** Minimum peak prominence (normalised, default: 0.1). */
  minPeakProminence: number;
  /** IBI range [min, max] in ms (physiological: 300-2000). */
  ibiRangeMs: [number, number];
  /** Maximum IBI stddev over last 5 to flag irregular rhythm (ms). */
  maxIbiStdMs: number;
  /** Use DPNet ONNX model for denoising (false = fallback filter). */
  useDPNet: boolean;
  /** Use knowledge-distilled HR edge model. */
  useEdgeHRModel: boolean;
}

/** Default config matching Pod hardware specs — see constants/ppg.ts for values. */
export declare const DEFAULT_PPG_CONFIG: PPGProcessorConfig;
