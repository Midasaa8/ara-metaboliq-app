# ARA MetaboliQ — AI-Powered Preventive Health App

> Fitbit-inspired health companion with voice AI disease screening, medical OCR, and personalized wellness insights.

## 🎯 Overview

ARA MetaboliQ is a React Native + Expo mobile app (iOS/Android) that provides comprehensive health tracking with AI-powered features:
- **Daily Dashboard**: Health Score, steps, sleep, stress, readiness
- **Voice AI**: 5-disease health screening from 20-second voice samples
- **Medical OCR**: Scan lab results → auto-parse → trending analysis
- **Guided Wellness**: Breathing exercises, stress management, sleep optimization
- **Female Health**: Cycle tracking with phase-based recommendations
- **Challenges & Social**: Leaderboards, badges, friend competition

**Technology Stack:**
- Frontend: React Native + TypeScript + Expo Router
- Backend: FastAPI + Python 3.12
- State: Zustand + AsyncStorage
- Theme: Dual mode (Light/Dark)
- UI: Lucide React Native + NativeWind

---

## 📁 Project Structure

```
ara-metaboliq-app/
├── app/                        # Expo Router screens
│   ├── (tabs)/                # Main 3-tab layout (Today, Discover, Profile)
│   ├── onboarding/            # 6-step onboarding flow
│   └── ...
├── backend/                    # FastAPI server (Wave 1 complete)
│   ├── services/              # 12 AI/health algorithms
│   ├── routers/               # API endpoints
│   └── requirements.txt
├── components/                # React Native UI components
│   ├── dashboard/             # Bento Grid widgets
│   ├── health/                # Health Score, sleep, stress
│   ├── settings/              # Settings screens
│   ├── premium/               # Paywall components
│   ├── voice/                 # Voice recording & results
│   ├── ocr/                   # Medical OCR UI
│   ├── social/                # Challenges & leaderboards
│   └── ...
├── services/                  # Business logic services
│   ├── health/                # Health data processing
│   ├── voice/                 # Voice check-in service
│   ├── ocr/                   # Medical OCR service
│   ├── activity/              # Step counter & activity
│   ├── stress/                # Stress management
│   ├── settings/              # User settings
│   ├── monetization/          # Premium subscription
│   └── api/                   # API client
├── hooks/                     # Custom React hooks
├── store/                     # Zustand global state
├── types/                     # TypeScript declarations
├── constants/                 # Theme, hardware constants
└── package.json
```

---

## ✅ Wave 1 Status: COMPLETE (Phase 20s-36s)

### Frontend (Sonnet Phases 20s-36s)
- ✅ **Phase 20s**: Navigation (3-tab + FAB layout)
- ✅ **Phase 21s**: Onboarding (6-step flow, rotary pickers)
- ✅ **Phase 22s**: Health Connect integration
- ✅ **Phase 23s**: Activity tracking (steps, AZM, calories)
- ✅ **Phase 24s**: Food & water logging
- ✅ **Phase 25s**: Weight & body composition
- ✅ **Phase 26s**: Sleep tracking with score display
- ✅ **Phase 27s**: Voice AI (5-disease screening)
- ✅ **Phase 28s**: Medical OCR (lab result scanning)
- ✅ **Phase 29s**: Stress management + breathing exercises
- ✅ **Phase 30s**: Reminders to move (hourly nudge)
- ✅ **Phase 31s**: Challenges & social + badges
- ✅ **Phase 32s**: Female health cycle tracking
- ✅ **Phase 33s**: Settings architecture
- ✅ **Phase 34s**: Premium/monetization
- ✅ **Phase 35s**: Dashboard Bento Grid customization
- ✅ **Phase 36s**: Daily Readiness Score

### Backend (Opus Phases 20s-31s)
All 12 Wave 1 services ✅ tested and working:
- `body_composition` — BMI, body fat %, BMR/TDEE
- `step_counter` — Accelerometer pedometer
- `active_zone_minutes` — HR zone classification
- `sleep_score` — 5-component sleep quality
- `health_score_v2` — Composite health metric
- `exercise_calculator` — Calorie burn estimation
- `lab_patterns` — Lab value classification (LOINC mapped)
- `stress_score` — Voice + HRV + sleep composite
- `anomaly_detection` — Z-score + Isolation Forest detection
- `voice_trend` — Multi-metric trend analysis
- `female_health` — Cycle prediction + phase analysis
- `daily_readiness` — Morning readiness scoring

---

## 🚀 Quick Start

### Prerequisites
- **Frontend**: Node.js 18+, npm/yarn, Expo CLI
- **Backend**: Python 3.12+, pip, venv

### Frontend Setup
```bash
cd ara-metaboliq-app

# Install dependencies
npm install --legacy-peer-deps

# Start Expo dev server
npx expo start

# Run on Android
a

# Run on iOS
i
```

### Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run server (FastAPI)
python -m uvicorn main:app --reload --port 8000
```

**Default Backend URL:** `http://localhost:8000`

---

## 🔑 Key Features

### 1. Daily Dashboard (Bento Grid)
- **Health Score ring** (2×2) — overall wellness metric
- **Steps & Distance** (2×1) — daily goal progress
- **Active Zone Minutes** (2×1) — cardio intensity zones
- **Sleep Quality** (2×1) — stage breakdown
- **Voice Wellness** (2×1) — 5-disease screening results
- **Stress Level** (1×1) — real-time stress indicator
- **Daily Readiness** (1×1) — exercise recommendation
- **Customizable**: Toggle visibility, drag to reorder

### 2. Voice AI Check-in
1. Tap "Voice Check-in" FAB
2. Record 20 seconds of natural speech
3. Auto-upload to backend for MARVEL multi-task processing
4. Display 5-signal report:
   - 🫀 Metabolic Risk (0-100)
   - 🧠 Movement Stability (0-100)
   - 💭 Cognitive Trend (0-100)
   - 😊 Mood Pattern (0-100)
   - 🫁 Respiratory Health (0-100)

**Disclaimer**: Health signal, not medical diagnosis. Consult doctor if concerned.

### 3. Medical OCR Lab Scanner
1. Tap "Scan Lab Result" FAB
2. Align lab report in camera frame
3. Auto-capture + upload
4. Display structured results table:
   - Test Name | Value | Unit | Normal Range | Status
   - Auto-correctable
5. Save to health profile → auto-update Health Score

**Supported Tests**: Glucose, HbA1c, Cholesterol, LDL, HDL, TSH, CBC, etc.

### 4. Settings & Privacy
- **General**: Units, language (vi/en), theme (light/dark/system)
- **Health Goals**: Customizable targets
- **Notifications**: Granular control
- **Privacy**: Export user data (JSON), delete account
- **Premium**: Subscription management

### 5. Premium Subscription
- **Free**: 1 voice check-in/month, basic dashboard
- **Premium** ($4.99/month):
  - Unlimited voice AI
  - Unlimited medical OCR
  - Detailed sleep/stress/readiness scores
  - Social challenges & badges
  - Custom dashboard

---

## 📊 TypeScript + Strict Mode

All code follows TypeScript strict mode:
```bash
# Validate all files
npx tsc --noEmit
```

**Current Status**: 0 errors in Phase 33s-36s files ✅

---

## 🎨 Theme System

No hardcoded colors. All UI uses theme hook:
```typescript
const { colors, fonts, spacing } = useTheme();

// Light mode
lightColors: { primary: '#2563EB', surface: '#F8FAFB', ... }

// Dark mode  
darkColors: { primary: '#60A5FA', surface: '#181818', ... }
```

---

## 🔐 API Authentication

All API calls through centralized client:
```typescript
import APIClient from '@/services/api/APIClient';

// GET
const data = await APIClient.get('/api/v1/wave1/health-score');

// POST
const result = await APIClient.post('/api/v1/wave1/voice/analyze', payload);
```

**Base URL**: `http://localhost:8000` (configurable in `.env`)

---

## 📱 Supported Platforms

- ✅ Android 8.0+ (API 26+)
- ✅ iOS 12.0+
- ✅ Web (Expo Web, limited features)

---

## 🧪 Testing

### TypeScript Check
```bash
npx tsc --noEmit
```

### Backend Integration Test
```bash
cd backend
python -m pytest tests/
```

Or run Opus validation script:
```bash
cd backend
python -c "
from backend.services import *
# All 12 services imported + tested
"
```

---

## 📦 File Structure Guidelines

**Rule 1**: Max 200 lines per file
```typescript
/**
 * PART:   [Module description]
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  [Phase number]
 * TASK:   [What this file does]
 */
```

**Rule 2**: No console.log for health data
**Rule 3**: No hardcoded hex colors → use theme.ts
**Rule 4**: All API calls via APIClient
**Rule 5**: Health Score computed server-side only

---

## 🚀 Deployment

### Frontend (Expo)
```bash
# Build APK (Android)
eas build -p android

# Build IPA (iOS)
eas build -p ios

# Submit to stores
eas submit -p ios/android
```

### Backend (Production)
```bash
# Deploy to production server
# Use gunicorn + uvicorn workers
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
```

---

## 📚 Documentation

- **Phases**: See `SONNET_PHASES.md` for detailed phase breakdown
- **Backend Algorithms**: See `backend/services/` docstrings
- **Type Definitions**: See `types/` folder
- **Architecture**: See `project-docs/`

---

## 👤 Authors

- **Frontend (Sonnet)**: Claude Sonnet 4.6 — React Native/TypeScript specialist
- **Backend (Opus)**: Claude Opus — AI/ML algorithm specialist

---

## 📄 License

Proprietary — ARA Health Technologies

---

## 🤝 Contributing

1. Follow TypeScript strict mode
2. Max 200 lines per file
3. Add PARTS header to every file
4. Test with `npx tsc --noEmit`
5. Use theme hooks (no hardcoded colors)
6. Keep markdown docs in `project-docs/`

---

## 📞 Support

For issues, questions, or feature requests — contact dev team.

---

**Last Updated**: May 2026 | Wave 1 Complete ✅ | Phase 33s-36s Merged
