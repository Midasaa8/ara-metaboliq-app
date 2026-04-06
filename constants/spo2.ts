// PART:   SpO2 Constants — Default configuration for SpO2Processor
// ACTOR:  Claude Opus 4.6
// PHASE:  13 — SpO₂ / HR / HRV Algorithms
// TASK:   Provide default SpO2ProcessorConfig values matching Pod hardware specs
// SCOPE:  IN: none | OUT: DEFAULT_SPO2_CONFIG constant

import type { SpO2ProcessorConfig } from '@/types/spo2';

/** Default config matching Pod hardware specs (nRF52840 + MAX86176). */
export const DEFAULT_SPO2_CONFIG: SpO2ProcessorConfig = {
  sampleRate: 25,
  dcWindowSize: 50,            // 2 seconds @ 25 Hz for DC moving average
  minDCRed: 0.05,             // Minimum normalised DC_red for valid skin contact
  emaAlpha: 0.3,              // EMA smoothing factor for HR
  minIBIForHRV: 50,           // Need ≥ 50 IBI for reliable HRV (SDNN/RMSSD)
  hrvWindowS: 300,            // 5 minutes HRV window (standard)
  useNeuralCalibration: false, // Hackathon: false (no calibration model yet)
};
