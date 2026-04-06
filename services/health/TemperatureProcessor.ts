/**
 * PART:   TemperatureProcessor — NTC Steinhart-Hart + Beta correction
 * ACTOR:  Claude Opus 4.6
 * PHASE:  14 — Temperature Algorithm
 * TASK:   Convert raw 12-bit ADC → °C using Steinhart-Hart + Beta formula
 * SCOPE:  IN: raw 12-bit ADC value from NTC thermistor
 *         OUT: TemperatureResult { skinTempC, coreTempC, smoothedTempC, flags }
 *
 * Sensor: NTC 10kΩ B=3950 thermistor in voltage divider (R_ref=10kΩ, Vcc=3.3V)
 *
 * Source: Tong_Hop_Thuat_Toan §6 — Temperature algorithms
 */

import type {
  TemperatureProcessorConfig,
  TemperatureQualityFlag,
  TemperatureResult,
} from '@/types/temperature';
import { DEFAULT_TEMP_CONFIG } from '@/constants/temperature';
import { SENSOR_BOUNDS } from '@/constants/hardware';

// ══════════════════════════════════════════════
//  Temperature Processor — Main class
// ══════════════════════════════════════════════

export class TemperatureProcessor {
  private readonly config: TemperatureProcessorConfig;

  /** IIR smoothing state. */
  private smoothedTemp: number = 0;
  private smoothInitialised: boolean = false;

  /** Last valid temperature for delta check. */
  private lastTempC: number = 0;
  private lastTempValid: boolean = false;

  /** ADC max value derived from adcBits. */
  private readonly adcMax: number;

  constructor(config: Partial<TemperatureProcessorConfig> = {}) {
    this.config = { ...DEFAULT_TEMP_CONFIG, ...config };
    this.adcMax = (1 << this.config.adcBits) - 1; // 4095 for 12-bit
  }

  // ── Public API ──

  /**
   * Process a raw ADC reading from NTC thermistor.
   *
   * Pipeline:
   *   1. ADC → Voltage:  V_out = ADC_raw × (Vcc / ADC_max)
   *   2. Voltage → Resistance:  NTC_R = R_ref × V_out / (Vcc - V_out)
   *   3. Resistance → Temperature (Steinhart-Hart or Beta)
   *   4. Skin → Core correction:  T_core = T_skin + 0.7°C
   *   5. IIR smoothing:  T_f(t) = α×T_raw + (1-α)×T_f(t-1)
   *   6. Quality flags
   *
   * @param adcRaw      Raw 12-bit ADC value (0-4095)
   * @param timestampMs Timestamp of reading (Unix ms)
   */
  process(adcRaw: number, timestampMs: number): TemperatureResult {
    const flags: TemperatureQualityFlag[] = [];

    // ── Step 1: ADC → Voltage ──
    // V_out = ADC_raw × (Vcc / ADC_max)
    if (adcRaw <= 0 || adcRaw >= this.adcMax) {
      flags.push('adc_saturated');
    }

    const adcClamped = clamp(adcRaw, 1, this.adcMax - 1);
    const vOut = adcClamped * (this.config.vcc / this.adcMax);

    // ── Step 2: Voltage → NTC Resistance ──
    // Voltage divider: V_out = Vcc × NTC_R / (R_ref + NTC_R)
    // Solving: NTC_R = R_ref × V_out / (Vcc - V_out)
    const vDiff = this.config.vcc - vOut;
    const ntcR = this.config.rRef * vOut / Math.max(vDiff, 1e-6);

    // Validate resistance range (reasonable for body temperature)
    // At 30°C: ~8.3kΩ, at 42°C: ~4.9kΩ (for B=3950, R₀=10kΩ@25°C)
    if (ntcR < 1000 || ntcR > 100_000) {
      flags.push('resistance_invalid');
    }

    // ── Step 3: Resistance → Temperature ──
    let skinTempC: number;

    if (this.config.useSteinhartHart) {
      // Steinhart-Hart Equation:
      // 1/T = A + B×ln(R) + C×(ln(R))³
      skinTempC = steinhartHart(
        ntcR,
        this.config.shA,
        this.config.shB,
        this.config.shC,
      );
    } else {
      // Beta (B-parameter) Approximation:
      // 1/T = 1/T₀ + (1/B)×ln(R/R₀)
      skinTempC = betaApproximation(
        ntcR,
        this.config.beta,
        this.config.r0,
        this.config.t0K,
      );
    }

    // ── Step 4: Skin → Core correction ──
    // T_core ≈ T_skin + 0.7  (empirical patch factor)
    const coreTempC = skinTempC + this.config.skinToCoreOffset;

    // ── Validate range ──
    if (coreTempC < SENSOR_BOUNDS.temperature.min || coreTempC > SENSOR_BOUNDS.temperature.max) {
      flags.push('out_of_range');
    }

    // ── Check large delta ──
    if (this.lastTempValid) {
      const delta = Math.abs(coreTempC - this.lastTempC);
      if (delta > 0.5) {
        flags.push('large_delta');
      }
    }
    this.lastTempC = coreTempC;
    this.lastTempValid = true;

    // ── Step 5: IIR smoothing ──
    // T_filtered(t) = α × T_raw(t) + (1-α) × T_filtered(t-1)
    const smoothedTempC = this.smooth(coreTempC);

    return {
      skinTempC: round2(skinTempC),
      coreTempC: round2(coreTempC),
      smoothedTempC: round2(smoothedTempC),
      ntcResistanceOhm: round1(ntcR),
      voltageV: round4(vOut),
      flags,
      timestampMs,
    };
  }

  /** Reset internal state (IIR filter, delta tracking). */
  reset(): void {
    this.smoothedTemp = 0;
    this.smoothInitialised = false;
    this.lastTempC = 0;
    this.lastTempValid = false;
  }

  // ══════════════════════════════════════════════
  //  Internal: IIR Smoothing
  // ══════════════════════════════════════════════

  /**
   * 1st-order IIR low-pass filter.
   * T_f(t) = α × T_raw(t) + (1-α) × T_f(t-1)
   *
   * α = 0.1 → heavy smoothing (slow response, stable reading)
   */
  private smooth(tempC: number): number {
    if (!this.smoothInitialised) {
      this.smoothedTemp = tempC;
      this.smoothInitialised = true;
      return tempC;
    }

    const alpha = this.config.iirAlpha;
    // T_f(t) = α × T_raw(t) + (1-α) × T_f(t-1)
    this.smoothedTemp = alpha * tempC + (1 - alpha) * this.smoothedTemp;
    return this.smoothedTemp;
  }
}

// ══════════════════════════════════════════════
//  Pure Functions — Temperature Conversion
// ══════════════════════════════════════════════

/**
 * Steinhart-Hart equation: resistance → temperature.
 *
 * 1/T = A + B×ln(R) + C×(ln(R))³
 * T°C = (1/T_kelvin) − 273.15
 *
 * More accurate than Beta approximation (~±0.01°C vs ~±0.05°C).
 *
 * @param r   NTC resistance (Ω)
 * @param a   S-H coefficient A (1.009249522e-3)
 * @param b   S-H coefficient B (2.378405444e-4)
 * @param c   S-H coefficient C (2.019202697e-7)
 * @returns Temperature in °C
 */
function steinhartHart(r: number, a: number, b: number, c: number): number {
  const lnR = Math.log(r);

  // 1/T = A + B×ln(R) + C×(ln(R))³
  const invT = a + b * lnR + c * lnR * lnR * lnR;

  // T°C = (1/T_kelvin) − 273.15
  return 1.0 / invT - 273.15;
}

/**
 * Beta (B-parameter) approximation: resistance → temperature.
 *
 * 1/T = 1/T₀ + (1/B)×ln(R/R₀)
 * T°C = (1/T_kelvin) − 273.15
 *
 * Faster, < 0.05°C error compared to Steinhart-Hart.
 *
 * @param r   NTC resistance (Ω)
 * @param beta Beta parameter (K), default 3950
 * @param r0  Nominal resistance at T₀ (Ω), default 10000
 * @param t0K Nominal temperature T₀ (K), default 298.15
 * @returns Temperature in °C
 */
function betaApproximation(r: number, beta: number, r0: number, t0K: number): number {
  // 1/T = 1/T₀ + (1/B)×ln(R/R₀)
  const invT = 1.0 / t0K + (1.0 / beta) * Math.log(r / r0);

  // T°C = (1/T_kelvin) − 273.15
  return 1.0 / invT - 273.15;
}

// ══════════════════════════════════════════════
//  Utility
// ══════════════════════════════════════════════

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
