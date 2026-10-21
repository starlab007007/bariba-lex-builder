/// Translation memory: validated French <-> Baatɔnum sentence pairs built from the
/// printed dictionary, Apprendre, the scenes and the exercise bank
/// (`scripts/dunya_translate/export_memory.py` → `assets/data/dunya_memory.json`).
///
/// A hit is a corpus-derived translation candidate: it needs no model or network and is
/// instant, but grade A does not establish independent human approval. DunyaTranslator consults it before ByT5 so that known phrases are
/// always 100 % correct, offline included.
library;

import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;

import 'dunya_refine.dart';
import 'dunya_voice_brain.dart' show foldBariba;

class DunyaMemoryHit {
  const DunyaMemoryHit(this.text, this.grade, {required this.exact});

  /// The corpus translation; grade A is not proof of independent human approval.
  final String text;

  /// Corpus quality grade, not an independent human-approval status.
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

class DunyaSimilarExample {
  const DunyaSimilarExample({required this.source, required this.translation, required this.grade, required this.commonWords});
  final String source;
  final String translation;
  /// Corpus grade is not proof of independent human approval.
  final String grade;
  final int commonWords;
}

class DunyaTranslationMemory {
  /// [pairs] rows are `[french, bariba, grade]`.
  DunyaTranslationMemory(List<List<String>> pairs) {
    final ambiguousFr = <String>{};
    final ambiguousBa = <String>{};
    for (final p in pairs) {
      if (p.length < 3) continue;
      final fr = p[0], ba = p[1], grade = p[2];
      final frKey = foldFrench(fr);
      final baKey = foldBariba(ba);
      if (frKey.isEmpty || baKey.isEmpty) continue;
      _originalFrench.putIfAbsent(frKey, () => fr);
      _originalBariba.putIfAbsent(baKey, () => ba);
      final frPrevious = _frToBa[frKey];
      if (frPrevious != null && foldBariba(frPrevious.$1) != baKey) {
        ambiguousFr.add(frKey);
      } else {
        _frToBa.putIfAbsent(frKey, () => (ba, grade));
      }
      final baPrevious = _baToFr[baKey];
      if (baPrevious != null && foldFrench(baPrevious.$1) != frKey) {
        ambiguousBa.add(baKey);
      } else {
        _baToFr.putIfAbsent(baKey, () => (fr, grade));
      }
    }
    for (final key in ambiguousFr) { _frToBa.remove(key); }
    for (final key in ambiguousBa) { _baToFr.remove(key); }
    _baKeys = _baToFr.keys.toList();
  }

  final Map<String, (String, String)> _frToBa = {};
  final Map<String, String> _originalFrench = {};
  final Map<String, String> _originalBariba = {};
  final Map<String, (String, String)> _baToFr = {};
  late final List<String> _baKeys;

  int get size => _baToFr.length;

  DunyaRefineLexicon? _refineLexicon;

  /// Attested Baatɔnum vocabulary (from every memory sentence) used by the offline spelling repair.
  DunyaRefineLexicon refineLexicon() =>
      _refineLexicon ??= DunyaRefineLexicon.fromTexts(_originalBariba.values, foldBariba);

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

  /// Advisory retrieval only; never automatically substitutes fuzzy matches.
  List<DunyaSimilarExample> suggestSimilar(String text,
      {required bool toBariba, int limit = 3}) {
    if (limit <= 0) return const [];
    final key = toBariba ? foldFrench(text) : foldBariba(text);
    final query = key.split(' ').where((w) => w.length >= 3).toSet();
    if (query.length < 2) return const [];
    final table = toBariba ? _frToBa : _baToFr;
    final originals = toBariba ? _originalFrench : _originalBariba;
    final examples = <DunyaSimilarExample>[];
    for (final entry in table.entries) {
      if (entry.key == key) continue;
      final candidateWords = entry.key.split(' ').where((w) => w.length >= 3).toSet();
      final intersection = query.intersection(candidateWords).length;
      if (intersection < 2 || intersection / query.length < 0.5) continue;
      examples.add(DunyaSimilarExample(
        source: originals[entry.key] ?? entry.key,
        translation: entry.value.$1,
        grade: entry.value.$2,
        commonWords: intersection,
      ));
    }
    examples.sort((a, b) => b.commonWords.compareTo(a.commonWords));
    return examples.take(limit).toList(growable: false);
  }

  /// Unambiguous corpus translation, or null. Never throws (asset missing, tests, first start):
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
