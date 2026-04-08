# GEMINI 3.1 — ARA MetaboliQ | Nhiệm vụ theo Phase

> **Mày là ai**: Gemini 3.1 (Gemini 3.1 Pro) — UI Conversion Specialist + Codebase Reviewer  
> **Thế mạnh**: Đọc ảnh mockup, context dài 1M token, sinh component nhanh  
> **Nguyên tắc cứng**: Đọc file `project-docs/AGENTS.md` trước. KHÔNG có mockup = KHÔNG code screen.

---

## ⚡ LUỒNG LÀM VIỆC BẮT BUỘC

```
User gửi ảnh mockup
     ↓
Bước 1: Mô tả mockup (layout, màu, component, interaction)
     ↓
Bước 2: Map màu → constants/theme.ts (KHÔNG hardcode hex)
     ↓
Bước 3: Sinh component với PARTS header + TODO placeholders
     ↓
Bước 4: Gửi file cho Claude Sonnet fill logic
```

---

## ── HACKATHON (Phase 1–10) ──

---

### PHASE 1 — Project Architecture Shell

**Mày làm gì**: Sinh skeleton toàn bộ file/folder theo cấu trúc dưới. Chưa cần logic.

**File cần tạo:**
```
ara-metaboliq-app/
├── constants/
│   └── theme.ts           ← QUAN TRỌNG NHẤT: màu, font, spacing từ mockup
├── types/
│   ├── health.d.ts
│   ├── hardware.d.ts
│   └── api.d.ts
└── assets/
    └── mockups/            ← để ảnh mockup vào đây
```

**PARTS Header cho theme.ts:**
```typescript
/**
 * PART:   Constants — Theme (Single Source of Truth)
 * ACTOR:  Gemini 3.1
 * PHASE:  1 — Project Setup
 * TASK:   Healthcare dual-mode color system (Light default + Dark option)
 * SCOPE:  IN: visual tokens only
 *         OUT: logic, API, business rules
 * READS:  PLAN_B_HACKATHON.md §XI Design Language
 */
```

**QUY TẮC MÀU SẮC Y TẾ:**
```
1. LIGHT MODE (mặc định): Nền trắng/xám nhạt + Blue/Green = tin cậy + chữa lành
2. DARK MODE: TUYỆT ĐỐI KHÔNG dùng #000000 (đen tuyền) + #FFFFFF (trắng tinh)
   - Nền: xám sẫm (#181818, #1E1E1E, #2C2C2C)
   - Chữ: trắng ngà (#E4E4E4, #F5E8D8) — KHÔNG #FFFFFF
   - Accent: giảm bão hòa 20 điểm so với Light Mode
3. App phải có cả 2 mode, Light là default
```

**theme.ts phải chứa:**
```typescript
// ── LIGHT MODE (default) ──
export const lightColors = {
  background:      '#F8FAFB', // Snow — nền chính
  surface:         '#FFFFFF', // White — card, modal
  surfaceElevated: '#F1F5F9', // Fog — input, inner card
  primary:         '#2563EB', // Trust Blue — CTA, active
  secondary:       '#059669', // Heal Green — health positive
  tertiary:        '#93C5FD', // Sky — score ring glow
  text: { primary: '#1E293B', secondary: '#64748B', muted: '#CBD5E1' },
  health: { good: '#10B981', warning: '#D97706', danger: '#DC2626', info: '#2563EB' },
  border:          '#E2E8F0', // Pearl
  gradients: {
    scoreRing:    ['#2563EB', '#059669'],
    cta:          ['#2563EB', '#1D4ED8'],
    aiProcessing: ['#2563EB', '#93C5FD'],
    dangerZone:   ['#DC2626', '#B91C1C'],
  },
};

// ── DARK MODE ──
// QUY TẮC: KHÔNG #000000, KHÔNG #FFFFFF, accent giảm bão hòa 20 điểm
export const darkColors = {
  background:      '#181818', // Deep Grey — KHÔNG đen tuyền
  surface:         '#1E1E1E', // Card Dark
  surfaceElevated: '#2C2C2C', // Elevated
  primary:         '#60A5FA', // Soft Blue (desaturated)
  secondary:       '#34D399', // Soft Teal (desaturated)
  tertiary:        '#A8DADC', // Pastel Cyan
  text: { primary: '#E4E4E4', secondary: '#A1A1AA', muted: '#52525B' },
  health: { good: '#6EE7B7', warning: '#FCD34D', danger: '#FCA5A5', info: '#60A5FA' },
  border:          '#3F3F46', // Graphite
  gradients: {
    scoreRing:    ['#60A5FA', '#34D399'],
    cta:          ['#60A5FA', '#3B82F6'],
    aiProcessing: ['#60A5FA', '#A8DADC'],
    dangerZone:   ['#FCA5A5', '#F87171'],
  },
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 8, md: 16, lg: 24, full: 9999 };
export const fonts = { regular: 'Inter-Regular', medium: 'Inter-Medium', bold: 'SpaceGrotesk-Bold', sizes: { xs:10, sm:12, md:14, lg:16, xl:20, xxl:28 } };
```

**types/health.d.ts phải có:**
```typescript
export interface HealthData {
  healthScore: number;          // 0-100
  hr: number;                   // BPM
  spo2: number;                 // %
  temperature: number;          // °C
  ppgRaw: number[];             // 25Hz buffer
  timestamp: number;
}
export interface SleepData { totalMin: number; deepMin: number; stages: SleepStage[]; }
export interface VoiceAnalysis { class: string; confidence: number; flags: string[]; }
```

---

### PHASE 2 — Navigation & Tab Shell

**Mày làm gì**: Sinh skeleton 5 tab screens + root layout. Chưa có nội dung, chỉ cần mount và navigate được.

**File cần tạo:**
```
app/
├── _layout.tsx            ← Root layout, Stack navigator
├── (tabs)/
│   ├── _layout.tsx        ← Tab navigator (5 tabs)
│   ├── index.tsx          ← Home (skeleton)
│   ├── voice.tsx          ← Voice AI (skeleton)
│   ├── exercise.tsx       ← Exercise (skeleton)
│   ├── twin.tsx           ← Twin/Sleep (skeleton)
│   └── fintech.tsx        ← Insurance (skeleton)
├── patch-connect.tsx      ← Patch connection screen (skeleton)
└── onboarding.tsx         ← First run (skeleton)
```

**PARTS Header cho mỗi file tab:**
```typescript
/**
 * PART:   [Tab Name] Screen — navigation skeleton
 * ACTOR:  Gemini 3.1
 * PHASE:  2 — Navigation Shell
 * TASK:   Mount empty screen with correct tab icon and title
 * SCOPE:  IN: shell layout, tab bar visual
 *         OUT: any content, API, logic (Phase 3+)
 */
```

**Tab config (app/(tabs)/_layout.tsx):**
- Tab 1: `index` — icon `home`, label "Home"
- Tab 2: `voice` — icon `mic`, label "Voice AI"  
- Tab 3: `exercise` — icon `activity`, label "Exercise"
- Tab 4: `twin` — icon `heart`, label "Twin"
- Tab 5: `fintech` — icon `shield`, label "Insurance"

---

### PHASE 3 — Home Dashboard Screen

**Input cần có**: Ảnh mockup Home Dashboard từ user  
**Mày làm gì**: Mockup → Component với skeleton states

**File cần tạo:** `app/(tabs)/index.tsx`

**PARTS Header:**
```typescript
/**
 * PART:   Home Dashboard Screen — visual shell from mockup
 * ACTOR:  Gemini 3.1
 * PHASE:  3 — Home Dashboard
 * SOURCE: Mockup image [date user sends]
 * TASK:   Full UI from mockup. Health score ring, vitals row, daily summary cards.
 * SCOPE:  IN: layout, NativeWind, skeleton loader, mock data display
 *         OUT: useHealthScore() hook (Claude Sonnet Phase 3)
 *              real API call (Claude Sonnet Phase 3)
 */
```

**UI elements phải có (từ mockup ARA):**
```typescript
// Layout từ trên xuống:
// 1. Header: avatar user + "Good morning [name]" + notification bell
// 2. HEALTH SCORE RING: animated circular progress (0-100), số lớn ở giữa
// 3. VITALS ROW: HR | SpO₂ | Temp | RR — 4 card ngang
// 4. TODAY'S MODULES: Voice, Exercise, Sleep, Nutrition — 4 tile vuông
// 5. PATCH STATUS: "ARA Pod Connected" / "No Device"
// 6. QUICK INSIGHTS: mini chart + 1 insight text

// Mock data (thay thật sau):
const mockHealthScore = 82;
const mockVitals = { hr: 72, spo2: 98, temp: 36.5, rr: 16 };
```

**TODO placeholders bắt buộc:**
```typescript
{/* TODO(Claude Sonnet - Phase 3): Replace mockHealthScore with useHealthScore() hook */}
{/* TODO(Claude Sonnet - Phase 3): Replace mockVitals with usePatchConnection() data */}
{/* TODO(Claude Sonnet - Phase 8): Health score computed server-side via healthAPI.getScore() */}
```

---

### PHASE 4 — Voice AI Screen UI

**Input cần có**: Ảnh mockup Voice AI screen  
**File:** `app/(tabs)/voice.tsx`

**PARTS Header:**
```typescript
/**
 * PART:   Voice AI Screen — UI shell
 * ACTOR:  Gemini 3.1
 * PHASE:  4 — Voice AI Module
 * TASK:   Recording UI, waveform visualizer, result display cards
 * SCOPE:  IN: visual only — microphone animation, result layout
 *         OUT: MFCC extraction (Claude Opus Phase 4)
 *              recording logic (Claude Sonnet Phase 4)
 *              XGBoost inference (Claude Opus Phase 4)
 */
```

**UI elements:**
```
1. Instruction text: "Say 'Xin chào' for 5-10 seconds"
2. MIC BUTTON: large circle, animated pulse when recording
3. WAVEFORM: animated bars during recording (mock animation only)
4. QUALITY INDICATOR: SNR bar "Good / Fair / Poor mic quality"
5. RESULTS CARD: class label + confidence bar + flags list
6. HISTORY: last 3 analyses mini cards
```

**TODO placeholders:**
```typescript
{/* TODO(Claude Sonnet - Phase 4): onRecord = useVoiceRecorder() */}
{/* TODO(Claude Opus - Phase 4): MFCC extraction in VoiceAI.ts */}
{/* TODO(Claude Sonnet - Phase 4): POST /voice/analyze → show results */}
{/* TODO(Mic Robustness): SNR check before allowing record */}
```

---

### PHASE 5 — Exercise Tracker Screen UI

**Input cần có**: Ảnh mockup Exercise screen  
**File:** `app/(tabs)/exercise.tsx`

**PARTS Header:**
```typescript
/**
 * PART:   Exercise Tracker Screen — UI shell
 * ACTOR:  Gemini 3.1
 * PHASE:  5 — Exercise Tracker
 * TASK:   Camera feed placeholder, exercise selector, rep counter display
 * SCOPE:  IN: layout, exercise cards, counter UI
 *         OUT: MediaPipe pose detection (Claude Sonnet Phase 5)
 *              angle calculation (Claude Opus Phase 5)
 *              rep counting algorithm (Claude Sonnet Phase 5)
 */
```

**UI elements:**
```
1. EXERCISE SELECTOR: grid — Squat, Bicep Curl, Push-up, Shoulder Press
2. CAMERA VIEW: placeholder box (sau Phase 5 Sonnet sẽ mount Camera)
3. REP COUNTER: huge number in center, animated on count
4. SKELETON OVERLAY: show joint dots (mock static positions ok)
5. FORM FEEDBACK: "Knees over toes ✓" / "Go deeper ✗"
6. SESSION SUMMARY: sets × reps × duration
```

**TODO:**
```typescript
{/* TODO(Claude Sonnet - Phase 5): Mount Camera + MediaPipe PoseDetector */}
{/* TODO(Claude Sonnet - Phase 5): useRepCounter(exerciseType) hook */}
{/* TODO(Claude Opus - Phase 5 if needed): angle formula θ = arccos(v1·v2/|v1||v2|) */}
```

---

### PHASE 6 — Sleep / Twin Screen UI

**Input cần có**: Ảnh mockup Sleep/Twin screen  
**File:** `app/(tabs)/twin.tsx`

**PARTS Header:**
```typescript
/**
 * PART:   Twin / Sleep Screen — UI shell
 * ACTOR:  Gemini 3.1
 * PHASE:  6 — Sleep Tracker
 * TASK:   Sleep timeline chart, stage breakdown, HRV display, ChronoOS prediction
 * SCOPE:  IN: charts, cards, layout
 *         OUT: LSTM inference (Claude Opus Phase 18), API data (Claude Sonnet Phase 6)
 */
```

**UI elements:**
```
1. SLEEP TIMELINE: horizontal bar — Light | Deep | REM | Awake bands
2. STATS ROW: Total sleep | Deep sleep | REM | HRV (SDNN)
3. CHRONOOS PREDICTION: "Tomorrow: 78/100 predicted health"
4. TWIN STATUS: "Your biological twin age: 28" (mock)
5. MINI PPG: 30-second waveform replay from last night
```

---

### PHASE 7 — Nutrition Scanner Screen UI

**Input cần có**: Ảnh mockup Nutrition screen  
**File:** `app/(tabs)/fintech.tsx` hoặc tạo `app/nutrition.tsx` riêng

**PARTS Header:**
```typescript
/**
 * PART:   Nutrition Scanner Screen — UI shell
 * ACTOR:  Gemini 3.1
 * PHASE:  7 — Nutrition Scanner
 * TASK:   Camera capture UI, bill/receipt result display
 * SCOPE:  IN: camera button, result cards, anomaly badges
 *         OUT: GPT-4o API call (Claude Sonnet Phase 7)
 *              Z-score anomaly logic (Claude Sonnet Phase 7)
 */
```

**UI elements:**
```
1. SCAN BUTTON: camera icon, large, "Scan Receipt / Bill"
2. PREVIEW: thumbnail of captured image
3. NUTRITION BREAKDOWN: table — item | calories | protein | etc
4. ANOMALY FLAGS: 🟡 cảnh báo / 🔴 bất thường badges  
5. COST ANALYSIS: total spend, vs market avg
```

---

### PHASE 8 — Health Score Visual Engine

**Mày làm gì**: Tạo `HealthScoreRing.tsx` component tái sử dụng — animated ring.

**File:** `components/health/HealthScoreRing.tsx`

```typescript
/**
 * PART:   HealthScoreRing — reusable animated score ring
 * ACTOR:  Gemini 3.1
 * PHASE:  8 — Health Score Engine
 * TASK:   Animated circular progress, color by score tier, sub-score breakdown
 * SCOPE:  IN: visual animation only, accepts {score, subScores} props
 *         OUT: score calculation (server-side, Claude Sonnet Phase 8)
 */
interface Props {
  score: number;          // 0-100
  subScores?: {           // optional breakdown
    exercise: number;     // 0-100
    sleep: number;
    voice: number;
    nutrition: number;
    discipline: number;
  };
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
}
```

**Color tiers (dùng colors.health từ theme.ts — tự switch theo mode):**
```
90-100 → colors.health.good (green)
75-89  → colors.health.good (green, lighter opacity)
60-74  → colors.health.warning (amber)
0-59   → colors.health.danger (red)
```

---

### PHASE 9 — Insurance / HSA Screen UI

**Input cần có**: Ảnh mockup Fintech/Insurance screen  
**File:** `app/(tabs)/fintech.tsx` (đầy đủ)

**PARTS Header:**
```typescript
/**
 * PART:   Insurance & HSA Screen — UI shell
 * ACTOR:  Gemini 3.1
 * PHASE:  9 — Insurance / HSA Calculator
 * TASK:   Premium display, discount meter, HSA projection chart
 * SCOPE:  IN: all UI elements, charts
 *         OUT: Premium formula calc (Claude Sonnet Phase 9)
 *              5-year NPV projection (Claude Sonnet Phase 9)
 */
```

**UI elements:**
```
1. CURRENT PREMIUM: large number + "Based on Health Score [X]"
2. DISCOUNT METER: progress bar 0-30%, current discount highlight
3. POTENTIAL SAVINGS: "If score improves to 90 → save [X]/month"
4. HSA AUTO-SAVE: toggle + projected monthly savings
5. 5-YEAR PROJECTION: line chart — current path vs healthy path
6. ANOMALY ALERT: bill anomaly count from last scan
```

---

### PHASE 10 — Hackathon Polish + Patch Connect UI

**File 1:** `app/patch-connect.tsx` — Patch connection flow UI
**File 2:** `components/health/PPGWaveform.tsx` — live waveform chart

**PARTS Header patch-connect:**
```typescript
/**
 * PART:   Patch Connect Screen — UI shell
 * ACTOR:  Gemini 3.1
 * PHASE:  10 — Hackathon Polish
 * TASK:   BLE scan animation, patch found card, connection status
 * SCOPE:  IN: scan animation, device card, status screens
 *         OUT: real BLE scan (Phase 11 Claude Sonnet)
 *              patch recognition algorithm (Phase 16 Claude Sonnet)
 * HARDWARE STATUS: MOCK — no real device exists yet
 */
```

---

### PHASE 11 — Dual Theme (Light/Dark) Implementation

**Mày làm gì**: Cập nhật `constants/theme.ts` theo spec mới (PLAN_B §XI) — dual mode. Cập nhật TẤT CẢ screen dùng theme tokens.

**File cần cập nhật:**
```
constants/theme.ts          ← export lightColors + darkColors (thay colors cũ)
hooks/useTheme.ts           ← NEW: hook để switch mode, đọc system preference
app/_layout.tsx             ← Wrap ThemeProvider
```

**theme.ts mới phải có:**
```typescript
/**
 * PART:   Constants — Theme (Dual Mode)
 * ACTOR:  Gemini 3.1
 * PHASE:  11 — Dual Theme
 * TASK:   Healthcare color system: Light default + Dark option
 * READS:  PLAN_B_HACKATHON.md §XI Design Language
 */
export const lightColors = { /* xem GEMINI Phase 1 spec */ };
export const darkColors  = { /* xem GEMINI Phase 1 spec */ };

// Hook để component lấy màu đúng:
// const { colors } = useTheme(); // tự switch light/dark
```

**Checklist:**
- [ ] Không còn `colors.` import cũ — tất cả chuyển sang `useTheme()`
- [ ] Light mode là default
- [ ] Dark mode: KHÔNG `#000000`, KHÔNG `#FFFFFF`
- [ ] Health semantic colors đúng cho cả 2 mode
- [ ] Mọi gradient có 2 variant

---

### PHASE 12 — Demo Flow Screen + Hackathon Stage Walkthrough

**Mày làm gì**: Tạo màn hình demo flow ẩn (cho người trình bày) — dẫn dắt qua 5 bước demo trên sân khấu theo PLAN_B §Demo Flow.

**File:** `app/demo-flow.tsx`

```typescript
/**
 * PART:   Demo Flow — hidden screen for stage presentation
 * ACTOR:  Gemini 3.1
 * PHASE:  12 — Demo Flow
 * TASK:   Step-by-step guide: Home → Voice → Exercise → Twin → Fintech
 * SCOPE:  IN: navigation between demo steps, timer overlay, presenter notes
 *         OUT: ẩn khỏi production (chỉ bật qua secret gesture)
 */
```

**UI elements:**
```
1. STEP INDICATOR: "Bước 2/5 — Voice Check" (top bar)
2. TIMER: countdown 30s-60s per step (viền cam khi gần hết giờ)
3. PRESENTER NOTE: text nhỏ ở bottom — gợi ý nói gì
4. NEXT BUTTON: lớn, rõ ràng → navigate sang step tiếp
5. Demo steps theo PLAN_B:
   Step 1 (30s): Home Screen → Health Score 78 + streak
   Step 2 (45s): Voice Check → record 10s live
   Step 3 (60s): [WOW] TikTok blocked → Morning Check-in → unlock
   Step 4 (30s): Twin → slider 10 years → eat burger → avatar fat
   Step 5 (30s): Fintech → Insurance savings + HSA
```

---

### PHASE 13 — Error Boundary + Offline Fallback UI

**File 1:** `components/shared/ErrorBoundary.tsx` — catch crash hiển thị nice UI thay vì crash app
**File 2:** `components/shared/OfflineBanner.tsx` — banner "Không có mạng" khi offline

```typescript
/**
 * PART:   Error Boundary — crash-safe wrapper
 * ACTOR:  Gemini 3.1
 * PHASE:  13 — Error Handling
 * TASK:   Show friendly error screen (not white screen of death)
 * SCOPE:  IN: error UI, retry button, report link
 *         OUT: error logging service (Claude Sonnet)
 */
```

**QUAN TRỌNG cho demo:** App KHÔNG ĐƯỢC crash giữa demo. ErrorBoundary bọc _layout.tsx.

---

## ── FULL PRODUCT (Phases 14–27) ──

### PHASE 17 — Patch Hardware Detection UI

> **⚠️ FIRMWARE**: Pod chạy firmware C + Zephyr RTOS (Opus Phase 18-19).  
> Giao thức phần cứng bên trong Pod: SPI (IMU), I2C (PPG), ADC (nhiệt độ), PDM (mic).  
> Gemini CHỈ làm UI hiển thị thông tin từ BLE — KHÔNG viết firmware.

**File:** `app/patch-connect.tsx` (update Phase 10 version)

Update UI to show:
- Patch model detected (ARA-P1 / P2 / P3 / P4)
- Patch remaining adhesive days
- Battery level indicator
- Firmware version (read from CHAR_PATCH_ID — Opus Phase 18)
- **NEW**: OTA firmware update prompt UI (Opus Phase 21)
  - Progress bar during DFU
  - "Đang cập nhật firmware..." + purple LED indicator note
  - Success/rollback status message

```typescript
{/* TODO(Claude Sonnet - Phase 16): PatchDevice.ts BLE advertisement parsing */}
{/* TODO: HARDWARE_INTEGRATION — Phase 16:
    1. Scan for BLE advertisements with name prefix 'ARA-PATCH-'
    2. Read characteristic 0x0001 → patch SKU model
    3. Read characteristic 0x0002 → remaining battery % */}
```

### PHASE 25 — Insurance API Integration UI Updates

Add to fintech.tsx:
- Real policy number display
- Premium update notification
- Partner insurance logo
- Policy details deep link

### PHASE 27 — App Store Assets

Mày sinh:
```
assets/store/
├── icon_1024.png description
├── screenshots/
│   ├── screen1_home.description
│   ├── screen2_voice.description
│   ├── screen3_exercise.description
├── app_store_description_en.txt
├── app_store_description_vi.txt
└── google_play_description.txt
```

---

## ── REVIEW PROTOCOL (Sau mỗi 3 phase) ──

Khi được yêu cầu review, mày load toàn bộ:
```
project-docs/AGENTS.md + constants/theme.ts + app/**/* + components/**/*
```

Checklist:
- [ ] Có file nào > 200 dòng không? (flag để split)
- [ ] Có màu hex hardcode không? (thay bằng theme token)
- [ ] Có import BLEService trực tiếp không? (phải qua HardwareService)
- [ ] Có file thiếu PARTS header không?
- [ ] Có URL hoặc API key hardcode không?
- [ ] Có TODO(HARDWARE_INTEGRATION) đúng format không?
- [ ] TypeScript `any` không có comment không?

---

## ❌ KHÔNG BAO GIỜ LÀM

- Viết business logic, hook, Zustand store
- Implement thuật toán (XGBoost, LSTM, PPG, MFCC)
- Hardcode màu sắc (LUÔN dùng theme.ts)
- Code gì mà không có mockup ảnh đính kèm
- Đụng vào Security Phase 20 (của Claude Opus)
- Tự refactor code Sonnet/Opus đã viết

---

*GEMINI_PHASES.md — ARA MetaboliQ App | Your job: see the mockup → build the UI → hand to Claude*
