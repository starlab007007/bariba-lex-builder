/// Deterministic FITILA post-editor. No network, Gemini or paid API.
/// Safe lexical rewrites are guarded and never treated as semantic certification.
library;
import 'dart:math' as math;

class DunyaRefinement {
  const DunyaRefinement({required this.text, required this.status, required this.reason});
  final String text;
  final String status; // applied, unchanged, rejected
  final String reason;
}

abstract final class DunyaLocalRefiner {
  static String normalize(String value) => value.replaceAll(RegExp(r'\s+'), ' ').trim();
  static final forbidden = RegExp(r'share via link|loading|submit|clear|button|click|select|undefined|<html|<!doctype', caseSensitive: false);
  static final substitutions = <(RegExp, String)>[
    (RegExp(r'Kua dɔ̃ɔ', caseSensitive: false), 'A kpuna n do?'),
    (RegExp(r'Kua wɛrɛ', caseSensitive: false), 'Bɛɛ ka yoka'),
    (RegExp(r'A kɛra\s*\?', caseSensitive: false), 'Anna wunɛn wasi?'),
    (RegExp(r'Na kɛra sãa sãa', caseSensitive: false), 'Alaafia'),
    (RegExp(r'A nii koo', caseSensitive: false), 'siara'),
    (RegExp(r'Nɛn yaa', caseSensitive: false), 'bii mɛro'),
    (RegExp(r'Nim nɔnkuru', caseSensitive: false), 'nim nɔru'),
    (RegExp(r'Goo u g[ɑaã̃]+ kasuu,\s*u ga bɛri', caseSensitive: false), 'Durɔ goo u kasuu, u ga bɛri'),
  ];
  static String _correctBariba(String value) {
    var result = normalize(value);
    for (final (pattern, replacement) in substitutions) {
      result = result.replaceAll(pattern, replacement);
    }
    return normalize(result);
  }
  static int _editDistance(String a, String b) {
    var prev = List<int>.generate(b.length + 1, (i) => i);
    for (var i = 1; i <= a.length; i++) {
      final next = List<int>.filled(b.length + 1, 0)..[0] = i;
      for (var j = 1; j <= b.length; j++) {
        next[j] = math.min(math.min(prev[j] + 1, next[j-1] + 1), prev[j-1] + (a.codeUnitAt(i-1) == b.codeUnitAt(j-1) ? 0 : 1));
      }
      prev = next;
    }
    return prev[b.length];
  }
  static DunyaRefinement refine(String draft, {required bool toBariba}) {
    final original = normalize(draft);
    if (original.isEmpty || forbidden.hasMatch(original)) {
      return DunyaRefinement(text: original, status: 'rejected', reason: 'invalid_input');
    }
    final candidate = toBariba ? _correctBariba(original) : original;
    if (candidate == original) return DunyaRefinement(text: original, status: 'unchanged', reason: 'no_attested_change');
    final distance = _editDistance(original.toLowerCase(), candidate.toLowerCase());
    final similarity = 1 - distance / math.max(original.length, candidate.length);
    // Server's conservative edit-distance guard. Additional lexical checks still
    // take place server-side; client rejects rather than guessing.
    if (similarity < (toBariba ? .6 : .5)) {
      return DunyaRefinement(text: original, status: 'rejected', reason: 'too_different');
    }
    return DunyaRefinement(text: candidate, status: 'applied', reason: 'local_rule');
  }
}
