/**
 * PART:   Constants — Hardware configuration
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  1 — Project Setup
 * TASK:   BLE UUIDs, sensor config, hackathon flag
 * SCOPE:  IN: hardware constants only
 *         OUT: BLE logic (BLEService.ts Phase 11), mock data (MockHardware.ts)
 */

// IS_HACKATHON controls Mock vs Real hardware throughout the app
// Phase 11: set to false to enable real BLE
export const IS_HACKATHON = true; // TODO: HARDWARE_INTEGRATION — Phase 11: set false for production

export const BLE = {
  ADVERTISEMENT_NAME_PREFIX: 'ARA-PATCH-',
  SERVICE_UUID:               '0000ARA1-0000-1000-8000-00805F9B34FB',
  CHAR_SENSOR_DATA:           '0000ARA2-0000-1000-8000-00805F9B34FB',
  CHAR_PATCH_ID:              '0000ARA3-0000-1000-8000-00805F9B34FB',
  CHAR_BATTERY:               '0000ARA4-0000-1000-8000-00805F9B34FB',
  SCAN_TIMEOUT_MS:            10_000,
  CONNECT_TIMEOUT_MS:         15_000,
  SAMPLE_RATE_HZ:             25,
  BUFFER_SIZE:                256, // samples
} as const;

// Sensor valid physiological ranges — reject readings outside these
export const SENSOR_BOUNDS = {
  hr:          { min: 30,   max: 220  }, // BPM
  spo2:        { min: 70,   max: 100  }, // %
  temperature: { min: 30.0, max: 42.0 }, // °C
  ibi:         { min: 300,  max: 2000 }, // ms (HR 30–200 BPM)
} as const;

export const MOCK_PATCH = {
  id:              'ARA-MOCK-0001',
  sku:             'ARA-P4' as const,
  firmwareVersion: '1.0.0-mock',
} as const;
