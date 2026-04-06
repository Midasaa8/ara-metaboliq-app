// PART:   Temperature Constants — Default config for TemperatureProcessor
// ACTOR:  Claude Opus 4.6
// PHASE:  14 — Temperature Algorithm (NTC Steinhart-Hart)
// TASK:   Provide default TemperatureProcessorConfig for Pod NTC thermistor
// SCOPE:  IN: none | OUT: DEFAULT_TEMP_CONFIG constant

import type { TemperatureProcessorConfig } from '@/types/temperature';

/**
 * Default config for Pod NTC 10kΩ B=3950 thermistor.
 *
 * Steinhart-Hart coefficients calibrated for B=3950 NTC:
 *   A = 1.009249522e-3
 *   B = 2.378405444e-4
 *   C = 2.019202697e-7
 *
 * Voltage divider: R_ref=10kΩ, Vcc=3.3V, 12-bit ADC.
 */
export const DEFAULT_TEMP_CONFIG: TemperatureProcessorConfig = {
  rRef: 10_000,             // Reference resistor (Ω)
  vcc: 3.3,                 // Supply voltage (V)
  adcBits: 12,              // 12-bit ADC → 4096 levels
  shA: 1.009249522e-3,      // Steinhart-Hart A
  shB: 2.378405444e-4,      // Steinhart-Hart B
  shC: 2.019202697e-7,      // Steinhart-Hart C
  beta: 3950,               // Beta parameter (K)
  r0: 10_000,               // NTC nominal resistance at T₀ (Ω)
  t0K: 298.15,              // T₀ = 25°C in Kelvin
  skinToCoreOffset: 0.7,    // Empirical patch skin→core offset (°C)
  iirAlpha: 0.1,            // IIR: T_f(t) = 0.1×T_raw + 0.9×T_f(t-1)
  useSteinhartHart: true,   // Use S-H (more accurate) over Beta approx
};
