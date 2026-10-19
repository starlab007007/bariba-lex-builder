#!/usr/bin/env python3
"""Evaluate conservative exact corpus-memory override + ByT5 outputs.

No implicit certification: grade A/B is NOT independent human approval.
Prevent conflicting normalized mappings and report exact source coverage.
A separate held-out evaluation is necessary to establish generalization.
"""
import argparse
import collections
import json
import re
import unicodedata
from pathlib import Path

from sacrebleu.metrics import CHRF


def fold_french(value):
    s = unicodedata.normalize("NFKD", value.lower().replace("’", "'"))
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9' ]", " ", s)
    return " ".join(s.split())


def fold_baatonum(value):
    # Conservative normalization for this independent analysis: preserve tone
    # and vowel distinction; do not collapse diacritics into unrelated words.
    return " ".join(unicodedata.normalize("NFC", value).casefold().split()).strip(" .,!?;:")


def index_memory(rows, direction):
    bucket = collections.defaultdict(set)
    for row in rows:
        if len(row) < 3: continue
        source, target = (row[0], row[1]) if direction == "fr-ba" else (row[1], row[0])
        norm = fold_french(source) if direction == "fr-ba" else fold_baatonum(source)
        if norm and target.strip():
            bucket[norm].add(target.strip())
    return {k: next(iter(v)) for k, v in bucket.items() if len(v) == 1}, sum(len(v) != 1 for v in bucket.values())


def score(rows):
    scorer = CHRF(word_order=2)
    return round(scorer.corpus_score([r["output"] for r in rows],
                                   [[r["reference"] for r in rows]]).score, 2)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--comparison", required=True)
    parser.add_argument("--memory", default="fitila_flutter/assets/data/dunya_memory.json")
    parser.add_argument("--profile", default="both-matmul")
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    comparison = json.loads(Path(args.comparison).read_text(encoding="utf-8"))
    memory = json.loads(Path(args.memory).read_text(encoding="utf-8"))
    predictions = comparison["results"][args.profile]["predictions"]
    pairs = memory["pairs"]
    report = {"status": "EXPLORATORY_NOT_CERTIFIED", "profile": args.profile,
              "warning": "Corpus grades are not human approvals; exact overlap with evaluation can inflate metrics.",
              "directions": {}, "examples": []}
    for direction in ("fr-ba", "ba-fr"):
        index, conflicts = index_memory(pairs, direction)
        candidates = [r for r in predictions if r["direction"] == direction]
        baseline, hybrid = [], []
        matched = 0
        for row in candidates:
            key = fold_french(row["source"]) if direction == "fr-ba" else fold_baatonum(row["source"])
            override = index.get(key)
            matched += override is not None
            baseline.append({"reference": row["reference"], "output": row["prediction"]})
            hybrid.append({"reference": row["reference"], "output": override or row["prediction"]})
            report["examples"].append({"id": row.get("id"), "direction": direction,
               "source": row["source"], "reference": row["reference"],
               "neural": row["prediction"], "hybrid": override or row["prediction"],
               "memory_hit": override is not None, "memory_human_approved": False})
        report["directions"][direction] = {
            "n": len(candidates), "exact_memory_hits": matched,
            "conflicting_normalized_keys_excluded": conflicts,
            "neural_chrf++": score(baseline), "hybrid_chrf++": score(hybrid),
            "independence_verified": False}
    dest = Path(args.out); dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report["directions"], ensure_ascii=False, indent=2))
    print("CAUTION: evaluation/test overlaps with memory are not generalization evidence.")
    print(f"REPORT={dest}")


if __name__ == "__main__":
    main()
