import 'dart:math' as math;

import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/fitila_backend.dart';
import 'handunia_consultation_model.dart';

class HanduniaConsultationData {
  static SupabaseClient get _client => FitilaBackend.client;

  static String? get currentLineageKey {
    if (!FitilaBackend.configured) {
      return null;
    }
    final raw = _client.auth.currentUser?.userMetadata?['lineage_key'];
    final value = raw?.toString().trim() ?? '';
    return value.isEmpty ? null : value;
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
    List<Map<String, dynamic>> fragments;
    try {
      final rows = await _client
          .from('handunia_fragments')
          .select(
            'id, text, transcript_text, audio_url, audio_duration_ms, '
            'audio_codec, audio_bitrate_kbps, period_label, scope_level, '
            'seal_hash, sealed_at, lineage_key, latitude, longitude, '
            'lacuna_filled, synchronized_at, withdrawn_at, ai_generated, '
            'created_at, user_id, lieu_id',
          )
          .order('created_at', ascending: false)
          .limit(limit * 2);
      fragments = List<Map<String, dynamic>>.from(rows as List);
    } on PostgrestException {
      final rows = await _client
          .from('handunia_fragments')
          .select('id, text, ai_generated, created_at, user_id, lieu_id')
          .order('created_at', ascending: false)
          .limit(limit * 2);
      fragments = List<Map<String, dynamic>>.from(rows as List);
    }

    if (fragments.isEmpty) {
      return const [];
    }

    final lineage = currentLineageKey;
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

    var lieux = <Map<String, dynamic>>[];
    try {
      final rows = await _client
          .from('handunia_lieux')
          .select('id, name, latitude, longitude');
      lieux = List<Map<String, dynamic>>.from(rows as List);
    } catch (_) {
      final rows = await _client.from('handunia_lieux').select('id, name');
      lieux = List<Map<String, dynamic>>.from(rows as List);
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
      visible.add(<String, dynamic>{
        ...fragment,
        'item_type': withdrawn ? 'withdrawn' : 'memory',
        'lieu_name': lieu?['name']?.toString() ?? '',
        'author_initials': handuniaInitials(displayName),
        'voice_count': handuniaDistinctVoiceCount(
          fragment['user_id']?.toString(),
          voices[id] ?? const <String>{},
        ),
        'latest_corroboration_at':
            latest[id]?.toIso8601String() ?? fragment['created_at'],
        'distance_m': distance,
      });
    }

    visible.sort(compareHanduniaFeedItems);
    if (visible.length > limit) {
      visible.removeRange(limit, visible.length);
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
