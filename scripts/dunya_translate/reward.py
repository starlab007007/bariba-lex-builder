"""Reward used to *reinforce* the translation model (RAFT / rejection sampling,
preference ranking, best-of-n re-ranking at inference).

reward = 0.55 chrF++(hyp, ref)      closeness to the validated reference
       + 0.20 lexical validity      target words that exist in the FITILA lexicon
       + 0.10 format                NFC, no alpha, no repetition, sane length
       + 0.10 numbers               digits of the source are kept
       + 0.05 round-trip            back-translation agrees with the source (optional)

Pure Python, no dependencies: it also runs in CI smoke tests and on a laptop.
"""

from __future__ import annotations

import re
import unicodedata
from collections import Counter

from dunya_text import fold_ba, fold_fr, tokens


def _ngrams(items: list[str], n: int) -> Counter:
    return Counter(tuple(items[i:i + n]) for i in range(len(items) - n + 1))


def chrf(hyp: str, ref: str, char_order: int = 6, word_order: int = 2, beta: float = 2.0) -> float:
    """chrF++ in [0, 1] (character n-grams 1..6 + word n-grams 1..2)."""
    h, r = unicodedata.normalize("NFC", hyp), unicodedata.normalize("NFC", ref)
    if not h.strip() or not r.strip():
        return 0.0
    hc, rc = re.sub(r"\s+", "", h), re.sub(r"\s+", "", r)
    scores = []
    for n in range(1, char_order + 1):
        a, b = _ngrams(list(hc), n), _ngrams(list(rc), n)
        scores.append((a, b))
    hw, rw = h.split(), r.split()
    for n in range(1, word_order + 1):
        scores.append((_ngrams(hw, n), _ngrams(rw, n)))
    precisions, recalls = [], []
    for a, b in scores:
        if not a or not b:
            continue
        overlap = sum((a & b).values())
        precisions.append(overlap / max(sum(a.values()), 1))
        recalls.append(overlap / max(sum(b.values()), 1))
    if not precisions:
        return 0.0
    p, rcl = sum(precisions) / len(precisions), sum(recalls) / len(recalls)
    if p + rcl == 0:
        return 0.0
    return (1 + beta ** 2) * p * rcl / (beta ** 2 * p + rcl)


def lexical_validity(hyp: str, vocab: set[str], target_is_bariba: bool) -> float:
    toks = [t for t in tokens(hyp) if not t.isdigit()]
    if not toks:
        return 0.0
    fold = fold_ba if target_is_bariba else fold_fr
    return sum(1 for t in toks if fold(t) in vocab) / len(toks)


def format_score(hyp: str, src: str) -> float:
    if not hyp.strip():
        return 0.0
    score = 1.0
    if hyp != unicodedata.normalize("NFC", hyp):
        score -= 0.25
    if "ɑ" in hyp:
        score -= 0.25
    words = hyp.split()
    for n in (2, 3, 4):
        grams = _ngrams(words, n)
        if grams and max(grams.values()) >= 3:
            score -= 0.5  # loops: "a ka a ka a ka"
            break
    ratio = len(hyp) / max(len(src), 1)
    if ratio < 0.25 or ratio > 4.0:
        score -= 0.3
    if re.search(r"(?i)\b(traduction|translation|share via|error|undefined)\b", hyp):
        score -= 0.5
    return max(score, 0.0)


def numbers_kept(hyp: str, src: str) -> float:
    a = re.findall(r"\d+", src)
    if not a:
        return 1.0
    b = re.findall(r"\d+", hyp)
    return sum(1 for x in a if x in b) / len(a)


def reward(src: str, hyp: str, ref: str | None, vocab: set[str], target_is_bariba: bool,
           round_trip: float | None = None) -> float:
    parts = {
        "lex": (0.20, lexical_validity(hyp, vocab, target_is_bariba)),
        "fmt": (0.10, format_score(hyp, src)),
        "num": (0.10, numbers_kept(hyp, src)),
    }
    if ref is not None:
        parts["chrf"] = (0.55, chrf(hyp, ref))
    if round_trip is not None:
        parts["rt"] = (0.05, round_trip)
    total_w = sum(w for w, _ in parts.values())
    return sum(w * v for w, v in parts.values()) / total_w


def confidence(src: str, hyp: str, vocab: set[str], target_is_bariba: bool, round_trip: float | None = None) -> float:
    """Reference-free confidence in [0, 1] (what the app shows instead of a fixed 85-97 %)."""
    return reward(src, hyp, None, vocab, target_is_bariba, round_trip)
