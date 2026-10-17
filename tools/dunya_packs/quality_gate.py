#!/usr/bin/env python3
"""Language quality release gate from native Baatɔnum human evaluations.

CSV format: text_id,speaker_id,village,correctly_understood,tone_score,naturalness_score
Every row corresponds to one *independently scored audio* from the actual
candidate pack. This gate never fabricates scores or substitutes ASR metrics.
"""
import argparse
import csv
import json
import statistics
from pathlib import Path


def evaluate(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    required = {"text_id", "speaker_id", "village",
                "correctly_understood", "tone_score", "naturalness_score"}
    if not rows or not required.issubset(rows[0]):
        raise ValueError("Fichier de notes incomplet")
    texts = {x["text_id"].strip() for x in rows}
    speakers = {x["speaker_id"].strip() for x in rows}
    villages = {x["village"].strip() for x in rows}
    if len(texts) < 30 or len(speakers) < 5 or len(villages) < 3:
        raise ValueError("Il faut au moins 30 textes, 5 locuteurs, 3 villages")
    combinations = {(r["text_id"], r["speaker_id"]) for r in rows}
    if len(combinations) != len(rows):
        raise ValueError("Evaluations texte/locuteur dupliquees")
    if any(sum(r["text_id"] == t for r in rows) < 5 for t in texts):
        raise ValueError("Chaque texte doit etre ecoute par 5 locuteurs minimum")
    understand, tone, naturalness = [], [], []
    for row in rows:
        if row["correctly_understood"] not in ("0", "1"):
            raise ValueError("correctly_understood attend 0 ou 1")
        understand.append(int(row["correctly_understood"]))
        for key, target in (("tone_score", tone), ("naturalness_score", naturalness)):
            score = float(row[key])
            if not 1 <= score <= 5:
                raise ValueError(key + " doit etre compris entre 1 et 5")
            target.append(score)
    report = {
        "speakers": len(speakers), "villages": len(villages),
        "texts": len(texts), "judgments": len(rows),
        "understood_rate": round(statistics.mean(understand), 4),
        "tone_mean": round(statistics.mean(tone), 3),
        "naturalness_mean": round(statistics.mean(naturalness), 3),
    }
    # Release acceptance thresholds, not an assertion about today's model.
    report["passed"] = (
        report["understood_rate"] >= .90
        and report["tone_mean"] >= 4.0
        and report["naturalness_mean"] >= 4.0
    )
    return report


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("csv")
    p.add_argument("--report", type=Path)
    args = p.parse_args()
    result = evaluate(args.csv)
    if args.report:
        args.report.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
    if not result["passed"]:
        raise SystemExit("QUALITE NON VALIDEE - publication interdite")
