#!/usr/bin/env python3
"""Real greedy FP32 versus selective INT8 evaluation; exploratory, NOT certification.

Outputs predictions for independent linguistic review. Do not conflate greedy
results with Android's beam search, or parity-to-FP32 with translation quality.
"""
import argparse
import json
import math
import statistics
import time
from pathlib import Path

import numpy as np
import onnxruntime as ort

EOS = 1
START = 0


def encode(text):
    return [b + 3 for b in text.encode("utf-8")[:511]] + [EOS]


def decode(ids):
    return bytes(int(x) - 3 for x in ids if 3 <= x <= 258).decode("utf-8", errors="replace").strip()


def load(pack, threads):
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = threads
    opts.inter_op_num_threads = 1
    base = Path(pack) / "byt5"
    config = json.loads((base / "config.json").read_text(encoding="utf-8"))
    encoder = ort.InferenceSession(str(base / "encoder.onnx"), opts, providers=["CPUExecutionProvider"])
    decoder = ort.InferenceSession(str(base / "decoder.onnx"), opts, providers=["CPUExecutionProvider"])
    return (encoder, decoder, config)


def run(engine, text, direction, limit):
    encoder, decoder, config = engine
    prefix = config["prefix_fr_ba"] if direction == "fr-ba" else config["prefix_ba_fr"]
    ids = np.asarray([encode(prefix + text)], dtype=np.int64)
    mask = np.ones_like(ids)
    start = time.perf_counter()
    states = encoder.run(None, {"input_ids": ids, "attention_mask": mask})[0]
    out = [START]
    for _ in range(limit):
        logits = decoder.run(None, {
            "decoder_input_ids": np.asarray([out], dtype=np.int64),
            "encoder_hidden_states": states,
            "encoder_attention_mask": mask,
        })[0]
        token = int(np.argmax(logits[0, -1, :]))
        if token == EOS:
            break
        out.append(token)
    return decode(out), round((time.perf_counter()-start)*1000, 1)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--fp32", required=True)
    parser.add_argument("--candidates-root", required=True)
    parser.add_argument("--gold", default="data/translation/gold_candidates.jsonl")
    parser.add_argument("--samples-per-direction", type=int, default=5)
    parser.add_argument("--max-new-tokens", type=int, default=120)
    parser.add_argument("--threads", type=int, default=2)
    parser.add_argument("--out", default="dist/dunya-byt5-int8-candidates/quality_comparison.json")
    args = parser.parse_args()
    if args.samples_per_direction < 1:
        parser.error("samples-per-direction must be positive")
    from sacrebleu.metrics import CHRF
    scorer = CHRF(word_order=2)
    records = [json.loads(line) for line in Path(args.gold).read_text(encoding="utf-8").splitlines() if line.strip()]
    cases = []
    for direction, source, target in [("fr-ba", "fr", "ba"), ("ba-fr", "ba", "fr")]:
        eligible = [r for r in records if r.get(source) and r.get(target) and r.get("split") == "test"]
        if len(eligible) < args.samples_per_direction:
            raise SystemExit(f"{direction}: only {len(eligible)} gold test records")
        for r in eligible[:args.samples_per_direction]:
            cases.append({"id": r.get("id"), "direction": direction, "source": r[source], "reference": r[target]})
    profiles = {"fp32": args.fp32}
    for name in ("encoder-only", "decoder-only", "both-matmul"):
        profiles[name] = str(Path(args.candidates_root) / name)
    results = {}
    for name, folder in profiles.items():
        print(f"RUNNING {name}", flush=True)
        engine = load(folder, args.threads)
        predictions = []
        for i, case in enumerate(cases, 1):
            prediction, latency = run(engine, case["source"], case["direction"], args.max_new_tokens)
            predictions.append({**case, "prediction": prediction, "latency_ms": latency})
            print(f"  {i}/{len(cases)} {case['direction']} {latency:.0f}ms", flush=True)
        by_direction = {}
        for direction in ("fr-ba", "ba-fr"):
            subset = [r for r in predictions if r["direction"] == direction]
            score = scorer.corpus_score([r["prediction"] for r in subset],
                                        [[r["reference"] for r in subset]]).score
            by_direction[direction] = {
                "n": len(subset),
                "sacrebleu_chrf++": round(score, 2),
                "latency_median_ms": round(statistics.median(r["latency_ms"] for r in subset), 1),
                "latency_p95_ms": round(sorted(r["latency_ms"] for r in subset)[math.ceil(.95*len(subset))-1], 1),
            }
        results[name] = {"by_direction": by_direction, "predictions": predictions}
        print(json.dumps({"profile": name, "by_direction": by_direction}, ensure_ascii=False), flush=True)
        del engine
    for name in results:
        if name == "fp32": continue
        for direction in ("fr-ba", "ba-fr"):
            a = [x for x in results["fp32"]["predictions"] if x["direction"] == direction]
            b = [x for x in results[name]["predictions"] if x["direction"] == direction]
            results[name]["by_direction"][direction]["exact_match_fp32"] = sum(x["prediction"] == y["prediction"] for x,y in zip(a,b))
    report = {"purpose": "exploratory_greedy_not_mobile_or_human_certification", "settings": vars(args), "results": results}
    target = Path(args.out); target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"REPORT={target}")


if __name__ == "__main__":
    main()
