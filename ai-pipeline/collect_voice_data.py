# PART:   Voice Data Collection — record + extract GeMAPS features
# ACTOR:  Claude Opus 4.6
# PHASE:  17 — Dataset + Pipeline
# TASK:   Record audio from microphone, extract GeMAPS 88-dim, save CSV
# SCOPE:  IN: raw audio recordings | OUT: features.csv + labels.csv
#
# Usage:
#   python collect_voice_data.py --output-dir ./data/voice --duration 10
#
# Requirements:
#   pip install sounddevice soundfile opensmile numpy pandas

from __future__ import annotations

import argparse
import csv
import os
import sys
import time
from pathlib import Path
from typing import Any

import numpy as np


def record_audio(
    duration_s: float = 10.0,
    sample_rate: int = 16000,
    channels: int = 1,
) -> np.ndarray:
    """Record audio from default microphone.

    Parameters
    ----------
    duration_s : float
        Recording duration in seconds.
    sample_rate : int
        Sample rate (16kHz for voice).
    channels : int
        Number of channels (1 = mono).

    Returns
    -------
    np.ndarray
        Audio samples as float32 array.
    """
    try:
        import sounddevice as sd
    except ImportError:
        print("ERROR: pip install sounddevice")
        sys.exit(1)

    print(f"  Recording {duration_s}s at {sample_rate}Hz...")
    audio = sd.rec(
        int(duration_s * sample_rate),
        samplerate=sample_rate,
        channels=channels,
        dtype="float32",
    )
    sd.wait()
    return audio.flatten()


def save_wav(audio: np.ndarray, path: str, sample_rate: int = 16000) -> None:
    """Save audio as WAV file."""
    try:
        import soundfile as sf
    except ImportError:
        print("ERROR: pip install soundfile")
        sys.exit(1)

    sf.write(path, audio, sample_rate)


def extract_gemaps(wav_path: str) -> np.ndarray:
    """Extract GeMAPS v02 features (88-dim) from WAV file.

    Uses openSMILE library — Geneva Minimalistic Acoustic Parameter Set.
    Features include: F₀, formants F1-F3, jitter, shimmer, HNR, MFCCs, etc.

    Parameters
    ----------
    wav_path : str
        Path to WAV file.

    Returns
    -------
    np.ndarray
        88-dimensional feature vector.
    """
    try:
        import opensmile
    except ImportError:
        print("ERROR: pip install opensmile")
        sys.exit(1)

    smile = opensmile.Smile(
        feature_set=opensmile.FeatureSet.GeMAPSv02,
        feature_level=opensmile.FeatureLevel.Functionals,
    )
    features = smile.process_file(wav_path)
    return features.values.flatten()


def collect_session(
    output_dir: Path,
    participant_id: str,
    n_sentences: int = 10,
    duration_s: float = 10.0,
) -> list[dict[str, Any]]:
    """Run a collection session for one participant.

    Prompts the participant to read sentences and records each.

    Parameters
    ----------
    output_dir : Path
        Directory to save WAV files and features.
    participant_id : str
        Unique participant identifier.
    n_sentences : int
        Number of sentences to record.
    duration_s : float
        Duration per recording.

    Returns
    -------
    list[dict]
        List of recording metadata.
    """
    wav_dir = output_dir / "wav"
    wav_dir.mkdir(parents=True, exist_ok=True)

    sentences = [
        "Hôm nay tôi cảm thấy khỏe mạnh và tràn đầy năng lượng.",
        "Tôi đã ngủ rất ngon đêm qua và thức dậy sảng khoái.",
        "Công việc hôm nay khiến tôi cảm thấy hơi mệt mỏi.",
        "Tôi đang rất vui vì hoàn thành được mục tiêu tập thể dục.",
        "Thời tiết hôm nay rất đẹp, tôi muốn đi dạo ngoài trời.",
        "Tôi cần nghỉ ngơi thêm vì cảm thấy căng thẳng.",
        "Bữa ăn của tôi hôm nay rất lành mạnh và đầy đủ dinh dưỡng.",
        "Tôi đang cố gắng duy trì thói quen tập thể dục đều đặn.",
        "Giấc ngủ không tốt khiến tôi cảm thấy uể oải cả ngày.",
        "Tôi rất lạc quan về sức khỏe của mình trong tương lai.",
    ]

    recordings = []
    for i in range(min(n_sentences, len(sentences))):
        print(f"\n--- Recording {i + 1}/{n_sentences} ---")
        print(f'  Sentence: "{sentences[i]}"')
        input("  Press ENTER when ready to record...")

        audio = record_audio(duration_s)

        filename = f"{participant_id}_s{i + 1:02d}.wav"
        wav_path = str(wav_dir / filename)
        save_wav(audio, wav_path)

        # Extract features
        features = extract_gemaps(wav_path)

        recordings.append({
            "participant_id": participant_id,
            "sentence_id": i + 1,
            "filename": filename,
            "duration_s": duration_s,
            "n_features": len(features),
            "features": features.tolist(),
        })

        print(f"  Saved: {filename} ({len(features)} features)")

    return recordings


def save_features_csv(
    recordings: list[dict[str, Any]],
    output_path: Path,
) -> None:
    """Save extracted features to CSV.

    Columns: participant_id, sentence_id, filename, feat_0, feat_1, ..., feat_87
    """
    if not recordings:
        return

    n_feat = recordings[0]["n_features"]
    header = ["participant_id", "sentence_id", "filename"]
    header += [f"feat_{i}" for i in range(n_feat)]

    with open(output_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        for rec in recordings:
            row = [rec["participant_id"], rec["sentence_id"], rec["filename"]]
            row += rec["features"]
            writer.writerow(row)

    print(f"\nFeatures saved to: {output_path}")


def main():
    parser = argparse.ArgumentParser(description="ARA Voice Data Collection")
    parser.add_argument("--output-dir", type=str, default="./data/voice")
    parser.add_argument("--participant", type=str, required=True)
    parser.add_argument("--sentences", type=int, default=10)
    parser.add_argument("--duration", type=float, default=10.0)
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"=== ARA MetaboliQ Voice Data Collection ===")
    print(f"Participant: {args.participant}")
    print(f"Sentences: {args.sentences}")
    print(f"Duration: {args.duration}s each")
    print(f"Output: {output_dir}")

    recordings = collect_session(
        output_dir=output_dir,
        participant_id=args.participant,
        n_sentences=args.sentences,
        duration_s=args.duration,
    )

    features_path = output_dir / f"features_{args.participant}.csv"
    save_features_csv(recordings, features_path)

    print(f"\nDone! Collected {len(recordings)} recordings.")


if __name__ == "__main__":
    main()
