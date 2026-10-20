#!/usr/bin/env python3
"""Audit independently collected bilingual evaluation pairs BEFORE ByT5 scoring.

Never labels legacy corpus rows as held-out. Requires explicit provenance and
confirmation of non-membership in model training and model-selection datasets.
A source not found in the packaged memory may still be in training data.
"""
import argparse
import csv
import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path


def normalized(s):
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", s).casefold()).strip(" .!?;:,\t")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, help="UTF-8 CSV: id,fr,ba,reviewer,provenance,training_excluded")
    ap.add_argument("--memory", default="fitila_flutter/assets/data/dunya_memory.json")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    memory = json.loads(Path(args.memory).read_text(encoding="utf-8"))
    fr_memory = {normalized(row[0]) for row in memory["pairs"] if len(row) >= 2}
    ba_memory = {normalized(row[1]) for row in memory["pairs"] if len(row) >= 2}
    rows = list(csv.DictReader(Path(args.input).open(encoding="utf-8-sig", newline="")))
    required = {"id", "fr", "ba", "reviewer", "provenance", "training_excluded"}
    if not rows:
        raise SystemExit("Empty review CSV: create new bilingual pairs, do not copy dictionary examples.")
    if not required.issubset(rows[0]):
        raise SystemExit("Missing CSV fields: " + ", ".join(sorted(required - set(rows[0]))))
    dup = Counter(normalized(row["fr"]) for row in rows)
    problems = []
    selected = []
    for row in rows:
        reasons = []
        fr, ba = normalized(row["fr"]), normalized(row["ba"])
        if not fr or not ba: reasons.append("missing_translation")
        if not row["reviewer"].strip(): reasons.append("missing_reviewer")
        if not row["provenance"].strip(): reasons.append("missing_provenance")
        if row["training_excluded"].strip().lower() not in ("yes", "oui", "true"):
            reasons.append("training_exclusion_unconfirmed")
        if fr in fr_memory: reasons.append("french_in_memory")
        if ba in ba_memory: reasons.append("baatonum_in_memory")
        if dup[fr] > 1: reasons.append("duplicate_french_source")
        if "�" in row["fr"] + row["ba"]: reasons.append("replacement_character")
        if reasons: problems.append({"id": row["id"], "reasons": reasons})
        else: selected.append(row)
    report = {
        "status": "REVIEW_REQUIRED",
        "input_rows": len(rows),
        "eligible_after_self_report_checks": len(selected),
        "rejected_rows": len(problems),
        "problems": problems,
        "warning": "Exclusion from packaged memory is NOT proof of independence from training or tuning. Verify provenance against all original splits/checkpoints.",
        "human_approval_and_training_independence_verified_by_tool": False,
    }
    target = Path(args.out); target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    if selected:
        accepted = target.with_name(target.stem + "-candidate.jsonl")
        with accepted.open("w", encoding="utf-8") as f:
            for row in selected:
                f.write(json.dumps({"id": row["id"], "fr": row["fr"], "ba": row["ba"], "split": "independent_candidate", "reviewer": row["reviewer"], "provenance": row["provenance"]}, ensure_ascii=False) + "\n")
        print(f"CANDIDATES={accepted}")
    print(json.dumps({"input_rows": len(rows), "candidate_rows": len(selected), "flagged_rows": len(problems)}, ensure_ascii=False))
    print(f"REPORT={target}")


if __name__ == "__main__":
    main()
