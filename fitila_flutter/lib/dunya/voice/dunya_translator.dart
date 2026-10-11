/// French <-> Baatɔnum translation for DUNYA's Bariba mode.
///
/// Engines, in order: on-device FITILA ByT5 (when its pack is installed),
/// then the FITILA cloud chain (ai-translate / byt5-bariba-translate) when
/// the phone is online. Hooks are set at app start-up (see main.dart).
library;

typedef DunyaTranslateFn = Future<String?> Function(String text, bool toBariba);

class DunyaTranslation {
  const DunyaTranslation(this.text, this.engine);

  final String text;

  /// 'offline' | 'online'
  final String engine;
}

class DunyaTranslator {
  DunyaTranslator._();

  /// On-device engine (FITILA ByT5 pack). Null until installed.
  static DunyaTranslateFn? offline;

  /// FITILA cloud chain; returns null when offline or signed out.
  static DunyaTranslateFn? online;

  static bool get hasAnyEngine => offline != null || online != null;

  static Future<DunyaTranslation?> translate(String text, {required bool toBariba}) async {
    final clean = text.trim();
    if (clean.isEmpty) return null;
    for (final (engine, fn) in [('offline', offline), ('online', online)]) {
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
