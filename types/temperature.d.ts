/**
 * PART:   Temperature Types — data structures for Phase 14 processing
 * ACTOR:  Claude Opus 4.6
 * PHASE:  14 — Temperature Algorithm (NTC Steinhart-Hart)
 * TASK:   Type definitions for TemperatureProcessor
 * SCOPE:  IN: type-only definitions
 *         OUT: algorithm implementations (TemperatureProcessor.ts)
 *
 * Sensor: NTC 10kΩ B=3950 thermistor in voltage divider (R_ref=10kΩ, Vcc=3.3V)
 */

// ══════════════════════════════════════════════
//  Temperature Result Types
// ══════════════════════════════════════════════

/** Result of a single temperature computation. */
export interface TemperatureResult {
  /** Raw skin temperature from Steinhart-Hart (°C). */
  skinTempC: number;
  /** Estimated core temperature: T_core = T_skin + offset (°C). */
  coreTempC: number;
  /** IIR-smoothed core temperature (°C). */
  smoothedTempC: number;
  /** NTC resistance computed from ADC (Ω). */
  ntcResistanceOhm: number;
  /** ADC voltage (V). */
  voltageV: number;
  /** Quality flags. */
  flags: TemperatureQualityFlag[];
  /** Timestamp (Unix ms). */
  timestampMs: number;
}

/** Quality flags for temperature readings. */
export type TemperatureQualityFlag =
  | 'out_of_range'           // Temperature outside [30, 42] °C
  | 'adc_saturated'          // ADC at 0 or 4095
  | 'resistance_invalid'     // NTC resistance outside expected range
  | 'large_delta'            // > 0.5°C jump between consecutive readings
  | 'calibration_drift';     // Drift > tolerance (0.3°C) from reference

/** Configuration for temperature processing. */
export interface TemperatureProcessorConfig {
  /** Reference resistance R_ref in voltage divider (Ω). Default: 10000. */
  rRef: number;
  /** Supply voltage Vcc (V). Default: 3.3. */
  vcc: number;
  /** ADC resolution (bits). Default: 12 → 4096 levels. */
  adcBits: number;
  /** Steinhart-Hart coefficient A. */
  shA: number;
  /** Steinhart-Hart coefficient B. */
  shB: number;
  /** Steinhart-Hart coefficient C. */
  shC: number;
  /** Beta parameter for B-approximation. Default: 3950. */
  beta: number;
  /** NTC nominal resistance at T₀ (Ω). Default: 10000. */
  r0: number;
  /** NTC nominal temperature T₀ (K). Default: 298.15 (25°C). */
  t0K: number;
  /** Skin-to-core offset (°C). Default: 0.7. */
  skinToCoreOffset: number;
  /** IIR smoothing factor (0-1). Default: 0.1 (heavy smoothing). */
  iirAlpha: number;
  /** Use Steinhart-Hart (true) or Beta approximation (false). */
  useSteinhartHart: boolean;
}
