#!/usr/bin/env python3
"""Turn the corpus d'or into ByT5 training files (SFT) with retrieval hints.

Every example is the pair (input, target). Inputs are built with `build_input()`
in a random hint mode so the model works with *and* without memory/glossary:

  none 25% | mem+dic 35% | dic 20% | mem 20%    (+10% of mem hints are poisoned
  on purpose so the model learns not to copy blindly)

Memory for train examples = train pairs only (minus the example itself);
dev/test examples also use train memory only -> honest evaluation.
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

from dunya_text import build_input
from retrieval import Memory
from build_corpus import split_of


def ctx_text(ctx: dict | None) -> str | None:
    if not ctx:
        return None
    bits = [ctx.get("category") or ctx.get("place"), ctx.get("who")]
    text = " · ".join(b for b in bits if b)
    if ctx.get("prev"):
        text += f" · avant: {ctx['prev']['fr']} = {ctx['prev']['ba']}"
    return text[:220] or None


def make_example(rng: random.Random, memory: Memory, rec: dict, direction: str, pool: list[dict],
                 mode: str | None = None) -> dict:
    src, tgt = (rec["fr"], rec["ba"]) if direction == "fr-ba" else (rec["ba"], rec["fr"])
    mode = mode or rng.choices(["none", "both", "dic", "mem"], weights=[25, 35, 20, 20])[0]
    mem = dic = None
    if rec["kind"] != "word":
        if mode in ("both", "mem"):
            found = memory.similar(direction, src, k=2, exclude_ids={rec["id"]})
            mem = [((m["fr"], m["ba"]) if direction == "fr-ba" else (m["ba"], m["fr"])) for m, _ in found] or None
            if mem and rng.random() < 0.10:
                other = rng.choice(pool)
                mem = [((other["fr"], other["ba"]) if direction == "fr-ba" else (other["ba"], other["fr"]))]
        if mode in ("both", "dic"):
            dic = memory.dic_hints(direction, src) or None
    ctx = ctx_text(rec.get("ctx")) if mode != "none" and rng.random() < 0.6 else None
    return {
        "input": build_input(direction, src, mem, dic, ctx), "target": tgt, "task": "translate",
        "direction": direction, "id": rec["id"], "grade": rec["grade"], "hints": mode,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=str(Path(__file__).resolve().parents[2] / "data/translation"))
    ap.add_argument("--out", default=None)
    ap.add_argument("--seed", type=int, default=7)
    args = ap.parse_args()
    data = Path(args.data)
    out = Path(args.out or data / "training")
    out.mkdir(parents=True, exist_ok=True)
    rng = random.Random(args.seed)

    records = [json.loads(line) for line in (data / "parallel.jsonl").open(encoding="utf-8")]
    glossary = json.loads((data / "glossary.json").read_text(encoding="utf-8"))
    train = [r for r in records if r["split"] == "train"]
    memory = Memory(train, glossary)
    pool = [r for r in train if r["kind"] != "word"]

    files = {s: [] for s in ("train", "dev", "test")}
    for rec in records:
        copies = 2 if "proverbe" in rec["tags"] or "dialogue" in rec["tags"] else 1  # scarce, high value
        for _ in range(copies if rec["split"] == "train" else 1):
            for direction in ("fr-ba", "ba-fr"):
                files[rec["split"]].append(make_example(rng, memory, rec, direction, pool))
    for task in (json.loads(line) for line in (data / "multitask.jsonl").open(encoding="utf-8")):
        if task["task"] in ("plural", "focus") or split_of(task["group"]) == "train":
            if task["task"] != "quiz":
                files["train"].append({"input": task["input"], "target": task["target"], "task": task["task"],
                                       "direction": task["task"], "id": task.get("ref"), "grade": "A", "hints": "none"})
    rng.shuffle(files["train"])
    for split, rows in files.items():
        with (out / f"{split}.jsonl").open("w", encoding="utf-8") as fh:
            for row in rows:
                fh.write(json.dumps(row, ensure_ascii=False) + "\n")
    summary = {s: len(r) for s, r in files.items()}
    lengths = sorted(len(r["input"].encode("utf-8")) for r in files["train"])
    summary["input_bytes_p50_p95_max"] = [lengths[len(lengths) // 2], lengths[int(len(lengths) * .95)], lengths[-1]]
    (out / "summary.json").write_text(json.dumps(summary, indent=1), encoding="utf-8")
    print(json.dumps(summary, indent=1))


if __name__ == "__main__":
    main()
