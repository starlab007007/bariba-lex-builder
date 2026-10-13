#!/usr/bin/env python3
"""Stage 2 — reinforcement signal: sample n candidates per training source, score
them with reward.py and keep (a) the HARD examples the model still fails and
(b) preference pairs (reference/best vs worst sampled candidate).

  python mine_hard_examples.py --model out/byt5-v04 --samples 6
  -> training/hard.jsonl        examples to oversample in the next SFT round
  -> training/preference_self.jsonl   merged with preference.jsonl for DPO
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import torch

from byt_common import decode, encode, load_model, read_jsonl, MAX_IN
from dunya_text import fold_ba, fold_fr, tokens
from reward import reward


def main() -> None:
    root = Path(__file__).resolve().parents[2] / "data/translation"
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    ap.add_argument("--data", default=str(root))
    ap.add_argument("--samples", type=int, default=6)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--hard-threshold", type=float, default=0.6)
    ap.add_argument("--tiny", action="store_true")
    args = ap.parse_args()
    data = Path(args.data)
    train = [r for r in read_jsonl(data / "training/train.jsonl") if r["task"] == "translate"]
    if args.limit:
        train = train[: args.limit]
    records = read_jsonl(data / "parallel.jsonl")
    vocab_ba = {fold_ba(t) for r in records for t in tokens(r["ba"])}
    vocab_fr = {fold_fr(t) for r in records for t in tokens(r["fr"])}
    model = load_model(args.model, args.tiny).eval()

    hard, prefs = [], []
    for row in train:
        to_ba = row["direction"] == "fr-ba"
        ids = torch.tensor([encode(row["input"], MAX_IN)])
        with torch.no_grad():
            out = model.generate(ids, do_sample=True, top_k=40, temperature=0.9, num_return_sequences=args.samples, max_new_tokens=128)
        scored = []
        src = row["input"].split(": ", 1)[-1].split(" || ")[0]
        for seq in out:
            hyp = decode(seq.tolist())
            scored.append((reward(src, hyp, row["target"], vocab_ba if to_ba else vocab_fr, to_ba), hyp))
        scored.sort()
        best_reward = scored[-1][0]
        if best_reward < args.hard_threshold:
            hard.append(row)
        worst_reward, worst = scored[0]
        if worst and worst != row["target"] and worst_reward < 0.8:
            prefs.append({"prompt": row["input"], "chosen": row["target"], "rejected": worst, "source": "self-sample"})
    out_dir = data / "training"
    with (out_dir / "hard.jsonl").open("w", encoding="utf-8") as fh:
        for r in hard:
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")
    with (out_dir / "preference_self.jsonl").open("w", encoding="utf-8") as fh:
        for r in prefs:
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(json.dumps({"scanned": len(train), "hard": len(hard), "preferences": len(prefs)}))


if __name__ == "__main__":
    main()
