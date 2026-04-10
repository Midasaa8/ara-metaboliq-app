# ARA MetaboliQ — AI Training Pipeline

## Overview
Scripts for data collection and model training. **Hackathon uses mock data (Phase 15)**.
These scripts prepare for post-hackathon real model training.

## Dataset Priority

| # | Data Type | Source | Target | Status |
|---|-----------|--------|--------|--------|
| 1 | Voice | Phenikaa students + RAVDESS + Bridge2AI | ≥500 recordings | Planning |
| 2 | PPG | Pod prototype + BIDMC + MIMIC | ≥1000 segments | Waiting for Pod |
| 3 | Sleep | Apple HealthKit / Fitbit export | ≥100 nights | Planning |

## Public Datasets

- **RAVDESS**: 7356 files, 24 actors, 8 emotions — [zenodo.org/record/1188976](https://zenodo.org/record/1188976)
- **Bridge2AI-Voice v2.0** (2025): 9 health tasks — [bridge2ai.org](https://bridge2ai.org)
- **LibriSpeech 960h**: Pre-training — [openslr.org/12](https://openslr.org/12)
- **BIDMC PPG**: [physionet.org/content/bidmc](https://physionet.org/content/bidmc)
- **MIMIC-IV Waveforms**: [physionet.org/content/mimiciv](https://physionet.org/content/mimiciv)
- **PulseLM**: 1.31M segments — [github.com/manhph2211/PulseLM](https://github.com/manhph2211/PulseLM)

## Scripts

| Script | Purpose |
|--------|---------|
| `collect_voice_data.py` | Record audio → GeMAPS features → CSV |
| `train_voice_xgb.py` | Load features → Optuna search → XGBoost → export .pkl |

## When to Start Training?

1. Phase 17 only creates scripts + README (no actual training)
2. Data collection starts after IRB approval (~week 3 post-submit)
3. Real training: after hackathon, with ≥200 recordings
4. **Hackathon demo uses mock data entirely (Phase 15)**
