"""Translation memory + glossary retrieval (the "RAG" half of FITILA translation).

Used identically for: building training inputs, evaluation, and (ported to Dart
and TypeScript) at inference time on the phone and in the edge function.
"""

from __future__ import annotations

import math
from collections import defaultdict

from dunya_text import FR_STOP, fold_ba, fold_fr, tokens

BA_STOP = {"a", "na", "u", "ba", "ka", "ma", "ta", "ni", "nu", "ku", "ra", "mu", "ga", "ya", "ye", "n", "sa", "i",
           "bɛɛ", "man", "nun", "sun", "win", "nɛn", "ben", "wunɛn", "bɛɛn", "bɛsɛn", "koo", "ko", "yè"}


def _senses(gloss: str) -> list[str]:
    import re
    base = re.sub(r"\(.*?\)", "", gloss or "")
    out = []
    for part in re.split(r"[;,]", base):
        part = part.strip(" .")
        if part and len(part.split()) <= 4:
            out.append(part)
    return out


class Memory:
    def __init__(self, records: list[dict], glossary: list[dict]) -> None:
        self.pairs = [r for r in records if r["kind"] != "word"]
        self.exact_fr: dict[str, list[int]] = defaultdict(list)
        self.exact_ba: dict[str, list[int]] = defaultdict(list)
        self.post_fr: dict[str, list[int]] = defaultdict(list)
        self.post_ba: dict[str, list[int]] = defaultdict(list)
        self.toks_fr: list[set[str]] = []
        self.toks_ba: list[set[str]] = []
        for i, r in enumerate(self.pairs):
            self.exact_fr[fold_fr(r["fr"])].append(i)
            self.exact_ba[fold_ba(r["ba"])].append(i)
            tf = {fold_fr(t) for t in tokens(r["fr"]) if fold_fr(t) not in FR_STOP}
            tb = {fold_ba(t) for t in tokens(r["ba"]) if fold_ba(t) not in BA_STOP}
            self.toks_fr.append(tf)
            self.toks_ba.append(tb)
            for t in tf:
                self.post_fr[t].append(i)
            for t in tb:
                self.post_ba[t].append(i)
        n = max(len(self.pairs), 1)
        self.idf_fr = {t: math.log(1 + n / len(p)) for t, p in self.post_fr.items()}
        self.idf_ba = {t: math.log(1 + n / len(p)) for t, p in self.post_ba.items()}
        # glossary: ba -> first senses ; fr sense -> ba headwords
        self.ba_gloss: dict[str, str] = {}
        self.fr_to_ba: dict[str, list[str]] = defaultdict(list)
        for g in glossary:
            key = fold_ba(g["ba"])
            senses = [s for d in g["fr"] for s in _senses(d)]
            # Short or very polysemous words (particles, pronouns) give misleading hints.
            if senses and len(key) > 2 and len(g["fr"]) < 3:
                self.ba_gloss[key] = senses[0]
            for s in senses:
                heads = self.fr_to_ba[fold_fr(s)]
                if g["ba"] not in heads:
                    heads.append(g["ba"])

    # ---- exact -----------------------------------------------------------
    def exact(self, direction: str, text: str) -> list[dict]:
        idx = (self.exact_fr if direction == "fr-ba" else self.exact_ba)[
            fold_fr(text) if direction == "fr-ba" else fold_ba(text)
        ]
        return sorted((self.pairs[i] for i in idx), key=lambda r: r["grade"])

    # ---- fuzzy -----------------------------------------------------------
    def similar(self, direction: str, text: str, k: int = 2, threshold: float = 0.34,
                exclude_ids: set[str] | None = None) -> list[tuple[dict, float]]:
        if direction == "fr-ba":
            q = {fold_fr(t) for t in tokens(text) if fold_fr(t) not in FR_STOP}
            post, idf, cand_toks = self.post_fr, self.idf_fr, self.toks_fr
            key = fold_fr(text)
            keyfn = lambda r: fold_fr(r["fr"])  # noqa: E731
        else:
            q = {fold_ba(t) for t in tokens(text) if fold_ba(t) not in BA_STOP}
            post, idf, cand_toks = self.post_ba, self.idf_ba, self.toks_ba
            key = fold_ba(text)
            keyfn = lambda r: fold_ba(r["ba"])  # noqa: E731
        if not q:
            return []
        scores: dict[int, float] = defaultdict(float)
        for t in q:
            for i in post.get(t, ()):
                scores[i] += idf[t]
        qmass = sum(idf.get(t, 0.0) for t in q)
        ranked = []
        for i, shared in scores.items():
            r = self.pairs[i]
            if keyfn(r) == key or (exclude_ids and r["id"] in exclude_ids):
                continue
            cmass = sum(idf.get(t, 0.0) for t in cand_toks[i])
            sim = shared / max(qmass + cmass - shared, 1e-9)
            if sim >= threshold:
                ranked.append((sim, i))
        ranked.sort(reverse=True)
        return [(self.pairs[i], s) for s, i in ranked[:k]]

    # ---- glossary hints ----------------------------------------------------
    def dic_hints(self, direction: str, text: str, limit: int = 6) -> list[tuple[str, str]]:
        out: list[tuple[str, str]] = []
        seen: set[str] = set()
        toks = tokens(text)
        if direction == "fr-ba":
            grams = [" ".join(toks[i:i + n]) for n in (2, 1) for i in range(len(toks) - n + 1)]
            for gram in grams:
                f = fold_fr(gram)
                if f in seen or f in FR_STOP or f not in self.fr_to_ba:
                    continue
                seen.add(f)
                out.append((gram, self.fr_to_ba[f][0]))
        else:
            for tok in toks:
                f = fold_ba(tok)
                if f in seen or f in BA_STOP or f not in self.ba_gloss:
                    continue
                seen.add(f)
                out.append((tok, self.ba_gloss[f]))
        return out[:limit]
