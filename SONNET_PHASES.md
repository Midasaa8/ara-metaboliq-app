# CLAUDE SONNET 4.6 — ARA MetaboliQ | Nhiệm vụ theo Phase

> **Mày là ai**: Claude Sonnet 4.6 — Primary Coder (80% công việc trong dự án)  
> **Thế mạnh**: React Native TypeScript, API integration, Zustand, hooks, CRUD nhanh  
> **Nguyên tắc cứng**: Đọc `project-docs/AGENTS.md` trước. Code trên skeleton Gemini đã làm. KHÔNG tự ý viết UI layout.

---

## ⚡ QUY TẮC BẮT BUỘC

```
1. Mọi file mới BẮT BUỘC có PARTS header comment
2. Mọi truy cập hardware → HardwareService.ts (KHÔNG BLEService trực tiếp)
3. Mọi API call → qua APIClient.ts (KHÔNG bare fetch())
4. Health Score → KHÔNG tính trên client, gọi server POST /health/score
5. Màu sắc → theme.ts (KHÔNG hardcode hex) — dùng lightColors / darkColors
6. File tối đa 200 dòng — tách nếu vượt
7. Không bao giờ console.log giá trị health data
8. TypeScript strict — không để any không có comment
9. Theme DUAL MODE: Light (default) + Dark (tùy chọn)
   - Light: nền #F8FAFB, accent Blue #2563EB + Green #059669
   - Dark: KHÔNG #000000/#FFFFFF, nền #181818, accent desaturated #60A5FA/#34D399
   - Khi cần màu → import { lightColors, darkColors } from 'constants/theme'
10. FIRMWARE (C/Zephyr trên nRF52840) → Opus Phase 18-19 viết.
    Sonnet CHỈ viết phone-side BLE client. KHÔNG viết driver SPI/I2C/ADC/PDM.
    BLE packet format 20-byte → xem Opus Phase 18 GATT spec.
```

---

## ── HACKATHON (Phase 1–10) ──

---

### PHASE 1 — Expo Project Setup + Dependencies

**Mày làm sau khi Gemini tạo xong constants/ và types/**

**Lệnh khởi tạo:**
```bash
npx create-expo-app@latest ara-metaboliq-app --template blank-typescript
cd ara-metaboliq-app
```

**Cài dependencies:**
```bash
npx expo install expo-router expo-camera expo-av react-native-ble-plx
npx expo install zustand @tanstack/react-query axios
npm install nativewind tailwindcss
npm install victory-native react-native-svg
npm install @react-native-async-storage/async-storage
```

**File cần tạo:**

**`services/api/APIClient.ts`:**
```typescript
/**
 * PART:   APIClient — HTTP client singleton
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  1 — Project Setup
 * TASK:   Axios instance with auth interceptor, retry, error handling
 * SCOPE:  IN: base URL, auth header injection, 401 refresh flow, retry × 3
 *         OUT: business logic, response parsing (each API file does that)
 */
import axios from 'axios';
import { API_BASE_URL } from '@/constants/api';

const APIClient = axios.create({ baseURL: API_BASE_URL, timeout: 10000 });

// Request interceptor: inject Bearer token
APIClient.interceptors.request.use(async (config) => {
  const token = await getAccessToken(); // from sessionStore
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: handle 401 → refresh → retry
APIClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      // TODO(Claude Sonnet - Phase 20): refresh token flow
    }
    return Promise.reject(err);
  }
);

export default APIClient;
```

**`constants/api.ts`:**
```typescript
/**
 * PART:   Constants — API endpoints
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  1 — Project Setup
 */
export const API_BASE_URL = __DEV__
  ? 'http://localhost:8000'
  : 'https://api.ara-metaboliq.com';  // TODO: replace với production URL

export const ENDPOINTS = {
  health:     { score: '/health/score', readings: '/health/readings', history: '/health/history' },
  voice:      { analyze: '/voice/analyze' },
  sleep:      { last: '/sleep/last-night', history: '/sleep/history' },
  nutrition:  { scan: '/nutrition/scan', history: '/nutrition/history' },
  insurance:  { premium: '/insurance/premium', discount: '/insurance/discount' },
  auth:       { login: '/auth/login', refresh: '/auth/refresh', logout: '/auth/logout' },
};
```

**`constants/hardware.ts`:**
```typescript
/**
 * PART:   Constants — Hardware configuration
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  1 — Project Setup
 */
export const BLE = {
  ADVERTISEMENT_NAME_PREFIX: 'ARA-PATCH-',
  SERVICE_UUID:               '0000ARA1-0000-1000-8000-00805F9B34FB',
  CHAR_SENSOR_DATA:           '0000ARA2-0000-1000-8000-00805F9B34FB',
  CHAR_PATCH_ID:              '0000ARA3-0000-1000-8000-00805F9B34FB',
  CHAR_BATTERY:               '0000ARA4-0000-1000-8000-00805F9B34FB',
  SAMPLE_RATE_HZ:             25,
  BUFFER_SIZE:                256,   // samples
};
```

**`services/hardware/MockHardware.ts`:**
```typescript
/**
 * PART:   MockHardware — fake sensor data for hackathon demo
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  1 — Project Setup
 * TASK:   Implement IHardwareService with realistic mock data
 * SCOPE:  IN: mock data generation, PPG waveform simulation
 *         OUT: real BLE (Phase 11), real sensor algorithms (Phase 12-15)
 * HARDWARE STATUS: MOCK — real Pod not built yet
 */
export class MockHardware implements IHardwareService {
  // PPG mock: 5 Gaussian peaks (systolic + dicrotic notch + diastolic)
  generatePPGSample(t: number, hr: number): number {
    const T = 60 / hr;  // period in seconds
    const phase = (t % T) / T;
    const systolic  =  1.0 * Math.exp(-Math.pow((phase - 0.15), 2) / (2 * 0.003**2));
    const dicrotic  = -0.2 * Math.exp(-Math.pow((phase - 0.35), 2) / (2 * 0.002**2));
    const diastolic =  0.4 * Math.exp(-Math.pow((phase - 0.42), 2) / (2 * 0.004**2));
    const noise = (Math.random() - 0.5) * 0.02;
    return systolic + dicrotic + diastolic + noise;
  }

  async getSensorReading(): Promise<ISensorReading> {
    console.warn('[MockHardware] Using mock — real Pod connects Phase 11');
    return {
      hr: 68 + Math.round(Math.random() * 12),
      spo2: 97 + Math.round(Math.random() * 2),
      temperature: 36.2 + Math.random() * 0.8,
      ppgRaw: Array.from({ length: 125 }, (_, i) => this.generatePPGSample(i / 25, 72)),
      imuAccel: { x: 0, y: 0, z: 9.8 },
      timestamp: Date.now(),
      patchId: 'ARA-MOCK-0001',
    };
  }

  // TODO: HARDWARE_INTEGRATION — Phase 11:
  //   1. Replace with real BLE scan for 'ARA-PATCH-' prefix
  //   2. Subscribe to CHAR_SENSOR_DATA characteristic notifications
  //   3. Parse 20-byte packet: [hr:2][spo2:1][temp:4][ppg:12][imu:6] (little-endian)
  async connect(): Promise<boolean> { return true; }
  async disconnect(): Promise<void> {}
  isConnected(): boolean { return true; }
}
```

**`store/healthStore.ts`:**
```typescript
/**
 * PART:   Zustand — Health data store
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  1 — Project Setup
 */
import { create } from 'zustand';
interface HealthStore {
  healthScore: number;
  vitals: { hr: number; spo2: number; temperature: number; rr: number };
  lastVoiceAnalysis: VoiceAnalysis | null;
  setHealthScore: (score: number) => void;
  setVitals: (v: HealthStore['vitals']) => void;
  setVoiceAnalysis: (v: VoiceAnalysis) => void;
}
export const useHealthStore = create<HealthStore>((set) => ({
  healthScore: 0,
  vitals: { hr: 0, spo2: 0, temperature: 0, rr: 0 },
  lastVoiceAnalysis: null,
  setHealthScore: (score) => set({ healthScore: score }),
  setVitals: (vitals) => set({ vitals }),
  setVoiceAnalysis: (v) => set({ lastVoiceAnalysis: v }),
}));
```

---

### PHASE 2 — Navigation & Tab Shell (logic)

**Mày làm**: Connect Gemini skeleton screens với Expo Router file routing.

**`app/_layout.tsx`:**
```typescript
/**
 * PART:   Root Layout — auth check + providers
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  2 — Navigation
 * TASK:   Wrap app with QueryClientProvider + Zustand, check auth → redirect
 */
```

- Wrap với `QueryClientProvider` (React Query)
- Load `sessionStore` → nếu không có token → redirect `/onboarding`
- Inject NativeWind className resolver

**`app/(tabs)/_layout.tsx`:**
```typescript
/**
 * PART:   Tab Navigator — bottom tab bar config
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  2 — Navigation
 */
```

- 5 tabs theo thứ tự: Home, Voice, Exercise, Twin, Insurance
- `unmountOnBlur: false` — giữ state khi chuyển tab
- `lazy: true` — chỉ render khi vào lần đầu

---

### PHASE 3 — Home Dashboard Logic

**Mày làm**: Fill logic trên Gemini skeleton `app/(tabs)/index.tsx`

**`services/api/healthAPI.ts`:**
```typescript
/**
 * PART:   Health API service
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  3 — Home Dashboard
 * TASK:   getScore(), getLatestReading(), getHistory(days)
 */
export const healthAPI = {
  getScore: () => APIClient.post<{ score: number; sub_scores: SubScores }>(ENDPOINTS.health.score),
  getLatestReading: () => APIClient.get<HealthData>(ENDPOINTS.health.readings),
  getHistory: (days: number) => APIClient.get(ENDPOINTS.health.history, { params: { days } }),
};
```

**`hooks/useHealthScore.ts`:**
```typescript
/**
 * PART:   useHealthScore hook
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  3 — Home Dashboard
 */
export function useHealthScore() {
  return useQuery({
    queryKey: ['health-score'],
    queryFn: () => healthAPI.getScore().then(r => r.data),
    staleTime: 60_000,   // re-fetch every 60s
    refetchInterval: 300_000,
  });
}
```

**`hooks/usePatchConnection.ts`:**
```typescript
/**
 * PART:   usePatchConnection — abstracts Mock vs Real BLE
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  3 — Home Dashboard
 */
// Returns same interface whether using MockHardware or BLEService
// Phase 11: swap MockHardware for BLEService here — screens unchanged
```

---

### PHASE 4 — Voice AI Recording Logic

**Mày làm**: Recording + API call trên Gemini skeleton `voice.tsx`

**`hooks/useVoiceRecorder.ts`:**
```typescript
/**
 * PART:   useVoiceRecorder — record audio, check quality, send to API
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  4 — Voice AI Module
 * TASK:   Start/stop recording (Expo AV), compute basic SNR, call voiceAPI
 * SCOPE:  IN: recording lifecycle, SNR pre-check, API call, state management
 *         OUT: MFCC extraction (Claude Opus Phase 4 in VoiceAI.ts)
 *              XGBoost inference (runs server-side via voiceAPI)
 */
```

**`services/api/voiceAPI.ts`:**
```typescript
/**
 * PART:   Voice API service
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  4 — Voice AI Module
 */
export const voiceAPI = {
  analyze: (audioBase64: string, sampleRate: number) =>
    APIClient.post<VoiceAnalysis>(ENDPOINTS.voice.analyze, {
      audio: audioBase64,
      sample_rate: sampleRate,
      duration_ms: 5000,
    }),
};
```

**Flow trong voice.tsx:**
```
User taps REC → useVoiceRecorder.start()
     → 5 giây → auto stop
     → SNR check (reject < 10dB → show "Try again in quiet environment")
     → API POST /voice/analyze
     → show results: class + confidence + flags
     → save to healthStore.setVoiceAnalysis()
     → trigger healthScore re-fetch (invalidate 'health-score' query)
```

---

### PHASE 5 — Exercise Tracker Logic

**`services/ai/PoseDetector.ts`:**
```typescript
/**
 * PART:   PoseDetector — MediaPipe Pose wrapper
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  5 — Exercise Tracker
 * TASK:   Wrapper around react-native-mediapipe, extract 33 landmarks
 */
```

**`hooks/useRepCounter.ts`:**
```typescript
/**
 * PART:   useRepCounter — state machine for rep counting
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  5 — Exercise Tracker
 * TASK:   DOWN→UP state machine + angle calc using MediaPipe landmarks
 *
 * Angle formula (từ Tong_Hop_Thuat_Toan doc #6):
 *   θ = arccos(v1·v2 / (|v1|·|v2|)) × 180/π
 *   v1 = B - A;  v2 = C - A  (joint at A, endpoints B and C)
 */
const angleThresholds: Record<ExerciseType, { low: number; high: number }> = {
  squat:          { low: 90,  high: 160 },
  bicep_curl:     { low: 40,  high: 160 },
  push_up:        { low: 90,  high: 160 },
  shoulder_press: { low: 80,  high: 160 },
};
```

---

### PHASE 6 — Sleep Tracker Logic

**`services/api/sleepAPI.ts`:**
```typescript
/**
 * PART:   Sleep API service
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  6 — Sleep Tracker
 */
export const sleepAPI = {
  getLastNight: () => APIClient.get<SleepData>(ENDPOINTS.sleep.last),
  getHistory:   (days: number) => APIClient.get(ENDPOINTS.sleep.history, { params: { days } }),
};
```

**twin.tsx logic:**
- Fetch sleep data on mount, populate Gemini's chart component
- SDNN HRV từ `data.hrv_sdnn` trả về từ server
- Show ChronoOS prediction từ `data.predicted_tomorrow_score`

---

### PHASE 7 — Nutrition Scanner Logic

**`services/core/NutritionScanner.ts`:**
```typescript
/**
 * PART:   NutritionScanner — camera capture + GPT-4o call
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  7 — Nutrition Scanner
 * TASK:   captureReceipt(), compress to JPEG 85%, call /nutrition/scan
 * SCOPE:  IN: image capture, compression, API call, Z-score anomaly display
 *         OUT: GPT-4o prompt engineering (server handles this)
 */
```

**Z-score anomaly display** (formula từ Tong_Hop_Thuat_Toan doc #20):
```typescript
// zᵢ = (xᵢ - μ_market) / σ_market
// Server returns z_score per item → Sonnet just displays badge
const getAnomalyBadge = (z: number) => {
  if (z > 2.0) return { color: 'red',    label: '🔴 Bất thường' };
  if (z > 1.5) return { color: 'yellow', label: '🟡 Cảnh báo' };
  return           { color: 'green',  label: '✅ Hợp lý' };
};
```

---

### PHASE 8 — Health Score Engine (client side)

**`services/ai/HealthScore.ts`:**
```typescript
/**
 * PART:   HealthScore — client-side display only (score computed server-side)
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  8 — Health Score Engine
 * TASK:   Call POST /health/score, store result, display breakdown
 * SCOPE:  IN: API call, Zustand update, animated ring trigger
 *         OUT: actual formula computation (SERVER-SIDE ONLY — Phase 19 FastAPI)
 *
 * SECURITY: NEVER compute H_score on client. Always POST to server.
 *           H_score = 0.25E + 0.20S + 0.25V + 0.15N + 0.15D (hackathon)
 *           Server validates all sub-scores before computing.
 */
```

---

### PHASE 9 — Insurance / HSA Calculator Logic

**`services/core/InsuranceCalc.ts`:**
```typescript
/**
 * PART:   InsuranceCalc — actuarial model display
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  9 — Insurance / HSA
 * TASK:   Call /insurance/premium, display discount, HSA projection
 *
 * Formulas từ Tong_Hop_Thuat_Toan doc:
 *   Premium = Base × AgeFactor × (1 - Discount)
 *   Discount = min(S/100 × 0.30, 0.30)
 *   HSA Monthly = base_rate × H_factor
 */
```

**`services/api/insuranceAPI.ts`:**
```typescript
/**
 * PART:   Insurance API service
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  9 — Insurance / HSA
 */
export const insuranceAPI = {
  getPremium:  () => APIClient.get(ENDPOINTS.insurance.premium),
  getDiscount: () => APIClient.get(ENDPOINTS.insurance.discount),
};
```

---

### PHASE 10 — Mock BLE Data + Hackathon Polish

**`components/health/PPGWaveform.tsx`:**
```typescript
/**
 * PART:   PPGWaveform — real-time PPG chart
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  10 — Hackathon Polish
 * TASK:   Scrolling line chart of PPG raw data, 25Hz feed from MockHardware
 * SCOPE:  IN: chart rendering, mock data subscription
 *         OUT: real BLE data (Phase 12)
 * HARDWARE STATUS: MOCK — PPG generated by MockHardware.generatePPGSample()
 */
```

Hackathon demo checklist (Sonnet thực hiện):
- [ ] Mock patch connected status on Home screen
- [ ] PPG waveform animates on home dashboard
- [ ] All 5 tabs load without crash
- [ ] Health Score ring animates on app open
- [ ] Voice AI shows result card (even if mock)
- [ ] Exercise counter increments on tap

---

### PHASE 11 — Dual Theme Logic + useTheme Hook

**Mày làm gì**: Tạo hook `useTheme()` cho Gemini Phase 11. Implement context, persist preference, follow system.

**File 1:** `hooks/useTheme.ts`
**File 2:** `contexts/ThemeContext.tsx`

```typescript
/**
 * PART:   useTheme hook — dual mode switching
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  11 — Dual Theme Logic
 * TASK:   ThemeProvider, useTheme(), persist preference to AsyncStorage
 * SCOPE:  IN: theme context, toggle function, system preference detection
 *         OUT: visual tokens (Gemini Phase 11 provides lightColors/darkColors)
 */

// useTheme() returns:
// { colors, isDark, toggle, setMode('light'|'dark'|'system') }
// Default: 'system' → follow OS preference
// Persist: AsyncStorage key 'ara_theme_mode'
```

---

### PHASE 12 — Integration Testing + End-to-End Flow

**Mày làm gì**: Kết nối tất cả screens. Đảm bảo navigate Home → Voice → Exercise → Twin → Fintech không crash.

```typescript
/**
 * PART:   Integration — wire all screens together
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  12 — Integration Test
 * TASK:   
 *   1. Home screen calls useHealthScore() → displays real mock score
 *   2. Voice tab: record → send to voiceAPI → show result
 *   3. Exercise tab: select exercise → start → see counter
 *   4. Twin tab: fetch sleep data → display timeline
 *   5. Fintech tab: fetch premium → show discount
 *   All navigation smooth, no white screen, no crash
 */
```

**Checklist:**
- [ ] Home: HealthScoreRing animates, VitalCards show HR/SpO2/Temp
- [ ] Voice: 5s record → result card with 4 scores
- [ ] Exercise: tap exercise → camera placeholder → tap count reps
- [ ] Twin: sleep bars render, HRV number displayed
- [ ] Fintech: premium number + discount bar + HSA projection
- [ ] Tab switching < 300ms, no flicker
- [ ] Back gestures work correctly on all screens
- [ ] Onboarding → Home transition works

---

### PHASE 13 — Demo Data Seeding + Mock AI Responses

**Mày làm gì**: Tạo realistic demo data cho ngày thi. KHÔNG dùng random — dùng dữ liệu hardcoded đẹp.

**File:** `services/demo/DemoDataSeeder.ts`

```typescript
/**
 * PART:   DemoDataSeeder — hardcoded beautiful demo data
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  13 — Demo Data
 * TASK:   Seed stores with curated data for stage demo
 * 
 * Data cần seed:
 *   - Health Score: 78 (con số trong PLAN_B demo flow)
 *   - HR: 72 BPM, SpO2: 98%, Temp: 36.5°C
 *   - Voice AI result: Burnout 12%, Anxiety 38%, Energy 76%, Recovery 82%
 *   - Sleep: 7h20m total, 1h40m deep, 1h25m REM
 *   - HRV SDNN: 42ms
 *   - Streak: 5 ngày liên tục
 *   - Insurance premium: ₫450,000/mo, discount 18%
 *   - HSA balance: ₫12,500,000
 *
 * IMPORTANT: DemoDataSeeder.activate() chỉ bật qua secret gesture
 *            (triple-tap version text ở Settings)
 */
```

---

### PHASE 14 — Error Handling + Crash Guard Logic

**File 1:** `services/core/ErrorReporter.ts` — log crash info
**File 2:** `hooks/useNetworkStatus.ts` — detect online/offline

```typescript
/**
 * PART:   Error handling — crash guard for demo day
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  14 — Error Guard
 * TASK:   
 *   1. ErrorReporter: catch unhandled errors, log to AsyncStorage
 *   2. useNetworkStatus: NetInfo → show OfflineBanner (Gemini Phase 13)
 *   3. API fallback: if server unreachable → use cached data from Zustand
 *   4. Voice API timeout: 10s → show "Server bận, thử lại sau"
 */
```

---

## ── FULL PRODUCT (Phase 15–24) ──

---

### PHASE 15 — BLE Hardware Layer

> **⚠️ DEPENDENCY**: Phase này nhận data từ **firmware nRF52840** (Opus Phase 18-19).  
> Firmware viết bằng **C + Zephyr RTOS**, chạy trên Pod chip, truyền data qua BLE GATT.  
> Sonnet CHỈ viết **phone-side BLE client** (React Native) — KHÔNG viết firmware.  
> Giao thức phần cứng (SPI, I2C, ADC, PDM) → xem Opus Phase 19.

**File:** `services/hardware/BLEService.ts`

```typescript
/**
 * PART:   BLEService — real BLE scan + connect + subscribe
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  11 — BLE Hardware Layer
 * TASK:   Implement IHardwareService using react-native-ble-plx
 * SCOPE:  IN: BLE lifecycle, GATT subscribe, packet parser
 *         OUT: sensor algorithms (Claude Opus Phase 12-15)
 *
 * TODO: HARDWARE_INTEGRATION — Phase 11:
 *   1. Scan for device with name startsWith('ARA-PATCH-')
 *   2. Connect to SERVICE_UUID (constants/hardware.ts)
 *   3. Subscribe to CHAR_SENSOR_DATA notifications
 *   4. Parse 20-byte packet every 40ms (25Hz):
 *      bytes 0-1:  HR uint16 little-endian (×0.1 = BPM)
 *      byte  2:    SpO₂ uint8 (%)
 *      bytes 3-6:  Temperature float32
 *      bytes 7-18: PPG int16[6] (last 6 samples)
 *      bytes 19:   IMU flags bitfield
 */
```

---

### PHASE 18 — BP Clip Integration

**File:** `services/hardware/BPClipService.ts`

```typescript
/**
 * PART:   BPClipService — wired BP clip via 3.5mm TRRS
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  15 — BP Clip Integration
 *
 * TODO: HARDWARE_INTEGRATION — Phase 15:
 *   1. Detect TRRS audio jack insertion (AudioSession)
 *   2. Read analog signal from microphone channel (opus calculates PTT)
 *   3. PTT = T_finger - T_arm (milliseconds)
 *   4. SBP = a - b·PTT  (coefficients from personal calibration)
 */
```

---

### PHASE 19 — Patch Recognition

**File:** `services/hardware/PatchDevice.ts`

```typescript
/**
 * PART:   PatchDevice — BLE advertisement → patch SKU recognition
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  16 — Patch Hardware Detection
 *
 * TODO: HARDWARE_INTEGRATION — Phase 16:
 *   1. Parse BLE advertisement manufacturer data
 *   2. Byte 0: product family (0x01 = ARA Patch)
 *   3. Byte 1: SKU (0x01=P1 Quick, 0x02=P2 Daily, 0x03=P3 Comfort, 0x04=P4 Pro)
 *   4. Bytes 2-3: days remaining adhesive
 *   5. Display patch model + remaining life in patch-connect.tsx
 */
```

---

### PHASE 22 — FastAPI Backend

**Folder:** `/backend/` (riêng với app, deploy lên VPS)

```python
# PART:   FastAPI Backend — all non-algorithm endpoints
# ACTOR:  Claude Sonnet 4.6
# PHASE:  19 — FastAPI Backend Full
# TASK:   All CRUD endpoints, TimescaleDB ingest, Redis cache
# SCOPE:  IN: HTTP layer, DB queries, cache logic
#         OUT: ML inference (Claude Opus Phase 17-18 handles algorithms server-side)
```

Endpoints Sonnet tạo:
```
POST /health/score      → compute và cache H_score (formula logic do Opus viết)
GET  /health/readings   → latest sensor reading từ TimescaleDB
GET  /sleep/last-night  → sleep data với SDNN
POST /voice/analyze     → nhận audio → gọi VoiceAI.ts (Opus viết) → return result
POST /nutrition/scan    → nhận image → gọi GPT-4o API → return nutrition
GET  /insurance/premium → compute premium từ H_score + age
POST /auth/login        → bcrypt verify → JWT issue (security thêm Phase 20)
```

**Redis cache pattern:**
```python
@cache(ttl=3600)  # health_score overview — 1 hour
@cache(ttl=300)   # latest readings — 5 minutes  
@cache(ttl=0)     # voice analysis — no cache (mỗi lần khác nhau)
```

---

## ── KHÔNG BAO GIỜ ──

- Implement MFCC, XGBoost, LSTM, Beer-Lambert, NTC formula → Opus làm
- Implement AES-256-GCM, bcrypt, mTLS, DP → Opus làm (Phase 20)
- Compute Health Score trên client
- Tự ý thay đổi UI Gemini đã làm
- Gọi BLEService trực tiếp từ screen
- Log health data vào console

---

*SONNET_PHASES.md — ARA MetaboliQ App | Primary Coder — logic, API, hooks, CRUD*
