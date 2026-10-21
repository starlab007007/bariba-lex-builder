#!/usr/bin/env python3
"""Evaluate a FR<->Baatɔnum translator on the held-out gold set.

Backends
  memory   floor baseline: nearest translation-memory sentence, else word-by-word glossary
  space    the public FITILA ByT5 Hugging Face Space (needs internet: run it in CI)
  hf       a local transformers checkpoint, optionally with retrieval hints (--rag)
  jsonl    predictions produced elsewhere: {"id","direction","hyp"} per line

Reports chrF++, exact match, lexical validity (words known to the lexicon), loop
rate and format errors, overall and per tag. The memory comes from TRAIN pairs only.
"""

from __future__ import annotations

import argparse
import json
import re
import time
from collections import defaultdict
from pathlib import Path

from dunya_text import build_input, fold_ba, fold_fr, tokens
from retrieval import Memory
from v004_prompt import to_v004
from reward import chrf, format_score, lexical_validity, reward


def load_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.open(encoding="utf-8")]


class MemoryBackend:
    name = "memory-baseline"

    def __init__(self, memory: Memory) -> None:
        self.memory = memory

    def __call__(self, direction: str, text: str) -> str:
        found = self.memory.similar(direction, text, k=1, threshold=0.5)
        if found:
            rec = found[0][0]
            return rec["ba"] if direction == "fr-ba" else rec["fr"]
        hints = dict((src.lower(), tgt) for src, tgt in self.memory.dic_hints(direction, text, limit=40))
        return " ".join(hints.get(t.lower(), t) for t in tokens(text))


class SpaceBackend:
    def __init__(self, url: str, mode: str, autocorrect: bool = True) -> None:
        from gradio_client import Client
        self.client = Client(url)
        self.mode = mode
        self.autocorrect = autocorrect
        self.name = "space-byt5-v03" + ("" if autocorrect else "-no-autocorrect")

    def __call__(self, direction: str, text: str) -> str:
        for attempt in range(4):
            try:
                out = self.client.predict(text, direction, self.mode, True, self.autocorrect, api_name="/translate_pipeline")
                return (out[0] if isinstance(out, (list, tuple)) else out) or ""
            except Exception as exc:  # cold start / queue timeouts
                time.sleep(3 * (attempt + 1))
                last = exc
        print("space failed:", last)
        return ""


class HfBackend:
    def __init__(self, path: str, memory: Memory, rag: bool, beams: int, prefix_style: str = "plain") -> None:
        import torch
        from transformers import AutoModelForSeq2SeqLM
        self.torch, self.memory, self.rag, self.beams, self.prefix_style = torch, memory, rag, beams, prefix_style
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = AutoModelForSeq2SeqLM.from_pretrained(path).to(self.device).eval()
        self.name = f"hf:{Path(path).name}{'+rag' if rag else ''}"

    def __call__(self, direction: str, text: str) -> str:
        mem = dic = None
        if self.rag:
            found = self.memory.similar(direction, text, k=2)
            mem = [((m["fr"], m["ba"]) if direction == "fr-ba" else (m["ba"], m["fr"])) for m, _ in found] or None
            dic = self.memory.dic_hints(direction, text) or None
        prompt = build_input(direction, text, mem, dic)
        if self.prefix_style == "v004":
            prompt = to_v004(prompt)
        ids = [b + 3 for b in prompt.encode("utf-8")][:511] + [1]
        with self.torch.no_grad():
            out = self.model.generate(self.torch.tensor([ids], device=self.device), max_new_tokens=256, num_beams=self.beams,
                                      no_repeat_ngram_size=3 if self.prefix_style == "v004" else 0,
                                      repetition_penalty=1.10 if self.prefix_style == "v004" else 1.0)
        data = bytes(i - 3 for i in out[0].tolist() if 3 <= i < 259)
        return data.decode("utf-8", errors="ignore")


def build_vocab(records: list[dict], glossary: list[dict]) -> tuple[set[str], set[str]]:
    ba, fr = set(), set()
    for r in records:
        ba.update(fold_ba(t) for t in tokens(r["ba"]))
        fr.update(fold_fr(t) for t in tokens(r["fr"]))
    for g in glossary:
        ba.update(fold_ba(t) for t in tokens(g["ba"]))
        for d in g["fr"]:
            fr.update(fold_fr(t) for t in tokens(d))
    return ba, fr


def main() -> None:
    root = Path(__file__).resolve().parents[2] / "data/translation"
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=str(root))
    ap.add_argument("--backend", choices=["memory", "space", "hf", "jsonl"], default="memory")
    ap.add_argument("--space-url", default="https://zimesongbian-modele-byt5-bariba-expert-api-v03-improve.hf.space")
    ap.add_argument("--space-mode", default="Qualite maximale")
    ap.add_argument("--no-autocorrect", action="store_true", help="Space: disable its rule-based post-correction")
    ap.add_argument("--model", default=None)
    ap.add_argument("--rag", action="store_true")
    ap.add_argument("--beams", type=int, default=4)
    ap.add_argument("--prefix-style", choices=["plain", "v004"], default="plain")
    ap.add_argument("--predictions", default=None)
    ap.add_argument("--gold", default=None, help="gold jsonl (default: gold_candidates.jsonl)")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    data = Path(args.data)
    records = load_jsonl(data / "parallel.jsonl")
    glossary = json.loads((data / "glossary.json").read_text(encoding="utf-8"))
    memory = Memory([r for r in records if r["split"] == "train"], glossary)
    vocab_ba, vocab_fr = build_vocab(records, glossary)
    gold = load_jsonl(Path(args.gold) if args.gold else data / "gold_candidates.jsonl")
    if args.limit:
        gold = gold[: args.limit]

    if args.backend == "memory":
        backend = MemoryBackend(memory)
    elif args.backend == "space":
        backend = SpaceBackend(args.space_url, args.space_mode, not args.no_autocorrect)
    elif args.backend == "hf":
        backend = HfBackend(args.model, memory, args.rag, args.beams, args.prefix_style)
    else:
        preds = {(p["id"], p["direction"]): p["hyp"] for p in load_jsonl(Path(args.predictions))}
        backend = lambda d, t, _p=preds: ""  # noqa: E731
        backend.name = "jsonl"

    rows = []
    for rec in gold:
        for direction in ("fr-ba", "ba-fr"):
            src, ref = (rec["fr"], rec["ba"]) if direction == "fr-ba" else (rec["ba"], rec["fr"])
            if args.backend == "jsonl":
                hyp = preds.get((rec["id"], direction), "")
            else:
                hyp = backend(direction, src)
            to_ba = direction == "fr-ba"
            rows.append({
                "id": rec["id"], "direction": direction, "src": src, "ref": ref, "hyp": hyp, "tags": rec.get("tags", []),
                "chrf": chrf(hyp, ref), "exact": int(fold_ba(hyp) == fold_ba(ref)) if to_ba else int(fold_fr(hyp) == fold_fr(ref)),
                "lex": lexical_validity(hyp, vocab_ba if to_ba else vocab_fr, to_ba),
                "fmt": format_score(hyp, src), "reward": reward(src, hyp, ref, vocab_ba if to_ba else vocab_fr, to_ba),
                "loop": int(format_score(hyp, src) <= 0.5 and bool(hyp)),
            })

    def agg(sub: list[dict]) -> dict:
        n = max(len(sub), 1)
        out = {"n": len(sub)}
        for key in ("chrf", "exact", "lex", "fmt", "reward", "loop"):
            out[key] = round(sum(r[key] for r in sub) / n, 4)
        return out

    report = {"backend": getattr(backend, "name", args.backend), "overall": agg(rows),
              "by_direction": {d: agg([r for r in rows if r["direction"] == d]) for d in ("fr-ba", "ba-fr")}, "by_tag": {}}
    tags = defaultdict(list)
    for r in rows:
        for t in r["tags"]:
            tags[t].append(r)
    report["by_tag"] = {t: agg(v) for t, v in sorted(tags.items(), key=lambda kv: -len(kv[1])) if len(v) >= 20}
    try:  # standard chrF++ for comparability with papers
        from sacrebleu.metrics import CHRF
        scorer = CHRF(word_order=2)
        for d in ("fr-ba", "ba-fr"):
            sub = [r for r in rows if r["direction"] == d]
            report["by_direction"][d]["sacrebleu_chrf++"] = round(scorer.corpus_score([r["hyp"] for r in sub], [[r["ref"] for r in sub]]).score, 2)
    except Exception:
        pass

    out = Path(args.out) if args.out else data / f"eval_{re.sub(r'[^a-z0-9]+', '_', report['backend'])}.json"
    out.write_text(json.dumps({"report": report, "rows": rows}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
