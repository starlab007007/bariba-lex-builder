/// DUNYA offline speech engine.
///
/// * Listening: Meta Omnilingual ASR (one model, French and Baatɔnum) running
///   in sherpa-onnx inside a background isolate so the UI never freezes.
/// * Speaking: MMS VITS voices (Baatɔnum, French fallback) in the same isolate,
///   or the phone's own French voice when it has one.
/// Nothing leaves the phone.
library;

import 'dart:async';
import 'dart:io';
import 'dart:isolate';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:sherpa_onnx/sherpa_onnx.dart' as sherpa;

import 'dunya_voice_pack.dart';

class DunyaSpeechEngine {
  DunyaSpeechEngine._(this._isolate, this._commands, this._responses, this.paths);

  final Isolate _isolate;
  final SendPort _commands;
  final ReceivePort _responses;
  final DunyaVoicePaths paths;
  final _pending = <int, Completer<Object?>>{};
  var _nextId = 0;

  static Future<DunyaSpeechEngine> start(DunyaVoicePaths paths, {required String tempDir}) async {
    final responses = ReceivePort();
    final threads = math.max(1, math.min(4, Platform.numberOfProcessors - 1));
    final config = <String, Object?>{
      'asrModel': paths.asrModel,
      'asrTokens': paths.asrTokens,
      'bbaModel': paths.ttsBba?.model,
      'bbaTokens': paths.ttsBba?.tokens,
      'fraModel': paths.ttsFra?.model,
      'fraTokens': paths.ttsFra?.tokens,
      'threads': threads,
      'tempDir': tempDir,
    };
    final isolate = await Isolate.spawn(_speechMain, [responses.sendPort, config], debugName: 'dunya-speech');
    final ready = Completer<SendPort>();
    DunyaSpeechEngine? created;
    responses.listen((message) {
      if (message is SendPort) {
        if (!ready.isCompleted) ready.complete(message);
        return;
      }
      if (message is List && message.length == 3) {
        final completer = created?._pending.remove(message[0] as int);
        if (completer == null) return;
        if (message[1] == 'ok') {
          completer.complete(message[2]);
        } else {
          completer.completeError(DunyaSpeechException(message[2].toString()));
        }
      }
    });
    final commands = await ready.future.timeout(const Duration(seconds: 20));
    final engine = DunyaSpeechEngine._(isolate, commands, responses, paths);
    created = engine;
    return engine;
  }

  Future<Object?> _call(String op, Object? payload) {
    final id = _nextId++;
    final completer = Completer<Object?>();
    _pending[id] = completer;
    _commands.send([id, op, payload]);
    return completer.future;
  }

  /// Loads the listening model in advance (a few seconds on small phones).
  Future<void> warmUp() async {
    if (paths.canListen) await _call('warm_asr', null);
  }

  /// [samples] are mono 16 kHz floats in [-1, 1].
  Future<String> transcribe(Float32List samples) async {
    if (!paths.canListen) throw DunyaSpeechException('Pack voix non installé.');
    final data = TransferableTypedData.fromList([samples]);
    final text = await _call('asr', data);
    return (text as String? ?? '').trim();
  }

  /// Writes a WAV for [text] with the offline voice of [lang] ('bba' | 'fra').
  Future<String> synthesize(String text, String lang, {double speed = 0.9}) async {
    final voice = lang == 'bba' ? paths.ttsBba : paths.ttsFra;
    if (voice == null) throw DunyaSpeechException('Voix $lang non installée.');
    final prepared = prepareTextForVoice(text, voice.normalization);
    final path = await _call('tts', [lang, prepared, speed]);
    return path as String;
  }

  void dispose() {
    for (final c in _pending.values) {
      if (!c.isCompleted) c.completeError(DunyaSpeechException('Moteur vocal arrêté.'));
    }
    _pending.clear();
    _isolate.kill(priority: Isolate.immediate);
    _responses.close();
  }
}

class DunyaSpeechException implements Exception {
  DunyaSpeechException(this.message);

  final String message;

  @override
  String toString() => message;
}

/// Lowercases and maps characters to the voice's alphabet (tones, apostrophes).
String prepareTextForVoice(String text, Map<String, String> normalization) {
  var s = text.toLowerCase().replaceAll('’', "'");
  final keys = normalization.keys.toList()..sort((a, b) => b.length.compareTo(a.length));
  for (final k in keys) {
    s = s.replaceAll(k, normalization[k]!);
  }
  return s.replaceAll(RegExp(r'\s+'), ' ').trim();
}

// ---------------------------------------------------------------------------
// Background isolate
// ---------------------------------------------------------------------------

void _speechMain(List<Object?> args) {
  final reply = args[0] as SendPort;
  final config = (args[1] as Map).cast<String, Object?>();
  final commands = ReceivePort();
  reply.send(commands.sendPort);

  var bindingsReady = false;
  sherpa.OfflineRecognizer? recognizer;
  final voices = <String, sherpa.OfflineTts>{};
  var counter = 0;
  final threads = config['threads'] as int;

  void ensureBindings() {
    if (bindingsReady) return;
    sherpa.initBindings();
    bindingsReady = true;
  }

  sherpa.OfflineRecognizer asr() {
    ensureBindings();
    return recognizer ??= sherpa.OfflineRecognizer(
      sherpa.OfflineRecognizerConfig(
        model: sherpa.OfflineModelConfig(
          omnilingual: sherpa.OfflineOmnilingualAsrCtcModelConfig(model: config['asrModel'] as String),
          tokens: config['asrTokens'] as String,
          numThreads: threads,
          debug: false,
        ),
      ),
    );
  }

  sherpa.OfflineTts voice(String lang) {
    ensureBindings();
    final existing = voices[lang];
    if (existing != null) return existing;
    final model = config['${lang}Model'] as String?;
    final tokens = config['${lang}Tokens'] as String?;
    if (model == null || tokens == null) throw StateError('voix $lang absente');
    final tts = sherpa.OfflineTts(
      sherpa.OfflineTtsConfig(
        model: sherpa.OfflineTtsModelConfig(
          vits: sherpa.OfflineTtsVitsModelConfig(model: model, tokens: tokens),
          numThreads: threads,
          debug: false,
        ),
        maxNumSenetences: 1,
      ),
    );
    voices[lang] = tts;
    return tts;
  }

  commands.listen((message) {
    final m = message as List;
    final id = m[0] as int;
    final op = m[1] as String;
    try {
      switch (op) {
        case 'warm_asr':
          asr();
          reply.send([id, 'ok', null]);
        case 'asr':
          final samples = (m[2] as TransferableTypedData).materialize().asFloat32List();
          final recognizerInstance = asr();
          final stream = recognizerInstance.createStream();
          try {
            stream.acceptWaveform(samples: samples, sampleRate: 16000);
            recognizerInstance.decode(stream);
            reply.send([id, 'ok', recognizerInstance.getResult(stream).text]);
          } finally {
            stream.free();
          }
        case 'tts':
          final p = m[2] as List;
          final lang = p[0] as String;
          final text = p[1] as String;
          final speed = (p[2] as num).toDouble();
          final audio = voice(lang).generate(text: text, sid: 0, speed: speed);
          if (audio.samples.isEmpty) throw StateError('audio vide');
          final path = '${config['tempDir']}/dunya_tts_${counter++ % 4}.wav';
          final ok = sherpa.writeWave(filename: path, samples: audio.samples, sampleRate: audio.sampleRate);
          if (!ok) throw StateError('écriture audio impossible');
          reply.send([id, 'ok', path]);
        default:
          reply.send([id, 'error', 'opération inconnue $op']);
      }
    } catch (error) {
      reply.send([id, 'error', error.toString()]);
    }
  });
}
