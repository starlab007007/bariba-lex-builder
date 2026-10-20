/// French <-> Baatɔnum translation for DUNYA's Bariba mode.
///
/// Engines, in order: the validated translation memory (always exact, offline),
/// on-device FITILA ByT5 (when its pack is installed),
/// then the FITILA cloud chain (ai-translate / byt5-bariba-translate) when
/// the phone is online. Hooks are set at app start-up (see main.dart).
library;

import 'dunya_linguistic_quality.dart';

/// The on-device ByT5 pack is shipped as a beta (manifest tested:false). It is active, but every
/// result it produces is announced as a test result and must be double-checked.
const dunyaOfflineTestNotice = 'Traduction hors ligne en test (bêta) : à vérifier.';

typedef DunyaTranslateFn = Future<String?> Function(String text, bool toBariba);

class DunyaTranslation {
  const DunyaTranslation(this.text, this.engine, {this.reviewFlags = const []});

  final String text;

  /// 'memory' | 'offline' | 'online'
  final String engine;

  /// Nonblocking caution indicators, e.g. grammar requiring human review.
  final List<String> reviewFlags;
}

class DunyaTranslator {
  DunyaTranslator._();

  /// Validated sentence memory (dictionary, Apprendre, scenes). Instant and exact.
  static DunyaTranslateFn? memory;
  static const quality = DunyaLinguisticQualityEngine();

  /// On-device engine (FITILA ByT5 pack). Null until installed.
  static DunyaTranslateFn? offline;

  /// FITILA cloud chain; returns null when offline or signed out.
  static DunyaTranslateFn? online;
  static bool Function()? allowRemote;
  static bool Function()? preferRemote;

  // Avoid repeating expensive ByT5 calls for identical phrases. Bounded cache
  // never stores failures; online and offline results are isolated.
  static final _cache = <String, DunyaTranslation>{};
  static const _maxCacheEntries = 96;

  static bool get hasAnyEngine => memory != null || offline != null || online != null;

  static Future<DunyaTranslation?> translate(String text, {required bool toBariba}) async {
    final clean = text.trim();
    if (clean.isEmpty) return null;
    final remoteOk = allowRemote?.call() ?? false;
    final remoteFirst = remoteOk && (preferRemote?.call() ?? false);
    final cacheKey = '${toBariba ? 'fr-bba' : 'bba-fr'}|${remoteFirst ? 'remote' : 'local'}|${clean.toLowerCase()}';
    final cached = _cache[cacheKey];
    if (cached != null && (cached.engine != 'online' || remoteOk)) return cached;
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
          // On-device neural translation must not silently show corrupted,
          // looped, or numerically inconsistent results. Review flags are
          // propagated, but never used for automatic semantic rewrites.
          final assessment = engine == 'offline'
              ? quality.assess(source: clean, candidate: out, toBariba: toBariba)
              : const DunyaQualityAssessment(accepted: true, flags: []);
          if (!assessment.accepted) continue;
          final result = DunyaTranslation(out, engine, reviewFlags: assessment.flags);
          if (_cache.length >= _maxCacheEntries) _cache.remove(_cache.keys.first);
          _cache[cacheKey] = result;
          return result;
        }
      } catch (_) {
        // Try the next engine.
      }
    }
    return null;
  }
}
