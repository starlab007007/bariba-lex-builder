import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;

/// Direction of the typing-time translation.
enum KeyboardTranslationDirection { baribaToFrench, frenchToBariba }

/// One dictionary word (`ba`) with its French gloss and corpus frequency.
class KeyboardEntry {
  const KeyboardEntry(this.ba, this.fr, this.freq);

  final String ba;
  final String fr;
  final int freq;
}

/// Pure-Dart prediction + offline translation engine for Bàátɔ̀nú.
///
/// Uses the same `bariba_dictionary.json` (entries / phrases / bigrams) as the
/// Android IME and the iOS keyboard extension so every surface predicts alike.
class BaribaKeyboardEngine {
  BaribaKeyboardEngine._(
    this._entries,
    this._phrases,
    this._bigrams,
  ) {
    for (final entry in _entries) {
      _byKey.putIfAbsent(foldKey(entry.ba), () => entry);
      final fr = foldKey(entry.fr);
      if (fr.isNotEmpty) {
        _byFrench.putIfAbsent(fr, () => entry);
      }
    }
    for (final phrase in _phrases) {
      _phraseBa[foldKey(phrase.ba)] = phrase.fr;
      _phraseFr[foldKey(phrase.fr)] = phrase.ba;
    }
    _entries.sort((a, b) => b.freq.compareTo(a.freq));
  }

  static const assetPath = 'assets/data/bariba_keyboard_dictionary.json';

  final List<KeyboardEntry> _entries;
  final List<({String ba, String fr})> _phrases;
  final Map<String, List<String>> _bigrams;
  final Map<String, KeyboardEntry> _byKey = {};
  final Map<String, KeyboardEntry> _byFrench = {};
  final Map<String, String> _phraseBa = {};
  final Map<String, String> _phraseFr = {};

  static BaribaKeyboardEngine? _shared;

  /// Loads (once) the engine from the bundled asset.
  static Future<BaribaKeyboardEngine> load() async {
    final cached = _shared;
    if (cached != null) {
      return cached;
    }
    final raw = await rootBundle.loadString(assetPath);
    return _shared = BaribaKeyboardEngine.fromJson(
      jsonDecode(raw) as Map<String, dynamic>,
    );
  }

  factory BaribaKeyboardEngine.fromJson(Map<String, dynamic> json) {
    final entries = <KeyboardEntry>[
      for (final e in (json['entries'] as List? ?? const []))
        if (e is Map && (e['ba'] as String?)?.isNotEmpty == true)
          KeyboardEntry(
            e['ba'] as String,
            (e['fr'] as String?) ?? '',
            (e['freq'] as num?)?.toInt() ?? 0,
          ),
    ];
    final phrases = <({String ba, String fr})>[
      for (final p in (json['phrases'] as List? ?? const []))
        if (p is Map && p['ba'] is String && p['fr'] is String)
          (ba: p['ba'] as String, fr: p['fr'] as String),
    ];
    final bigrams = <String, List<String>>{
      for (final e in ((json['bigrams'] as Map?) ?? const {}).entries)
        foldKey(e.key as String): [
          for (final w in (e.value as List)) w as String,
        ],
    };
    return BaribaKeyboardEngine._(entries, phrases, bigrams);
  }

  int get entryCount => _entries.length;

  // ── Folding ────────────────────────────────────────────────────────────

  static const _fold = <String, String>{
    'à': 'a', 'á': 'a', 'â': 'a', 'ä': 'a', 'ã': 'a', 'ā': 'a',
    'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e', 'ẽ': 'e', 'ɛ': 'e', 'ē': 'e',
    'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i', 'ĩ': 'i', 'ī': 'i',
    'ò': 'o', 'ó': 'o', 'ô': 'o', 'ö': 'o', 'õ': 'o', 'ɔ': 'o', 'ō': 'o',
    'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u', 'ũ': 'u', 'ū': 'u',
    'ŋ': 'n', 'ñ': 'n', 'ǹ': 'n', 'ç': 'c', 'œ': 'o', 'æ': 'a',
  };

  /// Lower-cases and removes tones/nasal marks/accents, mapping the Bàátɔ̀nú
  /// letters ɛ→e, ɔ→o, ŋ→n so that a user typing on a plain layout still
  /// matches the accented dictionary spelling.
  static String foldKey(String input) {
    final buf = StringBuffer();
    for (final rune in input.toLowerCase().runes) {
      if (rune >= 0x0300 && rune <= 0x036F) {
        continue; // combining grave / acute / tilde / …
      }
      final ch = String.fromCharCode(rune);
      buf.write(_fold[ch] ?? ch);
    }
    return buf.toString().trim();
  }

  // ── Text helpers ───────────────────────────────────────────────────────

  static bool _isWordRune(int r) =>
      (r >= 0x30 && r <= 0x39) ||
      (r >= 0x41 && r <= 0x5A) ||
      (r >= 0x61 && r <= 0x7A) ||
      r == 0x27 ||
      r == 0x2019 ||
      (r >= 0x00C0 && r <= 0x02AF) || // Latin ext. + IPA (ɛ ɔ ŋ)
      (r >= 0x0300 && r <= 0x036F) ||
      (r >= 0x1E00 && r <= 0x1EFF);

  /// The word being typed just before [cursor] (empty right after a space).
  static String currentWord(String text, int cursor) {
    final end = cursor.clamp(0, text.length);
    var start = end;
    while (start > 0 && _isWordRune(text.codeUnitAt(start - 1))) {
      start--;
    }
    return text.substring(start, end);
  }

  /// The word typed before the one being typed (used for bigram prediction).
  static String previousWord(String text, int cursor) {
    final end = cursor.clamp(0, text.length);
    var i = end;
    while (i > 0 && _isWordRune(text.codeUnitAt(i - 1))) {
      i--;
    }
    while (i > 0 && !_isWordRune(text.codeUnitAt(i - 1))) {
      i--;
    }
    var start = i;
    while (start > 0 && _isWordRune(text.codeUnitAt(start - 1))) {
      start--;
    }
    return text.substring(start, i);
  }

  /// Replaces the word before [cursor] with [replacement] (+ trailing space).
  static TextEditingValueLite applySuggestion(
    String text,
    int cursor,
    String replacement,
  ) {
    final end = cursor.clamp(0, text.length);
    final word = currentWord(text, end);
    final start = end - word.length;
    final after = text.substring(end);
    final insert = after.startsWith(' ') ? replacement : '$replacement ';
    final next = text.replaceRange(start, end, insert);
    return TextEditingValueLite(next, start + insert.length);
  }

  // ── Prediction ─────────────────────────────────────────────────────────

  /// Up to [limit] completions for [prefix]. With an empty prefix, proposes the
  /// most likely follow-ups of [previous] (bigrams) or the most frequent words.
  List<KeyboardEntry> predict(String prefix, {String previous = '', int limit = 3}) {
    final key = foldKey(prefix);
    final follow = _bigrams[foldKey(previous)] ?? const <String>[];
    final result = <KeyboardEntry>[];
    final seen = <String>{};

    void add(KeyboardEntry e) {
      if (result.length < limit && seen.add(foldKey(e.ba))) {
        result.add(e);
      }
    }

    // 1. Bigram candidates matching the prefix.
    for (final w in follow) {
      final fw = foldKey(w);
      if (key.isEmpty || fw.startsWith(key)) {
        add(_byKey[fw] ?? KeyboardEntry(w, '', 0));
      }
    }
    if (key.isEmpty) {
      if (result.isEmpty) {
        _entries.take(limit * 3).forEach(add);
      }
      return result;
    }
    // 2. Frequency-ranked prefix matches (entries are sorted by freq).
    for (final e in _entries) {
      if (result.length >= limit) {
        break;
      }
      if (foldKey(e.ba).startsWith(key) && foldKey(e.ba) != key) {
        add(e);
      }
    }
    // 3. Exact match last so the typed word itself is confirmable.
    final exact = _byKey[key];
    if (exact != null) {
      add(exact);
    }
    return result;
  }

  // ── Offline translation ────────────────────────────────────────────────

  static final _tokenizer = RegExp(r"[\p{L}\p{M}\p{N}'’]+|[^\p{L}\p{M}\p{N}'’]+", unicode: true);

  /// Word/phrase translation from the embedded dictionary; null when unknown.
  String? translateOffline(String text, KeyboardTranslationDirection direction) {
    final trimmed = text.trim();
    if (trimmed.isEmpty) {
      return null;
    }
    final key = foldKey(trimmed);
    final toFrench = direction == KeyboardTranslationDirection.baribaToFrench;
    final phrase = toFrench ? _phraseBa[key] : _phraseFr[key];
    if (phrase != null) {
      return phrase;
    }
    final single = toFrench ? _byKey[key]?.fr : _byFrench[key]?.ba;
    if (single != null && single.isNotEmpty) {
      return _cleanGloss(single, toFrench);
    }
    // Word by word; unknown words are kept verbatim inside brackets-free text.
    var known = 0;
    var words = 0;
    final out = StringBuffer();
    for (final m in _tokenizer.allMatches(trimmed)) {
      final token = m.group(0)!;
      if (!_isWordRune(token.runes.first)) {
        out.write(token);
        continue;
      }
      words++;
      final hit = toFrench ? _byKey[foldKey(token)]?.fr : _byFrench[foldKey(token)]?.ba;
      if (hit != null && hit.isNotEmpty) {
        known++;
        out.write(_cleanGloss(hit, toFrench));
      } else {
        out.write(token);
      }
    }
    return known > 0 && known * 2 >= words ? out.toString() : null;
  }

  /// Dictionary glosses can be long ("venir, arriver (voir …)"): keep the head.
  static String _cleanGloss(String gloss, bool toFrench) {
    if (!toFrench) {
      return gloss;
    }
    final head = gloss.split(RegExp(r'[;,(]')).first.trim();
    return head.isEmpty ? gloss.trim() : head;
  }

  // ── Tone / nasal composition ───────────────────────────────────────────

  static const combiningGrave = '̀';
  static const combiningAcute = '́';
  static const combiningTilde = '̃';

  /// Appends a combining [mark] to the last letter before [cursor].
  static TextEditingValueLite applyCombining(String text, int cursor, String mark) {
    final end = cursor.clamp(0, text.length);
    if (end == 0) {
      return TextEditingValueLite(text, end);
    }
    final next = text.replaceRange(end, end, mark);
    return TextEditingValueLite(next, end + mark.length);
  }
}

/// Minimal text+cursor pair so the engine stays free of Flutter widget types.
class TextEditingValueLite {
  const TextEditingValueLite(this.text, this.cursor);

  final String text;
  final int cursor;
}
