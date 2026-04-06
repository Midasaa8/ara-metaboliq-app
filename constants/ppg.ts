// PART:   PPG Constants — Default configuration for PPGProcessor
// ACTOR:  Claude Opus 4.6
// PHASE:  12 — PPG Real-time Processing (DPNet Mamba + Peak Detection)
// TASK:   Provide default PPGProcessorConfig values matching Pod hardware specs
// SCOPE:  IN: none | OUT: DEFAULT_PPG_CONFIG constant

import type { PPGProcessorConfig } from '@/types/ppg';

/** Default config matching Pod hardware specs (nRF52840 + MAX86176). */
export const DEFAULT_PPG_CONFIG: PPGProcessorConfig = {
  sampleRate: 25,
  windowSize: 125,           // 5 seconds @ 25 Hz
  minPeakDistanceS: 0.3,     // ≥ 0.3s between beats (max 200 BPM)
  minPeakProminence: 0.1,
  ibiRangeMs: [300, 2000],   // HR 30–200 BPM physiological range
  maxIbiStdMs: 200,
  useDPNet: false,           // Hackathon: false (no model yet); Full product: true
  useEdgeHRModel: false,     // Hackathon: false; Full product: true
};
