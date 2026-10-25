"""Normalize the public Omnilingual pipeline result without guessing words."""


def transcript_text(result: object) -> str:
    if isinstance(result, str):
        text = result
    elif isinstance(result, dict):
        text = result.get("text")
    else:
        text = getattr(result, "text", None)
    return text.strip() if isinstance(text, str) else ""
