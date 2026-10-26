#!/usr/bin/env python3
"""Audit of model/provider names in likely user-visible strings.

Scans UI sources, excludes internal imports/comments as best as possible.
Use in CI or locally; manual review is still needed for interpolated errors.
"""
from pathlib import Path
import re
ROOT = Path(__file__).resolve().parents[1]
DIRS = [ROOT / "src" / "components", ROOT / "src" / "pages",
        ROOT / "fitila_flutter" / "lib", ROOT / "fitila_flutter" / "android" / "app" / "src" / "main"]
PATTERN = re.compile(r"(?i)\b(?:byt5|gemma|onnx|omnilingual|mms[ -]?tts|stt|tts|litert|supabase|hugging[ -]?face)\b")
SUFFIX = {".tsx", ".jsx", ".dart", ".java", ".kt", ".xml"}
results = []
for directory in DIRS:
    if not directory.is_dir():
        continue
    for path in directory.rglob("*"):
        if path.suffix not in SUFFIX or path.name.endswith(".g.dart"):
            continue
        for lineno, raw in enumerate(path.read_text("utf-8", errors="replace").splitlines(), 1):
            text = raw.strip()
            if not PATTERN.search(text):
                continue
            if text.startswith(("//", "///", "*", "import ", "package ", "/*", "#")):
                continue
            if not any(mark in text for mark in ("'", '"', "`", "Text(", "label", "subtitle", "title", "Toast", "SnackBar", "<p", "<span", "<div")):
                continue
            results.append((str(path.relative_to(ROOT)), lineno, text[:210]))
for filename, lineno, text in results:
    print(f"{filename}:{lineno}: {text}")
print(f"TOTAL SUSPECTED VISIBLE LINES: {len(results)}")
raise SystemExit(1 if results else 0)
