import 'package:audioplayers/audioplayers.dart' as audio;
import 'package:flutter_tts/flutter_tts.dart';

import '../apprendre/apprendre_audio.dart';
import '../dunya/voice/dunya_shared_speech.dart';

/// Lecture vocale sans Internet, pour tout l'app (Dictionnaire, Traducteur,
/// Classe, Apprendre…) :
///  - Bàátɔ̀nú : d'abord la voix humaine de référence déjà téléchargée
///    (Apprendre), sinon la voix générée sur l'appareil (pack DUNYA installé,
///    MMS-TTS Baatɔnum via sherpa-onnx) — couvre n'importe quel texte, y
///    compris les 8900+ mots du Dictionnaire qui n'ont pas d'enregistrement ;
///  - français : synthèse vocale du téléphone, sinon la voix française de
///    secours du pack DUNYA si le téléphone n'en a pas.
abstract final class LocalSpeech {
  static FlutterTts? _tts;
  static audio.AudioPlayer? _player;

  /// Renvoie true si le texte a pu être lu localement, par un moyen ou un autre.
  static Future<bool> speak(String text, {required bool bariba}) async {
    final clean = text.trim();
    if (clean.isEmpty) return false;
    if (bariba) {
      try {
        final ap = ApAudioService.instance;
        await ap.ensureLoaded(refresh: false);
        if (ap.has(clean) && await ap.play(clean)) return true;
      } catch (_) {
        // Catalogue indisponible : on tente la voix générée.
      }
      final generated = await DunyaSharedSpeech.instance.synthesizeBariba(clean);
      if (generated == null) return false;
      return _playFile(generated);
    }
    try {
      final tts = _tts ??= FlutterTts();
      await tts.setLanguage('fr-FR');
      await tts.speak(clean);
      return true;
    } catch (_) {
      final generated = await DunyaSharedSpeech.instance.synthesizeFrench(clean);
      if (generated == null) return false;
      return _playFile(generated);
    }
  }

  static Future<bool> _playFile(String path) async {
    try {
      final player = _player ??= audio.AudioPlayer();
      await player.stop();
      await player.play(audio.DeviceFileSource(path));
      return true;
    } catch (_) {
      return false;
    }
  }
}
