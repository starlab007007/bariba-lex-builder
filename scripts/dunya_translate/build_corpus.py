#!/usr/bin/env python3
"""Build the FITILA "corpus d'or" for French <-> Baatɔnum translation.

Reads every bilingual resource of the app (dictionary, Apprendre, scenes,
exercises, Classe N2) and produces, under --out:

  parallel.jsonl        deduplicated pairs with grade / source / split / context
  glossary.json         headwords with senses, plural, focus form, class, theme
  preference.jsonl      (prompt, chosen, rejected) from exercise distractors
  multitask.jsonl       cloze ("fill:"), plural ("ba-pl:") and focus ("ba-foc:") tasks
  mono_ba.txt           Baatɔnum-only text (Classe, foncier) for back-translation
  to_validate.jsonl     pairs a human must confirm before they can train a model
  gold_candidates.jsonl + gold_review.csv   test sentences for teachers to validate
  report.json           volumes, noise fixed, per-source lexical reliability

Grades:  A  attested in the printed dictionary / validated scenes (clean)
         B  attested but repaired by heuristics, or generated exercise bank
         C  low lexical reliability (words unknown to the dictionary) -> not trained
         V  flagged "a_valider" -> validation queue only
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

from dunya_text import (
    alignment_issue, clean_ba, clean_fr, clean_headword, fold_ba, fold_fr, kind_of, split_sentences, tokens,
)

TEST_PERMILLE = 76
DEV_PERMILLE = 50
GOLD_TARGET = 500


def load(root: Path, name: str):
    return json.loads((root / name).read_text(encoding="utf-8"))


def bucket(key: str) -> int:
    return int(hashlib.sha1(key.encode("utf-8")).hexdigest(), 16) % 1000


def split_of(group: str) -> str:
    b = bucket(group)
    if b < TEST_PERMILLE:
        return "test"
    if b < TEST_PERMILLE + DEV_PERMILLE:
        return "dev"
    return "train"


def senses(definition: str) -> list[str]:
    """'eau, intérêt' -> ['eau', 'intérêt']; keeps short senses only."""
    base = re.sub(r"\(.*?\)", "", definition or "")
    out = []
    for part in re.split(r"[;,]", base):
        part, _ = clean_fr(part)
        part = part.strip(" .")
        if part and len(tokens(part)) <= 4:
            out.append(part)
    return out


class Corpus:
    def __init__(self) -> None:
        self.pairs: dict[tuple[str, str], dict] = {}
        self.to_validate: list[dict] = []
        self.stats = Counter()
        self.src_tokens: dict[str, list[str]] = defaultdict(list)

    def add(self, fr: str, ba: str, *, source: str, grade: str, group: str, kind: str | None = None,
            ctx: dict | None = None, tags: list[str] | None = None, ref: str | None = None,
            force_train: bool = False) -> None:
        fr_c, fr_fix = clean_fr(fr)
        ba_c, ba_fix = clean_ba(ba)
        fr_c = fr_c.strip()
        ba_c = ba_c.strip()
        if not fr_c or not ba_c or ba_c.lower() == "none":
            self.stats["skipped_empty"] += 1
            return
        resolved_kind = kind or kind_of(fr_c, ba_c)
        issue = alignment_issue(fr_c, ba_c, resolved_kind)
        if issue:
            self.stats["rejected_" + issue.split()[0]] += 1
            self.to_validate.append({"fr": fr_c, "ba": ba_c, "kind": resolved_kind, "grade": "V", "sources": [source],
                                     "reason": issue, "group": group, "ctx": None, "tags": [], "ref": ref})
            return
        if (fr_fix or ba_fix) and grade == "A" and (re.search(r"\w-\s", fr) or re.search(r"\w-\s", ba)):
            grade = "B"
            self.stats["downgraded_ocr"] += 1
        self.stats["ocr_fixed"] += int(fr_fix or ba_fix)
        self.src_tokens[source].extend(fold_ba(t) for t in tokens(ba_c))
        record = {
            "fr": fr_c, "ba": ba_c, "kind": kind or kind_of(fr_c, ba_c), "grade": grade,
            "sources": [source], "tags": tags or [], "ctx": ctx, "ref": ref,
            "group": group, "force_train": force_train,
        }
        if grade == "V":
            self.to_validate.append(record)
            return
        key = (fold_fr(fr_c), fold_ba(ba_c))
        existing = self.pairs.get(key)
        if existing is None:
            self.pairs[key] = record
            return
        self.stats["merged_duplicates"] += 1
        existing["sources"] = sorted(set(existing["sources"] + [source]))
        existing["tags"] = sorted(set(existing["tags"] + record["tags"]))
        if existing["ctx"] is None and ctx:
            existing["ctx"] = ctx
        if existing["ref"] is None and ref:
            existing["ref"] = ref
        if record["grade"] < existing["grade"]:  # "A" < "B" < "C"
            existing["grade"] = record["grade"]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=str(Path(__file__).resolve().parents[2] / "fitila_flutter/assets/data"))
    ap.add_argument("--out", default=str(Path(__file__).resolve().parents[2] / "data/translation"))
    args = ap.parse_args()
    data, out = Path(args.data), Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    corpus = Corpus()
    glossary: dict[str, dict] = {}
    multitask: list[dict] = []
    preference: list[dict] = []
    mono: list[str] = []

    def gloss_entry(ba_head: str) -> dict:
        key = fold_ba(ba_head)
        return glossary.setdefault(key, {
            "ba": ba_head, "fr": [], "pos": None, "plural": None, "focus": None, "cls": None,
            "freq": None, "themes": [], "ref": None, "phonetic": None, "examples": 0, "sources": [],
        })

    # ---- 1. Dictionary --------------------------------------------------
    dictionary = load(data, "dictionnaire_ameliore.json")
    for entry in dictionary:
        head = clean_headword(entry.get("word", ""))
        if not head:
            continue
        g = gloss_entry(head)
        g["pos"] = g["pos"] or (entry.get("part_of_speech") or "").strip() or None
        g["phonetic"] = g["phonetic"] or (entry.get("phonetic") or "").strip() or None
        definition = clean_fr(entry.get("definition", ""))[0].strip(" .")
        if definition and definition not in g["fr"]:
            g["fr"].append(definition)
        g["sources"] = sorted(set(g["sources"] + ["dictionary"]))
        for sense in senses(entry.get("definition", "")):
            corpus.add(sense, head, source="dict_gloss", grade="A", group="gloss:" + fold_ba(head),
                       kind="word", tags=["gloss"], force_train=True)
        eb, ef = (entry.get("example_bariba") or "").strip(), (entry.get("example_francais") or "").strip()
        if eb and ef:
            g["examples"] += 1
            corpus.add(ef, eb, source="dict_example", grade="A", group="ex:" + fold_ba(eb), tags=["dictionnaire"])

    # ---- 2. Apprendre ---------------------------------------------------
    app = load(data, "apprendre_v2.json")
    theme_names = {t["id"]: t["name_fr"] for t in app["themes"]}
    for card in app["cards"]:
        head = clean_headword(card["ba"])
        g = gloss_entry(head)
        g["plural"] = card.get("pl") or g["plural"]
        g["focus"] = card.get("foc") or g["focus"]
        g["cls"] = card.get("cls") or g["cls"]
        g["freq"] = card.get("f") if g["freq"] is None else g["freq"]
        g["ref"] = card.get("id") or g["ref"]
        g["pos"] = g["pos"] or card.get("pos")
        g["themes"] = sorted(set(g["themes"] + [theme_names.get(t, t) for t in card.get("th", [])]))
        g["sources"] = sorted(set(g["sources"] + ["apprendre"]))
        fr_main = clean_fr(card["fr"])[0].strip(" .")
        if fr_main and fr_main not in g["fr"]:
            g["fr"].append(fr_main)
        themes = [theme_names.get(t, t) for t in card.get("th", [])]
        for sense in senses(card["fr"]):
            corpus.add(sense, head, source="apprendre_card", grade="A", group="gloss:" + fold_ba(head),
                       kind="word", tags=["gloss"] + themes, ref=card.get("id"), force_train=True)
        if card.get("ex_ba") and card.get("ex_fr"):
            corpus.add(card["ex_fr"], card["ex_ba"], source="apprendre_card", grade="A",
                       group="ex:" + fold_ba(card["ex_ba"]), tags=["apprendre"] + themes, ref=card.get("id"))
            if card.get("cloze"):
                ex_tokens = tokens(card["ex_ba"])
                target = fold_ba(head)
                for i, tok in enumerate(ex_tokens):
                    if fold_ba(tok) == target:
                        blanked = " ".join(ex_tokens[:i] + ["___"] + ex_tokens[i + 1:])
                        multitask.append({"task": "fill", "input": f"fill: {clean_ba(blanked)[0]} || fr: {clean_fr(card['ex_fr'])[0]}",
                                          "target": tok.strip(".,;:!?"), "ref": card.get("id"), "group": "ex:" + fold_ba(card["ex_ba"])})
                        break
        if card.get("pl"):
            multitask.append({"task": "plural", "input": f"ba-pl: {head}", "target": clean_ba(card["pl"])[0],
                              "ref": card.get("id"), "group": "gloss:" + fold_ba(head)})
        if card.get("foc"):
            multitask.append({"task": "focus", "input": f"ba-foc: {head}", "target": clean_ba(card["foc"])[0],
                              "ref": card.get("id"), "group": "gloss:" + fold_ba(head)})

    for scene in app["scenes"]:
        previous = None
        for line in scene["lines"]:
            if line.get("ba") and line.get("fr"):
                ctx = {"scene": scene["id"], "place": scene.get("place"), "who": line.get("who"),
                       "prev": previous}
                corpus.add(line["fr"], line["ba"], source="apprendre_scene", grade="A",
                           group="scene:" + scene["id"], ctx=ctx, tags=["dialogue"], ref=line.get("src"))
                previous = {"fr": clean_fr(line["fr"])[0], "ba": clean_ba(line["ba"])[0]}
    for proverb in app["proverbs"]:
        corpus.add(proverb["fr"], proverb["ba"], source="apprendre_proverb", grade="A",
                   group="ex:" + fold_ba(proverb["ba"]), tags=["proverbe"], ref=proverb.get("src"))

    for foundation in app["foundations"]:
        for section in foundation["sections"]:
            kind = section["type"]
            if kind in ("examples", "culture"):
                for item in section.get("items", []):
                    status = item.get("status", "atteste")
                    corpus.add(item["fr"], item["ba"], source="apprendre_foundation",
                               grade="A" if status == "atteste" else "V",
                               group="ex:" + fold_ba(item["ba"]), tags=[foundation["id"]], ref=item.get("ref"))
            elif kind == "pairs":
                for item in section.get("items", []):
                    for side in ("a", "b"):
                        w = item[side]
                        corpus.add(w["fr"], w["ba"], source="apprendre_foundation", grade="A",
                                   group="gloss:" + fold_ba(w["ba"]), kind="word", tags=["tons"],
                                   ref=w.get("ref"), force_train=True)
            elif kind == "order":
                corpus.add(section["fr"], " ".join(section["ba"]), source="apprendre_foundation", grade="A",
                           group="ex:" + fold_ba(" ".join(section["ba"])), tags=["ordre-svo"], ref=section.get("src"))
            elif kind == "table":
                cols = [c.lower() for c in section.get("columns", [])]
                if len(cols) >= 2 and cols[0].startswith("bàátɔ̀nú") and cols[1].startswith("fran"):
                    for row in section["rows"]:
                        corpus.add(row[1], row[0], source="apprendre_foundation", grade="A",
                                   group="gloss:" + fold_ba(row[0]), kind="word", tags=["grammaire"], force_train=True)
        for quiz in foundation.get("quiz", []):
            if quiz.get("type") == "mcq":
                wrong = [o for o in quiz["options"] if o != quiz["answer"]]
                if len(wrong) >= 1 and re.search(r"« .+ » (se dit|veut dire)", quiz["prompt"]):
                    multitask.append({"task": "quiz", "input": quiz["prompt"], "target": quiz["answer"],
                                      "rejected": wrong, "group": "quiz:" + quiz["prompt"]})

    # ---- 3. Scenes ------------------------------------------------------
    scenes = load(data, "scenes_v2.json")
    categories = {c["id"]: c["title"] for c in scenes["categories"]}
    for scene in scenes["scenes"]:
        previous = None
        for line in scene["lines"]:
            if line.get("ba") and line.get("fr"):
                status = line.get("status", "atteste")
                ctx = {"scene": scene["id"], "place": scene.get("place"), "category": categories.get(scene["category"]),
                       "level": scene.get("level"), "who": scene["roles"].get(line.get("who"), line.get("who")),
                       "prev": previous}
                corpus.add(line["fr"], line["ba"], source="scene", grade="A" if status == "atteste" else "V",
                           group="scene:" + scene["id"], ctx=ctx, tags=["dialogue", categories.get(scene["category"], "")],
                           ref=line.get("ref"))
                previous = {"fr": clean_fr(line["fr"])[0], "ba": clean_ba(line["ba"])[0]}
        for word in scene.get("vocab", []):
            corpus.add(word["fr"], word["ba"], source="scene_vocab", grade="A", group="gloss:" + fold_ba(word["ba"]),
                       kind="word", tags=["gloss"], ref=word.get("ref"), force_train=True)

    # ---- 4. Exercises (generated bank -> grade B, distractors -> preferences)
    exercises = load(data, "learning_exercises.json")["exercises"]
    for theme, items in exercises.items():
        for item in items:
            fr, ba = clean_fr(item["french"])[0], clean_ba(item["bariba"])[0]
            corpus.add(fr, ba, source="exercise", grade="B", group="ex:" + fold_ba(ba), tags=["exercice", theme])
            for wrong in item.get("distractors_ba", []):
                wrong_c = clean_ba(wrong)[0]
                if fold_ba(wrong_c) != fold_ba(ba):
                    preference.append({"prompt": f"fr-ba: {fr}", "chosen": ba, "rejected": wrong_c, "source": "exercise"})
            for wrong in item.get("distractors_fr", []):
                wrong_c = clean_fr(wrong)[0]
                if fold_fr(wrong_c) != fold_fr(fr):
                    preference.append({"prompt": f"ba-fr: {ba}", "chosen": fr, "rejected": wrong_c, "source": "exercise"})
    for item in multitask:
        if item["task"] == "quiz":
            for wrong in item["rejected"]:
                preference.append({"prompt": item["input"], "chosen": item["target"], "rejected": wrong, "source": "quiz"})

    # ---- 5. Classe N2 (bilingual passages, usually LLM-assisted -> checked by coverage)
    def align(ba_text: str, fr_text: str, source: str, tag: str, group: str) -> None:
        ba_blocks = [b for b in re.split(r"\n+", ba_text or "") if b.strip()]
        fr_blocks = [b for b in re.split(r"\n+", fr_text or "") if b.strip()]
        if len(ba_blocks) != len(fr_blocks):
            return
        for i, (bb, fb) in enumerate(zip(ba_blocks, fr_blocks)):
            bs, fs = split_sentences(bb), split_sentences(fb)
            if len(bs) == len(fs) and len(bs) > 1:
                for j, (b1, f1) in enumerate(zip(bs, fs)):
                    corpus.add(f1, b1, source=source, grade="C", group=f"{group}:{i}:{j}", tags=[tag])
            elif len(tokens(bb)) <= 40:
                corpus.add(fb, bb, source=source, grade="C", group=f"{group}:{i}", tags=[tag])

    for section in load(data, "classeContentN2Grammar.json")["GRAMMAR_N2_SECTIONS"]:
        for block in section.get("content", []):
            if block.get("content") and block.get("contentFr"):
                align(block["content"], block["contentFr"], "classe_n2_grammar", "classe-grammaire", "n2g:" + section["id"])
    for item in load(data, "classeContentN2TextProd.json")["TEXT_PRODUCTION_TYPES"]:
        align(item.get("example", ""), item.get("exampleFr", ""), "classe_n2_textprod", "classe-texte", "n2t:" + item["id"])
        align(item.get("definition", ""), item.get("definitionFr", ""), "classe_n2_textprod", "classe-texte", "n2td:" + item["id"])
    for item in load(data, "classeContentN2Gestion.json")["GESTION_N2_DOCUMENTS"]:
        align(item.get("definition", ""), item.get("definitionFr", ""), "classe_n2_gestion", "classe-gestion", "n2d:" + item["id"])

    # ---- 6. Monolingual Baatɔnum (back-translation material) -------------
    classe = load(data, "classe_content.json")
    for lesson in classe["CLASSE_LESSONS"] + load(data, "classe_web_parity.json")["lessons"]:
        for part in [lesson.get("text", "")] + [x for v in lesson.get("sections", {}).values() for x in v]:
            mono.append(part)
    for item in load(data, "classeVoiceContent.json")["items"]:
        if item["content_type"] in ("text", "question", "instruction", "answer", "exercise"):
            mono.append(item["content_text"])
    for article in load(data, "foncier_bariba_corpus.json"):
        mono.append(article.get("content", ""))
    mono_lines = []
    for text in mono:
        for line in re.split(r"\n+", text or ""):
            line = re.sub(r"^\s*\d+\s*[-.)]\s*", "", line)
            line, _ = clean_ba(line)
            if len(tokens(line)) >= 3:
                mono_lines.append(line)
    mono_lines = sorted(set(mono_lines))

    # ---- 7. Lexical reliability per source & grade C ----------------------
    dict_vocab = set()
    for g in glossary.values():
        dict_vocab.update(fold_ba(t) for t in tokens(g["ba"]))
    for rec in corpus.pairs.values():
        if "dict_example" in rec["sources"]:
            dict_vocab.update(fold_ba(t) for t in tokens(rec["ba"]))
    reliability = {}
    for source, toks in corpus.src_tokens.items():
        toks = [t for t in toks if t and not t.isdigit()]
        known = sum(1 for t in toks if t in dict_vocab)
        reliability[source] = round(known / max(len(toks), 1), 3)
    for rec in corpus.pairs.values():
        if rec["grade"] == "C":
            ts = [fold_ba(t) for t in tokens(rec["ba"])]
            cover = sum(1 for t in ts if t in dict_vocab) / max(len(ts), 1)
            if cover >= 0.75:
                rec["grade"] = "B"  # words are known: plausible, keep
            else:
                corpus.to_validate.append({**rec, "reason": f"lexical coverage {cover:.2f}"})
    corpus.pairs = {k: v for k, v in corpus.pairs.items() if v["grade"] != "C"}

    # ---- 8. Split without leakage ----------------------------------------
    records = list(corpus.pairs.values())
    for rec in records:
        rec["split"] = "train" if rec["force_train"] else split_of(rec["group"])
        rec["id"] = hashlib.sha1(f"{rec['fr']}|{rec['ba']}".encode("utf-8")).hexdigest()[:10]
    held_ba = {fold_ba(r["ba"]) for r in records if r["split"] != "train"}
    held_fr = {fold_fr(r["fr"]) for r in records if r["split"] != "train"}
    before = len(records)
    records = [r for r in records if r["split"] != "train" or r["kind"] == "word"
               or (fold_ba(r["ba"]) not in held_ba and fold_fr(r["fr"]) not in held_fr)]
    corpus.stats["dropped_leaking_train"] = before - len(records)
    for rec in records:
        rec.pop("force_train", None)
        rec["sources"] = sorted(rec["sources"])

    # ---- 9. Gold candidates ------------------------------------------------
    test = [r for r in records if r["split"] == "test" and r["grade"] == "A" and r["kind"] in ("sentence", "phrase")]
    test.sort(key=lambda r: bucket("gold" + r["id"]))
    gold = test[:GOLD_TARGET]
    for rec in gold:
        rec["tags"] = sorted(set(rec["tags"] + (["question"] if "?" in rec["fr"] + rec["ba"] else [])
                                 + (["long"] if len(tokens(rec["fr"])) >= 9 else [])
                                 + (["negation"] if re.search(r"\b(ne|n')\b.*\b(pas|plus|jamais|rien)\b", rec["fr"].lower()) else [])))

    # ---- 10. Write -------------------------------------------------------
    def dump_jsonl(path: Path, rows: list[dict]) -> None:
        with path.open("w", encoding="utf-8") as fh:
            for row in rows:
                fh.write(json.dumps(row, ensure_ascii=False) + "\n")

    records.sort(key=lambda r: (r["split"], r["id"]))
    dump_jsonl(out / "parallel.jsonl", records)
    dump_jsonl(out / "gold_candidates.jsonl", gold)
    dump_jsonl(out / "to_validate.jsonl", corpus.to_validate)
    dump_jsonl(out / "preference.jsonl", preference)
    dump_jsonl(out / "multitask.jsonl", multitask)
    (out / "mono_ba.txt").write_text("\n".join(mono_lines) + "\n", encoding="utf-8")
    ordered_glossary = sorted(glossary.values(), key=lambda g: fold_ba(g["ba"]))
    (out / "glossary.json").write_text(json.dumps(ordered_glossary, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    with (out / "gold_review.csv").open("w", encoding="utf-8-sig", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(["id", "francais", "bariba_reference", "reference_correcte(O/N)", "correction_ou_commentaire"])
        for rec in gold:
            writer.writerow([rec["id"], rec["fr"], rec["ba"], "", ""])

    by_split = Counter(r["split"] for r in records)
    by_grade = Counter(r["grade"] for r in records)
    by_kind = Counter(r["kind"] for r in records)
    by_source = Counter(s for r in records for s in r["sources"])
    report = {
        "pairs": len(records), "by_split": by_split, "by_grade": by_grade, "by_kind": by_kind, "by_source": by_source,
        "sentence_pairs_train": sum(1 for r in records if r["split"] == "train" and r["kind"] != "word"),
        "glossary_headwords": len(glossary),
        "glossary_with_plural": sum(1 for g in glossary.values() if g["plural"]),
        "glossary_with_focus": sum(1 for g in glossary.values() if g["focus"]),
        "multitask": Counter(m["task"] for m in multitask),
        "preference_pairs": len(preference), "mono_ba_lines": len(mono_lines),
        "to_validate": len(corpus.to_validate), "gold_candidates": len(gold),
        "source_lexical_reliability": reliability,
        "cleaning": corpus.stats,
    }
    (out / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
