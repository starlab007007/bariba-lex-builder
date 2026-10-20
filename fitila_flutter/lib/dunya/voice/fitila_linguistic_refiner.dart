/// FITILA Linguistic Refinement Engine (FLRE) V1.
/// Offline-only, conservative checks. Linguistic corrections require
/// separately attested rules; do not guess Baatɔnum negation or morphology.
class FlreResult {
  const FlreResult({
    required this.translation,
    required this.warnings,
    required this.provenance,
    required this.accepted,
    required this.refinementApplied,
  });

  final String translation;
  final List<String> warnings;
  final String provenance;
  final bool accepted;
  final bool refinementApplied;
}

abstract final class FitilaLinguisticRefiner {
  static final _digits = RegExp(r'(?<![\p{L}\p{N}])\d+(?:[.,]\d+)*(?![\p{L}\p{N}])', unicode: true);
  static final _space = RegExp(r'\s+');

  /// Never inserts missing entities or negation markers speculatively.
  /// Missing digits are signaled so the UI can ask for confirmation.
  static FlreResult refine({
    required String source,
    required String candidate,
    required bool toBariba,
    required String engine,
    String? context,
  }) {
    final normalized = candidate.replaceAll(_space, ' ').trim();
    final warnings = <String>[];
    if (normalized.isEmpty) {
      return FlreResult(translation: '', warnings: const ['empty_translation'],
          provenance: engine, accepted: false, refinementApplied: false);
    }
    final words = normalized.split(' ');
    for (var span = 1; span <= 3; span++) {
      if (words.length < span * 4) continue;
      for (var pos = 0; pos <= words.length - span * 4; pos++) {
        final phrase = words.sublist(pos, pos + span).join(' ');
        if (List.generate(4, (k) =>
            words.sublist(pos + k * span, pos + (k + 1) * span).join(' '))
            .every((part) => part == phrase)) {
          return FlreResult(translation: normalized,
              warnings: const ['repetition_loop'], provenance: engine,
              accepted: false, refinementApplied: normalized != candidate);
        }
      }
    }
    if (engine != 'memory') {
      final inputNumbers = _digits.allMatches(source).map((m) => m.group(0)).toList();
      final outputNumbers = _digits.allMatches(normalized).map((m) => m.group(0)).toList();
      if (inputNumbers.isNotEmpty && inputNumbers.join('|') != outputNumbers.join('|')) {
        warnings.add('numbers_need_review');
      }
      if (source.toLowerCase() == normalized.toLowerCase()) {
        warnings.add('unchanged_translation');
      }
      if (toBariba && RegExp(r'\b(ne|pas|jamais|aucun|sans)\b', caseSensitive: false)
          .hasMatch(source)) {
        // Do not assume what grammatical form is required in Baatɔnum.
        warnings.add('negation_review_required');
      }
    }
    return FlreResult(translation: normalized, warnings: warnings,
        provenance: engine, accepted: true,
        refinementApplied: normalized != candidate);
  }
}
