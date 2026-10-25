/// French <-> Baatɔnum translation for DUNYA's Bariba mode.
///
/// Engines, in order: the validated translation memory (always exact, offline),
/// on-device FITILA ByT5 (when its pack is installed),
/// then the FITILA cloud chain (ai-translate / byt5-bariba-translate) when
/// the phone is online. Hooks are set at app start-up (see main.dart).
library;

import 'dunya_linguistic_quality.dart';
import 'dunya_refine.dart';

/// The on-device beta requires an explicit opt-in. Every result is labelled for review.
const dunyaOfflineTestNotice = 'Traduction hors ligne en test (bêta) : à vérifier.';

/// Set by the app each time a result was produced by the offline beta model, so every surface
/// (DUNYA, translator, keyboard) can show the same "test (bêta)" mention next to it.
abstract final class DunyaOfflineBeta {
  static bool lastUsed = false;
  static const label = 'test (bêta)';
}

typedef DunyaTranslateFn = Future<String?> Function(String text, bool toBariba);

class DunyaTranslation {
  const DunyaTranslation(this.text, this.engine, {this.reviewFlags = const [], this.refined = false});

  final String text;

  /// 'memory' | 'offline' | 'online'
  final String engine;

  /// Nonblocking caution indicators, e.g. grammar requiring human review.
  final List<String> reviewFlags;

  /// True when the deterministic refinement (see dunya_refine.dart) changed the engine output.
  final bool refined;
}

class DunyaTranslator {
  DunyaTranslator._();

  /// Validated sentence memory (dictionary, Apprendre, scenes). Instant and exact.
  static DunyaTranslateFn? memory;
  static const quality = DunyaLinguisticQualityEngine();

  /// On-device engine (FITILA ByT5 pack). Null until installed.
  static DunyaTranslateFn? offline;

  /// Attested Baatɔnum vocabulary for the offline spelling repair (set once the memory has loaded).
  static DunyaRefineLexicon? refineLexicon;

  /// Deterministic refinement of an on-device (beta) result. Online results are refined by the server.
  static String refineOffline(String source, String output, bool toBariba) =>
      dunyaRefine(source, output, toBariba, lexicon: refineLexicon).text;

  /// FITILA cloud chain; returns null when offline or signed out.
  static DunyaTranslateFn? online;
  static bool Function()? allowRemote;
  static bool Function()? preferRemote;

  // Avoid repeating expensive ByT5 calls for identical phrases. Bounded cache
  // never stores failures; online and offline results are isolated.
  static final _cache = <String, DunyaTranslation>{};
  static const _maxCacheEntries = 96;
  static void clearCache() => _cache.clear();

  static bool get hasAnyEngine => memory != null || offline != null || online != null;

  static Future<DunyaTranslation?> translate(String text, {required bool toBariba}) async {
    final clean = text.trim();
    if (clean.isEmpty) return null;
    final remoteOk = allowRemote?.call() ?? false;
    final remoteFirst = remoteOk && (preferRemote?.call() ?? false);
    final cacheKey = '${toBariba ? 'fr-bba' : 'bba-fr'}|${remoteFirst ? 'remote' : 'local'}|${clean.toLowerCase()}';
    final cached = _cache[cacheKey];
    if (cached != null && (cached.engine != 'online' || remoteOk) &&
        (cached.engine != 'offline' || offline != null)) return cached;
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
          // Offline (and only offline): deterministic refinement of the beta model output.
          final polished = engine == 'offline' ? refineOffline(clean, out, toBariba) : out;
          final result = DunyaTranslation(polished, engine,
              reviewFlags: assessment.flags, refined: polished != out);
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
