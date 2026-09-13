import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';

class FitilaBackendSession {
  const FitilaBackendSession({
    required this.userId,
    required this.phone,
    required this.displayName,
    required this.username,
    required this.accessToken,
    required this.isAdmin,
  });

  final String userId;
  final String phone;
  final String displayName;
  final String username;
  final String accessToken;
  final bool isAdmin;
}

class FitilaBackend {
  static const supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://pmrhezgnyffiskbaiudb.supabase.co',
  );
  static const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  static bool get configured => supabaseAnonKey.isNotEmpty;

  static Future<void> initialize() async {
    if (!configured) return;
    await Supabase.initialize(
      url: supabaseUrl,
      publishableKey: supabaseAnonKey,
      authOptions: const FlutterAuthClientOptions(
        authFlowType: AuthFlowType.pkce,
      ),
    );
  }

  static SupabaseClient get client {
    if (!configured) {
      throw StateError(
        'Configuration Supabase absente. Compilez avec SUPABASE_ANON_KEY.',
      );
    }
    return Supabase.instance.client;
  }

  static String normalizeLocalPhone(String value) {
    var digits = value.replaceAll(RegExp(r'\D'), '');
    if (digits.startsWith('229') && digits.length > 8) {
      digits = digits.substring(3);
    }
    return digits;
  }

  static String fullPhone(String value) => '+229${normalizeLocalPhone(value)}';

  static String emailFromPhone(String value) =>
      '${normalizeLocalPhone(value)}@fitila.app';

  static Future<Map<String, dynamic>?> findProfileByPhone(String phone) async {
    final data = await client
        .from('tamtam_profiles')
        .select('user_id, display_name, username, phone_number')
        .eq('phone_number', fullPhone(phone))
        .maybeSingle();
    return data;
  }

  static Future<FitilaBackendSession> signInWithPhone({
    required String phone,
    required String pin,
  }) async {
    final localPhone = normalizeLocalPhone(phone);
    if (localPhone.length < 8) {
      throw const AuthException('Entrez au moins 8 chiffres.');
    }
    if (!RegExp(r'^\d{6}$').hasMatch(pin)) {
      throw const AuthException('Le PIN doit contenir exactement 6 chiffres.');
    }

    final profile = await findProfileByPhone(localPhone);
    if (profile == null) {
      throw const AuthException(
        'Aucun compte FITILA ne correspond à ce numéro.',
      );
    }

    final response = await client.auth.signInWithPassword(
      email: emailFromPhone(localPhone),
      password: pin,
    );
    final session = response.session;
    if (session == null) {
      throw const AuthException('La session FITILA n’a pas pu être créée.');
    }
    return sessionFromSupabase(session, profile: profile);
  }

  static Future<FitilaBackendSession> sessionFromSupabase(
    Session session, {
    Map<String, dynamic>? profile,
  }) async {
    final userId = session.user.id;
    final resolvedProfile =
        profile ??
        await client
            .from('tamtam_profiles')
            .select('display_name, username, phone_number')
            .eq('user_id', userId)
            .maybeSingle();
    final role = await client
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

    final metadata = session.user.userMetadata ?? const <String, dynamic>{};
    return FitilaBackendSession(
      userId: userId,
      phone:
          resolvedProfile?['phone_number']?.toString() ??
          metadata['phone_number']?.toString() ??
          '',
      displayName:
          resolvedProfile?['display_name']?.toString().trim().isNotEmpty == true
          ? resolvedProfile!['display_name'].toString().trim()
          : (metadata['display_name']?.toString().trim().isNotEmpty == true
                ? metadata['display_name'].toString().trim()
                : 'Utilisateur FITILA'),
      username: resolvedProfile?['username']?.toString() ?? '',
      accessToken: session.accessToken,
      isAdmin: role != null,
    );
  }

  static Future<FitilaBackendSession?> restoreSession() async {
    if (!configured) return null;
    final session = client.auth.currentSession;
    if (session == null) return null;
    try {
      return await sessionFromSupabase(session);
    } on AuthException {
      await client.auth.signOut();
      return null;
    }
  }

  static Future<void> signOut() async {
    if (configured) await client.auth.signOut();
  }

  static Future<String> askFitilaIa(String message) async {
    final response = await client.functions.invoke(
      'fitila-ia-chat',
      body: {'message': message.trim()},
    );
    final data = response.data;
    if (data is! Map) {
      throw StateError('Réponse Fitila IA invalide.');
    }
    if (data['error'] == 'credits_exhausted') {
      throw StateError('Crédits IA épuisés. Veuillez recharger le compte.');
    }
    if (data['error'] != null) {
      throw StateError(data['error'].toString());
    }
    final fallback = data['fallback'] == true;
    final bariba = data['response_ba']?.toString().trim() ?? '';
    final french = data['response_fr']?.toString().trim() ?? '';
    final answer = bariba.isNotEmpty && !fallback ? bariba : french;
    if (answer.isEmpty) throw StateError('Fitila IA n’a retourné aucun texte.');
    return answer.replaceAll(RegExp(r'\.\s+'), '.\n\n').trim();
  }

  static Future<List<Map<String, dynamic>>> fetchPublicFeed({
    int limit = 40,
  }) async {
    final results = await Future.wait([
      client
          .from('tamtam_posts')
          .select(
            '*, profile:tamtam_profiles!tamtam_posts_user_id_fkey(username, display_name, avatar_url)',
          )
          .eq('is_public', true)
          .order('created_at', ascending: false)
          .limit(limit),
      client
          .from('videos')
          .select(
            '*, profile:tamtam_profiles!videos_user_id_fkey(username, display_name, avatar_url)',
          )
          .eq('is_public', true)
          .order('created_at', ascending: false)
          .limit(limit),
    ]);
    final feed = <Map<String, dynamic>>[];
    for (final raw in results[0]) {
      final row = Map<String, dynamic>.from(raw);
      row['_source'] = 'post';
      feed.add(row);
    }
    for (final raw in results[1]) {
      final row = Map<String, dynamic>.from(raw);
      row['_source'] = 'video';
      feed.add(row);
    }
    feed.sort((a, b) {
      final left = DateTime.tryParse(a['created_at']?.toString() ?? '');
      final right = DateTime.tryParse(b['created_at']?.toString() ?? '');
      return (right ?? DateTime.fromMillisecondsSinceEpoch(0)).compareTo(
        left ?? DateTime.fromMillisecondsSinceEpoch(0),
      );
    });
    return feed.take(limit).toList(growable: false);
  }

  static Future<bool> togglePostLike({
    required String postId,
    required bool liked,
  }) async {
    final user = client.auth.currentUser;
    if (user == null) throw const AuthException('Connexion requise.');
    final existing = await client
        .from('tamtam_reactions')
        .select('id, reaction_type')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();
    if (liked) {
      if (existing == null) {
        await client.from('tamtam_reactions').insert({
          'post_id': postId,
          'user_id': user.id,
          'reaction_type': 'like',
        });
      } else if (existing['reaction_type'] != 'like') {
        await client
            .from('tamtam_reactions')
            .update({'reaction_type': 'like'})
            .eq('id', existing['id']);
      }
    } else if (existing != null) {
      await client.from('tamtam_reactions').delete().eq('id', existing['id']);
    }
    return liked;
  }

  static Future<Map<String, dynamic>> createTextPost({
    required String text,
    required List<String> hashtags,
    String? templateId,
    bool isPublic = true,
  }) async {
    final user = client.auth.currentUser;
    if (user == null) throw const AuthException('Connexion requise.');
    final payload = {
      'user_id': user.id,
      'audio_url': null,
      'media_type': 'text',
      'media_url': null,
      'thumbnail_url': null,
      'transcript_fr': text.trim(),
      'transcript_ba': null,
      'duration_seconds': null,
      'topic': hashtags.isEmpty ? null : hashtags.first,
      'template_id': templateId,
      'hashtags': hashtags.isEmpty ? null : hashtags,
      'is_public': isPublic,
    };
    final data = await client
        .from('tamtam_posts')
        .insert(payload)
        .select(
          '*, profile:tamtam_profiles!tamtam_posts_user_id_fkey(username, display_name, avatar_url)',
        )
        .single();
    return {...data, '_source': 'post'};
  }

  static Future<Map<String, dynamic>> createMediaPost({
    required Uint8List bytes,
    required String originalName,
    required String contentType,
    required String mediaType,
    required String text,
    required List<String> hashtags,
    String? templateId,
    bool isPublic = true,
  }) async {
    final user = client.auth.currentUser;
    if (user == null) throw const AuthException('Connexion requise.');
    final extension = originalName.contains('.')
        ? originalName.split('.').last.toLowerCase()
        : switch (mediaType) {
            'audio' => 'm4a',
            'photo' => 'jpg',
            _ => 'mp4',
          };
    final storagePath =
        'posts/${mediaType}_${user.id}_${DateTime.now().millisecondsSinceEpoch}.$extension';
    await client.storage
        .from('tamtam-media')
        .uploadBinary(
          storagePath,
          bytes,
          fileOptions: FileOptions(contentType: contentType, upsert: false),
        );
    final publicUrl = client.storage
        .from('tamtam-media')
        .getPublicUrl(storagePath);
    final data = await client
        .from('tamtam_posts')
        .insert({
          'user_id': user.id,
          'audio_url': mediaType == 'audio' ? publicUrl : null,
          'media_type': mediaType,
          'media_url': mediaType == 'audio' ? null : publicUrl,
          'thumbnail_url': mediaType == 'photo' ? publicUrl : null,
          'transcript_fr': text.trim().isEmpty ? null : text.trim(),
          'transcript_ba': null,
          'duration_seconds': null,
          'topic': hashtags.isEmpty ? null : hashtags.first,
          'template_id': templateId,
          'hashtags': hashtags.isEmpty ? null : hashtags,
          'is_public': isPublic,
        })
        .select(
          '*, profile:tamtam_profiles!tamtam_posts_user_id_fkey(username, display_name, avatar_url)',
        )
        .single();
    return {...data, '_source': 'post'};
  }

  static Future<Map<String, dynamic>?> fetchProfile(String userId) async {
    return client
        .from('tamtam_profiles')
        .select()
        .eq('user_id', userId)
        .maybeSingle();
  }

  static Future<void> updateProfile(
    String userId,
    Map<String, dynamic> updates,
  ) async {
    await client
        .from('tamtam_profiles')
        .update({...updates, 'updated_at': DateTime.now().toIso8601String()})
        .eq('user_id', userId);
  }

  static Future<Map<String, dynamic>> fetchVoiceLab() async {
    final user = client.auth.currentUser;
    if (user == null) throw const AuthException('Connexion requise.');
    final results = await Future.wait([
      client
          .from('bariba_corpus_phrases')
          .select(
            'id, text_bariba, text_french, category, source, word_count, difficulty, recordings_count',
          )
          .eq('is_active', true)
          .order('recordings_count', ascending: true)
          .limit(120),
      client
          .from('bariba_voice_recordings')
          .select('phrase_id')
          .eq('user_id', user.id),
      client
          .from('bariba_corpus_phrases')
          .select('id, category')
          .eq('is_active', true),
    ]);
    final recordedIds = results[1]
        .map((row) => row['phrase_id']?.toString())
        .whereType<String>()
        .toSet();
    final queue = results[0]
        .where((row) => !recordedIds.contains(row['id']?.toString()))
        .take(50)
        .map((row) => Map<String, dynamic>.from(row))
        .toList(growable: false);
    final categories = <String, int>{};
    for (final row in results[2]) {
      final category = row['category']?.toString() ?? 'Autres';
      categories[category] = (categories[category] ?? 0) + 1;
    }
    return {
      'queue': queue,
      'total': results[2].length,
      'recorded': recordedIds.length,
      'categories': categories,
    };
  }

  static Future<void> submitVoiceRecording({
    required String phraseId,
    required String category,
    required String baribaText,
    required Uint8List bytes,
    required String contentType,
    required int durationSeconds,
  }) async {
    final user = client.auth.currentUser;
    if (user == null) throw const AuthException('Connexion requise.');
    final extension = contentType.contains('mp4') ? 'm4a' : 'wav';
    final safeCategory = category
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9]+'), '_')
        .replaceAll(RegExp(r'^_+|_+$'), '');
    final normalizedText = baribaText
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9]+'), '_')
        .replaceAll(RegExp(r'^_+|_+$'), '');
    final safeText = normalizedText.length > 30
        ? normalizedText.substring(0, 30)
        : normalizedText;
    final fileName =
        '${safeCategory}_${safeText}_${DateTime.now().millisecondsSinceEpoch}.$extension';
    final storagePath = '${user.id}/${phraseId}_$fileName';
    await client.storage
        .from('bariba-voice-corpus')
        .uploadBinary(
          storagePath,
          bytes,
          fileOptions: FileOptions(contentType: contentType, upsert: false),
        );
    try {
      await client.from('bariba_voice_recordings').insert({
        'user_id': user.id,
        'phrase_id': phraseId,
        'storage_path': storagePath,
        'file_name': fileName,
        'duration_seconds': durationSeconds,
        'mime_type': contentType,
        'file_size_bytes': bytes.length,
      });
    } catch (_) {
      await client.storage.from('bariba-voice-corpus').remove([storagePath]);
      rethrow;
    }
  }
}
