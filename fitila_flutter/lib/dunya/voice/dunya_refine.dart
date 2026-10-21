/// Deterministic, offline refinement of a machine translation (no language model).
///
/// Same rules as `supabase/functions/_shared/deterministic-refine.ts`, checked against the shared
/// vectors (`test/fixtures/refine-vectors.json`). It only fixes surface errors (spelling noise,
/// spacing, machine loops, capital letter, final punctuation) and never changes the meaning.
/// Attested translations (memory, dictionary) must never be passed through it.
library;

class DunyaRefineChange {
  const DunyaRefineChange(this.rule, this.from, this.to);
  final String rule;
  final String from;
  final String to;
}

class DunyaRefineResult {
  const DunyaRefineResult(this.text, this.changes);
  final String text;
  final List<DunyaRefineChange> changes;
  bool get changed => changes.isNotEmpty;
}

/// Attested Baatɔnum vocabulary: folded word -> surface form (tones kept).
class DunyaRefineLexicon {
  DunyaRefineLexicon(this.surface, this.fold) {
    for (final folded in surface.keys) {
      if (folded.isEmpty) continue;
      (_byLength['${folded[0]}|${folded.length}'] ??= <String>[]).add(folded);
    }
  }

  factory DunyaRefineLexicon.fromTexts(Iterable<String> texts, String Function(String) fold) {
    final surface = <String, String>{};
    for (final text in texts) {
      for (final raw in text.split(RegExp(r'\s+'))) {
        final w = raw.replaceAll(RegExp(r'^[^\p{L}\p{M}]+|[^\p{L}\p{M}]+$', unicode: true), '');
        final k = fold(w);
        if (k.isNotEmpty && !RegExp(r'\d').hasMatch(k)) surface.putIfAbsent(k, () => w);
      }
    }
    return DunyaRefineLexicon(surface, fold);
  }

  final Map<String, String> surface;
  final String Function(String) fold;
  final Map<String, List<String>> _byLength = {};

  Iterable<String> near(String folded, int length) => _byLength['${folded[0]}|$length'] ?? const [];
}

bool _withinOneEdit(String a, String b) {
  if (a == b) return false;
  final la = a.length, lb = b.length;
  if ((la - lb).abs() > 1) return false;
  var i = 0, j = 0, edits = 0;
  while (i < la && j < lb) {
    if (a[i] == b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (la == lb) {
      i++;
      j++;
    } else if (la > lb) {
      i++;
    } else {
      j++;
    }
  }
  return edits + (la - i) + (lb - j) <= 1;
}

String _matchCase(String original, String replacement) {
  if (original.isEmpty || replacement.isEmpty) return replacement;
  final first = String.fromCharCode(original.runes.first);
  if (first != first.toLowerCase() && first == first.toUpperCase()) {
    final r = replacement.runes.toList();
    return String.fromCharCode(r.first).toUpperCase() + String.fromCharCodes(r.skip(1));
  }
  return replacement;
}

final _letter = RegExp(r"[\p{L}\p{M}']", unicode: true);
final _terminal = RegExp(r'[.?!…]$');
final _token = RegExp(r"^([^\p{L}\p{M}']*)([\p{L}\p{M}'][\p{L}\p{M}']*)([^\p{L}\p{M}']*)$", unicode: true);

DunyaRefineResult dunyaRefine(String source, String candidate, bool toBariba, {DunyaRefineLexicon? lexicon}) {
  final changes = <DunyaRefineChange>[];
  void note(String rule, String from, String to) {
    if (from != to) changes.add(DunyaRefineChange(rule, from, to));
  }

  final src = source.trim();
  var text = candidate;

  // 1. Characters
  var next = text
      .replaceAll('ε', 'ɛ')
      .replaceAll('’', "'")
      .replaceAll('‘', "'")
      .replaceAll(RegExp('[​-‍﻿]'), '');
  note('chars', text, next);
  text = next;

  // 2. Spacing around punctuation
  next = text
      .replaceAll(RegExp(r'\s+'), ' ')
      .replaceAllMapped(RegExp(r'\s+([,.;:!?…])'), (m) => m[1]!)
      .replaceAllMapped(RegExp(r'([,;:!?])(?=\p{L})', unicode: true), (m) => '${m[1]} ')
      .trim();
  note('spacing', text, next);
  text = next;

  // 3. Machine loops: an n-gram (1..3 words) repeated three times or more in a row is kept once.
  var words = text.split(' ').where((w) => w.isNotEmpty).toList();
  String key(String w) => w.toLowerCase().replaceAll(RegExp(r'[.,;:!?…]+$'), '');
  for (var n = 1; n <= 3; n++) {
    var i = 0;
    while (i + 3 * n <= words.length) {
      final a = words.sublist(i, i + n).map(key).join(' ');
      var reps = 1;
      while (i + (reps + 1) * n <= words.length &&
          words.sublist(i + reps * n, i + (reps + 1) * n).map(key).join(' ') == a) {
        reps++;
      }
      if (reps >= 3) {
        words.removeRange(i + n, i + n + (reps - 1) * n);
      } else {
        i++;
      }
    }
  }
  next = words.join(' ');
  note('loop', text, next);
  text = next;

  // 4. Spelling repair against the attested lexicon (Baatɔnum output only)
  if (toBariba && lexicon != null) {
    final sourceWords = src.split(RegExp(r'\s+')).map(lexicon.fold).where((w) => w.isNotEmpty).toSet();
    final parts = text.split(' ');
    for (var index = 0; index < parts.length; index++) {
      final token = parts[index];
      final m = _token.firstMatch(token);
      if (m == null) continue;
      final core = m[2]!;
      final folded = lexicon.fold(core);
      if (folded.length < 4 || lexicon.surface.containsKey(folded) || sourceWords.contains(folded)) continue;
      final startsUpper = core != core.toLowerCase();
      if (startsUpper && index > 0) continue; // probable proper name
      final found = <String>{};
      for (final len in [folded.length - 1, folded.length, folded.length + 1]) {
        for (final c in lexicon.near(folded, len)) {
          if (c.length >= 4 && _withinOneEdit(folded, c)) found.add(c);
        }
      }
      if (found.length != 1) continue;
      final replacement = _matchCase(core, lexicon.surface[found.first]!);
      note('lexicon', core, replacement);
      parts[index] = m[1]! + replacement + m[3]!;
    }
    text = parts.join(' ');
  }

  // 5. Capital letter and final punctuation follow the source
  if (src.isNotEmpty && text.isNotEmpty) {
    final sf = String.fromCharCode(src.runes.first);
    final tf = String.fromCharCode(text.runes.first);
    if (sf != sf.toLowerCase() && tf == tf.toLowerCase() && _letter.hasMatch(tf)) {
      next = tf.toUpperCase() + String.fromCharCodes(text.runes.skip(1));
      note('capital', text, next);
      text = next;
    }
  }
  final sourceEnd = RegExp(r'[.?!…]$').firstMatch(src)?[0];
  if (sourceEnd != null && text.isNotEmpty) {
    if (!_terminal.hasMatch(text)) {
      next = text + sourceEnd;
    } else if ((sourceEnd == '?' || sourceEnd == '!') && text.endsWith('.')) {
      next = text.substring(0, text.length - 1) + sourceEnd;
    } else {
      next = text;
    }
    note('final-punctuation', text, next);
    text = next;
  }
  return DunyaRefineResult(text, changes);
}
