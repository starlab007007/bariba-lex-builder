#!/usr/bin/env python3
"""Stage 3 — preference optimisation (DPO) for the encoder-decoder ByT5.

Chosen = validated reference; rejected = a human-written wrong answer from the
exercise bank / quiz distractors (preference.jsonl) or a sampled failure
(preference_self.jsonl). A frozen copy of the SFT model is the reference policy.

  loss = -log σ( β [ (log π(c|x) - log π(r|x)) - (log π_ref(c|x) - log π_ref(r|x)) ] )
"""

from __future__ import annotations

import argparse
import random
from pathlib import Path

import torch
import torch.nn.functional as F

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
    ap.add_argument("--batch", type=int, default=2, help="micro-batch (fits a 16 GB T4)")
    ap.add_argument("--accum", type=int, default=4, help="gradient accumulation (effective batch = batch x accum)")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--tiny", action="store_true")
    args = ap.parse_args()
    seed_all(7)

    rows = read_jsonl(Path(args.data) / "preference.jsonl")
    extra = Path(args.data) / "training/preference_self.jsonl"
    if extra.exists():
        rows += read_jsonl(extra)
    if args.limit:
        rows = rows[: args.limit]
    device = "cuda" if torch.cuda.is_available() else "cpu"
    policy = load_model(args.model, args.tiny).to(device)

    # 1) Reference log-probabilities, computed once with the frozen SFT model and kept on
    #    the CPU: no second model in GPU memory during training (the T4 ran out of memory).
    policy.eval()
    ref_c, ref_r = [], []
    with torch.no_grad():
        for i in range(0, len(rows), 16):
            chunk = rows[i:i + 16]
            good, bad = batchify(chunk, "chosen", device), batchify(chunk, "rejected", device)
            ref_c.append(seq_logp(policy, good["input_ids"], good["attention_mask"], good["labels"]).cpu())
            ref_r.append(seq_logp(policy, bad["input_ids"], bad["attention_mask"], bad["labels"]).cpu())
    ref_c, ref_r = torch.cat(ref_c), torch.cat(ref_r)
    if device == "cuda":
        torch.cuda.empty_cache()
    print(f"reference log-probs ready for {len(rows)} pairs")

    # 2) Policy training with small micro-batches, gradient accumulation and checkpointing.
    policy.train()
    if hasattr(policy, "gradient_checkpointing_enable") and not args.tiny:
        policy.config.use_cache = False
        policy.gradient_checkpointing_enable()
    optimiser = torch.optim.AdamW(policy.parameters(), lr=args.lr)
    order = list(range(len(rows)))
    step = 0
    for epoch in range(args.epochs):
        random.shuffle(order)
        optimiser.zero_grad()
        for n, i in enumerate(range(0, len(order), args.batch)):
            idx = order[i:i + args.batch]
            chunk = [rows[j] for j in idx]
            good, bad = batchify(chunk, "chosen", device), batchify(chunk, "rejected", device)
            pc = seq_logp(policy, good["input_ids"], good["attention_mask"], good["labels"])
            pr = seq_logp(policy, bad["input_ids"], bad["attention_mask"], bad["labels"])
            rc, rr = ref_c[idx].to(device), ref_r[idx].to(device)
            margin = args.beta * ((pc - pr) - (rc - rr))
            loss = -F.logsigmoid(margin).mean() / args.accum
            loss.backward()
            if (n + 1) % args.accum == 0:
                torch.nn.utils.clip_grad_norm_(policy.parameters(), 1.0)
                optimiser.step()
                optimiser.zero_grad()
                step += 1
                if step % 20 == 0:
                    print(f"epoch {epoch} step {step} loss {loss.item() * args.accum:.4f} margin {margin.mean().item():.3f}")
    policy.save_pretrained(args.out)
    print("saved", args.out)


if __name__ == "__main__":
    main()
