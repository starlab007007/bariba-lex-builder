import 'dart:convert';
import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/fitila_backend.dart';
import 'handunia_consultation_model.dart';

class HanduniaConsultationExtendedData {
  static SupabaseClient get _client => FitilaBackend.client;

  static String? get currentUserId => _client.auth.currentUser?.id;

  static Future<Map<String, dynamic>> fetchMemoryDetail(
    String fragmentId,
  ) async {
    final fragment = await _client
        .from('handunia_fragments')
        .select(
          'id, user_id, lieu_id, text, transcript_text, '
          'transcript_reviewed_by_guardian, audio_url, audio_duration_ms, '
          'audio_codec, audio_bitrate_kbps, period_label, period_year, '
          'scope_level, seal_hash, sealed_at, lineage_key, latitude, longitude, '
          'lacuna_filled, synchronized_at, withdrawn_at, created_at, '
          'source_fragment_id, witness_gender, theme_key',
        )
        .eq('id', fragmentId)
        .maybeSingle();
    if (fragment == null) {
      return <String, dynamic>{
        'id': fragmentId,
        'state': 'unavailable',
      };
    }

    final lieuId = fragment['lieu_id']?.toString() ?? '';
    final userId = fragment['user_id']?.toString() ?? '';
    final results = await Future.wait<dynamic>([
      lieuId.isEmpty
          ? Future.value(null)
          : _client
                .from('handunia_lieux')
                .select('id, name, latitude, longitude')
                .eq('id', lieuId)
                .maybeSingle(),
      userId.isEmpty
          ? Future.value(null)
          : _client
                .from('tamtam_profiles')
                .select('user_id, username, display_name')
                .eq('user_id', userId)
                .maybeSingle(),
      _client
          .from('handunia_corroborations')
          .select('user_id, created_at')
          .eq('fragment_id', fragmentId),
    ]);

    final lieu = results[0] as Map<String, dynamic>?;
    final profile = results[1] as Map<String, dynamic>?;
    final corroborations = List<Map<String, dynamic>>.from(results[2] as List);
    final corroboratorIds = corroborations
        .map((row) => row['user_id']?.toString() ?? '')
        .where((id) => id.isNotEmpty);
    final displayName =
        profile?['display_name']?.toString().trim().isNotEmpty == true
        ? profile!['display_name'].toString()
        : (profile?['username']?.toString() ?? '');

    final versions = await fetchMemoryVersions(fragment);
    return <String, dynamic>{
      ...fragment,
      'state': fragment['withdrawn_at'] == null ? 'ready' : 'withdrawn',
      'lieu_name': lieu?['name']?.toString() ?? '',
      'author_initials': handuniaInitials(displayName),
      'voice_count': handuniaDistinctVoiceCount(userId, corroboratorIds),
      'versions': versions,
    };
  }

  static Future<List<Map<String, dynamic>>> fetchMemoryVersions(
    Map<String, dynamic> fragment,
  ) async {
    final id = fragment['id']?.toString() ?? '';
    if (id.isEmpty) {
      return const [];
    }
    final sourceId = fragment['source_fragment_id']?.toString();
    final rootId = sourceId == null || sourceId.isEmpty ? id : sourceId;

    final versionRows = await _client
        .from('handunia_fragments')
        .select(
          'id, user_id, lieu_id, text, transcript_text, audio_url, '
          'audio_duration_ms, period_label, period_year, scope_level, '
          'seal_hash, withdrawn_at, created_at, source_fragment_id',
        )
        .or('id.eq.$rootId,source_fragment_id.eq.$rootId')
        .order('created_at', ascending: true);
    final versions = List<Map<String, dynamic>>.from(versionRows as List)
        .where((row) => row['id']?.toString() != id)
        .toList(growable: true);

    try {
      final divergenceRows = await _client
          .from('handunia_divergences')
          .select('version_a_id, version_b_id')
          .or('version_a_id.eq.$id,version_b_id.eq.$id');
      final ids = <String>{};
      for (final row
          in List<Map<String, dynamic>>.from(divergenceRows as List)) {
        for (final key in ['version_a_id', 'version_b_id']) {
          final other = row[key]?.toString();
          if (other != null && other.isNotEmpty && other != id) {
            ids.add(other);
          }
        }
      }
      if (ids.isNotEmpty) {
        final extra = await _client
            .from('handunia_fragments')
            .select(
              'id, user_id, lieu_id, text, transcript_text, audio_url, '
              'audio_duration_ms, period_label, period_year, scope_level, '
              'seal_hash, withdrawn_at, created_at, source_fragment_id',
            )
            .filter('id', 'in', '(${ids.join(',')})');
        for (final row in List<Map<String, dynamic>>.from(extra as List)) {
          if (!versions.any((item) => item['id'] == row['id'])) {
            versions.add(row);
          }
        }
      }
    } catch (_) {
      // La relation de divergence est optionnelle pour les souvenirs anciens.
    }
    return versions;
  }

  static Future<int> corroborate(String fragmentId) async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw const AuthException('Connexion requise.');
    }
    try {
      await _client.from('handunia_corroborations').insert({
        'fragment_id': fragmentId,
        'user_id': user.id,
      });
    } on PostgrestException catch (error) {
      if (error.code != '23505') {
        rethrow;
      }
    }
    final detail = await fetchMemoryDetail(fragmentId);
    return (detail['voice_count'] as num?)?.toInt() ?? 1;
  }

  static Future<Map<String, dynamic>> createNuance({
    required Map<String, dynamic> source,
    required Uint8List audioBytes,
    required int durationMs,
    String? transcript,
  }) async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw const AuthException('Connexion requise.');
    }
    final sourceId = source['source_fragment_id']?.toString();
    final rootId =
        sourceId == null || sourceId.isEmpty
        ? source['id']?.toString()
        : sourceId;
    final lieuId = source['lieu_id']?.toString() ?? '';
    if (rootId == null || rootId.isEmpty || lieuId.isEmpty) {
      throw StateError('Souvenir source incomplet.');
    }

    final path =
        'handunia/${user.id}/${DateTime.now().millisecondsSinceEpoch}.opus';
    await _client.storage
        .from('tamtam-audio')
        .uploadBinary(
          path,
          audioBytes,
          fileOptions: const FileOptions(
            contentType: 'audio/opus',
            upsert: false,
          ),
        );
    final audioUrl = _client.storage.from('tamtam-audio').getPublicUrl(path);
    final cleanTranscript = transcript?.trim() ?? '';
    final sealHash = sha256.convert(audioBytes).toString();

    final inserted = await _client
        .from('handunia_fragments')
        .insert(<String, dynamic>{
          'user_id': user.id,
          'lieu_id': lieuId,
          'text': cleanTranscript.isEmpty
              ? 'Voix non transcrite.'
              : cleanTranscript,
          'transcript_text': cleanTranscript.isEmpty ? null : cleanTranscript,
          'transcript_reviewed_by_guardian': false,
          'audio_url': audioUrl,
          'audio_duration_ms': durationMs,
          'audio_codec': 'opus',
          'audio_bitrate_kbps': 16,
          'period_label': source['period_label'],
          'period_year': source['period_year'],
          'scope_level': source['scope_level'] ?? 'community',
          'lineage_key': source['lineage_key'],
          'latitude': source['latitude'],
          'longitude': source['longitude'],
          'seal_hash': sealHash,
          'sealed_at': DateTime.now().toIso8601String(),
          'source_fragment_id': rootId,
          'witness_gender': source['witness_gender'],
          'theme_key': source['theme_key'],
        })
        .select()
        .single();
    return inserted;
  }

  static Future<String?> transcribeBariba(Uint8List bytes) async {
    final encoded = base64Encode(bytes);
    final response = await _client.functions.invoke(
      'bariba-stt',
      body: <String, dynamic>{
        'audio': 'data:audio/opus;base64,$encoded',
        'robustMode': true,
        'speakerType': 'Auto',
      },
    );
    final data = response.data;
    if (data is! Map) {
      return null;
    }
    for (final key in ['transcription', 'refined', 'text']) {
      final value = data[key]?.toString().trim() ?? '';
      if (value.isNotEmpty) {
        return value;
      }
    }
    return null;
  }

  static Future<List<Map<String, dynamic>>> fetchLivingMap() async {
    final lieuxRaw = await _client
        .from('handunia_lieux')
        .select('id, name, description, sort_order, latitude, longitude')
        .order('sort_order');
    final lieux = List<Map<String, dynamic>>.from(lieuxRaw as List);
    final fragmentsRaw = await _client
        .from('handunia_fragments')
        .select('id, user_id, lieu_id, withdrawn_at')
        .isFilter('withdrawn_at', null);
    final fragments = List<Map<String, dynamic>>.from(fragmentsRaw as List);
    final ids = fragments
        .map((row) => row['id']?.toString() ?? '')
        .where((id) => id.isNotEmpty)
        .toList(growable: false);

    var corroborations = <Map<String, dynamic>>[];
    if (ids.isNotEmpty) {
      final rows = await _client
          .from('handunia_corroborations')
          .select('fragment_id, user_id')
          .filter('fragment_id', 'in', '(${ids.join(',')})');
      corroborations = List<Map<String, dynamic>>.from(rows as List);
    }
    final corroborators = <String, Set<String>>{};
    for (final row in corroborations) {
      final fragmentId = row['fragment_id']?.toString() ?? '';
      final userId = row['user_id']?.toString() ?? '';
      if (fragmentId.isNotEmpty && userId.isNotEmpty) {
        corroborators.putIfAbsent(fragmentId, () => <String>{}).add(userId);
      }
    }

    return lieux.map((lieu) {
      final lieuId = lieu['id']?.toString() ?? '';
      final local = fragments
          .where((fragment) => fragment['lieu_id']?.toString() == lieuId)
          .toList(growable: false);
      final witnesses = <String>{};
      for (final fragment in local) {
        final author = fragment['user_id']?.toString() ?? '';
        if (author.isNotEmpty) {
          witnesses.add(author);
        }
        witnesses.addAll(
          corroborators[fragment['id']?.toString() ?? ''] ?? const <String>{},
        );
      }
      return <String, dynamic>{
        ...lieu,
        'memory_count': local.length,
        'voice_count': witnesses.length,
      };
    }).toList(growable: false);
  }

  static Future<Map<String, dynamic>> fetchLieuDetail(String lieuId) async {
    final allLieux = await fetchLivingMap();
    final lieu = allLieux.firstWhere(
      (item) => item['id']?.toString() == lieuId,
      orElse: () => <String, dynamic>{'id': lieuId, 'name': ''},
    );
    final rows = await _client
        .from('handunia_fragments')
        .select(
          'id, user_id, lieu_id, text, transcript_text, audio_url, '
          'audio_duration_ms, period_label, period_year, scope_level, '
          'seal_hash, lineage_key, witness_gender, theme_key, '
          'withdrawn_at, created_at',
        )
        .eq('lieu_id', lieuId)
        .isFilter('withdrawn_at', null)
        .order('created_at', ascending: true);
    final fragments = List<Map<String, dynamic>>.from(rows as List);
    final missing = <String>[];
    if (!fragments.any(
      (row) =>
          row['period_year'] != null ||
          (row['period_label']?.toString().trim().isNotEmpty ?? false),
    )) {
      missing.add('Période');
    }
    if (!fragments.any(
      (row) =>
          row['witness_gender'] != null &&
          row['witness_gender']?.toString() != 'unspecified',
    )) {
      missing.add('Genre');
    }
    if (!fragments.any(
      (row) => row['lineage_key']?.toString().trim().isNotEmpty == true,
    )) {
      missing.add('Lignée');
    }
    if (!fragments.any(
      (row) => row['theme_key']?.toString().trim().isNotEmpty == true,
    )) {
      missing.add('Thème');
    }

    Map<String, dynamic>? oldest;
    if (fragments.isNotEmpty) {
      oldest = await fetchMemoryDetail(fragments.first['id'].toString());
    }
    return <String, dynamic>{
      ...lieu,
      'fragments': fragments,
      'oldest_memory': oldest,
      'missing_axes': missing,
    };
  }

  static Future<List<Map<String, dynamic>>> fetchTimeline(String lieuId) async {
    final rows = await _client
        .from('handunia_fragments')
        .select('id, user_id, period_year')
        .eq('lieu_id', lieuId)
        .isFilter('withdrawn_at', null);
    final fragments = List<Map<String, dynamic>>.from(rows as List);
    final ids = fragments
        .map((row) => row['id']?.toString() ?? '')
        .where((id) => id.isNotEmpty)
        .toList(growable: false);
    var corroborations = <Map<String, dynamic>>[];
    if (ids.isNotEmpty) {
      final raw = await _client
          .from('handunia_corroborations')
          .select('fragment_id, user_id')
          .filter('fragment_id', 'in', '(${ids.join(',')})');
      corroborations = List<Map<String, dynamic>>.from(raw as List);
    }
    final byFragment = <String, Set<String>>{};
    for (final row in corroborations) {
      final id = row['fragment_id']?.toString() ?? '';
      final user = row['user_id']?.toString() ?? '';
      if (id.isNotEmpty && user.isNotEmpty) {
        byFragment.putIfAbsent(id, () => <String>{}).add(user);
      }
    }

    final periods = <({String label, bool Function(int year) includes})>[
      (label: 'Avant 1960', includes: (year) => year < 1960),
      (label: '1960–1979', includes: (year) => year >= 1960 && year <= 1979),
      (label: '1980–1999', includes: (year) => year >= 1980 && year <= 1999),
      (label: '2000–2019', includes: (year) => year >= 2000 && year <= 2019),
      (label: 'Depuis 2020', includes: (year) => year >= 2020),
    ];

    return periods.map((period) {
      final inPeriod = fragments.where((row) {
        final year = (row['period_year'] as num?)?.toInt();
        return year != null && period.includes(year);
      }).toList(growable: false);
      final witnesses = <String>{};
      for (final fragment in inPeriod) {
        final author = fragment['user_id']?.toString() ?? '';
        if (author.isNotEmpty) {
          witnesses.add(author);
        }
        witnesses.addAll(
          byFragment[fragment['id']?.toString() ?? ''] ?? const <String>{},
        );
      }
      return <String, dynamic>{
        'label': period.label,
        'memory_count': inPeriod.length,
        'voice_count': witnesses.length,
      };
    }).toList(growable: false);
  }

  static Future<List<Map<String, dynamic>>> fetchDivergences({
    String? lieuId,
  }) async {
    dynamic query = _client
        .from('handunia_divergences')
        .select(
          'id, lieu_id, subject, version_a_id, version_b_id, '
          'detected_at, status',
        )
        .eq('status', 'open');
    if (lieuId != null && lieuId.isNotEmpty) {
      query = query.eq('lieu_id', lieuId);
    }
    final raw = await query.order('detected_at', ascending: false);
    final rows = List<Map<String, dynamic>>.from(raw as List);
    final result = <Map<String, dynamic>>[];
    for (final divergence in rows) {
      final aId = divergence['version_a_id']?.toString();
      final bId = divergence['version_b_id']?.toString();
      final versions = await Future.wait<Map<String, dynamic>>([
        aId == null
            ? Future.value(<String, dynamic>{})
            : fetchMemoryDetail(aId),
        bId == null
            ? Future.value(<String, dynamic>{})
            : fetchMemoryDetail(bId),
      ]);
      final opinionsRaw = await _client
          .from('handunia_guardian_opinions')
          .select('guardian_user_id, opinion, created_at')
          .eq('divergence_id', divergence['id'])
          .order('created_at', ascending: false);
      final opinions = List<Map<String, dynamic>>.from(opinionsRaw as List);
      result.add(<String, dynamic>{
        ...divergence,
        'version_a': versions[0],
        'version_b': versions[1],
        'guardian_opinions': opinions,
      });
    }
    return result;
  }

  static Future<Map<String, dynamic>> askMemory(
    String question, {
    String? requestedScope,
  }) async {
    final response = await _client.functions.invoke(
      'handunia-memory-query',
      body: <String, dynamic>{
        'question': question.trim(),
        'requested_scope': ?requestedScope,
      },
    );
    final data = response.data;
    if (data is Map) {
      return Map<String, dynamic>.from(data);
    }
    throw StateError('Réponse mémoire invalide.');
  }

  static Future<Map<String, dynamic>> fetchFoyer() async {
    final fragmentsRaw = await _client
        .from('handunia_fragments')
        .select('id, user_id, synchronized_at, withdrawn_at');
    final fragments = List<Map<String, dynamic>>.from(fragmentsRaw as List);
    final returnsRaw = await _client
        .from('handunia_village_returns')
        .select('id, return_type, title, resource_url, published_at')
        .eq('active', true)
        .order('published_at', ascending: false);
    final guardianRows = await _client
        .from('handunia_guardians')
        .select('user_id, designated_at, designated_by_community')
        .eq('active', true);
    final guardians = List<Map<String, dynamic>>.from(guardianRows as List);
    final guardianIds = guardians
        .map((row) => row['user_id']?.toString() ?? '')
        .where((id) => id.isNotEmpty)
        .toList(growable: false);
    var profiles = <Map<String, dynamic>>[];
    if (guardianIds.isNotEmpty) {
      final raw = await _client
          .from('tamtam_profiles')
          .select('user_id, display_name, username')
          .filter('user_id', 'in', '(${guardianIds.join(',')})');
      profiles = List<Map<String, dynamic>>.from(raw as List);
    }
    final profileMap = <String, Map<String, dynamic>>{
      for (final profile in profiles)
        profile['user_id'].toString(): profile,
    };
    final decoratedGuardians = guardians.map((guardian) {
      final profile = profileMap[guardian['user_id']?.toString()];
      final name =
          profile?['display_name']?.toString().trim().isNotEmpty == true
          ? profile!['display_name'].toString()
          : (profile?['username']?.toString() ?? '');
      return <String, dynamic>{
        ...guardian,
        'initials': handuniaInitials(name),
      };
    }).toList(growable: false);

    return <String, dynamic>{
      'volume': fragments.length,
      'synchronized': fragments
          .where(
            (row) =>
                row['synchronized_at'] != null && row['withdrawn_at'] == null,
          )
          .length,
      'withdrawn': fragments
          .where((row) => row['withdrawn_at'] != null)
          .length,
      'returns': List<Map<String, dynamic>>.from(returnsRaw as List),
      'guardians': decoratedGuardians,
    };
  }

  static Future<void> savePath({
    required String fragmentId,
    required List<Map<String, double>> points,
    DateTime? capturedAt,
  }) async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw const AuthException('Connexion requise.');
    }
    await _client.from('handunia_memory_paths').insert({
      'fragment_id': fragmentId,
      'user_id': user.id,
      'path_points': points,
      if (capturedAt != null)
        'captured_at': capturedAt.toUtc().toIso8601String(),
    });
  }
}
