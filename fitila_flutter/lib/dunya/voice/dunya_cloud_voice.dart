/// DUNYA online voice: Meta Omnilingual ASR + Meta MMS-TTS Baatɔnum.
///
/// Uses the same bounded Supabase NDJSON service as FITILA Web. No on-device
/// ASR, TTS or Gemma checkpoint is required in this mode.
library;

import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;
import '../../core/fitila_backend.dart';

typedef DunyaCloudVoiceEvent = Future<void> Function(Map<String, dynamic> event);

class DunyaCloudVoiceException implements Exception {
  const DunyaCloudVoiceException(this.message);
  final String message;
  @override
  String toString() => message;
}

class DunyaCloudVoice {
  http.Client? _active;
  bool get isActive => _active != null;

  void cancel() {
    _active?.close();
    _active = null;
  }

  /// The DUNYA voice Edge Function has its own bounded guest authentication.
  /// A public Supabase API key must NOT be masqueraded as a user JWT.
  /// In guest mode omit Authorization; the server applies guest quotas.
  static Map<String, String> requestHeaders({
    required String apiKey,
    String? userAccessToken,
  }) => {
        'content-type': 'application/json',
        'apikey': apiKey,
        if (userAccessToken != null && userAccessToken.isNotEmpty)
          'Authorization': 'Bearer $userAccessToken',
      };

  static Uint8List wav16k(Float32List samples) {
    // The voice endpoint accepts 16 kHz mono signed-16-bit RIFF PCM.
    const hz = 16000;
    final size = samples.length * 2;
    final bytes = ByteData(44 + size);
    void four(int at, String text) {
      for (var i = 0; i < text.length; i++) {
        bytes.setUint8(at + i, text.codeUnitAt(i));
      }
    }
    four(0, 'RIFF');
    bytes.setUint32(4, size + 36, Endian.little);
    four(8, 'WAVE');
    four(12, 'fmt ');
    bytes.setUint32(16, 16, Endian.little);
    bytes.setUint16(20, 1, Endian.little);
    bytes.setUint16(22, 1, Endian.little);
    bytes.setUint32(24, hz, Endian.little);
    bytes.setUint32(28, hz * 2, Endian.little);
    bytes.setUint16(32, 2, Endian.little);
    bytes.setUint16(34, 16, Endian.little);
    four(36, 'data');
    bytes.setUint32(40, size, Endian.little);
    for (var i = 0; i < samples.length; i++) {
      final x = (samples[i].clamp(-1.0, 1.0) * 32767).round();
      bytes.setInt16(44 + 2 * i, x, Endian.little);
    }
    return bytes.buffer.asUint8List();
  }

  Future<void> turn({
    Float32List? samples,
    String? text,
    required String language,
    required String replyLanguage,
    List<Map<String, String>> history = const [],
    required DunyaCloudVoiceEvent onEvent,
  }) async {
    if (!FitilaBackend.configured) {
      throw const DunyaCloudVoiceException('Serveur FITILA non configuré.');
    }
    if ((samples == null || samples.isEmpty) && (text == null || text.trim().isEmpty)) {
      throw const DunyaCloudVoiceException('Aucune demande à traiter.');
    }
    if (samples != null && samples.length > 16000 * 25) {
      throw const DunyaCloudVoiceException('Message vocal trop long.');
    }
    if ((samples != null && samples.isNotEmpty) && (text != null && text.trim().isNotEmpty)) {
      throw const DunyaCloudVoiceException('Texte et audio simultanés non autorisés.');
    }
    if (!const ['fr', 'bba'].contains(language) ||
        !const ['fr', 'bba'].contains(replyLanguage)) {
      throw const DunyaCloudVoiceException('Langue DUNYA non reconnue.');
    }
    cancel();
    final client = http.Client();
    _active = client;
    try {
      final token = FitilaBackend.client.auth.currentSession?.accessToken;
      final request = http.Request('POST', Uri.parse(
          '${FitilaBackend.supabaseUrl}/functions/v1/dunya-voice-turn'));
      request.headers.addAll(requestHeaders(
        apiKey: FitilaBackend.supabaseAnonKey,
        userAccessToken: token,
      ));
      request.body = jsonEncode({
        if (samples != null) 'audio_base64': base64Encode(wav16k(samples)),
        'text': ?text,
        'lang': language,
        'reply_lang': replyLanguage,
        'history': history.length > 8 ? history.sublist(history.length - 8) : history,
      });
      final response = await client.send(request).timeout(const Duration(seconds: 30));
      if (response.statusCode != 200) {
        throw DunyaCloudVoiceException(switch (response.statusCode) {
          429 => 'Service très sollicité. Réessayez dans un instant.',
          401 || 403 => 'Accès à la voix DUNYA refusé.',
          _ => 'Service vocal indisponible (HTTP ${response.statusCode}).',
        });
      }
      var completed = false;
      var receivedBytes = 0;
      await for (final line in response.stream
          .transform(utf8.decoder).transform(const LineSplitter())) {
        if (!identical(_active, client)) {
          throw const DunyaCloudVoiceException('Conversation interrompue.');
        }
        receivedBytes += line.length;
        if (receivedBytes > 13 * 1024 * 1024) {
          throw const DunyaCloudVoiceException('Réponse vocale trop volumineuse.');
        }
        if (line.trim().isEmpty) continue;
        final parsed = jsonDecode(line);
        if (parsed is! Map<String, dynamic>) continue;
        if (parsed['type'] == 'error') {
          throw DunyaCloudVoiceException('Service vocal: ${parsed['code'] ?? 'indisponible'}');
        }
        if (parsed['type'] == 'done') completed = true;
        await onEvent(parsed);
      }
      if (!completed) {
        throw const DunyaCloudVoiceException('Réponse interrompue. Réessayez.');
      }
    } finally {
      if (identical(_active, client)) _active = null;
      client.close();
    }
  }
}
