/**
 * PART:   MockHardware — fake sensor data for hackathon demo
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  1 — Project Setup
 * READS:  AGENTS.md §8 Hardware Stubs, constants/hardware.ts
 * TASK:   Implement IHardwareService with realistic mock sensor data
 * SCOPE:  IN: mock data generation, PPG waveform simulation, subscription loop
 *         OUT: real BLE (BLEService.ts Phase 11), real sensor algorithms (Phase 12–15)
 * HARDWARE STATUS: MOCK — real Pod not built yet
 */

import type { IHardwareService, IPatchInfo, ISensorReading } from '@/types/hardware';
import { MOCK_PATCH, SENSOR_BOUNDS } from '@/constants/hardware';

// -- PPG mock generator --
// Simulates realistic PPG morphology: systolic peak + dicrotic notch + diastolic peak
// Source: standard PPG waveform literature — 5 Gaussian components
function generatePPGSample(t: number, hr: number): number {
  const T = 60 / hr; // cardiac period [seconds]
  const phase = (t % T) / T; // normalised phase [0–1]

  // Systolic peak (~t=0.15)
  const systolic = 1.0 * Math.exp(-Math.pow(phase - 0.15, 2) / (2 * 0.003 ** 2));
  // Dicrotic notch (~t=0.35, negative notch)
  const dicrotic = -0.2 * Math.exp(-Math.pow(phase - 0.35, 2) / (2 * 0.002 ** 2));
  // Diastolic peak (~t=0.42)
  const diastolic = 0.4 * Math.exp(-Math.pow(phase - 0.42, 2) / (2 * 0.004 ** 2));
  // Gaussian noise (simulates motion artefact ≈ 2%)
  const noise = (Math.random() - 0.5) * 0.02;

  return systolic + dicrotic + diastolic + noise;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function generateMockReading(): ISensorReading {
  const hr = clamp(
    68 + Math.round((Math.random() - 0.5) * 12),
    SENSOR_BOUNDS.hr.min,
    SENSOR_BOUNDS.hr.max
  );
  const spo2 = clamp(
    97 + Math.round((Math.random() - 0.5) * 4),
    SENSOR_BOUNDS.spo2.min,
    SENSOR_BOUNDS.spo2.max
  );
  const temperature = clamp(
    36.2 + Math.random() * 0.8,
    SENSOR_BOUNDS.temperature.min,
    SENSOR_BOUNDS.temperature.max
  );
  // 5-second PPG buffer at 25 Hz = 125 samples
  const ppgRaw = Array.from({ length: 125 }, (_, i) =>
    generatePPGSample(i / 25, hr)
  );

  return {
    hr,
    spo2,
    temperature,
    ppgRaw,
    imuAccel: {
      x: (Math.random() - 0.5) * 0.05,
      y: (Math.random() - 0.5) * 0.05,
      z: 9.8 + (Math.random() - 0.5) * 0.1,
    },
    timestamp: Date.now(),
    patchId: MOCK_PATCH.id,
    patchSku: MOCK_PATCH.sku,
  };
}

// -- MockHardwareService --

export class MockHardwareService implements IHardwareService {
  private _connected = false;
  private _intervalId: ReturnType<typeof setInterval> | null = null;
  private _listeners: Array<(data: ISensorReading) => void> = [];

  async connect(): Promise<boolean> {
    // Simulate BLE connection delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    this._connected = true;
    console.warn('[MockHardware] Connected to mock patch — real Pod connects in Phase 11');
    return true;
  }

  disconnect(): void {
    this._connected = false;
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
    this._listeners = [];
  }

  subscribe(callback: (data: ISensorReading) => void): () => void {
    this._listeners.push(callback);

    // Start emission loop if not already running (1 Hz tick to listeners)
    if (this._intervalId === null) {
      this._intervalId = setInterval(() => {
        if (!this._connected) return;
        const reading = generateMockReading();
        this._listeners.forEach((cb) => cb(reading));
      }, 1000);
    }

    // Return unsubscribe function
    return () => {
      this._listeners = this._listeners.filter((cb) => cb !== callback);
      if (this._listeners.length === 0 && this._intervalId !== null) {
        clearInterval(this._intervalId);
        this._intervalId = null;
      }
    };
  }

  async getPatchInfo(): Promise<IPatchInfo> {
    // TODO: HARDWARE_INTEGRATION — Phase 16: replace with real BLE advertisement parsing
    //   1. Scan BLE for devices with name startsWith('ARA-PATCH-')
    //   2. Connect and read DeviceInfo characteristic (CHAR_PATCH_ID)
    //   3. Parse SKU (ARA-P1 to ARA-P4) from first 4 bytes
    //   4. Validate patch expiry date from characteristic 0x2A08
    return {
      id:              MOCK_PATCH.id,
      sku:             MOCK_PATCH.sku,
      firmwareVersion: MOCK_PATCH.firmwareVersion,
    };
  }
}

// -- Factory: returns Mock in hackathon, real BLE in production --

let _instance: IHardwareService | null = null;

export function getHardwareService(): IHardwareService {
  if (!_instance) {
    // TODO: HARDWARE_INTEGRATION — Phase 11:
    //   import { BLEService } from './BLEService';
    //   _instance = IS_HACKATHON ? new MockHardwareService() : new BLEService();
    _instance = new MockHardwareService();
  }
  return _instance;
}
