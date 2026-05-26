# ARA MetaboliQ — AI-Powered Preventive Health App

> Ứng dụng sức khoẻ phòng ngừa tích hợp Voice AI, Medical OCR và dashboard cá nhân hoá.

## Overview

ARA MetaboliQ là React Native + Expo mobile app (iOS/Android) theo dõi sức khoẻ toàn diện:

- **Daily Dashboard** — Health Score, bước chân, giấc ngủ, stress, readiness
- **Voice AI** — Sàng lọc 5 tín hiệu sức khoẻ từ 20 giây giọng nói
- **Medical OCR** — Chụp kết quả xét nghiệm → tự động phân tích
- **Guided Wellness** — Bài tập thở, quản lý stress, tối ưu giấc ngủ
- **Female Health** — Theo dõi chu kỳ + dự đoán + khuyến nghị theo pha
- **Challenges & Social** — Bảng xếp hạng, huy hiệu, thi đua bạn bè

**Tech Stack:** React Native · TypeScript · Expo Router · FastAPI · Zustand · NativeWind

---

## Quick Start

### Frontend
```bash
cd ara-metaboliq-app
npm install --legacy-peer-deps
npx expo start
```

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

---

## UI App Test

> Screenshots chụp từ app khi đang test (Wave 1 build)

*Ảnh sẽ được cập nhật sau khi build.*

---

## Platforms

- Android 8.0+ (API 26+)
- iOS 12.0+
