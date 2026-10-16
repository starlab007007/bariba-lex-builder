import 'dart:math' as math;

import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/fitila_backend.dart';
import 'handunia_consultation_model.dart';

class HanduniaConsultationData {
  static SupabaseClient get _client => FitilaBackend.client;

  static Future<String?> resolveCurrentLineageKey() async {
    if (!FitilaBackend.configured) {
      return null;
    }
    final user = _client.auth.currentUser;
    if (user == null) {
      return null;
    }
    try {
      final row = await _client
          .from('handunia_lineage_memberships')
          .select('lineage_key')
          .eq('user_id', user.id)
          .eq('active', true)
          .order('designated_at', ascending: false)
          .limit(1)
          .maybeSingle();
      final value = row?['lineage_key']?.toString().trim() ?? '';
      return value.isEmpty ? null : value;
    } catch (_) {
      return null;
    }
  }

  static bool get currentGuardian {
    if (!FitilaBackend.configured) {
      return false;
    }
    return _client.auth.currentUser?.userMetadata?['handunia_guardian'] == true;
  }

  static Future<List<Map<String, dynamic>>> fetchFeed({
    int limit = 24,
    double? latitude,
    double? longitude,
    HanduniaFeedFilter filter = HanduniaFeedFilter.all,
  }) async {
    var fragments = await _fetchFragmentCandidates();

    if (fragments.isEmpty) {
      return const [];
    }

    final lineage = await resolveCurrentLineageKey();
    if (filter == HanduniaFeedFilter.lineage && lineage == null) {
      return const [];
    }
    if (filter == HanduniaFeedFilter.lineage) {
      fragments = fragments
          .where((row) => row['lineage_key']?.toString() == lineage)
          .toList(growable: false);
    }
    if (fragments.isEmpty) {
      return const [];
    }

    final userIds = fragments
        .map((item) => item['user_id']?.toString())
        .whereType<String>()
        .toSet()
        .toList(growable: false);
    final fragmentIds = fragments
        .map((item) => item['id']?.toString())
        .whereType<String>()
        .toSet()
        .toList(growable: false);

    var profiles = <Map<String, dynamic>>[];
    if (userIds.isNotEmpty) {
      try {
        final rows = await _client
            .from('tamtam_profiles')
            .select('user_id, username, display_name')
            .filter('user_id', 'in', '(${userIds.join(',')})');
        profiles = List<Map<String, dynamic>>.from(rows as List);
      } catch (_) {
        profiles = const [];
      }
    }
    final profileMap = <String, Map<String, dynamic>>{
      for (final profile in profiles)
        if (profile['user_id'] != null)
          profile['user_id'].toString(): profile,
    };

    var corroborations = <Map<String, dynamic>>[];
    if (fragmentIds.isNotEmpty) {
      try {
        final rows = await _client
            .from('handunia_corroborations')
            .select('fragment_id, user_id, created_at')
            .filter('fragment_id', 'in', '(${fragmentIds.join(',')})');
        corroborations = List<Map<String, dynamic>>.from(rows as List);
      } catch (_) {
        corroborations = const [];
      }
    }

    final divergentFragmentIds = <String>{};
    if (fragmentIds.isNotEmpty) {
      try {
        final rows = await _client
            .from('handunia_divergences')
            .select('version_a_id, version_b_id, status')
            .eq('status', 'open');
        for (final row in List<Map<String, dynamic>>.from(rows as List)) {
          final a = row['version_a_id']?.toString() ?? '';
          final b = row['version_b_id']?.toString() ?? '';
          if (a.isNotEmpty) divergentFragmentIds.add(a);
          if (b.isNotEmpty) divergentFragmentIds.add(b);
        }
      } catch (_) {
        // Une divergence non déployée ne doit jamais bloquer le fil.
      }
    }

    final likeCounts = <String, int>{};
    final likedByMe = <String>{};
    if (fragmentIds.isNotEmpty) {
      try {
        final rows = await _client
            .from('handunia_fragment_likes')
            .select('fragment_id, user_id')
            .filter('fragment_id', 'in', '(${fragmentIds.join(',')})');
        final currentUserId = _client.auth.currentUser?.id;
        for (final row in List<Map<String, dynamic>>.from(rows as List)) {
          final fragmentId = row['fragment_id']?.toString() ?? '';
          if (fragmentId.isEmpty) continue;
          likeCounts[fragmentId] = (likeCounts[fragmentId] ?? 0) + 1;
          if (currentUserId != null &&
              row['user_id']?.toString() == currentUserId) {
            likedByMe.add(fragmentId);
          }
        }
      } catch (_) {
        // Le fil reste consultable même si les réactions sont indisponibles.
      }
    }

    var lieux = <Map<String, dynamic>>[];
    try {
      final rows = await _client
          .from('handunia_lieux')
          .select(
            'id, name, icon, latitude, longitude, cover_url, photo_url, '
            'image_url, media_url',
          );
      lieux = List<Map<String, dynamic>>.from(rows as List);
    } catch (_) {
      try {
        final rows = await _client
            .from('handunia_lieux')
            .select('id, name, icon, latitude, longitude');
        lieux = List<Map<String, dynamic>>.from(rows as List);
      } catch (_) {
        final rows = await _client.from('handunia_lieux').select('id, name');
        lieux = List<Map<String, dynamic>>.from(rows as List);
      }
    }
    final lieuMap = <String, Map<String, dynamic>>{
      for (final lieu in lieux)
        if (lieu['id'] != null) lieu['id'].toString(): lieu,
    };

    final voices = <String, Set<String>>{};
    final latest = <String, DateTime>{};
    for (final row in corroborations) {
      final fragmentId = row['fragment_id']?.toString() ?? '';
      final userId = row['user_id']?.toString() ?? '';
      if (fragmentId.isEmpty || userId.isEmpty) {
        continue;
      }
      voices.putIfAbsent(fragmentId, () => <String>{}).add(userId);
      final created = DateTime.tryParse(row['created_at']?.toString() ?? '');
      if (created != null &&
          (latest[fragmentId] == null ||
              created.isAfter(latest[fragmentId]!))) {
        latest[fragmentId] = created;
      }
    }

    final visible = <Map<String, dynamic>>[];
    for (final fragment in fragments) {
      final id = fragment['id']?.toString() ?? '';
      final profile = profileMap[fragment['user_id']?.toString()];
      final displayName =
          profile?['display_name']?.toString().trim().isNotEmpty == true
          ? profile!['display_name'].toString()
          : (profile?['username']?.toString() ?? '');
      final lieu = lieuMap[fragment['lieu_id']?.toString()];
      final itemLat =
          (fragment['latitude'] as num?)?.toDouble() ??
          (lieu?['latitude'] as num?)?.toDouble();
      final itemLng =
          (fragment['longitude'] as num?)?.toDouble() ??
          (lieu?['longitude'] as num?)?.toDouble();

      double? distance;
      if (latitude != null &&
          longitude != null &&
          itemLat != null &&
          itemLng != null) {
        distance = _distanceMeters(
          latitude,
          longitude,
          itemLat,
          itemLng,
        );
      }

      final withdrawn = fragment['withdrawn_at'] != null;
      String? lieuCoverUrl;
      for (final key in const <String>[
        'cover_url',
        'photo_url',
        'image_url',
        'media_url',
      ]) {
        final candidate = lieu?[key]?.toString().trim() ?? '';
        if (candidate.startsWith('https://') ||
            candidate.startsWith('http://')) {
          lieuCoverUrl = candidate;
          break;
        }
      }

      visible.add(<String, dynamic>{
        ...fragment,
        'item_type': withdrawn ? 'withdrawn' : 'memory',
        'lieu_name': lieu?['name']?.toString() ?? '',
        'lieu_icon': lieu?['icon']?.toString() ?? '📍',
        'lieu_cover_url': lieuCoverUrl,
        'display_name': displayName.isEmpty ? 'Voix Handunia' : displayName,
        'author_initials': handuniaInitials(displayName),
        'voice_count': handuniaDistinctVoiceCount(
          fragment['user_id']?.toString(),
          voices[id] ?? const <String>{},
        ),
        'corroboration_count': voices[id]?.length ?? 0,
        'has_divergence': divergentFragmentIds.contains(id),
        'like_count': likeCounts[id] ?? 0,
        'liked_by_me': likedByMe.contains(id),
        'is_mine':
            _client.auth.currentUser?.id == fragment['user_id']?.toString(),
        'latest_corroboration_at':
            latest[id]?.toIso8601String() ?? fragment['created_at'],
        'distance_m': distance,
      });
    }

    visible.sort(compareHanduniaFeedItems);
    if (visible.length > limit) {
      visible.removeRange(limit, visible.length);
    }

    if (filter != HanduniaFeedFilter.lineage) {
      try {
        final rows = await _client
            .from('handunia_memory_gaps')
            .select(
              'id, lieu_id, gap_type, gap_value, severity, source_count, '
              'detected_at, resolved_at',
            )
            .isFilter('resolved_at', null)
            .order('severity', ascending: false)
            .limit(1);
        final gaps = List<Map<String, dynamic>>.from(rows as List);
        if (gaps.isNotEmpty) {
          final gap = gaps.first;
          final lieu = lieuMap[gap['lieu_id']?.toString()];
          final insertAt = visible.isEmpty ? 0 : math.min(4, visible.length);
          visible.insert(insertAt, <String, dynamic>{
            ...gap,
            'id': 'gap:${gap['id']}',
            'item_type': 'memory_gap',
            'lieu_name': lieu?['name']?.toString() ?? '',
            'lieu_icon': lieu?['icon']?.toString() ?? '🕯️',
            'created_at': gap['detected_at'],
          });
        }
      } catch (_) {
        // Une migration ancienne ne doit jamais empêcher la consultation.
      }
    }

    try {
      final rows = await _client
          .from('handunia_divergences')
          .select('id, lieu_id, subject, detected_at, status')
          .eq('status', 'open')
          .order('detected_at', ascending: false)
          .limit(1);
      final divergences = List<Map<String, dynamic>>.from(rows as List);
      if (divergences.isNotEmpty) {
        final divergence = divergences.first;
        final insertAt = visible.isEmpty ? 0 : math.min(2, visible.length);
        visible.insert(insertAt, <String, dynamic>{
          ...divergence,
          'item_type': 'divergence',
          'created_at': divergence['detected_at'],
        });
      }
    } catch (_) {
      // Pas de faux signal si la migration divergence n'est pas déployée.
    }

    return visible;
  }

  static Future<void> corroborate({
    required String fragmentId,
    String? audioUrl,
  }) async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw const AuthException('Connexion requise.');
    }
    await _client.from('handunia_corroborations').upsert(
      <String, dynamic>{
        'fragment_id': fragmentId,
        'user_id': user.id,
        'audio_url': audioUrl,
      },
      onConflict: 'fragment_id,user_id',
    );
  }

  static Future<List<Map<String, dynamic>>> _fetchFragmentCandidates() async {
    const pageSize = 250;
    final fragments = <Map<String, dynamic>>[];
    var offset = 0;
    var legacySchema = false;

    while (true) {
      dynamic rows;
      if (!legacySchema) {
        try {
          rows = await _client
              .from('handunia_fragments')
              .select(
                'id, text, transcript_text, audio_url, audio_duration_ms, '
                'audio_codec, audio_bitrate_kbps, period_label, period_year, '
                'scope_level, seal_hash, sealed_at, lineage_key, latitude, '
                'longitude, lacuna_filled, synchronized_at, withdrawn_at, '
                'ai_generated, ai_assisted, review_status, memory_state, '
                'witness_gender, theme_key, transcript_reviewed_by_guardian, '
                'created_at, user_id, lieu_id',
              )
              .order('created_at', ascending: false)
              .range(offset, offset + pageSize - 1);
        } on PostgrestException {
          legacySchema = true;
        }
      }

      if (legacySchema) {
        rows = await _client
            .from('handunia_fragments')
            .select('id, text, ai_generated, created_at, user_id, lieu_id')
            .order('created_at', ascending: false)
            .range(offset, offset + pageSize - 1);
      }

      final page = List<Map<String, dynamic>>.from(rows as List);
      fragments.addAll(page);
      if (page.length < pageSize) {
        break;
      }
      offset += pageSize;
    }

    return fragments;
  }

  static Future<Map<String, dynamic>?> fetchPlaceMemorySummary(
    String lieuId,
  ) async {
    if (!FitilaBackend.configured || lieuId.trim().isEmpty) return null;
    try {
      final rows = await _client.rpc(
        'handunia_place_memory_summary',
        params: {'p_lieu_id': lieuId.trim()},
      );
      final values = List<Map<String, dynamic>>.from(rows as List);
      return values.isEmpty ? null : values.first;
    } catch (_) {
      return null;
    }
  }

  static Future<List<Map<String, dynamic>>> fetchMemoryNeighborhood(
    String fragmentId, {
    int depth = 1,
  }) async {
    if (!FitilaBackend.configured || fragmentId.trim().isEmpty) {
      return const [];
    }
    try {
      final rows = await _client.rpc(
        'handunia_memory_neighborhood',
        params: {
          'p_fragment_id': fragmentId.trim(),
          'p_depth': depth.clamp(1, 3),
        },
      );
      return List<Map<String, dynamic>>.from(rows as List);
    } catch (_) {
      return const [];
    }
  }

  static Future<List<Map<String, dynamic>>> fetchNextMemories(
    String fragmentId, {
    int limit = 8,
  }) async {
    if (!FitilaBackend.configured || fragmentId.trim().isEmpty) {
      return const [];
    }
    try {
      final rows = await _client.rpc(
        'handunia_next_memory',
        params: {
          'p_fragment_id': fragmentId.trim(),
          'p_limit': limit.clamp(1, 24),
        },
      );
      return List<Map<String, dynamic>>.from(rows as List);
    } catch (_) {
      return const [];
    }
  }

  static Future<List<Map<String, dynamic>>> fetchGapPriorities({
    int limit = 8,
  }) async {
    if (!FitilaBackend.configured) return const [];
    try {
      final rows = await _client.rpc(
        'handunia_memory_gap_priorities',
        params: {'p_limit': limit.clamp(1, 24)},
      );
      return List<Map<String, dynamic>>.from(rows as List);
    } catch (_) {
      return const [];
    }
  }


  static double _distanceMeters(
    double lat1,
    double lon1,
    double lat2,
    double lon2,
  ) {
    const earthRadius = 6371000.0;
    final p1 = lat1 * math.pi / 180;
    final p2 = lat2 * math.pi / 180;
    final dp = (lat2 - lat1) * math.pi / 180;
    final dl = (lon2 - lon1) * math.pi / 180;
    final a =
        math.sin(dp / 2) * math.sin(dp / 2) +
        math.cos(p1) *
            math.cos(p2) *
            math.sin(dl / 2) *
            math.sin(dl / 2);
    return earthRadius *
        2 *
        math.atan2(math.sqrt(a), math.sqrt(1 - a));
  }
}
