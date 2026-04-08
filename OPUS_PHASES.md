# CLAUDE OPUS 4.6 — ARA MetaboliQ | Nhiệm vụ theo Phase

> **Mày là ai**: Claude Opus 4.6 — Algorithm Architect & Security Engineer  
> **Thế mạnh**: Signal processing, ML inference, cryptography, medical formulas, khó nhất  
> **Nguyên tắc cứng**: Công thức phải khớp **chính xác** với `project-docs/Tong_Hop_Thuat_Toan_ARA_MetaboliQ.docx`. Nếu không chắc → hỏi lại công thức.

---

## ⚡ QUY TẮC BẮT BUỘC

```
1. Mọi file mới BẮT BUỘC có PARTS header comment
2. Tất cả công thức: comment LaTeX trên từng line code
3. Tolerance thực nghiệm: HR ±3bpm, SpO₂ ±2%, Temp ±0.3°C, BP ±5mmHg
4. Cảnh báo calibration khi drift > tolerance
5. KHÔNG validate input ngoài boundary (Sonnet làm điều đó ở API layer)
6. Thuật toán server-only: Python (FastAPI) không phải TypeScript
7. Khi viết TypeScript (BLE, mobile), chỉ dùng để NHẬN + HIỂN THỊ đầu ra
8. Không bao giờ expose raw PPG buffer ra ngoài service layer
```

---

## ── PHASE 4 — Voice AI: MARVEL Dual-Branch ──

> Runs trên server (Python FastAPI). Sonnet làm HTTP call → kết quả.  
> **⚡ UPGRADE**: MFCC + XGBoost cũ → MARVEL framework (arXiv:2508.20717, Dec 2025)  
> **Kết quả**: AUROC overall 0.78 · Neurological 0.89 · Alzheimer's/MCI **0.97**  
> **Privacy**: Chỉ derived features truyền server, KHÔNG raw audio

**File:** `/backend/services/voice_ai.py`

```python
# PART:   VoiceAI — MARVEL dual-branch multi-task health screening
# ACTOR:  Claude Opus 4.6
# PHASE:  4 — Voice AI Module
# TASK:   Acoustic feature extraction + multi-condition classification (9 diseases)
# SCOPE:  IN: raw PCM audio bytes (16kHz, 16-bit mono, 5s)
#         OUT: {conditions: [...], confidence: [...], features_88d: [...], flags: [...]}
#
# Pipeline: Load PCM → SNR check → openSMILE GeMAPS → MARVEL heads
# Hackathon: Branch B only (GeMAPS 88-dim + XGBoost)
# Full Product: Branch A + B (HuBERT-768 + GeMAPS, late fusion)
#
# Source: MARVEL — Multi-task Acoustic Representations for Voice-based Health Analysis
#         Piao et al., arXiv:2508.20717, published Dec 2025

# ── SNR Pre-check (giữ lại từ cũ) ──
# SNR_dB = 10·log₁₀(σ²_signal / σ²_noise)
# noise_segment = first 500ms (silence assumed)
# REJECT if SNR_dB < 10 → return flags=['low_snr']

# ── Branch B: openSMILE GeMAPS v02 (Hackathon + Full Product) ──
# GeMAPS = Geneva Minimalistic Acoustic Parameter Set
# 88 features including: F₀ mean/var, formant F1-F3 mean/var, jitter, shimmer,
# HNR, MFCC 1-4 mean/var, spectral flux, spectral tilt, RMS, ZCR
# Extract via: opensmile.Smile(feature_set='GeMAPSv02', feature_level='functionals')
# Privacy: derived features only, NOT raw audio transmitted to server

# ── Branch A: HuBERT-base embeddings (Full Product only) ──
# from transformers import HubertModel
# model = HubertModel.from_pretrained('facebook/hubert-base-ls960')
# with torch.no_grad(): features = model(audio_tensor).last_hidden_state.mean(dim=1)
# → 768-dim embedding that encodes F₀, prosody, breathiness, vocal tract shape

# ── MARVEL Fusion + Multi-task Classification ──
# Hackathon: XGBoost(GeMAPS_88) per condition head
# Full Product: MLP fusion(HuBERT_768 + GeMAPS_88) → 9 task heads
# Loss: Σᵢ λᵢ × BCELoss_i   (λᵢ = inverse class frequency balancing)

# ── Task Heads (conditions detected) ──
# Neurological: Alzheimer's/MCI, Parkinson's, Stroke
# Respiratory: COVID-19, Asthma, COPD
# Voice disorders: Dysphonia, Vocal fold pathology, Hypernasality

# ── Output ──
# {'conditions': ['alzheimers_risk', 'dysphonia'], 'confidence': [0.91, 0.73],
#  'overall_respiratory': float, 'overall_neurological': float,
#  'flags': ['low_snr'] if applicable}
```

---

## ── PHASE 12 — PPG Processing: DPNet Mamba + Peak Detection ──

> TypeScript trên mobile (runs mỗi 40ms, 25Hz)  
> **⚡ UPGRADE**: Adaptive threshold cũ → DPNet (arXiv:2510.11058, Oct 2025, NTU Taiwan)  
> **Tại sao**: Mamba O(L) complexity vs LSTM O(L²); SI-SDR loss bảo toàn peak timing

**File:** `/services/hardware/PPGProcessor.ts` (mobile)

```typescript
/**
 * PART:   PPGProcessor — DPNet Mamba denoising + clean peak detection
 * ACTOR:  Claude Opus 4.6
 * PHASE:  12 — PPG Real-time Processing
 * TASK:   Denoise PPG via DPNet, detect peaks on clean signal
 * SCOPE:  IN: raw 12-bit ADC samples (0-4095) from BLE buffer
 *         OUT: detected peaks array, IBI list (passed to Phase 13)
 * HARDWARE STATUS: REAL — runs on Pod PPG sensor data (Phase 11+)
 *
 * Source: DPNet — Mamba-based PPG denoising
 *         Chiu et al., arXiv:2510.11058, NTU Taiwan, Oct 2025
 */

// ── DPNet: Mamba SSM Denoising (replaces adaptive threshold + moving average) ──
// Architecture (lightweight, edge-deployable):
//   Input: PPG segment (125 samples @ 25Hz = 5s)
//   4× Mamba blocks (hidden=64, selective state space, skip connections)
//   Output: denoised PPG waveform (same shape)
//
// Training objectives:
//   L_total = L_SI-SDR + λ × L_HR
//   SI-SDR = 10·log₁₀(||αs||² / ||αs−ŝ||²)  where α = <ŝ,s>/||s||²
//   L_HR = MSE(HR_from_predicted_peaks, HR_ground_truth)  ← physiological constraint
//
// Mamba advantage over LSTM:
//   O(L) complexity vs O(L²) → 3× faster on edge hardware
//   Selective state: only retains relevant context (unlike fixed LSTM hidden state)

// ── Peak Detection (on clean DPNet output) ──
// After denoising, use scipy-style find_peaks (via custom JS port):
//   peaks = findPeaks(ppg_clean, { distance: 0.3 × fs, prominence: 0.1 })
// Much more reliable than threshold on noisy signal

// ── IBI (Inter-Beat Interval) ──
// IBI(n) = (t_peak(n) - t_peak(n-1)) × 1000  [ms]
// REJECT IBI outside [300, 2000] ms (HR 30-200 BPM physiological range)
// Extra validation: σ(IBI_last_5) < 200ms (reject motion burst)

// ── HR Estimation: Knowledge-Distilled Edge Model ──
// Source: arXiv:2511.18829, NeurIPS 2025 Workshop, UW/Google Health
// Model: tiny CNN distilled from large PPG foundation model
//   Conv1D(32) → Conv1D(64) → AdaptiveAvgPool → Dense(1)
//   ~50K params, <5ms inference, MAE ≈ 1.5 BPM
//   vs peak-counting method MAE ≈ 2.8 BPM
// Strategy: Decoupled Knowledge Distillation (DKD) — best among 4 strategies tested
// Deploy as ONNX model in React Native native module

// ── 🧪 TEST: PPG Foundation Models (v4.0 additions) ──
// Alternative 1: SIGMA-PPG (arXiv:2601.21031, Jan 2026)
//   VQ-VAE tokenizer + adversarial masking, pre-trained 120K+ hours
//   SpO₂ MAE = 0.1457% (10× improvement!)
//   ⚠️ Pre-trained at 50Hz, Pod is 25Hz → run Hz comparison test (TEST A)
//   Server-side inference: send 10s PPG window → SIGMA embedding → downstream
//
// Alternative 2: Wavelet-MMR (arXiv:2601.12215, Jan 2026)
//   Wavelet multiscale reconstruction, 17M segments from 32K smartwatch users
//   17/19 downstream tasks improved over SOTA
//   ⚠️ Also needs Hz adaptation, but trained on wearable data → closer domain
//   Server-side inference
//
// Alternative 3: PulseLM (arXiv:2603.03331, Feb 2026)
//   1.31M standardized 10s PPG segments, 3.15M QA pairs
//   NOT a deployment model — use as evaluation benchmark for the above models
//   Code: github.com/manhph2211/PulseLM
//
// → Opus runs TEST A (Hz comparison) → reports to User → User picks best method
```

---

## ── PHASE 13 — SpO₂ + HR + HRV ──

> TypeScript trên mobile (post-processing sau Phase 12)

**File:** `/services/health/SpO2Processor.ts`

```typescript
/**
 * PART:   SpO2Processor — Beer-Lambert dual-wavelength SpO₂ + HR + SDNN/RMSSD
 * ACTOR:  Claude Opus 4.6
 * PHASE:  13 — SpO₂ / HR / HRV Algorithms
 * TASK:   Compute SpO₂ từ AC/DC ratio, HR từ IBI, HRV từ IBI variance
 *
 * Pod sensor: RED 660nm + IR 940nm photon count channels
 */

// ── Beer-Lambert Perfusion Ratio (từ Tong_Hop_Thuat_Toan §5) ──
// R = (AC_red / DC_red) / (AC_IR / DC_IR)
// SpO₂% = 110 - 25 × R
// Valid range: SpO₂ ∈ [85, 100]%  (< 85 → flag hypoxia + alert)

// ── AC/DC Extraction ──
// DC = moving average (W=50 samples)
// AC = peak-to-peak amplitude within 1 cardiac cycle
// Use SAME waveform as Phase 12 PPGProcessor (dual channel)

// ── HR from IBI ──
// HR = 60000 / mean(IBI_recent_10)  [BPM]
// Smooth with EMA: EMA(t) = 0.3 × HR(t) + 0.7 × EMA(t-1)

// ── SDNN (từ Tong_Hop_Thuat_Toan §5) ──
// SDNN = √(1/N × Σ(IBI_i - IBI_mean)²)  [ms]
// Window: last 300 seconds (5 min) → need ≥50 IBI

// ── RMSSD (từ Tong_Hop_Thuat_Toan §5) ──
// RMSSD = √(1/(N-1) × Σ(IBI_{i+1} - IBI_i)²)  [ms]
// RMSSD > 40ms = good autonomic function

// ── SpO₂ Neural Calibration Layer (NEW — on top of Beer-Lambert) ──
// Corrects for skin tone bias in empirical 110−25R formula
// δ_nn = MLP([R_raw, DC_red, DC_IR, contact_quality, motion_energy])
//         → scalar correction offset (typically −2 to +1%)
// SpO₂_calibrated = SpO₂_raw + δ_nn
// MLP: 4 layers, 32 hidden, ReLU, <1ms inference
// Reason: original calibration data biased toward light skin tones

// ── Reliability flags ──
// Return flags: ['motion_artifact'] if SDNN/RMSSD ratio > 5 (IMU check)
// Return flags: ['insufficient_data'] if N < 10 IBI
// Return flags: ['skin_contact_poor'] if DC_red < threshold (DPNet contact quality)
```

---

## ── PHASE 14 — Temperature: NTC Steinhart-Hart ──

**File:** `/services/health/TemperatureProcessor.ts`

```typescript
/**
 * PART:   TemperatureProcessor — NTC Steinhart-Hart + Beta correction
 * ACTOR:  Claude Opus 4.6
 * PHASE:  14 — Temperature Algorithm
 * TASK:   Convert raw 12-bit ADC → °C using S-H + Beta formula
 *
 * Sensor: NTC 10kΩ B=3950 thermistor in voltage divider (R_ref=10kΩ, Vcc=3.3V)
 */

// ── Resistance from ADC (từ Tong_Hop_Thuat_Toan §6) ──
// V_out = ADC_raw × (3.3 / 4096)
// NTC_R = R_ref × V_out / (Vcc - V_out)

// ── Steinhart-Hart Equation ──
// 1/T = A + B×ln(R) + C×(ln(R))³
// Coefficients (calibrated for B=3950 NTC):
//   A = 1.009249522e-3
//   B = 2.378405444e-4
//   C = 2.019202697e-7
// T°C = (1/T_kelvin) - 273.15

// ── Beta (B-parameter) Approximation (faster, <0.05°C error) ──
// 1/T = 1/T₀ + (1/B)×ln(R/R₀)
// T₀ = 298.15K (25°C), R₀ = 10000Ω, B = 3950
// T°C = (1/T_kelvin) - 273.15

// ── Thermal lag correction ──
// Patch sits on skin → reading lags core by ~0.7°C
// T_core ≈ T_skin + 0.7  (empirical patch factor)
// TODO: calibrate per body location in full product

// ── Smoothing ──
// Apply 1st-order IIR: T_filtered(t) = 0.9×T_filtered(t-1) + 0.1×T_raw(t)
```

---

## ── HACKATHON PHASES (15–17) — Demo AI Infrastructure ──

---

## ── PHASE 15 — Mock AI Inference Engine ──

> **MỤC ĐÍCH**: Demo ngày thi KHÔNG có model thật (chưa train). Tạo mock AI trả kết quả realistic.
> Phase này đảm bảo tất cả API endpoints trả data đẹp cho front-end demo.

**File:** `/backend/services/mock_ai_engine.py`

```python
# PART:   MockAIEngine — realistic AI responses for hackathon demo
# ACTOR:  Claude Opus 4.6
# PHASE:  15 — Mock AI for Hackathon
# TASK:   Trả kết quả AI giống thật nhưng hardcoded/rule-based (không cần model weights)
# SCOPE:  IN: all AI endpoints mock, deterministic demo mode
#         OUT: real model inference (Phase 19+ full product)
#
# ── Voice AI Mock ──
# Input: audio features (bỏ qua) → Output: hardcoded scores
# {
#   "burnout": 0.12,  "anxiety": 0.38,  "energy": 0.76,
#   "recovery": 0.82, "class": "mild_stress",
#   "confidence": 0.87
# }
# Variation: thêm Gaussian noise ±5% để trông realistic
#
# ── Health Score Mock ──
# H_score = 0.25×E + 0.20×S + 0.25×V + 0.15×N + 0.15×D
# E = exercise_points / 100  (from rep count today)
# S = sleep_hours / 8         (capped at 1.0)
# V = voice_recovery          (from mock voice AI)
# N = 0.70                    (fixed nutrition, chưa có data thật)
# D = streak_days / 7         (capped at 1.0)
# Output: scaled 0-100
#
# ── PPG/SpO2/HR/Temp Mock ──
# Dùng MockHardware.ts đã có (Sonnet Phase 10) — generate sine wave PPG
# Opus chỉ wrap lại endpoint trả format đúng:
#   {"hr": 72, "spo2": 98, "temperature": 36.5, "hrv_sdnn": 42.0}
#
# ── Insurance Mock ──
# Premium = 450_000 × (1 - 0.18)  [18% discount from H_score 78]
# HSA_balance = 12_500_000
# HSA_monthly = 500_000
#
# ── Deterministic Mode ──
# Khi DemoDataSeeder.activate() → tất cả endpoints trả EXACT data
# Khi không activate → thêm noise để test UI edge cases
```

---

## ── PHASE 16 — Health Score Formula Server-Side ──

> **QUAN TRỌNG**: Health Score KHÔNG ĐƯỢC tính trên client (security rule #4 từ SONNET).
> Opus viết formula logic trên server, Sonnet chỉ gọi API.

**File:** `/backend/services/health_score.py`

```python
# PART:   HealthScoreEngine — server-side computation
# ACTOR:  Claude Opus 4.6
# PHASE:  16 — Health Score Server
# TASK:   Compute H_score từ 5 tiêu chí (hackathon) hoặc 7 tiêu chí (full product)
#
# ══════════════════════════════════════
# HACKATHON FORMULA (5 tiêu chí):
# ══════════════════════════════════════
#   H = 0.25×E + 0.20×S + 0.25×V + 0.15×N + 0.15×D
#
#   E = exercise_score:
#       reps_today = total reps all exercises
#       E = min(reps_today / target_reps, 1.0) × 100
#       target_reps = 50 (default, adjustable)
#
#   S = sleep_score:
#       S = min(total_sleep_min / 480, 1.0) × 100  [target: 8h]
#       Bonus: +5 if deep_sleep > 90min, +5 if REM > 60min
#       Penalty: -10 if total < 360min (6h)
#
#   V = voice_score:
#       V = recovery_readiness × 100  [0.0 - 1.0 from Voice AI]
#
#   N = nutrition_score:
#       N = 70  (fixed for hackathon — no scanning yet)
#       Full product: from NutritionScanner Z-score average
#
#   D = discipline_score:
#       D = min(streak_days / 7, 1.0) × 100
#       streak = consecutive days with ≥1 voice check
#
# ══════════════════════════════════════
# FULL PRODUCT FORMULA (7 tiêu chí):
# ══════════════════════════════════════
#   H = 0.20×E + 0.15×S + 0.20×V + 0.10×N + 0.10×D + 0.15×P + 0.10×C
#   P = patch_vital_score (HR/SpO2/Temp stability from real wearable)
#   C = chronos_score (ChronoOS biological rhythm compliance)
#
# ── Score Tier Mapping ──
# 90-100: "Excellent" (🟢)
# 75-89:  "Good"      (🟢 lighter)
# 60-74:  "Fair"       (🟡)
# 0-59:   "Poor"       (🔴)
#
# ── Endpoint ──
# POST /health/score
# Body: { exercise_reps, sleep_min, deep_sleep_min, rem_min,
#          voice_recovery, nutrition_score, streak_days }
# Response: { score: int, tier: str, breakdown: {...}, updated_at: str }
#
# ── Validation ──
# All inputs bounded: 0 ≤ x ≤ reasonable_max
# Return 422 if any input negative or > 2× max
```

---

## ── PHASE 17 — Dataset Collection Plan + Training Pipeline Scaffold ──

> Phase này CHƯA train model thật. Chỉ thiết kế pipeline và chuẩn bị.
> **CHÚ Ý**: Hackathon dùng mock (Phase 15). Train model thật = Phase 19+ (full product).

**File:** `/ai-pipeline/README.md` + `/ai-pipeline/collect_voice_data.py` + `/ai-pipeline/train_voice_xgb.py`

```python
# PART:   AI Training Pipeline Scaffold
# ACTOR:  Claude Opus 4.6
# PHASE:  17 — Dataset + Pipeline
# TASK:   Chuẩn bị thu thập data + training script skeleton
#
# ══════════════════════════════════════
# DATASET CẦN THU THẬP (theo thứ tự ưu tiên):
# ══════════════════════════════════════
#
# 1. VOICE DATA (ưu tiên cao nhất — core feature)
#    Source: Thu thật từ sinh viên Phenikaa + public datasets
#    Public datasets:
#      - RAVDESS (Ryerson Audio-Visual Database of Emotional Speech)
#        → 7356 files, 24 actors, 8 emotions, English
#        → Download: zenodo.org/record/1188976
#      - Bridge2AI-Voice v2.0 (2025) — 9 health tasks
#        → bridge2ai.org
#      - LibriSpeech 960h (for pre-training Wav2Vec2)
#        → openslr.org/12
#    Custom collection:
#      - Nhờ 50+ sinh viên Phenikaa đọc 10 câu mỗi người
#      - Record bằng app (10s, 16kHz mono WAV)
#      - Label: self-reported burnout/stress/sleep quality (1-5 Likert)
#      - IRB approval: Phenikaa academic research ethics board
#    Target: ≥500 recordings (50 người × 10 câu)
#    Features: GeMAPS 88-dim via openSMILE
#    Model: XGBoost multi-class (Phase 4 MARVEL architecture)
#
# 2. PPG DATA (ưu tiên trung bình — cần Pod thật)
#    Public datasets:
#      - BIDMC PPG (physionet.org/content/bidmc)
#      - MIMIC-III/IV waveforms (physionet.org/content/mimiciv)
#      - PulseLM dataset: 1.31M segments (github.com/manhph2211/PulseLM)
#    Custom: Sau khi có Pod prototype → record 100 sessions
#    Target: ≥1000 PPG segments
#
# 3. SLEEP DATA (ưu tiên thấp — Fitbit/Apple Watch API)
#    Source: Apple HealthKit / Fitbit API export
#    Target: ≥100 nights from 10 volunteers
#
# ══════════════════════════════════════
# TRAINING PIPELINE:
# ══════════════════════════════════════
#
# collect_voice_data.py:
#   1. Record audio → extract GeMAPS features → save .csv
#   2. Label file (CSV: filename, burnout_1-5, anxiety_1-5, energy_1-5)
#   3. Train/val/test split: 70/15/15, stratified
#
# train_voice_xgb.py:
#   1. Load features + labels
#   2. Optuna hyperparameter search (50 trials)
#   3. 5-fold cross-validation
#   4. Export: best_model.pkl → deploy to backend
#   5. Metrics: accuracy, F1-macro, ROC-AUC per class
#   6. Confusion matrix → save as image
#
# train_ppg_processor.py (future):
#   1. Load PPG segments
#   2. Train DPNet Mamba denoiser (if enough data)
#   3. Fallback: use adaptive threshold (already implemented Phase 12)
#   4. Export: ONNX for edge inference
#
# ── KHI NÀO BẮT ĐẦU TRAIN? ──
# Phase 17 chỉ TẠO SCRIPT + README
# Thu data bắt đầu khi có IRB approval (~tuần 3 sau khi submit)
# Train thật: sau hackathon, khi có ≥200 recordings
# Hackathon demo HOÀN TOÀN DÙNG MOCK (Phase 15)
```

---

## ── FULL PRODUCT PHASES (18+) ──

---

## ── PHASE 18 — Blood Pressure: PITN (thay thế PTT) ──

> **⚡ UPGRADE v4.0**: PTT Method → PITN Physics-Informed Temporal Network  
> **Nguồn**: arXiv:2408.08488 [cs.LG], Dec 2024  
> **Lý do thay**: PITN dùng CÙNG hardware (BP Clip PPG+ECG) nhưng neural network + physics constraint cho MAE ~4 mmHg vs PTT ~5-8 mmHg  
> **Chi phí phần cứng**: KHÔNG THAY ĐỔI  
> **Chi phí compute**: Server inference (tăng nhẹ so với PTT edge)

**File:** `/backend/services/bp_pitn.py` (server) + `/services/health/BPProcessor.ts` (mobile client)

```python
# PART:   PITN — Physics-Informed Temporal Network for Cuffless BP
# ACTOR:  Claude Opus 4.6
# PHASE:  15 — BP Clip Algorithm (PITN primary, PTT fallback)
# TASK:   PPG + ECG from BP Clip → adversarial contrastive learning → SBP/DBP
#
# Source: PITN — arXiv:2408.08488, Dec 2024
#         Adversarial + Contrastive + Physics-informed cuffless BP
#
# Hardware: BP Clip 3.5mm TRRS (2-lead ECG + finger PPG red 660nm)
#   Channel L: ECG lead-1 signal → detect R-waves
#   Channel R: Finger PPG (red 660nm)
#   *** CÙNG phần cứng như PTT cũ — KHÔNG cần thay đổi ***

# ── PITN Architecture ──
# Input: [PPG_segment, ECG_segment] (5-10s window from BP Clip)
#
# Temporal Block with FFT Period Detection:
#   periods = top_k(|FFT(x)|, k=3)  → multi-periodic feature extraction
#   Captures: cardiac rhythm + respiratory rhythm + Mayer wave
#
# Physics Constraint (Taylor approximation of Moens-Korteweg):
#   L_physics = MSE(∂BP/∂PTT, −k/PTT²)  [k = learned parameter]
#   Enforces: BP inversely proportional to PTT²
#
# Adversarial PGD Training (robust to noise):
#   x_adv = x + ε × sign(∇ₓ L(x, y))  [ε = perturbation budget]
#   L_adv = L(f(x_adv), y)
#
# Contrastive Learning (subject-specific embeddings):
#   L_con = −log(exp(sim(zᵢ,zⱼ)/τ) / Σₖ exp(sim(zᵢ,zₖ)/τ))
#   Same subject → pull together; different subject → push apart
#
# Total Loss:
#   L = L_clean + α·L_adv + β·L_con + γ·L_physics
#   α, β, γ = hyperparameters (grid search)
#
# Output: (SBP, DBP) float
# Endpoint: POST /health/bp-pitn {ppg_window: [...], ecg_window: [...]}

# ── PTT Fallback (GIỮA LẠI — khi không có server) ──
# PTT = T_foot(finger-PPG) - T_foot(ECG-R-peak) [ms]
# SBP = a_sbp - b_sbp × PTT  (linear regression, edge-only)
# Use when: no internet, server down, latency-critical

# ── BERT Voice BP (Tier 2 — khi KHÔNG có BP Clip) ──
# Source: arXiv:2509.19750 (Sep 2025), R²=0.99 trên 95 người (đáng ngờ)
# Input: GeMAPS 88-dim features từ Phase 4 Voice AI (tái sử dụng)
# Model: BERT regression → (SBP, DBP) float
# Endpoint: POST /health/bp-voice {features_88d: float[]}
# ⚠️ EXPERIMENTAL: cần validate 500+ người trước khi ship

# ── 3-Tier Strategy ──
# Tier 1 (Primary): PITN (server, khi có BP Clip + internet)
# Tier 2 (Fallback): PTT (edge, khi có BP Clip, no server)
# Tier 3 (Voice only): BERT (server, khi KHÔNG có BP Clip)
# Fusion (optional): BP_final = w₁·BP_PITN + w₂·BP_voice
#   Weights from conformal prediction uncertainty

# ── Calibration Protocol (cả PITN và PTT) ──
# 1. User takes 3 cuff BP readings → enter in app
# 2. Simultaneously record PPG+ECG for each reading
# 3. PITN: fine-tune last layer with personal data (transfer learning)
# 4. PTT: linear regression (a, b) for fallback
# 5. Recalibrate every 14 days + if weight changes >3kg
# 6. Store calibration in SecureStore (encrypted via Phase 20)
```

---

## ── PHASE 20 — Twin AI: Multi-output XGBoost ──

> Runs on server (Python FastAPI). `ChronoOS.ts` trên mobile chỉ nhận kết quả.

**File:** `/backend/services/chronos_xgb.py`

```python
# PART:   ChronoOS XGBoost — multi-output simultaneous prediction
# ACTOR:  Claude Opus 4.6
# PHASE:  17 — Twin AI: XGBoost Layer
# TASK:   5 health targets predicted simultaneously from 1 feature vector
# SCOPE:  IN: 72-feature vector (24h × 3 time slots of aggregated vitals)
#         OUT: {energy, recovery, performance, metabolic_risk, anomaly_score}

# ── Feature Engineering ──
# Input window: 24 hours, sampled at 30-min intervals → 48 time points
# Per time point: [HR_mean, HR_std, SpO₂_mean, HRV_SDNN, Temp_mean, RR_interval, Steps]
# Aggregated stats: min, max, mean, trend (slope) per feature
# Total: 7 features × (4 stats) × (day|night split) = 56 features + 16 engineered = 72

# ── Multi-output XGBoost (từ Tong_Hop_Thuat_Toan §8) ──
# 5 separate XGBoost regressors (MultiOutputRegressor wrapper):
#   1. E_sport  → energy score for exercise today  [0-100]
#   2. R_score  → sleep quality / recovery index   [0-100]
#   3. P_score  → cognitive performance prediction [0-100]  
#   4. MetaRisk → metabolic risk flag              [0.0-1.0]
#   5. AnomalyΔ → deviation from personal baseline [0.0-1.0]

# XGBoost hyperparams (default, tune với Optuna):
# n_estimators=300, max_depth=6, learning_rate=0.05
# subsample=0.8, colsample_bytree=0.7, reg_lambda=1.0

# Labels (PLAN_A full product, Phase 17):
# Supervised from: Oura Ring API + Apple Health + user questionnaire (data collection phase)
```

---

## ── PHASE 21 — ChronoOS: Temporal Fusion Transformer (thay thế vanilla LSTM) ──

> **⚡ UPGRADE**: Vanilla LSTM 2-layer → TFT (OmniTFT-inspired, arXiv:2511.19485, Nov 2025)  
> **Tại sao**: LSTM không xử lý missing data, không interpretable, gradient vanishing trên 48 steps  
> **Validation**: OmniTFT tested trên MIMIC-III, MIMIC-IV, eICU (multi-center clinical data)  

**File:** `/backend/services/chronos_tft.py`

```python
# PART:   ChronoOS TFT — Temporal Fusion Transformer chronobiology engine
# ACTOR:  Claude Opus 4.6
# PHASE:  18 — ChronoOS Chronobiology Engine
# TASK:   24-hour multivariate vital sign forecasting + interpretable anomaly detection
#
# Source: OmniTFT — Xu et al., arXiv:2511.19485, Nov 2025
#         Benchmarked: MIMIC-III, MIMIC-IV, eICU datasets
#
# Architecture:
#   Input:
#     - time-varying numerical: HR, SpO₂, Temp, HRV_SDNN, steps (per 30min)
#     - time-varying categorical: time_of_day, is_sleep, is_exercise
#     - static: age, sex, baseline_HR, baseline_SpO₂
#
# ── 4 OmniTFT Innovations (adapt for wearable) ──
#
# 1. Sliding Window Equalized Sampling
#    Balance day/night states (prevent bias toward waking hours with more data)
#    window_weights = 1 / class_frequency per physiological state
#
# 2. Frequency-Aware Embedding Shrinkage
#    rare_states = ['fever', 'high_exercise', 'apnea']
#    embedding_scale[rare_state] = 1 / sqrt(frequency)  ← amplify rare
#
# 3. Hierarchical Variable Selection (interpretable)
#    selector = GatedResidualNetwork(input_dim, hidden_dim)
#    var_weights = softmax(selector(context_vector))  ← importance per feature
#    Output these weights in API response → "HRV là yếu tố quyết định hôm nay"
#
# 4. Influence-Aligned Attention Calibration
#    At abrupt changes (|Δx| > 2σ): rescale attention to prevent diffusion
#    if delta > threshold: attn = attn * influence_scale_factor
#
# ── Output ──
# Quantile forecast (TFT native): P10, P50, P90 intervals for each target
# → Show uncertainty bands on chart ("tomorrow HR: 65 [60-72]")
# Variable importance scores → natural language explanation

# ── Anomaly Detection (same logic, better baseline) ──
# μ_personal, σ_personal computed từ last 30 days (rolling, stored TimescaleDB)
# AnomalyΔ = |x_current - μ_personal| / σ_personal  [z-score]
# ALERT if AnomalyΔ > 2.0 for any biomarker for >3 consecutive hours

# ── Chronobiological Phase Shift (giữ nguyên) ──
# Circadian clock expected: HR nadir at 04:00 local time
# Phase shift = |actual_nadir_hour - 4| × 30 min
# Flag jetlag/shift-work disruption if phase_shift > 2 hours

# ── ChronoOS Output ──
# Return: predicted 24h biomarker curves + confidence bands + variable importance
# Display on Twin tab: line chart (Gemini skeleton) + Sonnet binds data + interpret text
```

---

## ── PHASE 23 — Security Stack ──

**Implements TRONG FastAPI backend** `/backend/security/`

```python
# PART:   Security — full clinical-grade auth + crypto + anti-tamper
# ACTOR:  Claude Opus 4.6
# PHASE:  20 — Security Layer
# TASK:   AES-256-GCM, bcrypt, JWT rotation, ε-DP, cert pinning, runtime check

# ── Encryption at Rest (từ AGENTS.md §8: Security) ──
# AES-256-GCM: IV=96-bit random per record, Tag=128-bit
#
# Key Derivation: Argon2id (REPLACES PBKDF2 — OWASP 2025 recommended)
# Reason: PBKDF2 is CPU-bound → crackable by GPU/ASIC farms at scale
#         Argon2id is memory-hard → 100× more expensive to crack
# Parameters: m=65536 (64MB RAM), t=3 (iterations), p=4 (parallelism)
# from argon2 import PasswordHasher
# ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4, hash_len=32)
# aes_key_bytes = derive_key_argon2id(user_password, salt)  # 256-bit key
#
# Encrypted fields: all health readings in DB, voice recordings, images
# GeMAPS features also encrypted (derived but still health data)

# ── Password Hashing ──
# bcrypt(cost=12)
# Progressive migration: re-hash on login if cost < 12

# ── JWT with Rotation + Revocation ──
# Access token TTL: 15 minutes (JTI in Redis)
# Refresh token TTL: 7 days (stored in SecureStore on mobile)
# Rotation: each refresh → new pair + revoke old refresh token
# Breach detection: if old refresh token used again → revoke ALL user tokens

# ── ε-Differential Privacy (Gaussian Mechanism) ──
# Applied to: aggregate analytics (telemetry, population stats)
# noise = N(0, (Δf × √(2ln(1.25/δ)) / ε)²)
# ε = 1.0, δ = 1e-5
# Do NOT apply DP to individual health data stored in user's own account

# ── Certificate Pinning (mobile) ──
# React Native: implement OkHttp CertificatePinner (Android) + NSURLSession (iOS)
# Pin: SHA-256 of API server cert leaf + intermediate
# Backup pin: 2nd cert for rotation
# If pin fails → refuse connection + alert user (do NOT silently fail)

# ── Runtime Integrity Check ──
# iOS: Disable on DEBUG builds (simulators)
# On anomaly: POST /security/integrity-event (collect forensics) NOT crash silently
# Check sequence: jailbreak → debugger → hooking frameworks → tampered binaries

# ── Anti-cheat: Server-side H_score only ──
# Health Score NEVER computed on client (confirmed in Phase 8)
# Server validates all sub-scores are physiologically plausible:
#   Exercise 0-100: reject if >80 without steps data
#   Sleep 0-100: reject if >90 without ≥6h sleep logged
#   Voice: reject if confidence < 0.6
# Server rate-limits: max 1 score computation per 5 minutes per user
```

---

## ── PHASE 24 — GutMind: BowelRCNN (thay thế basic CNN) ──

> **⚡ UPGRADE**: Basic CNN → BowelRCNN (arXiv:2504.08659, Apr 2025)  
> **Kết quả**: 96% accuracy, F1=71% — event-level detection (không chỉ segment-level)  
> **Lợi ích**: Detect individual events + count + measure duration → granular motility index

**File:** `/backend/services/gutmind.py`

```python
# PART:   GutMind — SPU0410 MEMS mic gut sound auscultation via BowelRCNN
# ACTOR:  Claude Opus 4.6
# PHASE:  21 — GutMind Gut Acoustic AI
# TASK:   Event-level bowel sound detection + motility index
#
# Source: BowelRCNN — Matynia & Nowak, arXiv:2504.08659, Apr 2025
#         96% accuracy, F1=71%, validated on 19 patients (60 min audio)
#
# Sensor: SPU0410HR5H-PB MEMS mic on Pod (near navel placement)
# Frequency range: 1Hz - 4kHz (bowel sounds: mostly 50-600Hz)
# Sample rate: 8kHz, 16-bit

# ── Preprocessing (same as before) ──
# 1. High-pass filter: fc=1Hz → remove breathing artifact
# 2. Low-pass filter: fc=1kHz → keep bowel sound range
# 3. Generate full spectrogram (continuous, NOT windowed segments)
# 4. Spectrogram: n_fft=512, hop=128, n_mel=64 → (64, T) image

# ── BowelRCNN Architecture (replaces basic CNN) ──
#
# Traditional CNN cũ: classify 10s window → just 'hypoactive/hyperactive/normal'
# BowelRCNN: detect individual events with time boundaries → event list
#
# Stage 1: Selective Search on spectrogram
#   Generate ~2000 region proposals (time-frequency patches)
#   Filter by acoustic energy > threshold
#
# Stage 2: ROI Pooling
#   Each proposal → fixed 7×7 feature map (regardless of original size)
#
# Stage 3: CNN Feature Extraction per region
#   Conv2D(32) → Conv2D(64) → Dense(128)
#
# Stage 4: Dual output heads
#   Classification: 4 classes (borborygmi / hypo / hyper / absent)
#   Regression: [t_start, t_end] bounding box in time axis
#
# Output: [(t_start, t_end, class, confidence), ...] per 30s window

# ── Granular Motility Index (replaces coarse M_index) ──
# n_events = count(events in 30min window)
# mean_duration = mean(t_end - t_start per event) [ms]
# intensity = mean(acoustic_energy per event)
# M_index_new = sigmoid(w₁·n_events + w₂·intensity + w₃·(1/mean_duration))
# Correlates better with clinical ileus scoring vs coarse classification
#
# ALERT thresholds:
#   n_events < 3 per 30min AND duration > 4h → 'hypoactive' → soft alert
#   n_events = 0 per 60min → 'absent' → urgent alert + refer doctor suggestion
#   n_events > 50 per 30min → 'hyperactive' → diarrhea risk alert

# ── Classes ──
# 0: Normal borborygmi — 5-35 events/30min, duration 0.1-3s
# 1: Hypoactive — <5 events/30min (early constipation/ileus flag)
# 2: Hyperactive — >35 events/30min, short duration (diarrhea risk)
# 3: Absent — 0 events per complete minute (pathological — refer doctor)
```

---

## ── KHÔNG BAO GIỜ ──

- Viết HTTP layer, routing, CRUD → Sonnet làm
- Tạo UI screens, components → Gemini làm
- Hardcode calibration constants mà không comment nguồn
- Bỏ qua validity bounds (physiological range checks)
- Để raw health data leak qua logging

---

## ── PHASE 25 — Bento Grid AI: Adaptive Layout Personalization (Full Product) ──

> **Chỉ Full Product — hackathon chưa cần.**  
> AI tự động điều chỉnh bố cục lưới Bento dựa trên hành vi người dùng.  
> Opus thiết kế thuật toán ranking + layout optimization. Gemini render UI. Sonnet làm API + data pipeline.

**File:** `/backend/services/bento_layout_engine.py` (server)

```python
# PART:   BentoLayoutEngine — AI-driven adaptive grid personalization
# ACTOR:  Claude Opus 4.6
# PHASE:  22 — Bento Grid AI (Full Product only)
# TASK:   Analyze user behavior → compute widget priority scores → optimize grid layout
# SCOPE:  IN: interaction_logs (tap, scroll, dwell), user_profile, time_context
#         OUT: layout_config {widget_id: (row, col, rowSpan, colSpan, priority)}
#
# Thuật toán gồm 3 stage:
#   Stage 1: Behavioral Signal Collection (interaction tracking)
#   Stage 2: Priority Scoring (multi-signal ranking)
#   Stage 3: Layout Optimization (constraint-based grid packing)

# ══════════════════════════════════════════════════════════════════
# STAGE 1: BEHAVIORAL SIGNAL COLLECTION
# ══════════════════════════════════════════════════════════════════
#
# Thu thập 5 tín hiệu hành vi từ client (Sonnet gửi qua API):
#   1. tap_count[widget_i]     — số lần tap vào widget i trong 7 ngày
#   2. dwell_time[widget_i]    — tổng thời gian nhìn (viewport intersection) [seconds]
#   3. scroll_past_rate[i]     — tỷ lệ lần scroll qua mà không tương tác
#   4. action_depth[i]         — user có drill-down hay chỉ nhìn? (0=glance, 1=tap, 2=detail)
#   5. recency[i]              — thời điểm tương tác gần nhất (decay function)
#
# Privacy: KHÔNG track nội dung, CHỈ track interaction patterns.
# Dữ liệu lưu local trước (AsyncStorage), batch sync lên server mỗi 6h.

# ══════════════════════════════════════════════════════════════════
# STAGE 2: PRIORITY SCORING — Multi-Signal Weighted Rank
# ══════════════════════════════════════════════════════════════════
#
# Priority Score cho mỗi widget:
#
#   P(i) = w₁·norm(tap_count[i])
#        + w₂·norm(dwell_time[i])
#        + w₃·(1 − scroll_past_rate[i])
#        + w₄·norm(action_depth[i])
#        + w₅·decay(recency[i])
#        + w₆·context_boost(i, time_of_day, health_state)
#
# Default weights (tunable per user via online learning):
#   w₁ = 0.25  (tap frequency — strongest intent signal)
#   w₂ = 0.20  (dwell time — passive interest)
#   w₃ = 0.15  (scroll-past inverse — nếu hay lướt qua = ít quan trọng)
#   w₄ = 0.15  (action depth — drill-down = high intent)
#   w₅ = 0.15  (recency decay — gần đây quan trọng hơn)
#   w₆ = 0.10  (context boost — thời gian + trạng thái sức khoẻ)
#
# Normalization: min-max per user, rolling 30-day window
#   norm(x) = (x − min_30d) / (max_30d − min_30d + ε)
#
# Recency Decay (exponential):
#   decay(t) = exp(−λ · Δt)     [λ = 0.1, Δt in days]
#   → Widget tương tác 1 ngày trước: decay = 0.90
#   → Widget tương tác 7 ngày trước: decay = 0.50
#   → Widget tương tác 30 ngày trước: decay = 0.05
#
# Context Boost (thời gian + sức khoẻ):
#   if time == morning AND widget == 'voice_check': boost += 0.3
#   if time == night AND widget == 'sleep_tracking': boost += 0.3
#   if health_alert == 'low_spo2' AND widget == 'spo2_detail': boost += 0.5
#   if health_alert == 'high_stress' AND widget == 'voice_check': boost += 0.3
#   → Context-aware: widget relevant nhất ở thời điểm hiện tại được đẩy lên

# ══════════════════════════════════════════════════════════════════
# STAGE 3: LAYOUT OPTIMIZATION — Constraint-based Grid Packing
# ══════════════════════════════════════════════════════════════════
#
# Bento Grid: 4 columns × N rows (responsive, mobile-first)
# Widget sizes: 1×1 (small), 2×1 (wide), 1×2 (tall), 2×2 (featured)
#
# Objective Function:
#   maximize  Σᵢ P(i) × area(i) × visibility(i)
#   subject to:
#     - Σ area(i) ≤ total_grid_cells (no overflow)
#     - no overlap between widgets
#     - Health Score widget ALWAYS in top-left 2×2 (anchor)
#     - Critical alerts ALWAYS full-width (4×1) at top
#     - minimum 1×1 for every active module (nothing completely hidden)
#
# Size Assignment (greedy by priority):
#   P(i) ≥ 0.8  →  2×2 featured (nhiều space nhất)
#   P(i) ≥ 0.5  →  2×1 wide
#   P(i) ≥ 0.2  →  1×1 standard
#   P(i) < 0.2  →  1×1 collapsed (chỉ icon + số, tap to expand)
#
# Visibility Score:
#   visibility(i) = 1 / (row_position(i) + 1)
#   → Widget ở hàng 1 = visibility 1.0, hàng 4 = 0.25
#   → High-priority widgets phải ở hàng trên
#
# Packing Algorithm: Modified First-Fit Decreasing (FFD)
#   1. Sort widgets by P(i) descending
#   2. For each widget, find first row with enough space
#   3. Place widget, update occupancy grid
#   4. If no space in current rows → add new row
#
# Output: layout_config JSON
#   [
#     {"widget": "health_score", "row": 0, "col": 0, "rowSpan": 2, "colSpan": 2},
#     {"widget": "voice_check",  "row": 0, "col": 2, "rowSpan": 1, "colSpan": 2},
#     {"widget": "sleep",        "row": 1, "col": 2, "rowSpan": 1, "colSpan": 2},
#     ...
#   ]

# ══════════════════════════════════════════════════════════════════
# STAGE 4: ONLINE LEARNING — Weight Adaptation
# ══════════════════════════════════════════════════════════════════
#
# Sau mỗi session, update weights w₁–w₆ per user:
#   reward = Σᵢ (user_interacted_with[i] × P(i))
#   if user always taps widget mà P(i) thấp → tăng w₁ (tap weight)
#   if user dwells nhưng không tap → tăng w₂ (dwell weight)
#
# Multi-Armed Bandit (Thompson Sampling):
#   Mỗi weight prior: Beta(α, β)
#   After positive interaction: α += 1
#   After negative (scroll past): β += 1
#   Sample: wₖ ~ Beta(αₖ, βₖ)
#
# Exploration rate ε:
#   ε = 0.15 (15% random layout variation để discover mới)
#   Decay: ε(t) = max(0.05, 0.15 × exp(−0.01t))  [t = days since signup]
#   → User mới: nhiều variation. User lâu: layout ổn định.

# ══════════════════════════════════════════════════════════════════
# Endpoint & Caching
# ══════════════════════════════════════════════════════════════════
# GET /layout/config → returns current optimized layout
# Cache: Redis TTL 1 hour (recompute sau mỗi session)
# Fallback: default static layout nếu < 3 days data
```

---

## ── PHASE 26 — Progressive Onboarding AI (Full Product) ──

> **Chỉ Full Product — hackathon dùng static onboarding đơn giản.**  
> Áp dụng 6 nguyên tắc UX: Progressive Disclosure, Validating Language,  
> Smart Defaults, Transparent Privacy, Frictionless Entry, Explain "Why".  
> Opus thiết kế thuật toán quyết định. Sonnet làm API. Gemini làm UI flow.

**File:** `/backend/services/onboarding_engine.py` (server)

```python
# PART:   OnboardingEngine — Progressive Disclosure + Smart Defaults AI
# ACTOR:  Claude Opus 4.6
# PHASE:  23 — Progressive Onboarding (Full Product only)
# TASK:   Decide WHICH questions to ask, WHEN, and HOW — maximize data collection
#         while minimizing user friction and dropout
# SCOPE:  IN: user_stage (new/day3/week2/...), completed_fields, engagement_score
#         OUT: next_question_batch, question_style, skip_allowed, privacy_note

# ══════════════════════════════════════════════════════════════════
# NGUYÊN TẮC 1: PROGRESSIVE DISCLOSURE (Tiết lộ Lũy tiến)
# ══════════════════════════════════════════════════════════════════
#
# Stage 0 (First open — MINIMAL): chỉ hỏi 3 câu
#   - Tên gọi (text, skip OK)
#   - Năm sinh (year picker, cho Smart Default = 1998)
#   - Mục tiêu chính (single choice: "Khoẻ hơn" / "Ngủ ngon" / "Giảm stress" / "Tài chính")
#   → Đủ để khởi tạo dashboard, KHÔNG hỏi thêm
#
# Stage 1 (Sau 3 ngày dùng app — TRUST BUILDING):
#   - Giới tính (nếu chưa) — "Để AI chuẩn hơn cho sức khoẻ giọng nói"
#   - Chiều cao + Cân nặng — "Để đo BMI và dự báo sức khoẻ"
#   - Thiết bị đeo (watchOS/WearOS/Pod) — "Để kết nối dữ liệu"
#
# Stage 2 (Sau 7 ngày — DEEPER):
#   - Giờ ngủ thông thường — "Để ChronoOS gợi ý giờ vàng"
#   - Tình trạng stress — "Để theo dõi Recovery Score chính xác hơn"
#   - Bệnh nền (optional!) — "Để cảnh báo an toàn, skip nếu không muốn"
#
# Stage 3 (Sau 14 ngày — FULL):
#   - Mục tiêu tài chính HSA — "Để tính phí bảo hiểm giả lập"
#   - Nghề nghiệp (shift work?) — "Để chronobiology adjust đúng"
#   - Lịch tập luyện — "Để AI gợi ý khung giờ và bài tập"
#
# Question Scheduler:
#   next_stage_unlock = max(current_stage_days, min_engagement_threshold)
#   min_engagement = {stage_1: 3 sessions, stage_2: 7 sessions, stage_3: 14 sessions}
#   Không unlock stage 2 nếu user chưa dùng 7 lần → tránh overwhelm

# ══════════════════════════════════════════════════════════════════
# NGUYÊN TẮC 2: EXPLAIN "WHY" — Mỗi câu hỏi đi kèm benefit
# ══════════════════════════════════════════════════════════════════
#
# question_metadata = {
#   "height_cm": {
#     "question": "Chiều cao của bạn?",
#     "why": "Để tính BMI và dự báo rủi ro tim mạch chính xác cho riêng bạn",
#     "benefit_icon": "📊",
#     "skip_allowed": True,
#     "smart_default": 165  # Trung bình VN
#   },
#   "stress_level": {
#     "question": "Bạn thường cảm thấy căng thẳng?",
#     "why": "AI sẽ so sánh giọng nói bạn hôm nay vs hôm qua → gợi ý nghỉ ngơi",
#     "benefit_icon": "🧘",
#     "options": ["Hiếm khi", "Thỉnh thoảng", "Thường xuyên", "Rất căng thẳng"],
#     "skip_allowed": True,
#     "smart_default": "Thỉnh thoảng"
#   }
# }
# → Gemini render: câu hỏi + dòng nhỏ "Tại sao?" + icon benefit

# ══════════════════════════════════════════════════════════════════
# NGUYÊN TẮC 3: FRICTIONLESS ENTRY — "Skip" mọi lúc
# ══════════════════════════════════════════════════════════════════
#
# skip_penalty = 0  (KHÔNG trừ điểm gì khi skip)
# skipped_questions → re-ask sau 7 ngày bằng in-app nudge (không popup)
# completion_rate = filled_fields / total_fields
# if completion_rate < 0.3 after 14 days → gentle nudge card on dashboard
# if completion_rate > 0.8 → "Hồ sơ hoàn chỉnh! AI hoạt động chính xác nhất cho bạn"

# ══════════════════════════════════════════════════════════════════
# NGUYÊN TẮC 4: VALIDATING LANGUAGE — Empathetic Tone
# ══════════════════════════════════════════════════════════════════
#
# tone_templates = {
#   "stress": "Ai cũng có những ngày mệt mỏi. Cho ARA biết bạn đang thế nào nhé 💙",
#   "weight": "Không sao đâu, con số chỉ là điểm bắt đầu thôi 🌱",
#   "disease": "Thông tin này giúp AI bảo vệ bạn tốt hơn. Bỏ qua cũng được ❤️",
#   "finance": "Quản lý tài chính sức khoẻ — bắt đầu nhỏ thôi!"
# }
# → Thay vì "Nhập cân nặng" → "Cho ARA biết để bắt đầu hành trình khoẻ mạnh nhé 🌱"

# ══════════════════════════════════════════════════════════════════
# NGUYÊN TẮC 5: TRANSPARENT PRIVACY — Hiển thị ngay
# ══════════════════════════════════════════════════════════════════
#
# privacy_note_per_stage = {
#   0: "🔒 Dữ liệu được mã hoá AES-256. ARA không bán cho bên thứ 3.",
#   1: "🔒 Chiều cao, cân nặng chỉ dùng để tính BMI — bạn có thể xoá bất kỳ lúc nào.",
#   2: "🔒 Thông tin bệnh nền KHÔNG chia sẻ với bảo hiểm. Chỉ dùng cho cảnh báo an toàn.",
#   3: "🔒 Dữ liệu tài chính chỉ là mô phỏng. ARA không kết nối ngân hàng."
# }
# → Gemini hiển thị dòng nhỏ dưới mỗi màn hình onboarding

# ══════════════════════════════════════════════════════════════════
# NGUYÊN TẮC 6: SMART DEFAULTS — Giảm effort
# ══════════════════════════════════════════════════════════════════
#
# Smart Default Strategy:
#   - Year of birth: 1998 (mode of VN college student)
#   - Height: 165cm (VN average)
#   - Weight: 60kg (VN average)
#   - Sleep time: 23:00 (common for 18-25 age group)
#   - Wake time: 07:00
#   - Goal: "Khoẻ hơn" (most common)
#   - Stress: "Thỉnh thoảng"
#
# Platform-specific defaults:
#   if device == 'apple_watch': auto-detect age, height, weight from HealthKit
#   if device == 'health_connect': same via Google Health Connect
#   → Pre-fill nếu user cho phép, chỉ cần confirm thay vì nhập mới
#
# Decision Paralysis Prevention:
#   Max 4 options per question (không bao giờ > 6)
#   Recommended option: highlighted with "Phổ biến nhất" badge
#   Free text fields: always have placeholder example

# ══════════════════════════════════════════════════════════════════
# Endpoint
# ══════════════════════════════════════════════════════════════════
# GET /onboarding/next → returns next question batch for current stage
# POST /onboarding/answer → save answers, check stage unlock
# GET /onboarding/completion → returns completion_rate + missing fields
```

---

## ── PHASE TEST — Kiểm chứng kỹ thuật mới (v4.0) ──

> **Phần này mới từ v4.0**. Opus chịu trách nhiệm implement + test tất cả kỹ thuật mới.  
> Sau khi test xong → ghi metrics vào report → gửi User quyết định.

### TEST A — SIGMA-PPG Hz Rate Comparison

> **Ai làm**: Opus implement, User thu thập Pod data  
> **Báo cáo**: Opus → User (bảng metrics 25Hz vs 50Hz vs 100Hz)

```
Protocol:
1. Thu thập 100+ giờ PPG RAW từ Pod (MAX86176 @ 25Hz)
2. Ground truth: Oura Ring / Polar H10 (chest strap)
3. Chuẩn bị 3 dataset:
   - Dataset A: Native 25Hz
   - Dataset B: Upsample 25Hz → 50Hz (cubic interpolation)
   - Dataset C: Upsample 25Hz → 100Hz
4. Chạy SIGMA-PPG pretrained → extract embeddings → downstream HR/SpO₂
5. Thống kê: MAE HR (BPM), MAE SpO₂ (%), AF AUROC
6. Pass criteria: HR MAE < 2.0 BPM
7. Nếu fail → fine-tune SIGMA-PPG trên 25Hz data hoặc dùng Wavelet-MMR
```

### TEST B — DPNet vs Wavelet-MMR vs Adaptive Threshold

> **Ai làm**: Opus implement cả 3, so sánh  
> **Báo cáo**: Opus → User (bảng SI-SDR, HR MAE)

```
Tiêu chí pass/fail:
- DPNet SI-SDR improvement > 3 dB → pass
- Wavelet-MMR HR MAE < 2.0 BPM → pass
- Chọn method có MAE tốt nhất + inference time < 200ms
```

### TEST C — PITN vs PTT Blood Pressure

> **Ai làm**: Opus implement PITN server-side  
> **Báo cáo**: Opus → User (SBP/DBP MAE so sánh trên cuff ground truth)

```
Tiêu chí: PITN MAE SBP < PTT MAE SBP (need ≥1 mmHg improvement)
Nếu fail: giữ PTT, dùng PITN features cho fusion only
```

### TEST D — BowelRCNN với SPU0410 MEMS

> **Ai làm**: Opus implement, User annotate events  
> **Báo cáo**: Opus → User (F1 score event-level)

```
Tiêu chí: F1 > 0.60 trên SPU0410 data
Cần: 20+ giờ gut audio từ Pod + manual annotation
Nếu fail: giữ basic CNN classification
```

### TEST E — TFT vs LSTM ChronoOS

> **Ai làm**: Opus implement both, so sánh  
> **Báo cáo**: Opus → User (RMSE per biomarker)

```
Tiêu chí: TFT RMSE < LSTM RMSE by ≥10%
Nếu fail: giữ LSTM (simpler, less data needed)
```

---

*OPUS_PHASES.md — ARA MetaboliQ App | Algorithm Architect & Security Engineer | v4.0*
