"""Shared text rules for the DUNYA/FITILA translation pipeline.

One module so that corpus building, training, evaluation and the reward all
normalise Baatɔnum and French *identically*. The Dart and TypeScript sides
mirror `build_input()` and `fold_ba()` (see FORMAT.md).
"""

from __future__ import annotations

import re
import unicodedata

# Tone marks we may drop for matching. The nasal tilde (U+0303) is NOT a tone:
# it changes the word (sɔ̃ɔ "soleil" vs sɔɔ), so it is always kept.
TONE_MARKS = {"̀", "́", "̂", "̄", "̌"}

PUNCT_EDGE = " \t\r\n.,;:!?()[]«»\"“”‘’'…-–—_/\\*"

FR_STOP = set(
    "le la les un une des de du d l à au aux en et ou où que qu qui quoi dont ce cet cette ces ça ca "
    "je j tu il elle on nous vous ils elles me m te t se s lui leur y ne n pas plus ni mais donc car "
    "est es suis sont être a as ai ont avoir est-ce ai-je mon ma mes ton ta tes son sa ses notre nos "
    "votre vos leurs dans sur sous avec sans pour par chez comme si très tout tous toute toutes".split()
)

# Hyphen compounds that must keep their hyphen when an OCR break splits them.
_FR_KEEP_AFTER_HYPHEN = {
    "tu", "vous", "il", "elle", "on", "moi", "toi", "lui", "nous", "là", "ci", "même", "être",
    "ce", "t", "en", "y", "je", "ils", "elles", "vingt", "vingts", "dix", "neuf", "mêmes",
}


def nfc(text: str) -> str:
    return unicodedata.normalize("NFC", text)


def strip_tones(text: str) -> str:
    decomposed = unicodedata.normalize("NFD", text)
    return nfc("".join(c for c in decomposed if c not in TONE_MARKS))


def fix_alpha(text: str) -> str:
    """The orthography never uses ɑ (alpha): it is always a plain a."""
    return text.replace("ɑ", "a").replace("Ɑ", "A")


def _tidy_punct(text: str) -> str:
    text = text.replace("’", "'").replace("`", "'")
    text = re.sub(r"\s+([,.;:!?…])", r"\1", text)
    text = re.sub(r"\s{2,}", " ", text)
    text = re.sub(r"^[\s,;:]+", "", text)
    return text.strip()


def clean_fr(text: str) -> tuple[str, bool]:
    """Clean OCR artefacts in French. Returns (text, heuristic_fix_applied)."""
    original = nfc(text or "")
    out = original
    out = re.sub(r"\s+-(?=\w)", "-", out)  # "es -tu" -> "es-tu"

    def join(match: re.Match) -> str:
        left, right = match.group(1), match.group(2)
        return f"{left}-{right}" if right.lower() in _FR_KEEP_AFTER_HYPHEN else f"{left}{right}"

    out = re.sub(r"(\w)-\s+(\w+)", join, out)  # "ve- nu" -> "venu"
    out = _tidy_punct(out)
    changed = _tidy_punct(original) != out
    return out, changed


def clean_ba(text: str) -> tuple[str, bool]:
    original = nfc(text or "")
    # OCR line breaks split Baatɔnum words ("soku- sia"); the orthography has no hyphens.
    out = re.sub(r"(\w)-\s+(\w)", r"\1\2", fix_alpha(original))
    out = _tidy_punct(out)
    return out, _tidy_punct(original) != out


def fold_ba(text: str) -> str:
    """Matching key for Baatɔnum: no tones, lower case, no alpha, no punctuation."""
    base = strip_tones(fix_alpha(nfc(text))).lower().replace("’", "'")
    base = re.sub(r"[^\w\u0303' ]|_", " ", base)  # inner punctuation never distinguishes sentences
    return re.sub(r"\s+", " ", base).strip()


def fold_fr(text: str) -> str:
    base = unicodedata.normalize("NFD", nfc(text).lower().replace("’", "'"))
    base = "".join(c for c in base if not unicodedata.combining(c))
    base = re.sub(r"[^a-z0-9' ]", " ", base)
    return re.sub(r"\s+", " ", base).strip()


def tokens(text: str) -> list[str]:
    return [t.strip(PUNCT_EDGE) for t in text.split() if t.strip(PUNCT_EDGE)]


def clean_headword(word: str) -> str:
    """'tem3' -> 'tem', 'gbaaru (2)' -> 'gbaaru', 'ginɛ (ka)' -> 'ginɛ'."""
    w = re.sub(r"\(.*?\)", " ", word or "")
    w = re.sub(r"\d+$", "", w.strip())
    return nfc(fix_alpha(w)).strip()


def kind_of(fr: str, ba: str) -> str:
    n = max(len(tokens(fr)), len(tokens(ba)))
    if n <= 2 and not re.search(r"[?!]", fr + ba):
        return "word"
    if n <= 4:
        return "phrase"
    return "sentence"


def split_sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-ÞƆƐ«\"])", text.strip())
    return [p.strip() for p in parts if p.strip()]


# --------------------------------------------------------------------------
# Model input format (single source of truth; mirrored in Dart / TypeScript)
# --------------------------------------------------------------------------

MAX_INPUT_BYTES = 480


def build_input(
    direction: str,
    src: str,
    mem: list[tuple[str, str]] | None = None,
    dic: list[tuple[str, str]] | None = None,
    ctx: str | None = None,
) -> str:
    """`fr-ba: texte || ctx: … || mem: fr = ba | fr = ba || dic: mot=sens ; …`

    Hints are optional: the model is trained with and without them, so the
    plain `fr-ba: texte` of the deployed v03 model stays valid.
    """
    parts = [f"{direction}: {src}"]
    if ctx:
        parts.append(f"ctx: {ctx}")
    if mem:
        parts.append("mem: " + " | ".join(f"{a} = {b}" for a, b in mem))
    if dic:
        parts.append("dic: " + " ; ".join(f"{a}={b}" for a, b in dic))
    text = " || ".join(parts)
    # Drop the least important hints first until the byte budget is respected.
    while len(text.encode("utf-8")) > MAX_INPUT_BYTES and len(parts) > 1:
        parts.pop()
        text = " || ".join(parts)
    return text


# --------------------------------------------------------------------------
# Alignment quality gate
# --------------------------------------------------------------------------

PLACEHOLDERS = {"—", "-", "–", "...", "…", "n/a", "none", "pas d'exemple fourni.", "pas d'exemple fourni", "aucun"}

# French function words that are not Baatɔnum words (checked against the dictionary).
FR_ONLY = set("le la les des du est qui que pas pour dans avec une sont elle ne cette ce mais personne "
              "chaque quand comme aussi très sur sous chez nous vous ils elles".split())


def alignment_issue(fr: str, ba: str, kind: str) -> str | None:
    """Reason why a pair is probably misaligned, or None when it looks sane."""
    if fr.strip().lower() in PLACEHOLDERS or ba.strip().lower() in PLACEHOLDERS:
        return "placeholder"
    if kind == "word":
        return None
    if sum(1 for t in tokens(ba) if t.lower() in FR_ONLY) >= 2:
        return "french-in-bariba"
    if sum(1 for t in tokens(fr) if fold_ba(t) in {"gusunɔ", "yɛnu"}) >= 99:  # placeholder for future rules
        return None
    ratio = len(ba) / max(len(fr), 1)
    if ratio < 0.35 or ratio > 2.8:
        return f"length-ratio {ratio:.2f}"
    tr = len(tokens(ba)) / max(len(tokens(fr)), 1)
    if tr < 0.2 or tr > 4.0:
        return f"token-ratio {tr:.2f}"
    return None
