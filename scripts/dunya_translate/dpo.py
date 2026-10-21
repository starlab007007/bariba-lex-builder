#!/usr/bin/env python3
"""Stage 3 — preference optimisation (DPO) for the encoder-decoder ByT5.

Chosen = validated reference; rejected = a human-written wrong answer from the
exercise bank / quiz distractors (preference.jsonl) or a sampled failure
(preference_self.jsonl). A frozen copy of the SFT model is the reference policy.

  loss = -log σ( β [ (log π(c|x) - log π(r|x)) - (log π_ref(c|x) - log π_ref(r|x)) ] )
"""

from __future__ import annotations

import argparse
import copy
import random
from pathlib import Path

import torch
import torch.nn.functional as F

from v004_prompt import to_v004
from byt_common import MAX_IN, MAX_OUT, collate, encode, load_model, read_jsonl, seed_all, seq_logp


def batchify(rows: list[dict], key: str, device) -> dict:
    items = [{"input_ids": encode(r["prompt"], MAX_IN), "labels": encode(r[key], MAX_OUT)} for r in rows]
    return {k: v.to(device) for k, v in collate(items).items()}


def main() -> None:
    root = Path(__file__).resolve().parents[2] / "data/translation"
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True, help="SFT checkpoint")
    ap.add_argument("--out", required=True)
    ap.add_argument("--data", default=str(root))
    ap.add_argument("--beta", type=float, default=0.1)
    ap.add_argument("--lr", type=float, default=2e-6)
    ap.add_argument("--epochs", type=int, default=1)
    ap.add_argument("--batch", type=int, default=8)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--tiny", action="store_true")
    ap.add_argument("--prefix-style", choices=["plain", "v004"], default="plain")
    args = ap.parse_args()
    seed_all(7)

    rows = read_jsonl(Path(args.data) / "preference.jsonl")
    extra = Path(args.data) / "training/preference_self.jsonl"
    if extra.exists():
        rows += read_jsonl(extra)
    if args.prefix_style == "v004":
        for r in rows:
            r["prompt"] = to_v004(r["prompt"])
    if args.limit:
        rows = rows[: args.limit]
    device = "cuda" if torch.cuda.is_available() else "cpu"
    policy = load_model(args.model, args.tiny).to(device).train()
    reference = copy.deepcopy(policy).eval()
    for p in reference.parameters():
        p.requires_grad_(False)
    optimiser = torch.optim.AdamW(policy.parameters(), lr=args.lr)

    for epoch in range(args.epochs):
        random.shuffle(rows)
        for i in range(0, len(rows), args.batch):
            chunk = rows[i:i + args.batch]
            good, bad = batchify(chunk, "chosen", device), batchify(chunk, "rejected", device)
            pc = seq_logp(policy, good["input_ids"], good["attention_mask"], good["labels"])
            pr = seq_logp(policy, bad["input_ids"], bad["attention_mask"], bad["labels"])
            with torch.no_grad():
                rc = seq_logp(reference, good["input_ids"], good["attention_mask"], good["labels"])
                rr = seq_logp(reference, bad["input_ids"], bad["attention_mask"], bad["labels"])
            margin = args.beta * ((pc - pr) - (rc - rr))
            loss = -F.logsigmoid(margin).mean()
            optimiser.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(policy.parameters(), 1.0)
            optimiser.step()
            if (i // args.batch) % 20 == 0:
                print(f"epoch {epoch} step {i // args.batch} loss {loss.item():.4f} margin {margin.mean().item():.3f}")
    policy.save_pretrained(args.out)
    print("saved", args.out)


if __name__ == "__main__":
    main()
