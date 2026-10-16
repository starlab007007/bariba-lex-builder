import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:crypto/crypto.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/fitila_backend.dart';
import '../core/fitila_media.dart';

class HanduniaAiCreationData {
  static const _pendingKey = 'handunia_ai_creation_pending_v1';

  static SupabaseClient get _client => FitilaBackend.client;

  static Future<String?> startSession({
    required String lieuId,
    required String languageCode,
  }) async {
    if (!FitilaBackend.configured) {
      return null;
    }
    final user = _client.auth.currentUser;
    if (user == null) {
      throw const AuthException('Connexion requise.');
    }
    final row = await _client
        .from('handunia_ai_sessions')
        .insert(<String, dynamic>{
          'user_id': user.id,
          'lieu_id': lieuId,
          'language_code': languageCode,
          'status': 'active',
        })
        .select('id')
        .single();
    return row['id']?.toString();
  }

  static Future<Map<String, dynamic>> askQuestion({
    required String lieuId,
    required String lieuName,
  }) async {
    final response = await _client.functions.invoke(
      'handunia-ai-create',
      body: <String, dynamic>{
        'mode': 'question',
        'lieu_id': lieuId,
        'lieu_name': lieuName,
      },
    );
    return _mapResponse(response.data);
  }

  static Future<Map<String, dynamic>> fetchGaps({
    required String lieuId,
    required String lieuName,
  }) async {
    final response = await _client.functions.invoke(
      'handunia-ai-create',
      body: <String, dynamic>{
        'mode': 'gaps',
        'lieu_id': lieuId,
        'lieu_name': lieuName,
      },
    );
    return _mapResponse(response.data);
  }

  static Future<String> transcribe(
    FitilaMediaAsset asset, {
    String languageCode = 'ba',
  }) async {
    final bytes = await asset.readBytes();
    if (bytes.length < 256) {
      throw StateError('Enregistrement audio trop court.');
    }
    final response = await _client.functions.invoke(
      'bariba-stt',
      body: <String, dynamic>{
        'audio': 'data:audio/opus;base64,${base64Encode(bytes)}',
        'robustMode': true,
        'speakerType': 'Auto',
        'languageCode': languageCode,
      },
    );
    final data = _mapResponse(response.data);
    final state = data['state']?.toString();
    if (state == 'unavailable') {
      throw StateError(
        data['message']?.toString().trim().isNotEmpty == true
            ? data['message'].toString()
            : 'Transcription momentanément indisponible.',
      );
    }
    for (final key in const ['transcript', 'transcription', 'refined', 'text']) {
      final value = data[key]?.toString().trim() ?? '';
      if (value.isNotEmpty) {
        return value;
      }
    }
    final detail = data['details']?.toString().trim();
    throw StateError(
      detail?.isNotEmpty == true
          ? detail!
          : 'Aucune transcription exploitable.',
    );
  }

  static Future<Map<String, dynamic>> analyze({
    required String transcript,
    required String lieuName,
    required String languageCode,
    required int durationMs,
  }) async {
    final response = await _client.functions.invoke(
      'handunia-ai-create',
      body: <String, dynamic>{
        'mode': 'analyze',
        'transcript': transcript.trim(),
        'lieu_name': lieuName,
        'language_code': languageCode,
      },
    );
    final data = _mapResponse(response.data);
    final analysisRaw = data['analysis'];
    if (analysisRaw is! Map) {
      throw StateError(
        data['message']?.toString() ?? 'Analyse Lumière IA indisponible.',
      );
    }
    final analysis = Map<String, dynamic>.from(analysisRaw);
    return _attachAudioRanges(
      analysis: analysis,
      transcript: transcript,
      durationMs: durationMs,
    );
  }

  static Future<Map<String, dynamic>> compare({
    required String transcript,
    required String lieuId,
  }) async {
    final response = await _client.functions.invoke(
      'handunia-ai-create',
      body: <String, dynamic>{
        'mode': 'compare',
        'transcript': transcript.trim(),
        'lieu_id': lieuId,
      },
    );
    final data = _mapResponse(response.data);
    final raw = data['comparison'];
    if (raw is Map) {
      return Map<String, dynamic>.from(raw);
    }
    return <String, dynamic>{
      'relation': 'new',
      'target_fragment_id': null,
      'confidence': 0.0,
      'reason': 'Aucune relation fiable détectée.',
    };
  }

  static Future<Map<String, dynamic>> seal({
    required Map<String, dynamic> lieu,
    required FitilaMediaAsset asset,
    required int durationMs,
    required String transcript,
    required String languageCode,
    required String selectedScope,
    required Map<String, dynamic> analysis,
    required Map<String, dynamic> comparison,
    String? sessionId,
  }) async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw const AuthException('Connexion requise.');
    }

    final bytes = await asset.readBytes();
    final now = DateTime.now().toUtc();
    final storagePath =
        'handunia/${user.id}/${now.microsecondsSinceEpoch}.opus';
    await _client.storage.from('tamtam-audio').uploadBinary(
      storagePath,
      bytes,
      fileOptions: const FileOptions(
        contentType: 'audio/opus',
        upsert: false,
      ),
    );
    final audioUrl =
        _client.storage.from('tamtam-audio').getPublicUrl(storagePath);
    final sealHash = sha256.convert(bytes).toString();

    final periodYear = _intOrNull(analysis['period_year']);
    final periodLabel = _clean(analysis['period_label']);
    final themeKey = _clean(analysis['theme_key']);
    final lineageFromAnalysis = _clean(analysis['lineage_key']);
    final lineageFromUser =
        _clean(user.userMetadata?['lineage_key']);
    final witnessGender =
        _clean(analysis['witness_gender']) ?? 'unspecified';
    final sensitivity =
        _clean(analysis['sensitivity_level']) ?? 'normal';
    final suggestedScope = _clean(analysis['suggested_scope']);
    final summary = _clean(analysis['summary']);
    final confidence = _doubleOrNull(analysis['confidence']);

    final fragments = await _client
        .from('handunia_fragments')
        .insert(<String, dynamic>{
          'user_id': user.id,
          'lieu_id': lieu['id'].toString(),
          'latitude': _doubleOrNull(lieu['latitude']),
          'longitude': _doubleOrNull(lieu['longitude']),
          'text': transcript.trim(),
          'transcript_text': transcript.trim(),
          'transcript_reviewed_by_guardian': false,
          'audio_url': audioUrl,
          'audio_duration_ms': durationMs,
          'audio_codec': 'opus',
          'audio_bitrate_kbps': 16,
          'period_label': periodLabel,
          'period_year': periodYear,
          'scope_level': selectedScope,
          'seal_hash': sealHash,
          'sealed_at': now.toIso8601String(),
          'lineage_key': lineageFromAnalysis ?? lineageFromUser,
          'witness_gender': witnessGender,
          'theme_key': themeKey,
          'ai_generated': false,
          'ai_assisted': true,
          'ai_summary': summary,
          'ai_confidence': confidence,
          'review_status': 'user_validated',
          'sensitivity_level': sensitivity,
          'suggested_scope': suggestedScope,
          'memory_state': 'sealed',
          'transcript_segments': _buildEvidenceSegments(analysis),
          'synchronized_at': now.toIso8601String(),
        })
        .select()
        .single();
    final fragment = Map<String, dynamic>.from(fragments);

    try {
      await _client.functions.invoke(
        'handunia-ai-create',
        body: <String, dynamic>{
          'mode': 'persist',
          'fragment_id': fragment['id'],
          'session_id': sessionId,
          'analysis': analysis,
          'comparison': comparison,
          'selected_scope': selectedScope,
        },
      );
    } catch (_) {
      // Le souvenir humain est déjà scellé. Les métadonnées IA sont
      // complémentaires et ne doivent jamais faire perdre la voix source.
    }
    return fragment;
  }

  static Future<void> queuePending({
    required Map<String, dynamic> lieu,
    required FitilaMediaAsset asset,
    required int durationMs,
    required String transcript,
    required String languageCode,
    required String selectedScope,
    required Map<String, dynamic> analysis,
    required Map<String, dynamic> comparison,
  }) async {
    final directory = await getApplicationDocumentsDirectory();
    final pendingDirectory =
        Directory('${directory.path}${Platform.pathSeparator}handunia_pending');
    if (!pendingDirectory.existsSync()) {
      await pendingDirectory.create(recursive: true);
    }
    final target = File(
      '${pendingDirectory.path}${Platform.pathSeparator}'
      'handunia_${DateTime.now().microsecondsSinceEpoch}.opus',
    );
    await File(asset.path).copy(target.path);

    final preferences = await SharedPreferences.getInstance();
    final current = preferences.getStringList(_pendingKey) ?? <String>[];
    current.add(
      jsonEncode(<String, dynamic>{
        'lieu': lieu,
        'audio_path': target.path,
        'duration_ms': durationMs,
        'transcript': transcript,
        'language_code': languageCode,
        'selected_scope': selectedScope,
        'analysis': analysis,
        'comparison': comparison,
        'created_at': DateTime.now().toUtc().toIso8601String(),
      }),
    );
    await preferences.setStringList(_pendingKey, current);
  }

  static Future<int> syncPending() async {
    if (!FitilaBackend.configured || _client.auth.currentUser == null) {
      return 0;
    }
    final preferences = await SharedPreferences.getInstance();
    final current = List<String>.from(
      preferences.getStringList(_pendingKey) ?? const <String>[],
    );
    if (current.isEmpty) {
      return 0;
    }

    var synced = 0;
    final remaining = <String>[];
    for (final raw in current) {
      try {
        final decoded = jsonDecode(raw);
        if (decoded is! Map) {
          continue;
        }
        final item = Map<String, dynamic>.from(decoded);
        final lieuRaw = item['lieu'];
        final analysisRaw = item['analysis'];
        final comparisonRaw = item['comparison'];
        if (lieuRaw is! Map ||
            analysisRaw is! Map ||
            comparisonRaw is! Map) {
          continue;
        }
        final path = item['audio_path']?.toString() ?? '';
        if (path.isEmpty || !File(path).existsSync()) {
          continue;
        }
        final asset = FitilaMediaAsset(
          path: path,
          name: path.split(Platform.pathSeparator).last,
          mediaType: 'audio',
          contentType: 'audio/opus',
        );
        await seal(
          lieu: Map<String, dynamic>.from(lieuRaw),
          asset: asset,
          durationMs: _intOrNull(item['duration_ms']) ?? 0,
          transcript: item['transcript']?.toString() ?? '',
          languageCode: item['language_code']?.toString() ?? 'ba',
          selectedScope: item['selected_scope']?.toString() ?? 'community',
          analysis: Map<String, dynamic>.from(analysisRaw),
          comparison: Map<String, dynamic>.from(comparisonRaw),
        );
        try {
          await File(path).delete();
        } catch (_) {
          // Best effort cleanup.
        }
        synced += 1;
      } catch (_) {
        remaining.add(raw);
      }
    }
    if (remaining.isEmpty) {
      await preferences.remove(_pendingKey);
    } else {
      await preferences.setStringList(_pendingKey, remaining);
    }
    return synced;
  }

  static Map<String, dynamic> _attachAudioRanges({
    required Map<String, dynamic> analysis,
    required String transcript,
    required int durationMs,
  }) {
    final length = math.max(1, transcript.length);
    List<Map<String, dynamic>> enrich(dynamic rawItems) {
      if (rawItems is! List) {
        return const <Map<String, dynamic>>[];
      }
      return rawItems.whereType<Map>().map((raw) {
        final item = Map<String, dynamic>.from(raw);
        final startChar = _intOrNull(item['start_char']);
        final endChar = _intOrNull(item['end_char']);
        if (startChar != null && endChar != null && durationMs > 0) {
          final startMs =
              ((startChar.clamp(0, length) / length) * durationMs).round();
          final endMs =
              ((endChar.clamp(0, length) / length) * durationMs).round();
          item['start_ms'] = startMs;
          item['end_ms'] = math.max(startMs + 700, endMs).clamp(0, durationMs);
          item['audio_range_estimated'] = true;
        }
        item.putIfAbsent('validated', () => false);
        return item;
      }).toList(growable: false);
    }

    return <String, dynamic>{
      ...analysis,
      'entities': enrich(analysis['entities']),
      'claims': enrich(analysis['claims']),
    };
  }

  static List<Map<String, dynamic>> _buildEvidenceSegments(
    Map<String, dynamic> analysis,
  ) {
    final result = <Map<String, dynamic>>[];
    for (final key in const ['entities', 'claims']) {
      final raw = analysis[key];
      if (raw is! List) {
        continue;
      }
      for (final itemRaw in raw.whereType<Map>()) {
        final item = Map<String, dynamic>.from(itemRaw);
        final evidence = _clean(item['evidence_text']);
        if (evidence == null) {
          continue;
        }
        result.add(<String, dynamic>{
          'kind': key == 'entities' ? 'entity' : 'claim',
          'evidence_text': evidence,
          'start_ms': _intOrNull(item['start_ms']),
          'end_ms': _intOrNull(item['end_ms']),
          'estimated': item['audio_range_estimated'] == true,
        });
      }
    }
    return result;
  }

  static Map<String, dynamic> _mapResponse(dynamic data) {
    if (data is Map) {
      return Map<String, dynamic>.from(data);
    }
    throw StateError('Réponse Handunia IA invalide.');
  }

  static String? _clean(dynamic value) {
    final text = value?.toString().trim() ?? '';
    return text.isEmpty ? null : text;
  }

  static int? _intOrNull(dynamic value) {
    if (value is int) {
      return value;
    }
    if (value is num) {
      return value.toInt();
    }
    return int.tryParse(value?.toString() ?? '');
  }

  static double? _doubleOrNull(dynamic value) {
    if (value is num) {
      return value.toDouble();
    }
    return double.tryParse(value?.toString() ?? '');
  }
}
