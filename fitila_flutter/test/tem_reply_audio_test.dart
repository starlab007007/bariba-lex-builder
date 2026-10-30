import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import '../lib/core/fitila_translation_audio.dart';

void main() {
  test('TEM uses inline WAV instead of a second remote synthesis', () {
    final bytes = Uint8List(46);
    bytes.setAll(0, ascii.encode('RIFF'));
    bytes.setAll(8, ascii.encode('WAVE'));
    final audio = FitilaTranslationAudio.parseBaribaAudio({
      'success': true, 'audio_base64': base64Encode(bytes),
      'audio_url': 'https://example.invalid/second-inference',
    });
    expect(audio.bytes, bytes);
    expect(audio.url, isNull);
    expect(audio.mimeType, 'audio/wav');
  });
  test('TEM rejects empty, error and HTML payloads, preserves HTTPS legacy audio', () {
    for (final payload in [
      <String, dynamic>{},
      <String, dynamic>{'success': false, 'error': 'sleeping'},
      <String, dynamic>{'audio_base64': base64Encode(ascii.encode('<html>not audio</html>'))},
      <String, dynamic>{'audio_url': 'http://example.invalid/audio.wav'},
    ]) {
      expect(() => FitilaTranslationAudio.parseBaribaAudio(payload), throwsA(isA<StateError>()));
    }
    expect(FitilaTranslationAudio.parseBaribaAudio({'audio_url':'https://example.invalid/audio.wav'}).available, isTrue);
  });
}
