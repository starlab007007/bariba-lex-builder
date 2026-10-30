import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:path_provider/path_provider.dart';

import 'fitila_backend.dart';
import 'fitila_media.dart';
import '../dunya/voice/dunya_shared_speech.dart';

class FitilaGeneratedAudio {
  const FitilaGeneratedAudio({
    this.url,
    this.bytes,
    this.mimeType,
  });

  final String? url;
  final Uint8List? bytes;
  final String? mimeType;

  bool get available =>
      (url?.trim().isNotEmpty ?? false) || (bytes?.isNotEmpty ?? false);

  Future<String?> materialize() async {
    final data = bytes;
    if (data == null || data.isEmpty) return null;
    final extension = (mimeType ?? '').contains('wav')
        ? 'wav'
        : (mimeType ?? '').contains('mp4')
            ? 'm4a'
            : 'mp3';
    final directory = await getTemporaryDirectory();
    final path =
        '${directory.path}${Platform.pathSeparator}fitila_tts_${DateTime.now().microsecondsSinceEpoch}.$extension';
    final file = File(path);
    await file.writeAsBytes(data, flush: true);
    return file.path;
  }
}

class FitilaTranslationAudio {
  FitilaTranslationAudio._();

  static FitilaGeneratedAudio parseBaribaAudio(Map data) {
    if (data['success'] == false || data['error'] != null) {
      throw StateError(data['message']?.toString() ?? 'Voix Baatɔnum momentanément indisponible.');
    }
    final encoded = (data['audio_base64'] ?? data['audioBase64'])?.toString().trim() ?? '';
    if (encoded.isNotEmpty) {
      final bytes = base64Decode(encoded);
      if (bytes.length < 44 || ascii.decode(bytes.sublist(0, 4), allowInvalid: true) != 'RIFF' ||
          ascii.decode(bytes.sublist(8, 12), allowInvalid: true) != 'WAVE') {
        throw StateError('Audio Baatɔnum invalide.');
      }
      return FitilaGeneratedAudio(bytes: bytes, mimeType: 'audio/wav');
    }
    final url = (data['audio_url'] ?? data['audioUrl'])?.toString().trim() ?? '';
    if (Uri.tryParse(url)?.scheme != 'https') throw StateError('Audio Baatɔnum indisponible.');
    return FitilaGeneratedAudio(url: url, mimeType: 'audio/wav');
  }

  static String _dataUrl(FitilaMediaAsset asset, List<int> bytes) =>
      'data:${asset.contentType};base64,${base64Encode(bytes)}';

  static Future<String> transcribe({
    required FitilaMediaAsset asset,
    required bool sourceIsBariba,
  }) async {
    if (!FitilaBackend.configured) {
      throw StateError('Serveur FITILA indisponible.');
    }
    final bytes = await asset.readBytes();
    if (bytes.isEmpty) {
      throw StateError('Enregistrement audio vide.');
    }

    if (sourceIsBariba) {
      final response = await FitilaBackend.client.functions.invoke(
        'bariba-stt',
        body: <String, dynamic>{
          'audio': _dataUrl(asset, bytes),
          'robustMode': true,
          'speakerType': 'Auto',
          'languageCode': 'ba',
        },
      );
      final data = response.data;
      if (data is! Map) {
        throw StateError('Réponse STT Baatɔnum invalide.');
      }
      final transcript =
          (data['transcript'] ?? data['transcription'] ?? data['text'])
              ?.toString()
              .trim() ??
          '';
      if (transcript.isEmpty) {
        throw StateError(
          data['message']?.toString() ??
              data['error']?.toString() ??
              'Aucune transcription Baatɔnum produite.',
        );
      }
      return transcript;
    }

    final response = await FitilaBackend.client.functions.invoke(
      'transcribe-audio',
      body: <String, dynamic>{
        'audio': _dataUrl(asset, bytes),
        'fileName': asset.name,
        'mimeType': asset.contentType,
        'languageCode': 'fr',
      },
    );
    final data = response.data;
    if (data is! Map) {
      throw StateError('Réponse STT français invalide.');
    }
    final transcript =
        (data['text'] ?? data['transcript'] ?? data['transcription'])
            ?.toString()
            .trim() ??
        '';
    if (transcript.isEmpty) {
      throw StateError(
        data['message']?.toString() ??
            data['error']?.toString() ??
            'Aucune transcription française produite.',
      );
    }
    return transcript;
  }

  static Future<FitilaGeneratedAudio> synthesize({
    required String text,
    required bool bariba,
  }) async {
    final clean = text.trim();
    if (clean.isEmpty) {
      throw StateError('Aucun texte à lire.');
    }
    if (bariba) {
      try {
        if (!FitilaBackend.configured) throw StateError('Serveur FITILA indisponible.');
        final response = await FitilaBackend.client.functions.invoke(
          'bariba-tts',
          body: <String, dynamic>{'text': clean, 'speakingRate': 1.0, 'skipRefine': true},
        ).timeout(const Duration(seconds: 35));
        if (response.data is! Map) throw StateError('Réponse TTS Baatɔnum invalide.');
        return parseBaribaAudio(response.data as Map);
      } catch (_) {
        // Connectivity does not prove that the speech service works.
        final path = await DunyaSharedSpeech.instance.synthesizeBariba(clean);
        if (path != null) {
          return FitilaGeneratedAudio(bytes: await File(path).readAsBytes(), mimeType: 'audio/wav');
        }
        rethrow;
      }
    }
    if (!FitilaBackend.configured) throw StateError('Serveur FITILA indisponible.');

    final response = await FitilaBackend.client.functions.invoke(
      'french-tts',
      body: <String, dynamic>{
        'text': clean,
        'voice': 'narrator',
        'speed': 1.0,
        'returnAudio': true,
      },
    );
    final data = response.data;
    if (data is! Map) {
      throw StateError('Réponse TTS français invalide.');
    }
    final encoded = data['audioBase64']?.toString().trim() ?? '';
    if (encoded.isEmpty) {
      throw StateError(
        data['message']?.toString() ??
            data['error']?.toString() ??
            'Voix française momentanément indisponible.',
      );
    }
    return FitilaGeneratedAudio(
      bytes: base64Decode(encoded),
      mimeType: data['audioFormat']?.toString() ?? 'audio/mpeg',
    );
  }
}
