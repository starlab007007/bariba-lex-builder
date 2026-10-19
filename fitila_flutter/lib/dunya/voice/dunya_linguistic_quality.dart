/// Conservative post-generation quality checks for offline FR ↔ Baatɔnum.
/// A heuristic rejection is not a linguistic correction. No automatic invented
/// translations, and corpus grade A/B is not human validation.
library;

class DunyaQualityAssessment {
  const DunyaQualityAssessment({required this.accepted, required this.flags});
  final bool accepted;
  final List<String> flags;
}

class DunyaLinguisticQualityEngine {
  const DunyaLinguisticQualityEngine();

  static final RegExp _word = RegExp(r"[^\s,.!?;:()]+", unicode: true);
  static final RegExp _numbers = RegExp(r'\d+');
  static final RegExp _replacement = RegExp('\uFFFD');

  DunyaQualityAssessment assess({
    required String source,
    required String candidate,
    required bool toBariba,
  }) {
    final flags = <String>[];
    final result = candidate.trim();
    if (result.isEmpty) flags.add('empty_output');
    if (_replacement.hasMatch(result)) flags.add('invalid_utf8');
    if (result.toLowerCase() == source.trim().toLowerCase()) flags.add('unchanged_source');

    final words = _word.allMatches(result.toLowerCase())
        .map((m) => m.group(0)!).toList();
    // Consecutive loops are a strong malfunction signal, not ordinary grammar.
    for (var span = 1; span <= 3 && span * 3 <= words.length; span++) {
      var found = false;
      for (var i = 0; i + 3 * span <= words.length; i++) {
        final fragment = words.sublist(i, i + span).join(' ');
        if (fragment == words.sublist(i + span, i + 2 * span).join(' ') &&
            fragment == words.sublist(i + 2 * span, i + 3 * span).join(' ')) {
          found = true;
          break;
        }
      }
      if (found) {
        flags.add('repeated_ngram');
        break;
      }
    }

    // Digits cannot disappear silently. Spelled-out numbers require a
    // bilingual grammar and are deliberately not "corrected" here.
    final inputDigits = _numbers.allMatches(source).map((m) => m.group(0)!).toList();
    final outputDigits = _numbers.allMatches(result).map((m) => m.group(0)!).toList();
    if (inputDigits.isNotEmpty && inputDigits.join('|') != outputDigits.join('|')) {
      // A language may legitimately spell numerals out; only contradictory
      // digit-to-digit outputs are a hard failure.
      flags.add(outputDigits.isNotEmpty ? 'number_mismatch' : 'review_number_words');
    }

    // Source-side negation requires language-aware morphology; this is only
    // a REVIEW flag, never a rejection or fabricated replacement.
    if (!toBariba &&
        RegExp(r"(^|\s)(ku|kun|ǹ)(\s|$)", caseSensitive: false).hasMatch(source) &&
        !RegExp(r"\b(ne|n'|pas|plus|jamais|aucun|sans|ni)\b", caseSensitive: false).hasMatch(result.toLowerCase())) {
      flags.add('review_negation');
    }

    // Only structurally untrustworthy outputs are rejected. Negation review
    // is displayed separately; no unchecked rewrite is generated.
    final fatal = flags.any((f) =>
        f != 'review_negation' && f != 'review_number_words');
    return DunyaQualityAssessment(accepted: !fatal, flags: flags);
  }
}
