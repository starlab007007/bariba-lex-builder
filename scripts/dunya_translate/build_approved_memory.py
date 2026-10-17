#!/usr/bin/env python3
"""Build a conservative OFFLINE translation-memory asset from human-approved CSV.

This tool deliberately excludes all unapproved gold candidates and generated
model outputs. It never uses fuzzy matching or guesses translations.
"""
from __future__ import annotations
import argparse
import csv
import json
import re
import unicodedata
from pathlib import Path

def normalize(text: str) -> str:
    text = unicodedata.normalize("NFC", text or "")
    return re.sub(r"\s+", " ", text).strip()

def build(source: Path, output: Path) -> dict:
    pairs = {}
    rejected = {"unapproved": 0, "incomplete": 0, "conflict": 0}
    with source.open(encoding="utf-8-sig", newline="") as fh:
        for row in csv.DictReader(fh, delimiter=";"):
            if normalize(row.get("Statut_validation", "")).upper() != "VALIDE":
                rejected["unapproved"] += 1
                continue
            direction = normalize(row.get("Direction", ""))
            src = normalize(row.get("Source", ""))
            target = normalize(row.get("Traduction_corrigee", ""))
            if direction not in ("fr-ba", "ba-fr") or not src or not target or not normalize(row.get("Reference_verifiee", "")):
                rejected["incomplete"] += 1
                continue
            key = (direction, src)
            if key in pairs and pairs[key] != target:
                rejected["conflict"] += 1
                del pairs[key]
                continue
            pairs[key] = target
    result = {"format": "fitila-approved-memory/1", "normalization": "NFC-whitespace/1",
              "entries": [{"direction": d, "source": s, "target": t}
                          for (d, s), t in sorted(pairs.items())],
              "rejected": rejected}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return result

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--reviewed-csv", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    result = build(Path(args.reviewed_csv), Path(args.out))
    print(json.dumps({"approved_entries": len(result["entries"]), "rejected": result["rejected"], "output": args.out}, ensure_ascii=False))
