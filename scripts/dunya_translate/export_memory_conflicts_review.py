#!/usr/bin/env python3
"""Export FITILA corpus-memory collisions for human review; never auto-approve."""
import argparse
import csv
import json
import unicodedata
from collections import defaultdict
from pathlib import Path


def normalized(value):
    return " ".join(unicodedata.normalize("NFC", value).casefold().split()).strip(" .!?")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--memory", default="fitila_flutter/assets/data/dunya_memory.json")
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    pairs = json.loads(Path(args.memory).read_text(encoding="utf-8"))["pairs"]
    groups = defaultdict(list)
    for pair in pairs:
        if not isinstance(pair, list) or len(pair) < 3:
            continue
        fr, ba, grade = pair[:3]
        if not fr or not ba:
            continue
        groups[("fr-ba", normalized(fr))].append((fr, ba, grade))
        groups[("ba-fr", normalized(ba))].append((ba, fr, grade))
    rows = []
    group_count = 0
    for (direction, _), options in sorted(groups.items()):
        if len({normalized(item[1]) for item in options}) <= 1:
            continue
        group_count += 1
        grades = {item[2] for item in options}
        priority = ("P1_MIXTE_A_B" if len(grades) > 1 else
                    "P2_PLUS_DE_DEUX" if len(options) > 2 else "P3_DEUX_VARIANTES")
        for order, (src, target, grade) in enumerate(options, start=1):
            rows.append({
                "Groupe": f"CF-{group_count:04d}", "Priorite": priority,
                "Direction": direction, "Phrase_source": src,
                "Variante_numero": order, "Nombre_variantes": len(options),
                "Traduction_candidate": target, "Grade_corpus": grade,
                "Decision_linguiste": "A_VALIDER", "Traduction_retenue": "",
                "Justification": "", "Validateur": "", "Date_validation": "",
            })
    output = Path(args.out)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8-sig", newline="") as handle:
        fields = ["Groupe", "Priorite", "Direction", "Phrase_source", "Variante_numero",
                  "Nombre_variantes", "Traduction_candidate", "Grade_corpus",
                  "Decision_linguiste", "Traduction_retenue",
                  "Justification", "Validateur", "Date_validation"]
        writer = csv.DictWriter(handle, fieldnames=fields, delimiter=";")
        writer.writeheader()
        writer.writerows(rows)
    print(json.dumps({"groups": group_count, "candidate_rows": len(rows),
                      "output": str(output)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
