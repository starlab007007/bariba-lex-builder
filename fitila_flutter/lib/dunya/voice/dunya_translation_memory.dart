/// Translation memory: validated French <-> Baatɔnum sentence pairs built from the
/// printed dictionary, Apprendre, the scenes and the exercise bank
/// (`scripts/dunya_translate/export_memory.py` → `assets/data/dunya_memory.json`).
///
/// A hit is a human-attested translation: it needs no model, no network and is
/// instant. DunyaTranslator consults it before ByT5 so that known phrases are
/// always 100 % correct, offline included.
library;

import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;

import 'dunya_voice_brain.dart' show foldBariba;

class DunyaMemoryHit {
  const DunyaMemoryHit(this.text, this.grade, {required this.exact});

  /// The attested translation.
  final String text;

  /// 'A' attested in the dictionary/scenes, 'B' generated exercise bank.
  final String grade;

  /// False when the source only matched after a one-letter recogniser/typing error.
  final bool exact;
}

String foldFrench(String input) {
  const map = {
    'à': 'a', 'â': 'a', 'ä': 'a', 'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e', 'î': 'i', 'ï': 'i',
    'ô': 'o', 'ö': 'o', 'ù': 'u', 'û': 'u', 'ü': 'u', 'ç': 'c', 'œ': 'oe', 'æ': 'ae', 'ÿ': 'y',
  };
  final buf = StringBuffer();
  for (final rune in input.toLowerCase().replaceAll('’', "'").runes) {
    final ch = String.fromCharCode(rune);
    buf.write(map[ch] ?? ch);
  }
  return buf.toString().replaceAll(RegExp(r"[^a-z0-9' ]"), ' ').replaceAll(RegExp(r'\s+'), ' ').trim();
}

/// Levenshtein distance with an early exit above [limit] (returns limit + 1).
int boundedEditDistance(String a, String b, int limit) {
  if ((a.length - b.length).abs() > limit) return limit + 1;
  var prev = List<int>.generate(b.length + 1, (i) => i);
  for (var i = 1; i <= a.length; i++) {
    final cur = List<int>.filled(b.length + 1, 0)..[0] = i;
    var rowMin = cur[0];
    for (var j = 1; j <= b.length; j++) {
      final cost = a.codeUnitAt(i - 1) == b.codeUnitAt(j - 1) ? 0 : 1;
      final v = [prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost].reduce((x, y) => x < y ? x : y);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > limit) return limit + 1;
    prev = cur;
  }
  return prev[b.length];
}

class DunyaTranslationMemory {
  /// [pairs] rows are `[french, bariba, grade]`.
  DunyaTranslationMemory(List<List<String>> pairs) {
    for (final p in pairs) {
      if (p.length < 3) continue;
      final fr = p[0], ba = p[1], grade = p[2];
      _frToBa.putIfAbsent(foldFrench(fr), () => (ba, grade));
      _baToFr.putIfAbsent(foldBariba(ba), () => (fr, grade));
    }
    _baKeys = _baToFr.keys.toList();
  }

  final Map<String, (String, String)> _frToBa = {};
  final Map<String, (String, String)> _baToFr = {};
  late final List<String> _baKeys;

  int get size => _baToFr.length;

  static DunyaTranslationMemory? _shared;

  /// Loads `assets/data/dunya_memory.json` once.
  static Future<DunyaTranslationMemory> shared() async {
    final cached = _shared;
    if (cached != null) return cached;
    final raw = jsonDecode(await rootBundle.loadString('assets/data/dunya_memory.json')) as Map<String, dynamic>;
    final rows = (raw['pairs'] as List).map((e) => (e as List).map((x) => x.toString()).toList()).toList();
    return _shared = DunyaTranslationMemory(rows);
  }

  DunyaMemoryHit? lookup(String text, {required bool toBariba}) {
    if (toBariba) {
      final hit = _frToBa[foldFrench(text)];
      return hit == null ? null : DunyaMemoryHit(hit.$1, hit.$2, exact: true);
    }
    final key = foldBariba(text);
    if (key.isEmpty) return null;
    final hit = _baToFr[key];
    if (hit != null) return DunyaMemoryHit(hit.$1, hit.$2, exact: true);
    // Speech recognisers drop or change one letter: accept a single edit on a long sentence only.
    if (key.length < 12) return null;
    for (final candidate in _baKeys) {
      if ((candidate.length - key.length).abs() > 1) continue;
      if (boundedEditDistance(candidate, key, 1) <= 1) {
        final near = _baToFr[candidate]!;
        return DunyaMemoryHit(near.$1, near.$2, exact: false);
      }
    }
    return null;
  }

  /// Exact attested translation, or null. Never throws (asset missing, tests, first start):
  /// callers simply continue with the online chain or the offline dictionary.
  static Future<String?> tryExact(String text, {required bool toBariba}) async {
    try {
      final hit = (await shared()).lookup(text, toBariba: toBariba);
      return hit != null && hit.exact ? hit.text : null;
    } catch (_) {
      return null;
    }
  }

  /// Hook for DunyaTranslator.memory.
  // Near matches can change negation, tone, or meaning. Return suggestions
  // from lookup() to the UI, but NEVER as validated automatic translations.
  Future<String?> translate(String text, bool toBariba) async {
    final hit = lookup(text, toBariba: toBariba);
    return hit != null && hit.exact ? hit.text : null;
  }
}
