#!/usr/bin/env python3
from __future__ import annotations

import argparse
import difflib
import re
from dataclasses import dataclass
from pathlib import Path


@dataclass
class Hunk:
    old_start: int
    old_count: int
    new_start: int
    new_count: int
    lines: list[str]


@dataclass
class FilePatch:
    old_path: str
    new_path: str
    hunks: list[Hunk]


def parse_patch(path: Path) -> list[FilePatch]:
    lines = path.read_text(encoding="utf-8").splitlines(keepends=True)
    result: list[FilePatch] = []
    i = 0
    while i < len(lines):
        if not lines[i].startswith("diff --git "):
            i += 1
            continue
        m = re.match(r"diff --git a/(.+) b/(.+)", lines[i].rstrip("\n"))
        if not m:
            raise RuntimeError(f"Malformed diff header in {path}: {lines[i]!r}")
        old_path, new_path = m.groups()
        i += 1
        hunks: list[Hunk] = []
        while i < len(lines) and not lines[i].startswith("diff --git "):
            if not lines[i].startswith("@@ "):
                i += 1
                continue
            hm = re.match(r"@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@", lines[i])
            if not hm:
                raise RuntimeError(f"Malformed hunk header in {path}: {lines[i]!r}")
            old_start = int(hm.group(1))
            old_count = int(hm.group(2) or 1)
            new_start = int(hm.group(3))
            new_count = int(hm.group(4) or 1)
            i += 1
            body: list[str] = []
            while i < len(lines) and not lines[i].startswith("@@ ") and not lines[i].startswith("diff --git "):
                if lines[i].startswith((" ", "+", "-", "\\")):
                    body.append(lines[i])
                i += 1
            hunks.append(Hunk(old_start, old_count, new_start, new_count, body))
        result.append(FilePatch(old_path, new_path, hunks))
    return result


def hunk_sequences(h: Hunk) -> tuple[list[str], list[str], list[tuple[int, str]]]:
    old: list[str] = []
    new: list[str] = []
    contexts: list[tuple[int, str]] = []
    old_index = 0
    for raw in h.lines:
        if raw.startswith("\\"):
            continue
        tag, text = raw[0], raw[1:]
        if tag in (" ", "-"):
            if tag == " ":
                contexts.append((old_index, text))
            old.append(text)
            old_index += 1
        if tag in (" ", "+"):
            new.append(text)
    return old, new, contexts


def occurrences(haystack: list[str], needle: list[str]) -> list[int]:
    if not needle:
        return []
    n = len(needle)
    return [i for i in range(0, len(haystack) - n + 1) if haystack[i : i + n] == needle]


def context_runs(h: Hunk) -> list[tuple[int, list[str]]]:
    runs: list[tuple[int, list[str]]] = []
    old_index = 0
    run_start: int | None = None
    run: list[str] = []
    for raw in h.lines:
        if raw.startswith("\\"):
            continue
        tag, text = raw[0], raw[1:]
        if tag == " ":
            if run_start is None:
                run_start = old_index
            run.append(text)
        else:
            if run:
                runs.append((run_start or 0, run))
                run_start, run = None, []
        if tag in (" ", "-"):
            old_index += 1
    if run:
        runs.append((run_start or 0, run))
    runs.sort(key=lambda x: len(x[1]), reverse=True)
    return runs


def norm_line(s: str) -> str:
    return " ".join(s.strip().split())


def ratio(a: list[str], b: list[str]) -> float:
    aa = [norm_line(x) for x in a]
    bb = [norm_line(x) for x in b]
    return difflib.SequenceMatcher(None, aa, bb, autojunk=False).ratio()


def locate_hunk(current: list[str], h: Hunk, old: list[str], new: list[str], line_shift: int) -> tuple[int, int, str, float]:
    exact = occurrences(current, old)
    expected = max(0, min(len(current), h.old_start - 1 + line_shift))
    if exact:
        pos = min(exact, key=lambda x: abs(x - expected))
        return pos, pos + len(old), "exact", 1.0

    # If the patch result is already present, treat it as idempotently applied.
    done = occurrences(current, new)
    if done:
        pos = min(done, key=lambda x: abs(x - expected))
        return pos, pos, "already", 1.0

    runs = context_runs(h)
    candidate_starts: set[int] = {expected}
    anchor_hits = 0
    for offset, run in runs[:5]:
        # Use at most four context lines to make anchors resilient but specific.
        choices: list[tuple[int, list[str]]] = []
        if len(run) >= 4:
            choices.append((offset, run[:4]))
            choices.append((offset + len(run) - 4, run[-4:]))
        elif len(run) >= 2:
            choices.append((offset, run))
        elif len(run) == 1:
            choices.append((offset, run))
        for anchor_offset, anchor in choices:
            hits = occurrences(current, anchor)
            if hits:
                anchor_hits += 1
            for hit in hits:
                start = hit - anchor_offset
                if 0 <= start <= len(current):
                    candidate_starts.add(start)

    if not candidate_starts:
        raise RuntimeError("no candidate anchors")

    best: tuple[float, int, int] | None = None
    old_len = len(old)
    # Search a bounded range of possible span lengths to absorb online-branch edits
    # inside the hunk while keeping unaffected code outside the hunk intact.
    spread = min(80, max(12, old_len // 3))
    lengths = range(max(0, old_len - spread), old_len + spread + 1)
    for start in candidate_starts:
        for length in lengths:
            end = start + length
            if end > len(current):
                continue
            score = ratio(old, current[start:end])
            # Slightly prefer candidates close to the original line position.
            score -= min(abs(start - expected), 2000) * 0.000005
            if best is None or score > best[0]:
                best = (score, start, end)
    if best is None:
        raise RuntimeError("no viable fuzzy window")
    score, start, end = best
    raw_score = ratio(old, current[start:end])
    threshold = 0.48 if len(old) >= 12 else 0.58
    if raw_score < threshold or (anchor_hits == 0 and raw_score < 0.72):
        raise RuntimeError(
            f"fuzzy match too weak: score={raw_score:.3f}, threshold={threshold:.2f}, "
            f"expected_line={h.old_start}, candidate={start+1}:{end}"
        )
    return start, end, "fuzzy", raw_score


def apply_file_patch(root: Path, fp: FilePatch, patch_name: str) -> None:
    target_rel = fp.new_path
    target = root / target_rel
    if fp.old_path == "/dev/null" or (not target.exists() and all(h.old_count == 0 for h in fp.hunks)):
        content: list[str] = []
        for h in fp.hunks:
            _, new, _ = hunk_sequences(h)
            content.extend(new)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text("".join(content), encoding="utf-8")
        print(f"{patch_name}: created {target_rel} ({len(content)} lines)")
        return

    if not target.exists():
        raise RuntimeError(f"{patch_name}: target missing: {target_rel}")

    current = target.read_text(encoding="utf-8").splitlines(keepends=True)
    line_shift = 0
    for idx, h in enumerate(fp.hunks, 1):
        old, new, _ = hunk_sequences(h)
        if h.old_count == 0 and not old:
            pos = max(0, min(len(current), h.new_start - 1 + line_shift))
            current[pos:pos] = new
            line_shift += len(new)
            print(f"{patch_name}: {target_rel} hunk {idx}/{len(fp.hunks)} inserted at {pos+1}")
            continue
        try:
            start, end, mode, score = locate_hunk(current, h, old, new, line_shift)
        except Exception as exc:
            before = "".join(old[:4]).replace("\n", "\\n")[:500]
            after = "".join(old[-4:]).replace("\n", "\\n")[:500]
            raise RuntimeError(
                f"{patch_name}: cannot locate {target_rel} hunk {idx}/{len(fp.hunks)} "
                f"old@{h.old_start}: {exc}; first={before!r}; last={after!r}"
            ) from exc
        if mode == "already":
            print(f"{patch_name}: {target_rel} hunk {idx}/{len(fp.hunks)} already present")
            continue
        old_span = end - start
        current[start:end] = new
        line_shift += len(new) - old_span
        print(
            f"{patch_name}: {target_rel} hunk {idx}/{len(fp.hunks)} {mode} "
            f"at {start+1}:{end} score={score:.3f}"
        )
    target.write_text("".join(current), encoding="utf-8")


def apply_patch(root: Path, patch_path: Path) -> None:
    parsed = parse_patch(patch_path)
    if not parsed:
        raise RuntimeError(f"No file diffs found in {patch_path}")
    for fp in parsed:
        apply_file_patch(root, fp, patch_path.name)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("patches", nargs="+")
    args = ap.parse_args()
    root = Path.cwd()
    for raw in args.patches:
        p = Path(raw)
        print(f"===== CONTEXT APPLY {p.name} =====")
        apply_patch(root, p)
    # Absolute guard: never leave merge artifacts in source.
    for rel in ("fitila_flutter/lib/main.dart", "fitila_flutter/lib/core/fitila_backend.dart"):
        p = root / rel
        if p.exists():
            text = p.read_text(encoding="utf-8")
            if any(mark in text for mark in ("<<<<<<<", "=======", ">>>>>>>")):
                raise RuntimeError(f"Conflict marker remains in {rel}")


if __name__ == "__main__":
    main()
