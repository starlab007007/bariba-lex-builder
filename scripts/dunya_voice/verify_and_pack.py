#!/usr/bin/env python3
"""Verify DUNYA voice models with sherpa-onnx, then build installable packs.

A pack is an uncompressed ZIP (models do not compress) with a manifest.json
listing every file with its SHA-256, so the phone can check integrity offline
after a Wi-Fi download or a transfer by SD card / phone-to-phone sharing.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import time
import wave
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import sherpa_onnx


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def load_normalization(folder: Path) -> dict[str, str]:
    path = folder / "normalize.json"
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def normalize(text: str, mapping: dict[str, str]) -> str:
    text = text.lower()
    for src in sorted(mapping, key=len, reverse=True):
        text = text.replace(src, mapping[src])
    return text


def tts(folder: Path, text: str, out_wav: Path) -> tuple[np.ndarray, int, float]:
    config = sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            vits=sherpa_onnx.OfflineTtsVitsModelConfig(
                model=str(folder / "model.onnx"),
                lexicon="",
                tokens=str(folder / "tokens.txt"),
            ),
            num_threads=2,
            debug=False,
        ),
        max_num_sentences=1,
    )
    engine = sherpa_onnx.OfflineTts(config)
    start = time.time()
    audio = engine.generate(normalize(text, load_normalization(folder)), sid=0, speed=1.0)
    elapsed = time.time() - start
    samples = np.asarray(audio.samples, dtype=np.float32)
    with wave.open(str(out_wav), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(audio.sample_rate)
        wf.writeframes((np.clip(samples, -1, 1) * 32767).astype(np.int16).tobytes())
    return samples, audio.sample_rate, elapsed


def resample(samples: np.ndarray, src: int, dst: int = 16000) -> np.ndarray:
    if src == dst:
        return samples
    n = int(len(samples) * dst / src)
    return np.interp(np.linspace(0, len(samples), n, endpoint=False), np.arange(len(samples)), samples).astype(np.float32)


def asr(folder: Path, samples: np.ndarray, rate: int) -> tuple[str, float]:
    recognizer = sherpa_onnx.OfflineRecognizer.from_omnilingual_asr_ctc(
        model=str(folder / "model.int8.onnx"),
        tokens=str(folder / "tokens.txt"),
        num_threads=2,
    )
    stream = recognizer.create_stream()
    stream.accept_waveform(16000, resample(samples, rate))
    start = time.time()
    recognizer.decode_stream(stream)
    return stream.result.text, time.time() - start


def build_pack(root: Path, pack_id: str, title: str, folders: list[str], licenses: dict, out_zip: Path) -> dict:
    files = []
    for folder in folders:
        for path in sorted((root / folder).rglob("*")):
            if path.is_file() and path.name not in ("export_info.json",):
                files.append({
                    "path": path.relative_to(root).as_posix(),
                    "size": path.stat().st_size,
                    "sha256": sha256(path),
                })
    manifest = {
        "format": "dunya-pack/1",
        "id": pack_id,
        "title": title,
        "version": 1,
        "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "components": folders,
        "files": files,
        "licenses": licenses,
        "total_bytes": sum(f["size"] for f in files),
    }
    with zipfile.ZipFile(out_zip, "w", compression=zipfile.ZIP_STORED, allowZip64=True) as zf:
        zf.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False, indent=1))
        for f in files:
            zf.write(root / f["path"], f["path"])
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True, help="folder holding asr/, tts-bba/, tts-fra/")
    parser.add_argument("--dist", required=True)
    args = parser.parse_args()

    root, dist = Path(args.root), Path(args.dist)
    dist.mkdir(parents=True, exist_ok=True)
    report: dict = {"checks": []}

    for lang, text in (
        ("bba", "A kua. N kua weru."),
        ("fra", "Bonjour, je suis Dunya. Comment puis-je vous aider ?"),
    ):
        folder = root / f"tts-{lang}"
        samples, rate, elapsed = tts(folder, text, dist / f"sample-{lang}.wav")
        duration = len(samples) / max(rate, 1)
        if duration < 0.4 or float(np.max(np.abs(samples))) < 0.01:
            raise SystemExit(f"TTS {lang} produced silent/empty audio ({duration:.2f}s)")
        heard, asr_time = asr(root / "asr", samples, rate)
        check = {
            "lang": lang,
            "text": text,
            "audio_seconds": round(duration, 2),
            "tts_seconds": round(elapsed, 2),
            "asr_round_trip": heard,
            "asr_seconds": round(asr_time, 2),
        }
        report["checks"].append(check)
        print(json.dumps(check, ensure_ascii=False))

    fr_wav = root / "asr" / "test_wavs" / "fr.wav"
    if fr_wav.exists():
        with wave.open(str(fr_wav)) as wf:
            pcm = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32) / 32768
            heard, asr_time = asr(root / "asr", pcm, wf.getframerate())
        report["checks"].append({"lang": "fra-reference", "asr": heard, "asr_seconds": round(asr_time, 2)})
        print("fr.wav ->", heard)

    core = build_pack(
        root,
        "dunya-voice-core",
        "DUNYA Voix — écoute FR/Bariba + voix bariba",
        ["asr", "tts-bba"],
        {
            "asr": "Apache-2.0 — Meta Omnilingual ASR via sherpa-onnx",
            "tts-bba": "CC-BY-NC-4.0 — Meta MMS-TTS (prototype, usage non commercial)",
        },
        dist / "dunya-voice-core-v1.zip",
    )
    fr = build_pack(
        root,
        "dunya-voice-fr",
        "DUNYA Voix française de secours",
        ["tts-fra"],
        {"tts-fra": "CC-BY-NC-4.0 — Meta MMS-TTS (prototype, usage non commercial)"},
        dist / "dunya-voice-fr-v1.zip",
    )
    for manifest in (core, fr):
        (dist / f"{manifest['id']}-v1.manifest.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8"
        )
    report["packs"] = {
        core["id"]: core["total_bytes"],
        fr["id"]: fr["total_bytes"],
    }
    (dist / "VOICE_PACK_REPORT.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
