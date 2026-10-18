#!/usr/bin/env python3
"""Evidence-based release gate for the actual offline FITILA translation pack.

This does NOT run inference. It only evaluates independent reports produced by
the HF/ONNX test harness, the bilingual held-out evaluator and Android tests.
It refuses to certify candidate or missing evidence.
"""
import argparse
import hashlib
import json
from pathlib import Path

DIRECTIONS = ("fr-ba", "ba-fr")


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(8 * 1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def validate(parity, quality, android, *, min_examples=100, min_chrf=45.0):
    if parity.get("parity_only_not_quality_certification") is not True:
        raise ValueError("Incorrect ONNX parity report format")
    if not android.get("physical_device") or not android.get("airplane_mode"):
        raise ValueError("Real Android airplane-mode inference evidence is required")
    if android.get("runtime") != "onnxruntime-mobile":
        raise ValueError("The mobile inference engine was not verified")
    if not android.get("model_sha256"):
        raise ValueError("Android checkpoint fingerprint is missing")
    metrics = quality.get("report", quality).get("by_direction", {})
    for direction in DIRECTIONS:
        result = parity.get("by_direction", {}).get(direction, {})
        if result.get("total", 0) < 20 or result.get("matched") != result.get("total"):
            raise ValueError(f"HF/ONNX parity failed for {direction}")
        score = metrics.get(direction, {})
        if score.get("n", 0) < min_examples:
            raise ValueError(f"Insufficient held-out examples for {direction}")
        if score.get("sacrebleu_chrf++", 0) < min_chrf:
            raise ValueError(f"Below quality threshold for {direction}")
        if score.get("loop", 1) > 0.02:
            raise ValueError(f"Repetition rate too high for {direction}")
        samples = android.get("by_direction", {}).get(direction, {})
        if samples.get("passed", 0) < 20 or samples.get("failed", 1) != 0:
            raise ValueError(f"Android offline inference not passed for {direction}")
    if android.get("ram_peak_mb", 1e9) > 3000:
        raise ValueError("Mobile memory exceeds 3 GB budget")
    if android.get("p95_latency_ms", 1e9) > 12000:
        raise ValueError("P95 mobile latency exceeds 12 seconds")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--parity", required=True)
    p.add_argument("--quality", required=True)
    p.add_argument("--android", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--min-examples", type=int, default=100)
    p.add_argument("--min-chrf", type=float, default=45.0)
    args = p.parse_args()
    inputs = [Path(args.parity), Path(args.quality), Path(args.android)]
    reports = [json.loads(path.read_text(encoding="utf-8")) for path in inputs]
    validate(*reports, min_examples=args.min_examples, min_chrf=args.min_chrf)
    certificate = {
        "certification": "fr-bba-bidirectional-android-v1",
        "approved_for_pack_publication": True,
        "evidence_sha256": {p.name: sha256(p) for p in inputs},
        "requirements": {
            "minimum_examples_per_direction": args.min_examples,
            "minimum_sacrebleu_chrf++": args.min_chrf,
            "maximum_loop_rate": 0.02,
            "maximum_ram_mb": 3000,
            "maximum_p95_ms": 12000,
        },
        "note": "Machine evidence gate; requires a separate human linguistic review before public release.",
    }
    out = Path(args.out)
    out.write_text(json.dumps(certificate, ensure_ascii=False, indent=2), encoding="utf-8")
    print(out)


if __name__ == "__main__":
    main()
