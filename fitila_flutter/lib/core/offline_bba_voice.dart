/// Shared, lazy Android/iOS MMS VITS runtime for all Flutter FITILA modules.
/// Does not use a network or download models. The same engine is reused for
/// Dictionnaire, Apprendre, Traducteur and DUNYA.
library;

import 'dart:async';

import 'package:audioplayers/audioplayers.dart' as audio;
import 'package:path_provider/path_provider.dart';

import '../dunya/voice/dunya_speech_engine.dart';
import '../dunya/voice/dunya_voice_pack.dart';

class OfflineBbaVoice {
  OfflineBbaVoice._();
  static final OfflineBbaVoice instance = OfflineBbaVoice._();

  final _player = audio.AudioPlayer();
  DunyaSpeechEngine? _engine;
  DunyaVoicePaths _paths = const DunyaVoicePaths();
  Future<DunyaSpeechEngine?>? _pending;

  DunyaVoicePaths get paths => _paths;

  Future<DunyaSpeechEngine?> ensureLoaded() =>
      _pending ??= _load().whenComplete(() => _pending = null);

  Future<DunyaSpeechEngine?> _load() async {
    final paths = await DunyaVoicePackManager.instance.resolvePaths();
    if (_engine != null &&
        paths.asrModel == _paths.asrModel &&
        paths.ttsBba?.model == _paths.ttsBba?.model &&
        paths.ttsFra?.model == _paths.ttsFra?.model) {
      return _engine;
    }
    _engine?.dispose();
    _engine = null;
    _paths = paths;
    if (!paths.canListen && !paths.canSpeakBariba && !paths.canSpeakFrenchOffline) {
      return null;
    }
    final dir = await getTemporaryDirectory();
    return _engine = await DunyaSpeechEngine.start(paths, tempDir: dir.path);
  }

  /// Called when the user has installed or removed a model ZIP.
  Future<DunyaSpeechEngine?> reload() async {
    if (_pending != null) await _pending;
    _engine?.dispose();
    _engine = null;
    _paths = const DunyaVoicePaths();
    return ensureLoaded();
  }

  /// Generate an offline WAV for reuse by existing audio players.
  /// Returns null if a validated local Baatɔnum pack is not installed.
  Future<String?> synthesizeToFile(String text, {double speed = 0.9}) async {
    if (text.trim().isEmpty) return null;
    final engine = await ensureLoaded();
    if (engine == null || !_paths.canSpeakBariba) return null;
    return engine.synthesize(text, 'bba', speed: speed);
  }

  Future<bool> speak(String text) async {
    final path = await synthesizeToFile(text);
    if (path == null) return false;
    await _player.stop();
    final finished = _player.onPlayerComplete.first;
    await _player.play(audio.DeviceFileSource(path));
    await finished.timeout(const Duration(seconds: 90), onTimeout: () {});
    return true;
  }

  Future<void> stop() => _player.stop();
}
