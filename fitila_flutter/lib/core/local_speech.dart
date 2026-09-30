import 'package:flutter_tts/flutter_tts.dart';

import '../apprendre/apprendre_audio.dart';

/// Lecture vocale sans Internet :
///  - français : synthèse vocale du téléphone ;
///  - Bàátɔ̀nú : voix de référence déjà téléchargées dans le module Apprendre.
abstract final class LocalSpeech {
  static FlutterTts? _tts;

  /// Renvoie true si le texte a pu être lu localement.
  static Future<bool> speak(String text, {required bool bariba}) async {
    final clean = text.trim();
    if (clean.isEmpty) return false;
    try {
      if (bariba) {
        final ap = ApAudioService.instance;
        await ap.ensureLoaded(refresh: false);
        return ap.has(clean) && await ap.play(clean);
      }
      final tts = _tts ??= FlutterTts();
      await tts.setLanguage('fr-FR');
      await tts.speak(clean);
      return true;
    } catch (_) {
      return false;
    }
  }
}
