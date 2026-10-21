"""Prompt format of the deployed model zimesongbian/byt5-small-fr-bariba-v004.

The Hugging Face Space builds `_prompt_prefix(direction) + text` (see the Space app.py). v05 is
fine-tuned FROM v004, so it keeps exactly that prefix and adds the optional retrieval hints after
the sentence:  `<v004 prefix><text> || ctx: … || mem: fr = ba | … || dic: mot=sens ; …`.
Without hints the input is byte-identical to what the Space sends today, so v05 is a drop-in.
"""

from __future__ import annotations

V004_PREFIX = {
    "fr-ba": "traduire francais en bariba (ordre SOV, voir=wa, mère=bii mɛro, si=yɛ): ",
    "ba-fr": "traduire bariba en francais (SOV, wa=voir, mɛɛri=regarder, yaa=viande): ",
}
# The Space tokenizes with max_length=512 bytes; keep room for the end-of-sequence byte.
MAX_V004_BYTES = 500


def to_v004(text: str) -> str:
    """`fr-ba: x || hints` (build_input format) -> `<v004 prefix>x || hints`, within the byte budget.

    Inputs of other tasks (fill:, ba-pl:, ba-foc:) are returned unchanged.
    """
    for direction, prefix in V004_PREFIX.items():
        tag = f"{direction}: "
        if text.startswith(tag):
            parts = (prefix + text[len(tag):]).split(" || ")
            out = " || ".join(parts)
            while len(out.encode("utf-8")) > MAX_V004_BYTES and len(parts) > 1:
                parts.pop()  # least important hint first (dic, then mem, then ctx)
                out = " || ".join(parts)
            return out
    return text


def source_of(prompt: str) -> str:
    """Sentence part of a prompt in either format (used to score sampled hypotheses)."""
    for prefix in V004_PREFIX.values():
        if prompt.startswith(prefix):
            return prompt[len(prefix):].split(" || ")[0]
    return prompt.split(": ", 1)[-1].split(" || ")[0]
