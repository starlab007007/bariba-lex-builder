/// Microphone capture for DUNYA: 16 kHz mono PCM with a light energy detector
/// that stops by itself after the user stops talking (no extra model needed).
library;

import 'dart:async';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:record/record.dart';

class DunyaUtteranceDetector {
  DunyaUtteranceDetector({
    this.sampleRate = 16000,
    // 1300ms ajoutait un temps mort fixe, identique, à chaque tour (avant même
    // le début de la transcription/réponse) : réduit à 700ms, une valeur
    // courante pour la détection de fin de phrase, qui reste largement
    // au-dessus d'une pause naturelle entre deux mots.
    this.silenceToStop = const Duration(milliseconds: 700),
    this.maxDuration = const Duration(seconds: 20),
    this.noSpeechTimeout = const Duration(seconds: 7),
    this.minThreshold = 0.008,
    this.minSpeech = const Duration(milliseconds: 180),
  });

  /// Raised during DUNYA's own speech so its voice does not trigger a turn.
  final double minThreshold;
  final Duration minSpeech;

  final int sampleRate;
  final Duration silenceToStop;
  final Duration maxDuration;
  final Duration noSpeechTimeout;

  final _samples = <double>[];
  double _noiseFloor = 0.0025;
  var _speechSamples = 0;
  var _silentSamples = 0;
  var _heardSpeech = false;
  int? _firstSpeech;
  var _lastSpeech = 0;

  bool get heardSpeech => _heardSpeech;

  Float32List get samples {
    if (_firstSpeech == null) return Float32List.fromList(_samples);
    // Keep consonant margins but avoid sending seconds of leading silence
    // through ASR. This also reduces uploads on a weak mobile connection.
    final start = math.max(0, _firstSpeech! - sampleRate ~/ 4);
    final end = math.min(_samples.length, _lastSpeech + sampleRate * 3 ~/ 10);
    return Float32List.fromList(_samples.sublist(start, end));
  }

  /// Feeds float samples; returns the RMS level (0..1) of the chunk.
  double add(Float32List chunk) {
    if (chunk.isEmpty) return 0;
    var sum = 0.0;
    for (final s in chunk) {
      sum += s * s;
      _samples.add(s);
    }
    final rms = math.sqrt(sum / chunk.length);
    final threshold = math.max(minThreshold, _noiseFloor * 2.8);
    if (rms > threshold) {
      _firstSpeech ??= _samples.length - chunk.length;
      _lastSpeech = _samples.length;
      _speechSamples += chunk.length;
      _silentSamples = 0;
      if (_speechSamples > sampleRate * minSpeech.inMilliseconds / 1000) _heardSpeech = true;
    } else {
      _silentSamples += chunk.length;
      // Track background noise only while nobody speaks.
      _noiseFloor = _noiseFloor * 0.95 + rms * 0.05;
    }
    return rms;
  }

  bool get shouldStop {
    final total = _samples.length;
    if (total >= maxDuration.inMilliseconds * sampleRate ~/ 1000) return true;
    if (_heardSpeech) {
      return _silentSamples >= silenceToStop.inMilliseconds * sampleRate ~/ 1000;
    }
    return total >= noSpeechTimeout.inMilliseconds * sampleRate ~/ 1000;
  }
}

/// Converts little-endian PCM16 bytes to floats, carrying an odd byte over.
class DunyaPcm16Decoder {
  int? _carry;

  Float32List decode(Uint8List bytes) {
    var data = bytes;
    if (_carry != null) {
      data = Uint8List(bytes.length + 1)
        ..[0] = _carry!
        ..setRange(1, bytes.length + 1, bytes);
      _carry = null;
    }
    final usable = data.length - data.length % 2;
    if (usable < data.length) _carry = data[data.length - 1];
    final view = ByteData.sublistView(data, 0, usable);
    final out = Float32List(usable ~/ 2);
    for (var i = 0; i < out.length; i++) {
      out[i] = view.getInt16(i * 2, Endian.little) / 32768.0;
    }
    return out;
  }
}

class DunyaMicCapture {
  final AudioRecorder _recorder = AudioRecorder();
  StreamSubscription<Uint8List>? _sub;
  Completer<Float32List?>? _done;
  DunyaUtteranceDetector? _detector;

  Future<bool> hasPermission() => _recorder.hasPermission();

  /// Records one utterance. [onLevel] receives 0..1 levels for the UI and
  /// [onSpeechStart] fires once, as soon as real speech is detected.
  /// Returns null when nothing was said.
  Future<Float32List?> listen({
    void Function(double level)? onLevel,
    void Function()? onSpeechStart,
    void Function(Float32List snapshot)? onAudioSnapshot,
    double minThreshold = 0.008,
    Duration minSpeech = const Duration(milliseconds: 180),
    Duration noSpeechTimeout = const Duration(seconds: 7),
    Duration silenceToStop = const Duration(milliseconds: 700),
  }) async {
    await cancel();
    final detector = DunyaUtteranceDetector(
      minThreshold: minThreshold,
      minSpeech: minSpeech,
      noSpeechTimeout: noSpeechTimeout,
      silenceToStop: silenceToStop,
    );
    final decoder = DunyaPcm16Decoder();
    final done = Completer<Float32List?>();
    _detector = detector;
    _done = done;
    var started = false;
    var snapshotClockSamples = 0;
    final stream = await _recorder.startStream(
      const RecordConfig(
        encoder: AudioEncoder.pcm16bits,
        sampleRate: 16000,
        numChannels: 1,
        autoGain: true,
        noiseSuppress: true,
        echoCancel: true,
      ),
    );
    _sub = stream.listen(
      (bytes) {
        final level = detector.add(decoder.decode(bytes));
        onLevel?.call(math.min(1, level * 9));
        if (!started && detector.heardSpeech) {
          started = true;
          onSpeechStart?.call();
        }
        // Progressive recognition uses a copy of the audio heard so far.
        // Decoding is performed asynchronously by the caller, never in
        // this microphone callback (which must remain responsive).
        snapshotClockSamples += bytes.length ~/ 2;
        if (onAudioSnapshot != null && detector.heardSpeech &&
            snapshotClockSamples >= 24000) {
          snapshotClockSamples = 0;
          onAudioSnapshot(detector.samples);
        }
        if (detector.shouldStop) unawaited(stop());
      },
      onError: (Object error) {
        if (!done.isCompleted) done.completeError(error);
      },
    );
    return done.future;
  }

  bool get isListening => _done != null;

  /// Ends the current utterance and returns what was heard.
  Future<void> stop() async {
    final done = _done;
    final detector = _detector;
    _done = null;
    await _sub?.cancel();
    _sub = null;
    if (await _recorder.isRecording()) await _recorder.stop();
    if (done != null && !done.isCompleted) {
      done.complete(detector != null && detector.heardSpeech ? detector.samples : null);
    }
  }

  Future<void> cancel() async {
    final done = _done;
    _done = null;
    await _sub?.cancel();
    _sub = null;
    if (await _recorder.isRecording()) await _recorder.stop();
    if (done != null && !done.isCompleted) done.complete(null);
  }

  Future<void> dispose() async {
    await cancel();
    await _recorder.dispose();
  }
}
