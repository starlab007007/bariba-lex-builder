/// French <-> Baatɔnum translation for DUNYA's Bariba mode.
///
/// Engines, in order: the validated translation memory (always exact, offline),
/// on-device FITILA ByT5 (when its pack is installed),
/// then the FITILA cloud chain (ai-translate / byt5-bariba-translate) when
/// the phone is online. Hooks are set at app start-up (see main.dart).
library;

import 'dunya_local_refiner.dart';

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

  static bool get hasAnyEngine => memory != null || offline != null || online != null;

  static Future<DunyaTranslation?> translate(String text, {required bool toBariba}) async {
    final clean = text.trim();
    if (clean.isEmpty) return null;
    for (final (engine, fn) in [('memory', memory), ('offline', offline), ('online', online)]) {
      if (fn == null) continue;
      try {
        final out = (await fn(clean, toBariba).timeout(const Duration(seconds: 35)))?.trim();
        if (out != null && out.isNotEmpty && out.toLowerCase() != clean.toLowerCase()) {
          if (engine == 'memory') return DunyaTranslation(out, engine);
          final result = DunyaLocalRefiner.refine(out, toBariba: toBariba);
          if (result.status == 'rejected') continue;
          return DunyaTranslation(result.text, engine);
        }
      } catch (_) {
        // Try the next engine.
      }
    }
    return null;
  }
}
