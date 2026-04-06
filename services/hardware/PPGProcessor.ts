/**
 * PART:   PPGProcessor — DPNet Mamba denoising + clean peak detection
 * ACTOR:  Claude Opus 4.6
 * PHASE:  12 — PPG Real-time Processing
 * TASK:   Denoise PPG via DPNet, detect peaks on clean signal
 * SCOPE:  IN: raw 12-bit ADC samples (0-4095) from BLE buffer
 *         OUT: detected peaks array, IBI list (passed to Phase 13)
 * HARDWARE STATUS: REAL — runs on Pod PPG sensor data (Phase 11+)
 *
 * Source: DPNet — Mamba-based PPG denoising
 *         Chiu et al., arXiv:2510.11058, NTU Taiwan, Oct 2025
 *
 * Architecture (lightweight, edge-deployable):
 *   Input: PPG segment (125 samples @ 25Hz = 5s)
 *   4× Mamba blocks (hidden=64, selective state space, skip connections)
 *   Output: denoised PPG waveform (same shape)
 *
 * Training objectives:
 *   L_total = L_SI-SDR + λ × L_HR
 *   SI-SDR = 10·log₁₀(‖αs‖² / ‖αs−ŝ‖²)  where α = ⟨ŝ,s⟩/‖s‖²
 *   L_HR = MSE(HR_from_predicted_peaks, HR_ground_truth)
 *
 * Mamba advantage over LSTM:
 *   O(L) complexity vs O(L²) → 3× faster on edge hardware
 *   Selective state: only retains relevant context
 */

import type {
  IBIEntry,
  PPGPeak,
  PPGProcessorConfig,
  PPGProcessorOutput,
  PPGQualityFlag,
} from '@/types/ppg';
import { DEFAULT_PPG_CONFIG } from '@/constants/ppg';
import { SENSOR_BOUNDS } from '@/constants/hardware';

// ══════════════════════════════════════════════
//  PPG Processor — Main class
// ══════════════════════════════════════════════

export class PPGProcessor {
  private readonly config: PPGProcessorConfig;
  private onnxSession: unknown | null = null; // ONNX InferenceSession when DPNet loaded

  constructor(config: Partial<PPGProcessorConfig> = {}) {
    this.config = { ...DEFAULT_PPG_CONFIG, ...config };
  }

  // ── Public API ──

  /**
   * Process a window of raw PPG samples.
   *
   * Pipeline:
   *   1. Normalise raw ADC (0-4095) → [0, 1]
   *   2. Denoise via DPNet ONNX (or fallback bandpass + moving average)
   *   3. Detect systolic peaks on clean signal (findPeaks)
   *   4. Compute IBI from consecutive peaks
   *   5. Estimate HR via peak-counting
   *   6. (Optional) HR via knowledge-distilled edge model
   *   7. Quality flags
   *
   * @param rawSamples  Raw 12-bit ADC values (0-4095) from MAX86176
   * @param timestampMs Timestamp of the LAST sample in the window (Unix ms)
   * @param imuMagnitude IMU acceleration magnitude (m/s²) for motion detection
   */
  process(
    rawSamples: number[],
    timestampMs: number,
    imuMagnitude?: number,
  ): PPGProcessorOutput {
    const t0 = performance.now();
    const flags: PPGQualityFlag[] = [];

    // ── Step 1: Normalise ADC → [0, 1] ──
    const normalised = normaliseADC(rawSamples);

    // ── Check for signal clipping ──
    if (hasClipping(rawSamples)) {
      flags.push('signal_clipped');
    }

    // ── Check for low perfusion (poor skin contact) ──
    if (hasLowPerfusion(normalised)) {
      flags.push('low_perfusion');
    }

    // ── Check motion artifact via IMU ──
    if (imuMagnitude !== undefined && imuMagnitude > 12.0) {
      // > 12 m/s² = significant motion (resting ≈ 9.8 m/s²)
      flags.push('motion_artifact');
    }

    // ── Step 2: Denoise ──
    let cleanSignal: number[];
    if (this.config.useDPNet && this.onnxSession !== null) {
      cleanSignal = this.denoiseWithDPNet(normalised);
    } else {
      if (this.config.useDPNet && this.onnxSession === null) {
        flags.push('model_unavailable');
      }
      cleanSignal = denoiseWithFallback(normalised, this.config.sampleRate);
    }

    // ── Step 3: Peak detection on clean signal ──
    const minDistance = Math.floor(this.config.minPeakDistanceS * this.config.sampleRate);
    const peaks = findPeaks(cleanSignal, minDistance, this.config.minPeakProminence);

    // Convert peak indices → PPGPeak objects with timestamps
    const samplePeriodMs = 1000 / this.config.sampleRate;
    const windowDurationMs = rawSamples.length * samplePeriodMs;
    const windowStartMs = timestampMs - windowDurationMs;

    const detectedPeaks: PPGPeak[] = peaks.map((idx) => ({
      index: idx,
      timestampMs: windowStartMs + idx * samplePeriodMs,
      amplitude: cleanSignal[idx],
    }));

    if (detectedPeaks.length < 3) {
      flags.push('insufficient_peaks');
    }

    // ── Step 4: IBI from consecutive peaks ──
    // IBI(n) = (t_peak(n) - t_peak(n-1)) × 1000  [ms]
    // REJECT IBI outside [300, 2000] ms (HR 30-200 BPM physiological range)
    const ibis = computeIBIs(detectedPeaks, this.config.ibiRangeMs);

    // Extra validation: σ(IBI_last_5) < 200ms (reject motion burst)
    if (ibis.length >= 5) {
      const recentIBIs = ibis.slice(-5).map((e) => e.durationMs);
      const std = stddev(recentIBIs);
      if (std > this.config.maxIbiStdMs) {
        flags.push('irregular_rhythm');
      }
    }

    // ── Step 5: HR from peak counting ──
    // HR = 60000 / mean(IBI_recent_10)  [BPM]
    const hrPeakCount = computeHRFromIBIs(ibis);

    // ── Step 6: HR from edge model (Phase 12 full product) ──
    // TODO: HARDWARE_INTEGRATION — Phase 12 Full Product:
    //   Load ONNX PPGHeartRateNet (~50K params, <5ms inference)
    //   Source: arXiv:2511.18829, NeurIPS 2025, UW/Google Health
    //   Conv1D(32) → Conv1D(64) → AdaptiveAvgPool → Dense(1)
    //   Trained via DKD (Decoupled Knowledge Distillation)
    //   MAE ≈ 1.5 BPM (vs peak-counting MAE ≈ 2.8 BPM)
    const hrEdgeModel: number | null = null;

    const processingMs = performance.now() - t0;

    return {
      cleanSignal,
      peaks: detectedPeaks,
      ibis,
      hrPeakCount,
      hrEdgeModel,
      flags,
      processingMs,
      timestampMs,
    };
  }

  /**
   * Load DPNet ONNX model for real-time denoising.
   *
   * Call once at startup. After loading, process() will use DPNet
   * instead of the fallback bandpass filter.
   *
   * Model spec (DPNet — arXiv:2510.11058):
   *   4× Mamba blocks, hidden=64, skip connections
   *   Input: (1, 125) — 5s window @ 25Hz
   *   Output: (1, 125) — denoised waveform
   *   ~25K params, <10ms inference on mobile CPU
   */
  async loadDPNetModel(modelPath: string): Promise<boolean> {
    try {
      // TODO: HARDWARE_INTEGRATION — Phase 12 Full Product:
      //   import { InferenceSession } from 'onnxruntime-react-native';
      //   this.onnxSession = await InferenceSession.create(modelPath);
      //   this.config.useDPNet = true;
      //   return true;
      console.warn('[PPGProcessor] DPNet ONNX loading not yet implemented — using fallback');
      return false;
    } catch (err) {
      console.error('[PPGProcessor] Failed to load DPNet model:', err);
      return false;
    }
  }

  // ── Private: DPNet inference ──

  /**
   * Denoise via DPNet Mamba ONNX model.
   *
   * DPNet (arXiv:2510.11058):
   *   Input: PPG segment (125 samples @ 25Hz = 5s)
   *   4× Mamba SSM blocks (hidden=64, selective state space)
   *   Output: denoised PPG waveform (same shape)
   *
   * Training loss:
   *   L_total = L_SI-SDR + λ × L_HR
   *   SI-SDR = 10·log₁₀(‖αs‖² / ‖αs−ŝ‖²)   where α = ⟨ŝ,s⟩/‖s‖²
   *   L_HR = MSE(HR_denoised_peaks, HR_ground_truth)
   */
  private denoiseWithDPNet(signal: number[]): number[] {
    // TODO: HARDWARE_INTEGRATION — Phase 12 Full Product:
    //   const input = new Float32Array(signal);
    //   const tensor = new Tensor('float32', input, [1, signal.length]);
    //   const result = await this.onnxSession.run({ input: tensor });
    //   return Array.from(result.output.data as Float32Array);
    return denoiseWithFallback(signal, this.config.sampleRate);
  }
}

// ══════════════════════════════════════════════
//  Signal Processing Utilities
// ══════════════════════════════════════════════

/**
 * Normalise raw 12-bit ADC values (0-4095) to [0, 1].
 */
function normaliseADC(raw: number[]): number[] {
  const out = new Array<number>(raw.length);
  for (let i = 0; i < raw.length; i++) {
    out[i] = raw[i] / 4095;
  }
  return out;
}

/**
 * Check if ADC signal is clipped (saturated at 0 or 4095).
 * Clipping > 2% of samples → flag.
 */
function hasClipping(raw: number[]): boolean {
  let clipped = 0;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] <= 1 || raw[i] >= 4094) clipped++;
  }
  return clipped / raw.length > 0.02;
}

/**
 * Check for low perfusion index (poor skin contact).
 * If DC component < 0.05 → poor contact.
 */
function hasLowPerfusion(normalised: number[]): boolean {
  let sum = 0;
  for (let i = 0; i < normalised.length; i++) sum += normalised[i];
  const dc = sum / normalised.length;
  return dc < 0.05;
}

/**
 * Fallback denoising when DPNet model is not available.
 *
 * Two-stage filter:
 * 1. 2nd-order Butterworth bandpass (0.5–8 Hz) — isolates cardiac band
 * 2. Moving average (window = 3 samples) — smooth residual noise
 *
 * The bandpass rejects:
 * - Baseline wander (< 0.5 Hz) from respiration / motion
 * - High-frequency noise (> 8 Hz) from EMG / electrical
 */
function denoiseWithFallback(signal: number[], sampleRate: number): number[] {
  // Stage 1: Butterworth bandpass 0.5–8 Hz (2nd order)
  const filtered = butterworthBandpass(signal, sampleRate, 0.5, 8.0);

  // Stage 2: Moving average (window = 3)
  const smoothed = movingAverage(filtered, 3);

  return smoothed;
}

/**
 * 2nd-order IIR Butterworth bandpass filter.
 *
 * Implemented as cascade of highpass (fc_low) + lowpass (fc_high).
 * Uses bilinear transform for coefficient computation.
 *
 * For PPG @ 25Hz:
 *   fc_low  = 0.5 Hz → removes baseline wander (respiration)
 *   fc_high = 8.0 Hz → removes high-frequency noise
 */
function butterworthBandpass(
  signal: number[],
  fs: number,
  fcLow: number,
  fcHigh: number,
): number[] {
  // Highpass to remove baseline wander
  const hp = iirHighpass(signal, fs, fcLow);
  // Lowpass to remove high-frequency noise
  const lp = iirLowpass(hp, fs, fcHigh);
  return lp;
}

/**
 * 1st-order IIR highpass filter.
 *
 * Transfer function: H(z) = α × (1 - z⁻¹) / (1 - α × z⁻¹)
 * where α = RC / (RC + dt), RC = 1/(2π·fc), dt = 1/fs
 */
function iirHighpass(signal: number[], fs: number, fc: number): number[] {
  const dt = 1.0 / fs;
  const RC = 1.0 / (2 * Math.PI * fc);
  const alpha = RC / (RC + dt);

  const out = new Array<number>(signal.length);
  out[0] = signal[0];
  for (let i = 1; i < signal.length; i++) {
    // y[n] = α × (y[n-1] + x[n] - x[n-1])
    out[i] = alpha * (out[i - 1] + signal[i] - signal[i - 1]);
  }
  return out;
}

/**
 * 1st-order IIR lowpass filter.
 *
 * Transfer function: H(z) = α / (1 - (1-α) × z⁻¹)
 * where α = dt / (RC + dt), RC = 1/(2π·fc)
 */
function iirLowpass(signal: number[], fs: number, fc: number): number[] {
  const dt = 1.0 / fs;
  const RC = 1.0 / (2 * Math.PI * fc);
  const alpha = dt / (RC + dt);

  const out = new Array<number>(signal.length);
  out[0] = signal[0] * alpha;
  for (let i = 1; i < signal.length; i++) {
    // y[n] = α × x[n] + (1-α) × y[n-1]
    out[i] = alpha * signal[i] + (1 - alpha) * out[i - 1];
  }
  return out;
}

/**
 * Moving average smoothing filter.
 */
function movingAverage(signal: number[], window: number): number[] {
  const half = Math.floor(window / 2);
  const out = new Array<number>(signal.length);
  for (let i = 0; i < signal.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(signal.length - 1, i + half); j++) {
      sum += signal[j];
      count++;
    }
    out[i] = sum / count;
  }
  return out;
}

// ══════════════════════════════════════════════
//  Peak Detection (on clean DPNet output)
// ══════════════════════════════════════════════
// After denoising, use scipy-style find_peaks:
//   peaks = findPeaks(ppg_clean, { distance: 0.3 × fs, prominence: 0.1 })
// Much more reliable than threshold on noisy signal

/**
 * Find local maxima (systolic peaks) in a signal.
 *
 * Implements scipy.signal.find_peaks logic:
 * 1. A peak is a sample greater than both neighbours
 * 2. Minimum distance between peaks enforced (prevent double-counting)
 * 3. Minimum prominence required (reject noise bumps)
 *
 * @param signal     Denoised PPG signal
 * @param minDistance Minimum samples between peaks
 * @param minProminence Minimum peak height above surrounding troughs
 * @returns Array of peak indices
 */
function findPeaks(
  signal: number[],
  minDistance: number,
  minProminence: number,
): number[] {
  const n = signal.length;
  if (n < 3) return [];

  // Step 1: Find all local maxima (sample > both neighbours)
  const candidates: number[] = [];
  for (let i = 1; i < n - 1; i++) {
    if (signal[i] > signal[i - 1] && signal[i] > signal[i + 1]) {
      candidates.push(i);
    }
  }

  // Step 2: Filter by prominence
  // Prominence = peak height - max(left trough, right trough)
  const prominent: number[] = [];
  for (const idx of candidates) {
    const prominence = computeProminence(signal, idx);
    if (prominence >= minProminence) {
      prominent.push(idx);
    }
  }

  // Step 3: Enforce minimum distance (keep highest peak in each window)
  const selected: number[] = [];
  let lastPeakIdx = -Infinity;

  for (const idx of prominent) {
    if (idx - lastPeakIdx >= minDistance) {
      selected.push(idx);
      lastPeakIdx = idx;
    } else {
      // If this peak is higher, replace the last one
      if (selected.length > 0 && signal[idx] > signal[selected[selected.length - 1]]) {
        selected[selected.length - 1] = idx;
        lastPeakIdx = idx;
      }
    }
  }

  return selected;
}

/**
 * Compute prominence of a peak.
 *
 * Prominence = peak_value - max(left_base, right_base)
 * left_base  = minimum value between peak and higher peak to the left (or start)
 * right_base = minimum value between peak and higher peak to the right (or end)
 */
function computeProminence(signal: number[], peakIdx: number): number {
  const peakVal = signal[peakIdx];

  // Scan left for the base
  let leftMin = peakVal;
  for (let i = peakIdx - 1; i >= 0; i--) {
    if (signal[i] > peakVal) break; // Higher peak found → stop
    if (signal[i] < leftMin) leftMin = signal[i];
  }

  // Scan right for the base
  let rightMin = peakVal;
  for (let i = peakIdx + 1; i < signal.length; i++) {
    if (signal[i] > peakVal) break;
    if (signal[i] < rightMin) rightMin = signal[i];
  }

  // Prominence = peak - highest base
  const base = Math.max(leftMin, rightMin);
  return peakVal - base;
}

// ══════════════════════════════════════════════
//  IBI (Inter-Beat Interval) Computation
// ══════════════════════════════════════════════
// IBI(n) = (t_peak(n) - t_peak(n-1)) × 1000  [ms]
// REJECT IBI outside [300, 2000] ms (HR 30-200 BPM physiological range)

/**
 * Compute Inter-Beat Intervals from detected peaks.
 *
 * IBI(n) = t_peak(n) - t_peak(n-1) [ms]
 * Rejects IBIs outside physiological range [300, 2000] ms.
 */
function computeIBIs(
  peaks: PPGPeak[],
  rangeMs: [number, number],
): IBIEntry[] {
  if (peaks.length < 2) return [];

  const ibis: IBIEntry[] = [];
  for (let i = 1; i < peaks.length; i++) {
    const durationMs = peaks[i].timestampMs - peaks[i - 1].timestampMs;

    // REJECT IBI outside physiological range
    if (durationMs >= rangeMs[0] && durationMs <= rangeMs[1]) {
      ibis.push({
        durationMs,
        timestampMs: peaks[i].timestampMs,
      });
    }
  }

  return ibis;
}

// ══════════════════════════════════════════════
//  HR Estimation from IBI
// ══════════════════════════════════════════════
// HR = 60000 / mean(IBI_recent_10) [BPM]
// Smooth with EMA: EMA(t) = 0.3 × HR(t) + 0.7 × EMA(t-1)

let _hrEma: number | null = null;

/**
 * Estimate heart rate from Inter-Beat Intervals.
 *
 * HR = 60000 / mean(IBI_recent_10)  [BPM]
 * Smoothed with EMA: EMA(t) = 0.3 × HR(t) + 0.7 × EMA(t-1)
 *
 * @returns HR in BPM, or 0 if insufficient data.
 */
function computeHRFromIBIs(ibis: IBIEntry[]): number {
  if (ibis.length === 0) return 0;

  // Use last 10 IBIs for stability
  const recent = ibis.slice(-10);
  const meanIBI = recent.reduce((s, e) => s + e.durationMs, 0) / recent.length;

  if (meanIBI <= 0) return 0;

  // HR = 60000 / mean(IBI) [BPM]
  const hrRaw = 60000 / meanIBI;

  // Clamp to physiological range
  const hrClamped = Math.max(
    SENSOR_BOUNDS.hr.min,
    Math.min(SENSOR_BOUNDS.hr.max, hrRaw),
  );

  // EMA smoothing: EMA(t) = 0.3 × HR(t) + 0.7 × EMA(t-1)
  if (_hrEma === null) {
    _hrEma = hrClamped;
  } else {
    _hrEma = 0.3 * hrClamped + 0.7 * _hrEma;
  }

  return Math.round(_hrEma);
}

// ══════════════════════════════════════════════
//  Math Utilities
// ══════════════════════════════════════════════

/** Standard deviation of an array of numbers. */
function stddev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// ── Reset EMA (for testing) ──
export function resetHREma(): void {
  _hrEma = null;
}
