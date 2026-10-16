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
          return DunyaTranslation(out, engine);
        }
      } catch (_) {
        // Try the next engine.
      }
    }
    return null;
  }
}
