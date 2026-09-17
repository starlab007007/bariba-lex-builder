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
    section: str
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
            hm = re.match(r"@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)", lines[i].rstrip("\n"))
            if not hm:
                raise RuntimeError(f"Malformed hunk header in {path}: {lines[i]!r}")
            old_start = int(hm.group(1))
            old_count = int(hm.group(2) or 1)
            new_start = int(hm.group(3))
            new_count = int(hm.group(4) or 1)
            section = hm.group(5).strip()
            i += 1
            body: list[str] = []
            while i < len(lines) and not lines[i].startswith("@@ ") and not lines[i].startswith("diff --git "):
                if lines[i].startswith((" ", "+", "-", "\\")):
                    body.append(lines[i])
                i += 1
            hunks.append(Hunk(old_start, old_count, new_start, new_count, section, body))
        result.append(FilePatch(old_path, new_path, hunks))
    return result


def hunk_sequences(h: Hunk) -> tuple[list[str], list[str]]:
    old: list[str] = []
    new: list[str] = []
    for raw in h.lines:
        if raw.startswith("\\"):
            continue
        tag, text = raw[0], raw[1:]
        if tag in (" ", "-"):
            old.append(text)
        if tag in (" ", "+"):
            new.append(text)
    return old, new


def occurrences(haystack: list[str], needle: list[str], lo: int = 0, hi: int | None = None) -> list[int]:
    if not needle:
        return []
    if hi is None:
        hi = len(haystack)
    n = len(needle)
    return [i for i in range(lo, max(lo, hi - n + 1)) if haystack[i : i + n] == needle]


def norm_line(s: str) -> str:
    return " ".join(s.strip().split())


def ratio(a: list[str], b: list[str]) -> float:
    return difflib.SequenceMatcher(
        None,
        [norm_line(x) for x in a],
        [norm_line(x) for x in b],
        autojunk=False,
    ).ratio()


def class_scope(lines: list[str], section: str) -> tuple[int, int]:
    m = re.search(r"\bclass\s+([A-Za-z_][A-Za-z0-9_]*)", section)
    if not m:
        return 0, len(lines)
    name = m.group(1)
    start = None
    pat = re.compile(rf"^class\s+{re.escape(name)}\b")
    for i, line in enumerate(lines):
        if pat.search(line):
            start = i
            break
    if start is None:
        return 0, len(lines)
    end = len(lines)
    top_level = re.compile(r"^(?:class|enum|mixin|extension|typedef)\s+")
    for i in range(start + 1, len(lines)):
        if top_level.search(lines[i]):
            end = i
            break
    return start, end


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


def line_anchors(old: list[str]) -> list[tuple[int, str]]:
    ranked: list[tuple[int, int, str]] = []
    for i, line in enumerate(old):
        n = norm_line(line)
        if len(n) < 18:
            continue
        distinct = len(set(n))
        ranked.append((len(n) + distinct, i, line))
    ranked.sort(reverse=True)
    return [(i, line) for _, i, line in ranked[:16]]


def locate_hunk(
    current: list[str], h: Hunk, old: list[str], new: list[str], line_shift: int
) -> tuple[int, int, str, float]:
    scope_lo, scope_hi = class_scope(current, h.section)
    expected_global = max(0, min(len(current), h.old_start - 1 + line_shift))
    expected = min(max(expected_global, scope_lo), max(scope_lo, scope_hi - 1))

    exact = occurrences(current, old, scope_lo, scope_hi)
    if exact:
        pos = min(exact, key=lambda x: abs(x - expected))
        return pos, pos + len(old), "exact", 1.0

    done = occurrences(current, new, scope_lo, scope_hi)
    if done:
        pos = min(done, key=lambda x: abs(x - expected))
        return pos, pos, "already", 1.0

    candidate_starts: set[int] = {expected}
    anchor_hits = 0

    # First use unchanged context runs.
    for offset, run in context_runs(h)[:6]:
        choices: list[tuple[int, list[str]]] = []
        if len(run) >= 4:
            choices += [(offset, run[:4]), (offset + len(run) - 4, run[-4:])]
        elif len(run) >= 2:
            choices.append((offset, run))
        elif len(run) == 1 and len(norm_line(run[0])) >= 22:
            choices.append((offset, run))
        for anchor_offset, anchor in choices:
            hits = occurrences(current, anchor, scope_lo, scope_hi)
            if hits:
                anchor_hits += 1
            for hit in hits:
                start = hit - anchor_offset
                if scope_lo <= start < scope_hi:
                    candidate_starts.add(start)

    # Also use distinctive old lines (including removed lines). This is
    # essential when the online branch changed the surrounding context but
    # retained the action/method being replaced.
    for offset, line in line_anchors(old):
        hits = occurrences(current, [line], scope_lo, scope_hi)
        if hits:
            anchor_hits += 1
        for hit in hits:
            start = hit - offset
            if scope_lo <= start < scope_hi:
                candidate_starts.add(start)

    old_len = len(old)
    spread = min(100, max(16, old_len // 2))
    best: tuple[float, int, int] | None = None
    for start in candidate_starts:
        max_end = min(scope_hi, start + old_len + spread)
        min_len = max(1, old_len - spread)
        for end in range(start + min_len, max_end + 1):
            score = ratio(old, current[start:end])
            # Very small positional tiebreaker; class and anchors dominate.
            score -= min(abs(start - expected), 2000) * 0.000002
            if best is None or score > best[0]:
                best = (score, start, end)
    if best is None:
        raise RuntimeError("no viable scoped fuzzy window")
    _, start, end = best
    raw_score = ratio(old, current[start:end])
    threshold = 0.44 if len(old) >= 12 else 0.55
    if anchor_hits >= 2 and len(old) >= 10:
        threshold = min(threshold, 0.36)
    if raw_score < threshold:
        raise RuntimeError(
            f"scoped fuzzy match too weak: score={raw_score:.3f}, threshold={threshold:.2f}, "
            f"scope={scope_lo+1}:{scope_hi}, expected_line={h.old_start}, candidate={start+1}:{end}, anchors={anchor_hits}"
        )
    return start, end, "fuzzy", raw_score


def apply_file_patch(root: Path, fp: FilePatch, patch_name: str) -> None:
    target_rel = fp.new_path
    target = root / target_rel
    if fp.old_path == "/dev/null" or (not target.exists() and all(h.old_count == 0 for h in fp.hunks)):
        content: list[str] = []
        for h in fp.hunks:
            _, new = hunk_sequences(h)
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
        old, new = hunk_sequences(h)
        if h.old_count == 0 and not old:
            pos = max(0, min(len(current), h.new_start - 1 + line_shift))
            current[pos:pos] = new
            line_shift += len(new)
            print(f"{patch_name}: {target_rel} hunk {idx}/{len(fp.hunks)} inserted at {pos+1}")
            continue
        try:
            start, end, mode, score = locate_hunk(current, h, old, new, line_shift)
        except Exception as exc:
            first = "".join(old[:4]).replace("\n", "\\n")[:500]
            last = "".join(old[-4:]).replace("\n", "\\n")[:500]
            raise RuntimeError(
                f"{patch_name}: cannot locate {target_rel} hunk {idx}/{len(fp.hunks)} "
                f"old@{h.old_start} section={h.section!r}: {exc}; first={first!r}; last={last!r}"
            ) from exc
        if mode == "already":
            print(f"{patch_name}: {target_rel} hunk {idx}/{len(fp.hunks)} already present")
            continue
        old_span = end - start
        current[start:end] = new
        line_shift += len(new) - old_span
        print(
            f"{patch_name}: {target_rel} hunk {idx}/{len(fp.hunks)} {mode} "
            f"at {start+1}:{end} score={score:.3f} section={h.section!r}"
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
    for rel in ("fitila_flutter/lib/main.dart", "fitila_flutter/lib/core/fitila_backend.dart"):
        p = root / rel
        if p.exists():
            text = p.read_text(encoding="utf-8")
            if any(mark in text for mark in ("<<<<<<<", "=======", ">>>>>>>")):
                raise RuntimeError(f"Conflict marker remains in {rel}")


if __name__ == "__main__":
    main()
