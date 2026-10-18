#!/usr/bin/env python3
"""Audit FITILA bilingual assets without promoting training/test material to approved memory."""
import argparse
import csv
import json
import unicodedata
from collections import Counter
from pathlib import Path


def clean(s):
    return " ".join(unicodedata.normalize("NFC", str(s or "")).split()).casefold()


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--root", default=".")
    p.add_argument("--out", required=True)
    args = p.parse_args()
    root, dest = Path(args.root), Path(args.out)
    dest.mkdir(parents=True, exist_ok=True)
    corpus = root / "data/translation/parallel.jsonl"
    gold = root / "data/translation/gold_candidates.jsonl"
    memory = root / "fitila_flutter/assets/data/dunya_memory.json"
    pending = root / "dist/dunya-byt5-v4-fp32/revision_linguistique_v4.csv"
    if not corpus.is_file() or not gold.is_file() or not memory.is_file():
        raise SystemExit("Missing parallel, gold or DUNYA memory data")
    records = [json.loads(line) for line in corpus.open(encoding="utf-8-sig") if line.strip()]
    gold_rows = [json.loads(line) for line in gold.open(encoding="utf-8-sig") if line.strip()]
    excluded = set()
    for record in gold_rows:
        excluded.add((clean(record.get("fr")), clean(record.get("ba"))))
        excluded.add((clean(record.get("ba")), clean(record.get("fr"))))
    if pending.is_file():
        with pending.open(encoding="utf-8-sig", newline="") as file:
            for row in csv.DictReader(file, delimiter=";"):
                excluded.add((clean(row.get("Source")), clean(row.get("Reference"))))
                excluded.add((clean(row.get("Reference")), clean(row.get("Source"))))
    grades = Counter()
    splits = Counter()
    for record in records:
        splits[record.get("split", "unknown")] += 1
        grades[record.get("grade", "unknown")] += 1

    source = json.loads(memory.read_text(encoding="utf-8-sig"))
    pairs = source.get("pairs", [])
    candidates = []
    seen = set()
    skipped_gold = 0
    for item in pairs:
        if not isinstance(item, list) or len(item) < 3:
            continue
        fr, ba, grade = item[:3]
        key = (clean(fr), clean(ba))
        if not all(key) or key in seen or grade != "A":
            continue
        seen.add(key)
        if key in excluded or (key[1], key[0]) in excluded:
            skipped_gold += 1
            continue
        candidates.append({"fr": fr, "ba": ba, "grade": grade,
                           "source": "dunya_memory.json",
                           "review_status": "A_VALIDER"})
    with (dest / "candidates_for_review.csv").open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["fr", "ba", "grade", "source", "review_status"],
                                delimiter=";")
        writer.writeheader()
        writer.writerows(candidates)
    report = {"corpus_total": len(records), "splits": dict(splits),
              "grades": dict(grades), "gold_count": len(gold_rows),
              "candidate_count": len(candidates), "excluded_gold_overlap": skipped_gold,
              "approved_entries": 0,
              "warning": "Inventory only: no automatically approved translations"}
    (dest / "audit_memory.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
