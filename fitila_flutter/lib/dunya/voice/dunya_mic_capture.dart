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
    this.silenceToStop = const Duration(milliseconds: 1300),
    this.maxDuration = const Duration(seconds: 20),
    this.noSpeechTimeout = const Duration(seconds: 7),
  });

  final int sampleRate;
  final Duration silenceToStop;
  final Duration maxDuration;
  final Duration noSpeechTimeout;

  final _samples = <double>[];
  double _noiseFloor = 0.004;
  var _speechSamples = 0;
  var _silentSamples = 0;
  var _heardSpeech = false;

  bool get heardSpeech => _heardSpeech;

  Float32List get samples => Float32List.fromList(_samples);

  /// Feeds float samples; returns the RMS level (0..1) of the chunk.
  double add(Float32List chunk) {
    if (chunk.isEmpty) return 0;
    var sum = 0.0;
    for (final s in chunk) {
      sum += s * s;
      _samples.add(s);
    }
    final rms = math.sqrt(sum / chunk.length);
    final threshold = math.max(0.012, _noiseFloor * 3.2);
    if (rms > threshold) {
      _speechSamples += chunk.length;
      _silentSamples = 0;
      if (_speechSamples > sampleRate * 0.18) _heardSpeech = true;
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

  /// Records one utterance. [onLevel] receives 0..1 levels for the UI.
  /// Returns null when nothing was said.
  Future<Float32List?> listen({void Function(double level)? onLevel}) async {
    await cancel();
    final detector = DunyaUtteranceDetector();
    final decoder = DunyaPcm16Decoder();
    final done = Completer<Float32List?>();
    _detector = detector;
    _done = done;
    final stream = await _recorder.startStream(
      const RecordConfig(
        encoder: AudioEncoder.pcm16bits,
        sampleRate: 16000,
        numChannels: 1,
        autoGain: true,
        noiseSuppress: true,
      ),
    );
    _sub = stream.listen(
      (bytes) {
        final level = detector.add(decoder.decode(bytes));
        onLevel?.call(math.min(1, level * 9));
        if (detector.shouldStop) unawaited(stop());
      },
      onError: (Object error) {
        if (!done.isCompleted) done.completeError(error);
      },
    );
    return done.future;
  }

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
