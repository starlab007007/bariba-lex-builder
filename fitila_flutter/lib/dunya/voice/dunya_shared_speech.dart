/// Shared, app-wide offline speech engine.
///
/// DUNYA's own voice page and every other screen that reads Baatɔnum text
/// aloud (Dictionnaire, Traducteur, Classe, Apprendre…) must share a single
/// running [DunyaSpeechEngine] instance. Starting a second one would load the
/// ASR/TTS models twice in memory — exactly what the project's own docs warn
/// against for low-end phones ("sans doubler le stockage ni allonger la
/// latence"). This class is the one place that is allowed to call
/// [DunyaSpeechEngine.start].
library;

import 'dart:async';

import 'package:path_provider/path_provider.dart';

import 'dunya_speech_engine.dart';
import 'dunya_voice_pack.dart';

class DunyaSharedSpeech {
  DunyaSharedSpeech._();

  static final DunyaSharedSpeech instance = DunyaSharedSpeech._();

  DunyaSpeechEngine? _engine;
  DunyaVoicePaths _paths = const DunyaVoicePaths();
  Future<void>? _starting;

  /// Last resolved pack paths (speak/listen capability flags).
  DunyaVoicePaths get paths => _paths;

  /// The running engine, if the installed packs allow at least one of
  /// listening or speaking. Null before the first [ensureStarted] call, or if
  /// no offline voice pack is installed.
  DunyaSpeechEngine? get engineOrNull => _engine;

  /// Re-resolves installed packs and (re)starts the engine if needed — call
  /// after a pack install/removal. Safe to call repeatedly; concurrent calls
  /// share the same resolution so packs are never loaded twice at once.
  Future<DunyaVoicePaths> refresh() async {
    if (_starting != null) {
      await _starting;
      return _paths;
    }
    final completer = Completer<void>();
    _starting = completer.future;
    try {
      final resolved = await DunyaVoicePackManager.instance.resolvePaths();
      final samePaths = resolved.asrModel == _paths.asrModel &&
          resolved.ttsBba?.model == _paths.ttsBba?.model &&
          resolved.ttsFra?.model == _paths.ttsFra?.model;
      if (samePaths && _engine != null) {
        return _paths;
      }
      _engine?.dispose();
      _engine = null;
      _paths = resolved;
      if (!resolved.canListen && !resolved.canSpeakBariba && !resolved.canSpeakFrenchOffline) {
        return _paths;
      }
      final temp = await getTemporaryDirectory();
      _engine = await DunyaSpeechEngine.start(resolved, tempDir: temp.path);
    } catch (_) {
      _engine = null;
    } finally {
      completer.complete();
      _starting = null;
    }
    return _paths;
  }

  /// Starts the engine on first use (lazy). No-op if already running with the
  /// currently installed packs.
  Future<DunyaSpeechEngine?> ensureStarted() async {
    if (_engine != null) return _engine;
    await refresh();
    return _engine;
  }

  /// Synthesizes [text] in Baatɔnum entirely on-device and returns the WAV
  /// file path, or null if no voice pack is installed or synthesis failed.
  /// Never throws: callers (e.g. [LocalSpeech]) treat null as "try something
  /// else", not as an error to surface loudly.
  Future<String?> synthesizeBariba(String text, {double speed = 0.9}) async {
    final clean = text.trim();
    if (clean.isEmpty) return null;
    try {
      final engine = await ensureStarted();
      if (engine == null || !_paths.canSpeakBariba) return null;
      return await engine.synthesize(clean, 'bba', speed: speed);
    } catch (_) {
      return null;
    }
  }

  /// Same as [synthesizeBariba] for the optional offline French fallback
  /// voice (used only when the phone has no French system voice).
  Future<String?> synthesizeFrench(String text, {double speed = 0.9}) async {
    final clean = text.trim();
    if (clean.isEmpty) return null;
    try {
      final engine = await ensureStarted();
      if (engine == null || !_paths.canSpeakFrenchOffline) return null;
      return await engine.synthesize(clean, 'fra', speed: speed);
    } catch (_) {
      return null;
    }
  }
}
