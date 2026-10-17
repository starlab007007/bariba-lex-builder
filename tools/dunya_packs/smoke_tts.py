#!/usr/bin/env python3
"""Real offline ONNX inference gate; does not claim linguistic correctness."""
import argparse
import json
import pathlib
import time
import wave
import zipfile
from array import array

import sherpa_onnx


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pack", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    base = pathlib.Path(args.out)
    base.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.pack) as z:
        if "tts-bba/model.onnx" not in z.namelist():
            raise SystemExit("MMS model absent")
        z.extractall(base / "model")
    source = base / "model" / "tts-bba"
    model = str(source / "model.onnx")
    tokens = str(source / "tokens.txt")
    config = sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            vits=sherpa_onnx.OfflineTtsVitsModelConfig(
                model=model, tokens=tokens,
            ),
            num_threads=2,
        ),
        max_num_sentences=1,
    )
    if not config.validate():
        raise SystemExit("Config MMS ONNX invalide")
    engine = sherpa_onnx.OfflineTts(config)
    normalization = {}
    norm = source / "normalize.json"
    if norm.is_file():
        normalization = json.loads(norm.read_text(encoding="utf-8"))
    report = []
    samples = ["A kua", "N kua weru", "Bɛɛ ka weru"]
    for i, text in enumerate(samples):
        clean = text.lower().replace("’", "'")
        for old, new in sorted(normalization.items(), key=lambda x: -len(x[0])):
            clean = clean.replace(old, new)
        start = time.monotonic()
        result = engine.generate(clean, sid=0, speed=0.9)
        elapsed = time.monotonic() - start
        if not len(result.samples) or not result.sample_rate:
            raise SystemExit("MMS n'a produit aucun audio")
        duration = len(result.samples) / result.sample_rate
        if duration <= 0.1 or duration > 45:
            raise SystemExit("Duree d'audio non plausible")
        pcm = array("h", (max(-32768, min(32767, int(v * 32767))) for v in result.samples))
        path = base / f"bba_{i:02d}.wav"
        with wave.open(str(path), "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(result.sample_rate)
            wav.writeframes(pcm.tobytes())
        report.append({
            "source_text": text,
            "engine_text": clean,
            "sample_rate": result.sample_rate,
            "duration_seconds": round(duration, 3),
            "elapsed_seconds": round(elapsed, 3),
            "rtf": round(elapsed / duration, 4),
            "wav": path.name,
            "quality_certified": False,
        })
    (base / "TTS_SMOKE_REPORT.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
