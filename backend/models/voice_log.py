# PART:   Voice Log DB Model — SQLAlchemy schema for voice analysis records
# ACTOR:  Claude Opus 4.6 (bootstrap — Sonnet extends in Phase 19)
# PHASE:  4 — Voice AI Module
# TASK:   Define voice_logs table model matching PLAN_B_HACKATHON.md schema
#
# Schema (from PLAN_B_HACKATHON.md §IV):
# voice_logs (id, user_id, audio_url, burnout_risk, anxiety_risk, cardiac_risk,
#             respiratory_risk, created_at)
# Extended with: recovery_readiness_score, sub_scores_json, condition_risks_json,
#                features_json, snr_db, flags_json, model_version

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class VoiceLog(Base):
    __tablename__ = "voice_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    audio_url = Column(Text, nullable=True)
    duration_s = Column(Float, nullable=True)

    # Legacy fields (kept for backward compatibility)
    burnout_risk = Column(Float, nullable=True)
    anxiety_risk = Column(Float, nullable=True)
    cardiac_risk = Column(Float, nullable=True)
    respiratory_risk = Column(Float, nullable=True)

    # MARVEL v4.0 fields
    recovery_readiness_score = Column(Integer, nullable=True)
    sub_scores_json = Column(JSONB, nullable=True)       # {"energy": 85, "stress": 72, ...}
    condition_risks_json = Column(JSONB, nullable=True)   # {"alzheimers_mci": 0.12, ...}
    features_json = Column(JSONB, nullable=True)          # 88-dim GeMAPS feature vector
    snr_db = Column(Float, nullable=True)
    flags_json = Column(JSONB, nullable=True)             # ["low_snr", ...]
    model_version = Column(String(100), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
