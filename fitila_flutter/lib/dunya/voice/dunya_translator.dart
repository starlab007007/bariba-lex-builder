/// French <-> Baatɔnum translation for DUNYA's Bariba mode.
///
/// Engines, in order: the validated translation memory (always exact, offline),
/// on-device FITILA ByT5 (when its pack is installed),
/// then the FITILA cloud chain (ai-translate / byt5-bariba-translate) when
/// the phone is online. Hooks are set at app start-up (see main.dart).
library;

typedef DunyaTranslateFn = Future<String?> Function(String text, bool toBariba);

class DunyaTranslation {
  const DunyaTranslation(this.text, this.engine);

  final String text;

  /// 'memory' | 'offline' | 'online'
  final String engine;
}

class DunyaTranslator {
  DunyaTranslator._();

  /// Validated sentence memory (dictionary, Apprendre, scenes). Instant and exact.
  static DunyaTranslateFn? memory;

  /// On-device engine (FITILA ByT5 pack). Null until installed.
  static DunyaTranslateFn? offline;

  /// FITILA cloud chain; returns null when offline or signed out.
  static DunyaTranslateFn? online;
  static bool Function()? allowRemote;
  static bool Function()? preferRemote;

  static bool get hasAnyEngine => memory != null || offline != null || online != null;

  /// Conservative post-inference guard shared by DUNYA, the translator and
  /// Flutter's in-app keyboard. Never invents or silently edits semantics.
  /// More ambitious grammar refinement requires a reviewed linguistic model.
  static String _safeLocalResult(String source, String output, String engine) {
    final normalized = output.replaceAll(RegExp(r'\\s+'), ' ').trim();
    if (engine == 'memory') return normalized;
    // Ignore suspicious exact repetition loops; callers can request a review.
    final words = normalized.split(RegExp(r'\\s+'));
    for (var n = 1; n <= 3; n++) {
      if (words.length < n * 4) continue;
      for (var start = 0; start <= words.length - n * 4; start++) {
        final unit = words.sublist(start, start + n).join(' ');
        if (List.generate(4, (i) => words.sublist(start + i * n, start + (i + 1) * n).join(' '))
            .every((part) => part == unit)) {
          throw StateError('Répétitions suspectes dans la traduction');
        }
      }
    }
    return normalized;
  }

  static Future<DunyaTranslation?> translate(String text, {required bool toBariba}) async {
    final clean = text.trim();
    if (clean.isEmpty) return null;
    final remoteOk = allowRemote?.call() ?? false;
    final remoteFirst = remoteOk && (preferRemote?.call() ?? false);
    final engines = [
      ('memory', memory),
      if (remoteFirst) ('online', online),
      ('offline', offline),
      if (!remoteFirst && remoteOk) ('online', online),
    ];
    for (final (engine, fn) in engines) {
      if (fn == null) continue;
      try {
        final out = (await fn(clean, toBariba).timeout(const Duration(seconds: 35)))?.trim();
        if (out != null && out.isNotEmpty && out.toLowerCase() != clean.toLowerCase()) {
          return DunyaTranslation(_safeLocalResult(clean, out, engine), engine);
        }
      } catch (_) {
        // Try the next engine.
      }
    }
    return null;
  }
}
