import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Langue d'affichage des contenus bilingues (Français / Bàátɔ̀nú), mémorisée sur l'appareil.
/// Le sélecteur de la barre latérale l'écrit ; la Classe (guide, grammaire…) la lit.
abstract final class FitilaLanguage {
  static const _key = 'fitila_language';

  /// `fr` ou `ba`.
  static final ValueNotifier<String> current = ValueNotifier('fr');
  static Future<void>? _loading;

  static bool get isBariba => current.value == 'ba';

  static Future<void> ensureLoaded() => _loading ??= () async {
    try {
      final saved = (await SharedPreferences.getInstance()).getString(_key);
      if (saved == 'fr' || saved == 'ba') {
        current.value = saved!;
      }
    } catch (_) {}
  }();

  static Future<void> set(String code) async {
    current.value = code;
    try {
      await (await SharedPreferences.getInstance()).setString(_key, code);
    } catch (_) {}
  }
}
