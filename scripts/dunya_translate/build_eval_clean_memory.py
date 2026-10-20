#!/usr/bin/env python3
"""Build evaluation-only FITILA corpus-memory candidates with held-out source exclusion.

Does not claim human approval, edit production memory, or modify models.
"""
import argparse
import json
import unicodedata
from pathlib import Path


def norm(text):
    return " ".join(unicodedata.normalize("NFC", str(text or "")).casefold().split()).strip(" .!?")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    ap.add_argument("--work", default="dist/dunya-byt5-certification")
    args = ap.parse_args()
    root = Path(args.root)
    work = root / args.work
    candidate_path = work / "offline_memory_candidates.json"
    records = json.loads(candidate_path.read_text(encoding="utf-8"))["entries"]
    heldout = set()
    sizes = {}
    for path, split_only in [
        (root / "data/translation/gold_candidates.jsonl", False),
        (root / "data/translation/parallel.jsonl", True),
    ]:
        if not path.is_file():
            raise SystemExit(f"Required evaluation dataset missing: {path}")
        count = 0
        with path.open(encoding="utf-8-sig") as fh:
            for line in fh:
                if not line.strip():
                    continue
                item = json.loads(line)
                if split_only and item.get("split") not in ("dev", "test"):
                    continue
                if item.get("fr"):
                    heldout.add(("fr-ba", norm(item["fr"])))
                if item.get("ba"):
                    heldout.add(("ba-fr", norm(item["ba"])))
                count += 1
        sizes[str(path)] = count
    kept = []
    removed = []
    for record in records:
        k = (record["direction"], norm(record["source"]))
        (removed if k in heldout else kept).append(record)
    report = {
        "candidate_count": len(records), "heldout_source_count": len(heldout),
        "removed_overlap": len(removed), "remaining_candidates": len(kept),
        "data_rows": sizes, "scope": "evaluation-only",
        "human_approved": False,
    }
    (work / "offline_memory_eval_clean.json").write_text(
        json.dumps({"format": "fitila-corpus-candidates/1", "scope": "evaluation-only",
                    "human_approved": False, "entries": kept}, ensure_ascii=False, indent=2),
        encoding="utf-8")
    (work / "holdout_exclusions.json").write_text(
        json.dumps(removed, ensure_ascii=False, indent=2), encoding="utf-8")
    (work / "holdout_clean_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
