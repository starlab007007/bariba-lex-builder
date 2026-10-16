import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Langue de l'interface, synchronisée avec le catalogue Web livré dans
/// public/i18n-platform.json. Le catalogue est inclus dans l'APK : aucun
/// accès réseau, modèle génératif ou traduction inventée n'est nécessaire.
abstract final class FitilaLanguage {
  static const _key = 'fitila_language';
  static const _catalogAsset = 'assets/i18n-platform.json';

  static final ValueNotifier<String> current = ValueNotifier('fr');
  static Future<void>? _loading;
  static final Map<String, String> _byKey = {};
  static final Map<String, String> _byFrench = {};
  static final Set<String> _ambiguousFrench = {};

  static bool get isBariba => current.value == 'ba';
  static int get translatedKeys => _byKey.length;

  /// Un libellé français sans équivalent unique et attesté demeure français.
  /// Pour les termes polysémiques (ex. Traducteur), utiliser la clé Web.
  static String translate(String french, {String? key}) {
    if (!isBariba || french.trim().isEmpty) return french;
    if (key != null && _byKey.containsKey(key)) return _byKey[key]!;
    return _byFrench[french.trim().toLowerCase()] ?? french;
  }

  static Future<void> ensureLoaded() => _loading ??= () async {
    try {
      final contents = await rootBundle.loadString(_catalogAsset);
      final raw = jsonDecode(contents);
      if (raw is Map) {
        _byKey.clear();
        _byFrench.clear();
        _ambiguousFrench.clear();
        for (final item in raw.entries) {
          if (item.key is! String || item.value is! Map) continue;
          final value = item.value as Map;
          final fr = value['fr'];
          final ba = value['ba'];
          if (fr is! String || ba is! String || ba.trim().isEmpty) continue;
          _byKey[item.key as String] = ba.trim();
          final label = fr.trim().toLowerCase();
          if (label.isEmpty || _ambiguousFrench.contains(label)) continue;
          final earlier = _byFrench[label];
          if (earlier == null) {
            _byFrench[label] = ba.trim();
          } else if (earlier != ba.trim()) {
            _ambiguousFrench.add(label);
            _byFrench.remove(label);
          }
        }
      }
    } catch (error) {
      debugPrint('FITILA localisation: catalogue unavailable: $error');
    }
    try {
      final saved = (await SharedPreferences.getInstance()).getString(_key);
      if (saved == 'fr' || saved == 'ba') current.value = saved!;
    } catch (error) {
      debugPrint('FITILA localisation: saved language unavailable: $error');
    }
  }();

  static Future<void> set(String code) async {
    if (code != 'fr' && code != 'ba') throw ArgumentError.value(code, 'code');
    await ensureLoaded();
    current.value = code;
    try {
      await (await SharedPreferences.getInstance()).setString(_key, code);
    } catch (error) {
      debugPrint('FITILA localisation: failed to persist language: $error');
    }
  }
}
