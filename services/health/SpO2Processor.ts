/**
 * PART:   SpO2Processor — Beer-Lambert dual-wavelength SpO₂ + HR + SDNN/RMSSD
 * ACTOR:  Claude Opus 4.6
 * PHASE:  13 — SpO₂ / HR / HRV Algorithms
 * TASK:   Compute SpO₂ from AC/DC ratio, HR from IBI, HRV from IBI variance
 * SCOPE:  IN: dual-channel PPG (RED 660nm + IR 940nm) + IBI array from Phase 12
 *         OUT: SpO2ProcessorOutput { spo2, hrBpm, hrv, flags }
 *
 * Pod sensor: MAX86176 — RED 660nm + IR 940nm photon count channels
 *
 * Source: Beer-Lambert perfusion ratio (Tong_Hop_Thuat_Toan §5)
 * Source: Neural calibration for skin tone bias correction
 */

import type { IBIEntry } from '@/types/ppg';
import type {
  ACDCComponents,
  DualChannelReading,
  HRVMetrics,
  SpO2ProcessorConfig,
  SpO2ProcessorOutput,
  SpO2QualityFlag,
  SpO2Result,
} from '@/types/spo2';
import { DEFAULT_SPO2_CONFIG } from '@/constants/spo2';
import { SENSOR_BOUNDS } from '@/constants/hardware';

// ══════════════════════════════════════════════
//  SpO₂ Processor — Main class
// ══════════════════════════════════════════════

export class SpO2Processor {
  private readonly config: SpO2ProcessorConfig;

  /** EMA state for HR smoothing. */
  private hrEma: number = 0;
  private hrEmaInitialised: boolean = false;

  /** Rolling IBI buffer for HRV computation (5-minute window). */
  private ibiBuffer: IBIEntry[] = [];

  constructor(config: Partial<SpO2ProcessorConfig> = {}) {
    this.config = { ...DEFAULT_SPO2_CONFIG, ...config };
  }

  // ── Public API ──

  /**
   * Process dual-channel PPG reading to produce SpO₂, HR, and HRV.
   *
   * Pipeline:
   *   1. Extract AC/DC from RED and IR channels
   *   2. Compute perfusion ratio R = (AC_red/DC_red) / (AC_IR/DC_IR)
   *   3. SpO₂ = 110 − 25 × R (Beer-Lambert empirical)
   *   4. Neural calibration correction (if available)
   *   5. HR from IBI with EMA smoothing
   *   6. HRV (SDNN + RMSSD) from rolling IBI buffer
   *   7. Quality/reliability flags
   *
   * @param reading   Dual-channel (RED + IR) raw ADC samples
   * @param ibis      IBI array from Phase 12 PPGProcessor
   * @param imuRatio  Optional SDNN/RMSSD ratio from IMU for motion check
   */
  process(
    reading: DualChannelReading,
    ibis: IBIEntry[],
    imuRatio?: number,
  ): SpO2ProcessorOutput {
    const t0 = performance.now();
    const flags: SpO2QualityFlag[] = [];

    // ── Step 1: Normalise dual channels ──
    const redNorm = normaliseADC(reading.redSamples);
    const irNorm = normaliseADC(reading.irSamples);

    // ── Step 2: Extract AC/DC components ──
    const redACDC = extractACDC(redNorm, this.config.dcWindowSize);
    const irACDC = extractACDC(irNorm, this.config.dcWindowSize);

    // ── Check skin contact via DC_red ──
    if (redACDC.dc < this.config.minDCRed) {
      flags.push('skin_contact_poor');
    }

    // ── Step 3: Perfusion Ratio R ──
    // R = (AC_red / DC_red) / (AC_IR / DC_IR)
    const ratioR = computeRatio(redACDC, irACDC);

    // ── Step 4: Beer-Lambert SpO₂ ──
    // SpO₂% = 110 − 25 × R  (empirical linearisation)
    const spo2Raw = 110 - 25 * ratioR;

    // ── Step 5: Neural calibration (skin tone bias correction) ──
    let spo2Calibrated: number;
    if (this.config.useNeuralCalibration) {
      // δ_nn = MLP([R_raw, DC_red, DC_IR, contact_quality, motion_energy])
      // SpO₂_calibrated = SpO₂_raw + δ_nn
      const delta = neuralCalibrationOffset(
        ratioR,
        redACDC.dc,
        irACDC.dc,
      );
      spo2Calibrated = spo2Raw + delta;
    } else {
      spo2Calibrated = spo2Raw;
      flags.push('calibration_needed');
    }

    // ── Clamp to valid range ──
    spo2Calibrated = clamp(spo2Calibrated, SENSOR_BOUNDS.spo2.min, SENSOR_BOUNDS.spo2.max);

    // ── Check for hypoxia ──
    if (spo2Calibrated < 85) {
      flags.push('hypoxia_alert');
    }

    // ── Check out of range ──
    if (spo2Raw < 70 || spo2Raw > 105) {
      flags.push('out_of_range');
    }

    // ── Step 6: HR from IBI with EMA smoothing ──
    const hrRaw = computeHRFromIBIs(ibis);
    const hrSmoothed = this.smoothHR(hrRaw);

    // ── Check insufficient data ──
    if (ibis.length < 10) {
      flags.push('insufficient_data');
    }

    // ── Step 7: Motion artifact check via SDNN/RMSSD ratio ──
    if (imuRatio !== undefined && imuRatio > 5) {
      flags.push('motion_artifact');
    }

    // ── Step 8: Update IBI buffer and compute HRV ──
    this.updateIBIBuffer(ibis, reading.timestampMs);
    const hrv = this.computeHRV(reading.timestampMs);

    const spo2Result: SpO2Result = {
      spo2Raw: round2(spo2Raw),
      spo2Calibrated: round2(spo2Calibrated),
      ratioR: round4(ratioR),
      redACDC,
      irACDC,
      timestampMs: reading.timestampMs,
    };

    return {
      spo2: spo2Result,
      hrBpm: round1(hrSmoothed),
      hrv,
      flags,
      processingMs: round2(performance.now() - t0),
    };
  }

  /** Reset internal state (EMA, IBI buffer). */
  reset(): void {
    this.hrEma = 0;
    this.hrEmaInitialised = false;
    this.ibiBuffer = [];
  }

  // ══════════════════════════════════════════════
  //  Internal: HR Smoothing
  // ══════════════════════════════════════════════

  /**
   * EMA smoothing for HR.
   * EMA(t) = α × HR(t) + (1−α) × EMA(t−1)
   */
  private smoothHR(hrRaw: number): number {
    if (hrRaw <= 0) {
      return this.hrEmaInitialised ? this.hrEma : 0;
    }

    if (!this.hrEmaInitialised) {
      this.hrEma = hrRaw;
      this.hrEmaInitialised = true;
      return hrRaw;
    }

    // EMA(t) = α × HR(t) + (1-α) × EMA(t-1)
    const alpha = this.config.emaAlpha;
    this.hrEma = alpha * hrRaw + (1 - alpha) * this.hrEma;
    return this.hrEma;
  }

  // ══════════════════════════════════════════════
  //  Internal: IBI Buffer Management
  // ══════════════════════════════════════════════

  /**
   * Add new IBIs to rolling buffer, trim to HRV window.
   */
  private updateIBIBuffer(ibis: IBIEntry[], nowMs: number): void {
    this.ibiBuffer.push(...ibis);

    // Trim: keep only last hrvWindowS seconds
    const cutoff = nowMs - this.config.hrvWindowS * 1000;
    this.ibiBuffer = this.ibiBuffer.filter((ibi) => ibi.timestampMs >= cutoff);
  }

  // ══════════════════════════════════════════════
  //  Internal: HRV Computation
  // ══════════════════════════════════════════════

  /**
   * Compute SDNN and RMSSD from the rolling IBI buffer.
   *
   * SDNN = √(1/N × Σ(IBI_i − IBI_mean)²)  [ms]
   *   Standard deviation of all NN (normal-to-normal) intervals.
   *   Reflects overall HRV including both sympathetic and parasympathetic.
   *
   * RMSSD = √(1/(N−1) × Σ(IBI_{i+1} − IBI_i)²)  [ms]
   *   Root mean square of successive differences.
   *   Primarily reflects parasympathetic (vagal) activity.
   *   RMSSD > 40ms = good autonomic function.
   *
   * @returns HRVMetrics or null if insufficient data (< minIBIForHRV).
   */
  private computeHRV(nowMs: number): HRVMetrics | null {
    const n = this.ibiBuffer.length;

    if (n < this.config.minIBIForHRV) {
      return null;
    }

    const durations = this.ibiBuffer.map((ibi) => ibi.durationMs);

    // ── SDNN ──
    // SDNN = √(1/N × Σ(IBI_i − IBI_mean)²)
    const mean = durations.reduce((s, v) => s + v, 0) / n;
    let sumSqDiff = 0;
    for (let i = 0; i < n; i++) {
      const diff = durations[i] - mean;
      sumSqDiff += diff * diff;
    }
    const sdnn = Math.sqrt(sumSqDiff / n);

    // ── RMSSD ──
    // RMSSD = √(1/(N−1) × Σ(IBI_{i+1} − IBI_i)²)
    let sumSqSuccDiff = 0;
    for (let i = 0; i < n - 1; i++) {
      const diff = durations[i + 1] - durations[i];
      sumSqSuccDiff += diff * diff;
    }
    const rmssd = Math.sqrt(sumSqSuccDiff / (n - 1));

    return {
      sdnn: round2(sdnn),
      rmssd: round2(rmssd),
      nSamples: n,
      timestampMs: nowMs,
    };
  }
}

// ══════════════════════════════════════════════
//  Pure Functions
// ══════════════════════════════════════════════

/**
 * Normalise 12-bit ADC values to [0, 1].
 */
function normaliseADC(samples: number[]): number[] {
  const out = new Array<number>(samples.length);
  for (let i = 0; i < samples.length; i++) {
    out[i] = samples[i] / 4095;
  }
  return out;
}

/**
 * Extract AC and DC components from a normalised PPG channel.
 *
 * DC = moving average over dcWindowSize samples.
 * AC = max − min within the signal (peak-to-peak amplitude).
 *
 * @param signal       Normalised signal [0, 1].
 * @param dcWindowSize Number of samples for DC moving average (default: 50).
 */
function extractACDC(signal: number[], dcWindowSize: number): ACDCComponents {
  // DC = moving average of last dcWindowSize samples (or entire signal if shorter)
  const windowStart = Math.max(0, signal.length - dcWindowSize);
  let dcSum = 0;
  for (let i = windowStart; i < signal.length; i++) {
    dcSum += signal[i];
  }
  const dc = dcSum / (signal.length - windowStart);

  // AC = peak-to-peak amplitude within the window
  let min = Infinity;
  let max = -Infinity;
  for (let i = windowStart; i < signal.length; i++) {
    if (signal[i] < min) min = signal[i];
    if (signal[i] > max) max = signal[i];
  }
  const ac = max - min;

  return { dc, ac };
}

/**
 * Compute Beer-Lambert perfusion ratio.
 *
 * R = (AC_red / DC_red) / (AC_IR / DC_IR)
 *
 * Clamp to avoid division by zero and extreme values.
 */
function computeRatio(red: ACDCComponents, ir: ACDCComponents): number {
  // Guard against division by zero
  const dcRed = Math.max(red.dc, 1e-6);
  const dcIR = Math.max(ir.dc, 1e-6);
  const acIR = Math.max(ir.ac, 1e-6);

  // R = (AC_red / DC_red) / (AC_IR / DC_IR)
  const ratio = (red.ac / dcRed) / (acIR / dcIR);

  // Clamp to physiological range [0.2, 1.5]
  // R ≈ 0.4 → SpO₂ ≈ 100%, R ≈ 1.0 → SpO₂ ≈ 85%
  return clamp(ratio, 0.2, 1.5);
}

/**
 * Compute HR from IBI array.
 * HR = 60000 / mean(IBI)  [BPM]
 */
function computeHRFromIBIs(ibis: IBIEntry[]): number {
  if (ibis.length === 0) return 0;

  let sum = 0;
  for (let i = 0; i < ibis.length; i++) {
    sum += ibis[i].durationMs;
  }
  const meanIBI = sum / ibis.length;

  if (meanIBI <= 0) return 0;

  // HR = 60000 / mean(IBI)  [BPM]
  return 60000 / meanIBI;
}

/**
 * Neural calibration offset δ_nn for skin tone bias correction.
 *
 * δ_nn = MLP([R_raw, DC_red, DC_IR, contact_quality, motion_energy])
 * Typically −2 to +1% correction.
 *
 * Hackathon: stub returns 0 (no model trained yet).
 * Full product: ONNX model inference.
 */
function neuralCalibrationOffset(
  _ratioR: number,
  _dcRed: number,
  _dcIR: number,
): number {
  // TODO: FULL_PRODUCT — Load ONNX MLP model for neural calibration
  // MLP: 4 layers, 32 hidden, ReLU, <1ms inference
  // Input: [R_raw, DC_red, DC_IR, contact_quality, motion_energy]
  // Output: scalar correction offset (typically −2 to +1%)
  return 0;
}

/**
 * Clamp a value to [min, max].
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}
