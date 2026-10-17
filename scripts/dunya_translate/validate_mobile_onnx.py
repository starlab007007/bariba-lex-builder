#!/usr/bin/env python3
"""Gate the real FITILA ByT5 mobile ONNX export against its HF checkpoint.

Run after export_mobile_onnx.py. This performs REAL CPU inference in both
translation directions; successful graph loading alone is not a quality test.
The script never sets manifest.tested=true automatically.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import onnxruntime as ort
import torch
from transformers import AutoModelForSeq2SeqLM

EOS, START = 1, 0


def encode(text: str) -> list[int]:
    return [b + 3 for b in text.encode("utf-8")[:511]] + [EOS]


def decode(tokens: list[int]) -> str:
    return bytes(t - 3 for t in tokens if 3 <= t <= 258).decode("utf-8", errors="replace").strip()


def hf_greedy(model, prompt: str, limit: int) -> str:
    ids = torch.tensor([encode(prompt)], dtype=torch.long)
    with torch.inference_mode():
        prediction = model.generate(
            input_ids=ids, attention_mask=torch.ones_like(ids),
            max_new_tokens=limit, num_beams=1, do_sample=False,
        )[0].tolist()
    return decode(prediction)


def onnx_greedy(encoder, decoder, prompt: str, limit: int) -> str:
    ids = np.array([encode(prompt)], dtype=np.int64)
    mask = np.ones_like(ids)
    states = encoder.run(None, {"input_ids": ids, "attention_mask": mask})[0]
    generated = [START]
    for _ in range(limit):
        logits = decoder.run(None, {
            "decoder_input_ids": np.array([generated], dtype=np.int64),
            "encoder_hidden_states": states,
            "encoder_attention_mask": mask,
        })[0]
        token = int(np.argmax(logits[0, -1]))
        if token == EOS:
            break
        generated.append(token)
    return decode(generated)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True, help="Exact fine-tuned checkpoint used for export")
    ap.add_argument("--pack-dir", required=True, help="Parent folder containing byt5/")
    ap.add_argument("--gold", default="data/translation/gold_candidates.jsonl")
    ap.add_argument("--samples-per-direction", type=int, default=12)
    ap.add_argument("--max-new-tokens", type=int, default=192)
    ap.add_argument("--out", default="byt5_onnx_parity.json")
    args = ap.parse_args()

    directory = Path(args.pack_dir) / "byt5"
    config = json.loads((directory / "config.json").read_text(encoding="utf-8"))
    assert config["format"] == "fitila-byt5-mobile/1"
    assert config["tokenizer"] == "byt5-bytes-plus-3"
    model = AutoModelForSeq2SeqLM.from_pretrained(args.model).cpu().eval()
    opts = ort.SessionOptions()
    encoder = ort.InferenceSession(str(directory / "encoder.onnx"), opts, providers=["CPUExecutionProvider"])
    decoder = ort.InferenceSession(str(directory / "decoder.onnx"), opts, providers=["CPUExecutionProvider"])

    gold = [json.loads(line) for line in Path(args.gold).open(encoding="utf-8") if line.strip()]
    cases = []
    for direction, src_key, prefix_key in [
        ("fr-ba", "fr", "prefix_fr_ba"), ("ba-fr", "ba", "prefix_ba_fr")
    ]:
        selected = [r for r in gold if r.get(src_key)][:args.samples_per_direction]
        if not selected:
            raise ValueError(f"No gold test cases for {direction}")
        for record in selected:
            prompt = config[prefix_key] + record[src_key]
            hf = hf_greedy(model, prompt, args.max_new_tokens)
            onnx = onnx_greedy(encoder, decoder, prompt, args.max_new_tokens)
            cases.append({
                "id": record.get("id"), "direction": direction, "reference": record.get("ba" if direction == "fr-ba" else "fr"),
                "hf": hf, "onnx": onnx, "exact_parity": hf == onnx,
            })

    by_dir = {direction: {
        "total": sum(c["direction"] == direction for c in cases),
        "matched": sum(c["direction"] == direction and c["exact_parity"] for c in cases),
    } for direction in ("fr-ba", "ba-fr")}
    report = {"checkpoint": args.model, "quantized": config.get("quantized"),
              "by_direction": by_dir, "cases": cases,
              "parity_only_not_quality_certification": True}
    Path(args.out).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"by_direction": by_dir, "report": args.out}, ensure_ascii=False))
    if any(not c["exact_parity"] for c in cases):
        raise SystemExit("ONNX/HF greedy mismatch: inspect report before publication")


if __name__ == "__main__":
    main()
