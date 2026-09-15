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

  // ================= Espace Enseignant (module Classe) =================
  // Réplique fidèle des requêtes Supabase de src/pages/teacher/*.tsx et
  // src/hooks/useTeacherRole.ts pour garantir la parité web ⇄ Flutter.

  static T? _firstOrNull<T>(Iterable<T> items) {
    final it = items.iterator;
    return it.moveNext() ? it.current : null;
  }

  static Future<bool> isTeacher() async {
    final user = client.auth.currentUser;
    if (user == null) return false;
    try {
      final rows = await client
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .filter('role', 'in', '(teacher,admin)');
      return (rows as List).isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  static String readableStudentLabel({
    String? displayName,
    String? username,
    String? phoneNumber,
    required String userId,
  }) {
    final dn = displayName?.trim();
    if (dn != null && dn.isNotEmpty && dn != 'Nouvel utilisateur') return dn;
    final un = username?.trim();
    if (un != null && un.isNotEmpty && !un.startsWith('user_')) return '@$un';
    if (phoneNumber != null && phoneNumber.trim().isNotEmpty) {
      final digits = phoneNumber.replaceAll(RegExp(r'\D'), '');
      final tail = digits.length > 8 ? digits.substring(digits.length - 8) : digits;
      return '📱 $tail';
    }
    final short = userId.length >= 4 ? userId.substring(0, 4).toUpperCase() : userId.toUpperCase();
    return 'Apprenant $short';
  }

  static Future<Map<String, dynamic>> fetchTeacherDashboard() async {
    final results = await Future.wait([
      client.from('classe_student_progress').select('user_id, completed_lessons'),
      client
          .from('classe_student_answers')
          .select('id')
          .filter('graded_at', 'is', null),
      client
          .from('classe_student_answers')
          .select('teacher_grade')
          .not('teacher_grade', 'is', null),
      client
          .from('classe_student_answers')
          .select('user_id, updated_at, module, level, lesson_id')
          .order('updated_at', ascending: false)
          .limit(10),
    ]);

    final progressRows = List<Map<String, dynamic>>.from(results[0] as List);
    final totalStudents = progressRows.map((r) => r['user_id']).toSet().length;
    final totalLessons = progressRows.fold<int>(0, (sum, row) {
      final list = row['completed_lessons'];
      return sum + (list is List ? list.length : 0);
    });
    final pendingCount = (results[1] as List).length;
    final grades = (results[2] as List)
        .map((r) => (r as Map)['teacher_grade'])
        .whereType<num>()
        .toList();
    final avgGrade = grades.isEmpty
        ? null
        : grades.reduce((a, b) => a + b) / grades.length;
    final recent = List<Map<String, dynamic>>.from(results[3] as List);

    return {
      'totalStudents': totalStudents,
      'pendingGrading': pendingCount,
      'completedLessons': totalLessons,
      'avgGrade': avgGrade,
      'recent': recent,
    };
  }

  static Future<List<Map<String, dynamic>>> fetchTeacherStudents() async {
    final progress = await client
        .from('classe_student_progress')
        .select('user_id, level, completed_lessons, updated_at');
    final progressRows = List<Map<String, dynamic>>.from(progress as List);
    final userIds = progressRows.map((r) => r['user_id'] as String).toSet().toList();
    if (userIds.isEmpty) return [];

    final results = await Future.wait([
      client
          .from('tamtam_profiles')
          .select('user_id, username, display_name, avatar_url, phone_number')
          .filter('user_id', 'in', '(${userIds.join(",")})'),
      client
          .from('classe_student_answers')
          .select('user_id')
          .filter('graded_at', 'is', null),
    ]);
    final profileMap = <String, Map<String, dynamic>>{
      for (final p in List<Map<String, dynamic>>.from(results[0] as List))
        p['user_id'] as String: p,
    };
    final pendingCount = <String, int>{};
    for (final a in List<Map<String, dynamic>>.from(results[1] as List)) {
      final uid = a['user_id'] as String;
      pendingCount[uid] = (pendingCount[uid] ?? 0) + 1;
    }

    final merged = userIds.map((uid) {
      final userRows = progressRows.where((p) => p['user_id'] == uid);
      final n1 = _firstOrNull(userRows.where((p) => p['level'] == 'N1'));
      final n2 = _firstOrNull(userRows.where((p) => p['level'] == 'N2'));
      final profile = profileMap[uid];
      final n1Completed = (n1?['completed_lessons'] as List?)?.length ?? 0;
      final n2Completed = (n2?['completed_lessons'] as List?)?.length ?? 0;
      final lastUpdated = [n1?['updated_at'], n2?['updated_at']]
          .whereType<String>()
          .toList()
        ..sort();
      return <String, dynamic>{
        'user_id': uid,
        'username': profile?['username'],
        'display_name': profile?['display_name'],
        'phone_number': profile?['phone_number'],
        'avatar_url': profile?['avatar_url'],
        'n1_completed': n1Completed,
        'n2_completed': n2Completed,
        'last_updated': lastUpdated.isEmpty ? '' : lastUpdated.last,
        'pending_count': pendingCount[uid] ?? 0,
      };
    }).toList()
      ..sort((a, b) => (b['last_updated'] as String).compareTo(a['last_updated'] as String));
    return merged;
  }

  static Future<Map<String, dynamic>> fetchStudentDetail(String userId) async {
    final results = await Future.wait<dynamic>([
      client
          .from('tamtam_profiles')
          .select(
            'display_name, username, avatar_url, phone_number, bio, followers_count, following_count, created_at, total_points, level',
          )
          .eq('user_id', userId)
          .maybeSingle(),
      client
          .from('classe_student_progress')
          .select('level, completed_lessons, lesson_stars, updated_at')
          .eq('user_id', userId),
      client
          .from('classe_evaluation_results')
          .select('level, evaluation_id, best_score, attempts')
          .eq('user_id', userId),
      client
          .from('classe_student_answers')
          .select(
            'id, user_id, level, module, lesson_id, section_key, question_idx, answer_text, answer_audio_path, answer_audio_duration, score, max_score, teacher_grade, teacher_comment, updated_at',
          )
          .eq('user_id', userId)
          .order('updated_at', ascending: false)
          .limit(500),
      client
          .from('tamtam_posts')
          .select('id, created_at, transcript_fr')
          .eq('user_id', userId)
          .order('created_at', ascending: false)
          .limit(20),
      client
          .from('dictionary_entries')
          .select('id, word, definition, created_at')
          .eq('created_by', userId)
          .order('created_at', ascending: false)
          .limit(20),
    ]);
    return {
      'profile': results[0],
      'progress': List<Map<String, dynamic>>.from((results[1] as List?) ?? []),
      'evaluations': List<Map<String, dynamic>>.from((results[2] as List?) ?? []),
      'answers': List<Map<String, dynamic>>.from((results[3] as List?) ?? []),
      'posts': List<Map<String, dynamic>>.from((results[4] as List?) ?? []),
      'contributions': List<Map<String, dynamic>>.from((results[5] as List?) ?? []),
    };
  }

  static Future<List<Map<String, dynamic>>> fetchPendingGrading({
    String? module,
    String? level,
  }) async {
    var query = client
        .from('classe_student_answers')
        .select(
          'id, user_id, level, module, lesson_id, section_key, question_idx, answer_text, answer_audio_path, answer_audio_duration, score, max_score, teacher_grade, teacher_comment, updated_at',
        )
        .filter('graded_at', 'is', null);
    if (module != null && module != 'all') query = query.eq('module', module);
    if (level != null && level != 'all') query = query.eq('level', level);
    final rows = await query.order('updated_at', ascending: false).limit(100);
    final list = List<Map<String, dynamic>>.from(rows as List);
    final ids = list.map((r) => r['user_id'] as String).toSet().toList();
    if (ids.isEmpty) return list;
    final profiles = await client
        .from('tamtam_profiles')
        .select('user_id, display_name, username, phone_number')
        .filter('user_id', 'in', '(${ids.join(",")})');
    final labelMap = {
      for (final p in List<Map<String, dynamic>>.from(profiles as List))
        p['user_id'] as String: readableStudentLabel(
          displayName: p['display_name'] as String?,
          username: p['username'] as String?,
          phoneNumber: p['phone_number'] as String?,
          userId: p['user_id'] as String,
        ),
    };
    for (final row in list) {
      row['_student_label'] = labelMap[row['user_id']] ?? (row['user_id'] as String).substring(0, 8);
    }
    return list;
  }

  static Future<void> gradeAnswer({
    required String answerId,
    required num grade,
    String? comment,
  }) async {
    await client
        .from('classe_student_answers')
        .update({
          'teacher_grade': grade,
          'teacher_comment': comment,
          'graded_at': DateTime.now().toIso8601String(),
        })
        .eq('id', answerId);
  }

  static Future<List<Map<String, dynamic>>> fetchAnswerKeys(String level) async {
    final rows = await client
        .from('classe_answer_keys')
        .select()
        .eq('level', level);
    return List<Map<String, dynamic>>.from(rows as List);
  }

  static Future<void> saveAnswerKey(Map<String, dynamic> key) async {
    await client
        .from('classe_answer_keys')
        .upsert(key, onConflict: 'level,module,lesson_id,section_key,question_idx');
  }

  static Future<List<Map<String, dynamic>>> fetchGradeWeights({
    String? level,
    String? module,
  }) async {
    var query = client.from('classe_grade_weights').select();
    if (level != null) query = query.eq('level', level);
    if (module != null) query = query.eq('module', module);
    final rows = await query
        .order('level')
        .order('module')
        .order('lesson_id')
        .order('section_key')
        .order('question_idx');
    return List<Map<String, dynamic>>.from(rows as List);
  }

  static Future<void> saveGradeWeight(Map<String, dynamic> weight) async {
    final user = client.auth.currentUser;
    await client.from('classe_grade_weights').upsert({
      ...weight,
      if (weight['id'] == null) 'created_by': user?.id,
      'updated_by': user?.id,
    }, onConflict: 'level,module,lesson_id,section_key,question_idx');
  }

  static Future<Map<String, dynamic>> fetchGradeOverview() async {
    final results = await Future.wait([
      client.from('tamtam_profiles').select('user_id, display_name, username').limit(500),
      client
          .from('classe_student_answers')
          .select('user_id, level, module, lesson_id, section_key, question_idx, teacher_grade')
          .not('teacher_grade', 'is', null)
          .limit(5000),
      client.from('classe_grade_weights').select(),
    ]);
    final students = List<Map<String, dynamic>>.from(results[0] as List);
    final answers = List<Map<String, dynamic>>.from(results[1] as List);
    final weights = List<Map<String, dynamic>>.from(results[2] as List);

    num weightFor(Map<String, dynamic> a) {
      for (final w in weights) {
        if (w['level'] == a['level'] &&
            w['module'] == a['module'] &&
            w['lesson_id'] == a['lesson_id'] &&
            w['section_key'] == a['section_key'] &&
            w['question_idx'] == a['question_idx']) {
          return (w['weight'] as num?) ?? 1;
        }
      }
      return 1;
    }

    final byStudent = <String, List<Map<String, dynamic>>>{};
    for (final a in answers) {
      byStudent.putIfAbsent(a['user_id'] as String, () => []).add(a);
    }

    final reports = byStudent.entries.map((entry) {
      final uid = entry.key;
      final rows = entry.value;
      final profile = _firstOrNull(students.where((s) => s['user_id'] == uid));
      final byModule = <String, List<Map<String, dynamic>>>{};
      for (final r in rows) {
        final key = '${r['level']}::${r['module']}';
        byModule.putIfAbsent(key, () => []).add(r);
      }
      final moduleAverages = <String, double>{};
      for (final entryMod in byModule.entries) {
        final rs = entryMod.value;
        num sumW = 0, sumWG = 0;
        for (final r in rs) {
          final g = (r['teacher_grade'] as num?);
          if (g == null) continue;
          final w = weightFor(r);
          sumW += w;
          sumWG += g * w;
        }
        if (sumW > 0) moduleAverages[entryMod.key] = sumWG / sumW;
      }
      final globalAvg = moduleAverages.isEmpty
          ? null
          : moduleAverages.values.reduce((a, b) => a + b) / moduleAverages.length;
      return <String, dynamic>{
        'user_id': uid,
        'name': profile?['display_name'] ??
            profile?['username'] ??
            (uid.length >= 8 ? uid.substring(0, 8) : uid),
        'global_average': globalAvg,
        'modules': moduleAverages,
        'total_graded': rows.length,
      };
    }).toList()
      ..sort((a, b) {
        final ga = a['global_average'] as double?;
        final gb = b['global_average'] as double?;
        return (gb ?? 0).compareTo(ga ?? 0);
      });

    final moduleColumns = answers
        .map((a) => '${a['level']}::${a['module']}')
        .toSet()
        .toList()
      ..sort();

    return {'reports': reports, 'moduleColumns': moduleColumns};
  }

  static String appreciationFor(double? grade) {
    if (grade == null) return 'À revoir';
    if (grade >= 18) return 'Excellent';
    if (grade >= 16) return 'Très bien';
    if (grade >= 14) return 'Bien';
    if (grade >= 12) return 'Assez bien';
    if (grade >= 10) return 'Passable';
    if (grade >= 8) return 'Insuffisant';
    return 'À revoir';
  }

  static Future<Map<String, dynamic>> fetchClassStats() async {
    final results = await Future.wait([
      client.from('classe_student_progress').select('level'),
      client.from('classe_student_answers').select('module'),
      client
          .from('classe_student_answers')
          .select('teacher_grade')
          .not('teacher_grade', 'is', null),
    ]);
    final levelCounts = <String, int>{};
    for (final r in List<Map<String, dynamic>>.from(results[0] as List)) {
      final lvl = r['level'] as String? ?? '?';
      levelCounts[lvl] = (levelCounts[lvl] ?? 0) + 1;
    }
    final moduleCounts = <String, int>{};
    for (final r in List<Map<String, dynamic>>.from(results[1] as List)) {
      final mod = r['module'] as String? ?? '?';
      moduleCounts[mod] = (moduleCounts[mod] ?? 0) + 1;
    }
    final grades = List<Map<String, dynamic>>.from(results[2] as List)
        .map((r) => r['teacher_grade'] as num?)
        .whereType<num>()
        .toList();
    final buckets = <String, int>{'0-5': 0, '6-9': 0, '10-12': 0, '13-15': 0, '16-20': 0};
    for (final g in grades) {
      if (g <= 5) {
        buckets['0-5'] = buckets['0-5']! + 1;
      } else if (g <= 9) {
        buckets['6-9'] = buckets['6-9']! + 1;
      } else if (g <= 12) {
        buckets['10-12'] = buckets['10-12']! + 1;
      } else if (g <= 15) {
        buckets['13-15'] = buckets['13-15']! + 1;
      } else {
        buckets['16-20'] = buckets['16-20']! + 1;
      }
    }
    return {
      'levelDistribution': levelCounts,
      'moduleActivity': moduleCounts,
      'gradeDistribution': buckets,
    };
  }

  // ---------------------------------------------------------------------
  // Marché — produits (tamtam_products) et emplois (tamtam_jobs)
  // ---------------------------------------------------------------------

  static Future<List<Map<String, dynamic>>> fetchProducts({
    String? category,
  }) async {
    var query = client.from('tamtam_products').select().eq(
      'is_available',
      true,
    );
    if (category != null && category.isNotEmpty) {
      query = query.eq('category', category);
    }
    final data = await query.order('created_at', ascending: false);
    return List<Map<String, dynamic>>.from(data as List);
  }

  static Future<List<Map<String, dynamic>>> searchProducts(String q) async {
    final term = q.trim();
    if (term.isEmpty) return fetchProducts();
    final data = await client
        .from('tamtam_products')
        .select()
        .eq('is_available', true)
        .or(
          'title_fr.ilike.%$term%,title_ba.ilike.%$term%,'
          'description_text.ilike.%$term%,category.ilike.%$term%',
        )
        .order('created_at', ascending: false)
        .limit(20);
    return List<Map<String, dynamic>>.from(data as List);
  }

  static Future<List<Map<String, dynamic>>> fetchMyProducts() async {
    final user = client.auth.currentUser;
    if (user == null) return const [];
    final data = await client
        .from('tamtam_products')
        .select()
        .eq('seller_id', user.id)
        .order('created_at', ascending: false);
    return List<Map<String, dynamic>>.from(data as List);
  }

  static Future<Map<String, dynamic>> createProduct({
    required String titleFr,
    required double price,
    required String category,
    String? descriptionText,
    String emojiIcon = '🛒',
    Uint8List? photoBytes,
    String photoExtension = 'jpg',
  }) async {
    final user = client.auth.currentUser;
    if (user == null) {
      throw const AuthException('Connexion requise pour publier un produit.');
    }
    String? imageUrl;
    if (photoBytes != null) {
      final ext = photoExtension.toLowerCase();
      final path =
          'products/${user.id}_${DateTime.now().millisecondsSinceEpoch}.$ext';
      await client.storage
          .from('tamtam-media')
          .uploadBinary(
            path,
            photoBytes,
            fileOptions: FileOptions(contentType: 'image/$ext'),
          );
      imageUrl = client.storage.from('tamtam-media').getPublicUrl(path);
    }
    final data = await client
        .from('tamtam_products')
        .insert(<String, dynamic>{
          'seller_id': user.id,
          'title': titleFr,
          'title_fr': titleFr,
          'description_text': descriptionText,
          'price': price,
          'currency': 'XOF',
          'category': category,
          'images': imageUrl == null ? <String>[] : <String>[imageUrl],
          'thumbnail_url': imageUrl,
          'emoji_icon': emojiIcon,
          'is_available': true,
          'status': 'available',
        })
        .select()
        .single();
    return data;
  }

  static Future<void> updateProductStatus({
    required String productId,
    required String status,
  }) async {
    final user = client.auth.currentUser;
    if (user == null) throw const AuthException('Connexion requise.');
    await client
        .from('tamtam_products')
        .update({'status': status, 'is_available': status == 'available'})
        .eq('id', productId)
        .eq('seller_id', user.id);
  }

  static Future<void> deleteProduct(String productId) async {
    final user = client.auth.currentUser;
    if (user == null) throw const AuthException('Connexion requise.');
    await client
        .from('tamtam_products')
        .delete()
        .eq('id', productId)
        .eq('seller_id', user.id);
  }

  static Future<List<Map<String, dynamic>>> fetchJobs({
    required String jobType,
  }) async {
    final data = await client
        .from('tamtam_jobs')
        .select()
        .eq('job_type', jobType)
        .eq('is_active', true)
        .order('created_at', ascending: false);
    return List<Map<String, dynamic>>.from(data as List);
  }

  static Future<List<Map<String, dynamic>>> fetchMyJobs() async {
    final user = client.auth.currentUser;
    if (user == null) return const [];
    final data = await client
        .from('tamtam_jobs')
        .select()
        .eq('employer_id', user.id)
        .order('created_at', ascending: false);
    return List<Map<String, dynamic>>.from(data as List);
  }

  static Future<Map<String, dynamic>> createJob({
    required String titleFr,
    required String jobType,
    required String category,
    String? location,
    String? salaryRange,
    String? descriptionText,
    String emojiIcon = '💼',
  }) async {
    final user = client.auth.currentUser;
    if (user == null) {
      throw const AuthException('Connexion requise pour publier une annonce.');
    }
    final data = await client
        .from('tamtam_jobs')
        .insert(<String, dynamic>{
          'employer_id': user.id,
          'title': titleFr,
          'title_fr': titleFr,
          'description_text': descriptionText,
          'job_type': jobType,
          'category': category,
          'location': location,
          'salary_range': salaryRange,
          'emoji_icon': emojiIcon,
          'urgency': 'normal',
          'is_active': true,
          'availability_status': jobType == 'demand'
              ? 'searching'
              : 'available',
        })
        .select()
        .single();
    return data;
  }

  static Future<void> applyToJob(String jobId) async {
    final user = client.auth.currentUser;
    if (user == null) {
      throw const AuthException('Connexion requise pour postuler.');
    }
    try {
      await client.from('tamtam_job_applications').insert(<String, dynamic>{
        'job_id': jobId,
        'applicant_id': user.id,
        'status': 'pending',
      });
    } on PostgrestException catch (e) {
      if (e.code == '23505') {
        throw StateError('Vous avez déjà postulé à cette offre.');
      }
      rethrow;
    }
  }

  // ---------------------------------------------------------------------
  // Assistant intelligent partagé — Agriculture / Finance / Santé
  // ---------------------------------------------------------------------

  static Future<Map<String, String>> askSmartAssistant({
    required String message,
    required String context,
    List<Map<String, String>> history = const [],
  }) async {
    final response = await client.functions.invoke(
      'smart-assistant',
      body: {
        'message': message.trim(),
        'context': context,
        'conversationHistory': history,
      },
    );
    final data = response.data;
    if (data is! Map) {
      throw StateError('Réponse de l’assistant invalide.');
    }
    final fr =
        data['response_fr']?.toString().trim() ??
        data['response']?.toString().trim() ??
        '';
    final ba = data['response_ba']?.toString().trim() ?? '';
    return {'fr': fr, 'ba': ba};
  }

  // ---------------------------------------------------------------------
  // Paramètres & Profil — préférences, confidentialité, avatar, bio audio
  // ---------------------------------------------------------------------

  static Future<Map<String, dynamic>> fetchPreferences() async {
    final user = client.auth.currentUser;
    if (user == null) return const {};
    final row = await client
        .from('tamtam_profiles')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();
    final prefs = row?['preferences'];
    return prefs is Map ? Map<String, dynamic>.from(prefs) : <String, dynamic>{};
  }

  static Future<Map<String, dynamic>> updatePreferences(
    Map<String, dynamic> partial,
  ) async {
    final user = client.auth.currentUser;
    if (user == null) throw const AuthException('Connexion requise.');
    final current = await fetchPreferences();
    final merged = {...current, ...partial};
    await client
        .from('tamtam_profiles')
        .update({
          'preferences': merged,
          'updated_at': DateTime.now().toIso8601String(),
        })
        .eq('user_id', user.id);
    return merged;
  }

  static Future<Map<String, dynamic>> fetchPrivacy() async {
    final user = client.auth.currentUser;
    if (user == null) return const {};
    final row = await client
        .from('tamtam_profiles')
        .select('privacy')
        .eq('user_id', user.id)
        .maybeSingle();
    final privacy = row?['privacy'];
    return privacy is Map ? Map<String, dynamic>.from(privacy) : <String, dynamic>{};
  }

  static Future<Map<String, dynamic>> updatePrivacy(
    Map<String, dynamic> partial,
  ) async {
    final user = client.auth.currentUser;
    if (user == null) throw const AuthException('Connexion requise.');
    final current = await fetchPrivacy();
    final merged = {...current, ...partial};
    await client
        .from('tamtam_profiles')
        .update({
          'privacy': merged,
          'updated_at': DateTime.now().toIso8601String(),
        })
        .eq('user_id', user.id);
    return merged;
  }

  static Future<String> uploadAvatar({
    required Uint8List bytes,
    required String extension,
    required String contentType,
  }) async {
    final user = client.auth.currentUser;
    if (user == null) throw const AuthException('Connexion requise.');
    final path = 'avatars/${user.id}_${DateTime.now().millisecondsSinceEpoch}.$extension';
    await client.storage
        .from('tamtam-media')
        .uploadBinary(path, bytes, fileOptions: FileOptions(contentType: contentType, upsert: true));
    final url = client.storage.from('tamtam-media').getPublicUrl(path);
    await client
        .from('tamtam_profiles')
        .update({'avatar_url': url, 'updated_at': DateTime.now().toIso8601String()})
        .eq('user_id', user.id);
    return url;
  }

  static Future<String> uploadBioAudio({
    required Uint8List bytes,
    required String contentType,
    required int durationSeconds,
  }) async {
    final user = client.auth.currentUser;
    if (user == null) throw const AuthException('Connexion requise.');
    final extension = contentType.contains('mp4') ? 'm4a' : 'wav';
    final path = 'bio/${user.id}_${DateTime.now().millisecondsSinceEpoch}.$extension';
    await client.storage
        .from('tamtam-audio')
        .uploadBinary(path, bytes, fileOptions: FileOptions(contentType: contentType, upsert: true));
    final url = client.storage.from('tamtam-audio').getPublicUrl(path);
    await client
        .from('tamtam_profiles')
        .update({'bio_audio_url': url, 'updated_at': DateTime.now().toIso8601String()})
        .eq('user_id', user.id);
    return url;
  }

  static Future<void> updatePassword(String newPassword) async {
    await client.auth.updateUser(UserAttributes(password: newPassword));
  }

  /// Exporte les données personnelles de l'utilisateur (RGPD) sous forme de
  /// Map prête à être sérialisée en JSON côté UI (FitilaBackend n'écrit
  /// aucun fichier lui-même — c'est à l'appelant de le sauvegarder/partager).
  static Future<Map<String, dynamic>> exportMyData() async {
    final user = client.auth.currentUser;
    if (user == null) throw const AuthException('Connexion requise.');
    final results = await Future.wait([
      client.from('tamtam_profiles').select().eq('user_id', user.id).maybeSingle(),
      client.from('translation_history').select().eq('user_id', user.id),
      client.from('learning_progress').select().eq('user_id', user.id).maybeSingle(),
      client.from('learning_session_log').select().eq('user_id', user.id),
    ]);
    return {
      'exported_at': DateTime.now().toIso8601String(),
      'profile': results[0],
      'translation_history': results[1],
      'learning_progress': results[2],
      'learning_sessions': results[3],
    };
  }

  static Future<void> requestAccountDeletion({String? reason}) async {
    final user = client.auth.currentUser;
    if (user == null) throw const AuthException('Connexion requise.');
    await client.from('account_deletion_requests').insert({
      'user_id': user.id,
      'reason': reason,
    });
  }

  // ---------------------------------------------------------------------
  // Traducteur IA — historique & favoris
  // ---------------------------------------------------------------------

  static Future<Map<String, dynamic>> saveTranslationHistory({
    required String sourceLang,
    required String targetLang,
    required String sourceText,
    required String translatedText,
    String mode = 'texte',
  }) async {
    final user = client.auth.currentUser;
    if (user == null) throw const AuthException('Connexion requise.');
    final data = await client
        .from('translation_history')
        .insert({
          'user_id': user.id,
          'source_lang': sourceLang,
          'target_lang': targetLang,
          'source_text': sourceText,
          'translated_text': translatedText,
          'mode': mode,
        })
        .select()
        .single();
    return data;
  }

  static Future<List<Map<String, dynamic>>> fetchTranslationHistory({
    bool favoritesOnly = false,
    String? search,
    int limit = 100,
  }) async {
    final user = client.auth.currentUser;
    if (user == null) return const [];
    var query = client.from('translation_history').select().eq('user_id', user.id);
    if (favoritesOnly) query = query.eq('is_favorite', true);
    if (search != null && search.trim().isNotEmpty) {
      query = query.or(
        'source_text.ilike.%${search.trim()}%,translated_text.ilike.%${search.trim()}%',
      );
    }
    final rows = await query.order('created_at', ascending: false).limit(limit);
    return List<Map<String, dynamic>>.from(rows as List);
  }

  static Future<void> toggleTranslationFavorite(String id, bool value) async {
    await client.from('translation_history').update({'is_favorite': value}).eq('id', id);
  }

  static Future<void> deleteTranslationHistoryEntry(String id) async {
    await client.from('translation_history').delete().eq('id', id);
  }

  // ---------------------------------------------------------------------
  // Espace Enseignant — correction avec audio (personnalisé / générique)
  // ---------------------------------------------------------------------

  static Future<void> gradeAnswerWithAudio({
    required String answerId,
    required num grade,
    String? comment,
    Uint8List? personalAudioBytes,
    Uint8List? genericAudioBytes,
    String contentType = 'audio/m4a',
    int? personalDurationSeconds,
    int? genericDurationSeconds,
  }) async {
    final updates = <String, dynamic>{
      'teacher_grade': grade,
      'teacher_comment': comment,
      'graded_at': DateTime.now().toIso8601String(),
    };
    final extension = contentType.contains('mp4') || contentType.contains('m4a') ? 'm4a' : 'wav';
    if (personalAudioBytes != null) {
      final path = 'corrections/personal_${answerId}_${DateTime.now().millisecondsSinceEpoch}.$extension';
      await client.storage
          .from('tamtam-audio')
          .uploadBinary(path, personalAudioBytes, fileOptions: FileOptions(contentType: contentType, upsert: true));
      updates['teacher_audio_personal_path'] = path;
      updates['teacher_audio_personal_duration'] = personalDurationSeconds;
    }
    if (genericAudioBytes != null) {
      final path = 'corrections/generic_${answerId}_${DateTime.now().millisecondsSinceEpoch}.$extension';
      await client.storage
          .from('tamtam-audio')
          .uploadBinary(path, genericAudioBytes, fileOptions: FileOptions(contentType: contentType, upsert: true));
      updates['teacher_audio_generic_path'] = path;
      updates['teacher_audio_generic_duration'] = genericDurationSeconds;
    }
    await client.from('classe_student_answers').update(updates).eq('id', answerId);
  }

  // ---------------------------------------------------------------------
  // Module Apprendre — progression, maîtrise, historique, badges
  // ---------------------------------------------------------------------

  static Future<Map<String, dynamic>> fetchLearningProgress() async {
    final user = client.auth.currentUser;
    if (user == null) {
      return {
        'xp': 0,
        'streak_days': 0,
        'current_direction': 'fr_to_bariba',
        'words_mastered': 0,
        'perfect_scores': 0,
      };
    }
    final row = await client
        .from('learning_progress')
        .select()
        .eq('user_id', user.id)
        .maybeSingle();
    if (row != null) return row;
    return {
      'user_id': user.id,
      'xp': 0,
      'streak_days': 0,
      'current_direction': 'fr_to_bariba',
      'words_mastered': 0,
      'perfect_scores': 0,
    };
  }

  static Future<List<Map<String, dynamic>>> fetchThemeMastery() async {
    final user = client.auth.currentUser;
    if (user == null) return const [];
    final rows = await client
        .from('learning_theme_mastery')
        .select()
        .eq('user_id', user.id);
    return List<Map<String, dynamic>>.from(rows as List);
  }

  static Future<List<Map<String, dynamic>>> fetchLearningHistory({int limit = 30}) async {
    final user = client.auth.currentUser;
    if (user == null) return const [];
    final rows = await client
        .from('learning_session_log')
        .select()
        .eq('user_id', user.id)
        .order('created_at', ascending: false)
        .limit(limit);
    return List<Map<String, dynamic>>.from(rows as List);
  }

  /// Enregistre le résultat d'une session d'exercices (QCM ou prononciation),
  /// met à jour XP/série/maîtrise par thème, journalise l'historique, et
  /// tente de débloquer les badges correspondants. Retourne un résumé
  /// {xpEarned, newStreak, unlockedBadges} pour l'écran de résultat.
  static Future<Map<String, dynamic>> recordLearningSession({
    required String sessionType, // 'exercise' | 'classe_lesson' | 'pronunciation'
    String? themeKey,
    String? lessonRef,
    String? direction,
    required int correctCount,
    required int totalCount,
  }) async {
    final user = client.auth.currentUser;
    if (user == null) throw const AuthException('Connexion requise.');
    final isPerfect = totalCount > 0 && correctCount == totalCount;
    final xpEarned = (correctCount * 8) + (isPerfect ? 20 : 0);

    // 1. Progression XP + série
    final existing = await client
        .from('learning_progress')
        .select()
        .eq('user_id', user.id)
        .maybeSingle();
    final today = DateTime.now();
    final todayKey = DateTime(today.year, today.month, today.day);
    int newStreak = 1;
    if (existing != null) {
      final lastActive = existing['last_active_date'] as String?;
      if (lastActive != null) {
        final last = DateTime.tryParse(lastActive);
        if (last != null) {
          final lastKey = DateTime(last.year, last.month, last.day);
          final diffDays = todayKey.difference(lastKey).inDays;
          if (diffDays == 0) {
            newStreak = (existing['streak_days'] as int? ?? 1);
          } else if (diffDays == 1) {
            newStreak = (existing['streak_days'] as int? ?? 0) + 1;
          } else {
            newStreak = 1;
          }
        }
      }
    }
    final newXp = (existing?['xp'] as int? ?? 0) + xpEarned;
    final newPerfectScores = (existing?['perfect_scores'] as int? ?? 0) + (isPerfect ? 1 : 0);
    await client.from('learning_progress').upsert({
      'user_id': user.id,
      'xp': newXp,
      'streak_days': newStreak,
      'last_active_date': todayKey.toIso8601String().split('T').first,
      if (direction != null) 'current_direction': direction,
      'perfect_scores': newPerfectScores,
    });

    // 2. Maîtrise du thème
    if (themeKey != null) {
      final themeRow = await client
          .from('learning_theme_mastery')
          .select()
          .eq('user_id', user.id)
          .eq('theme_key', themeKey)
          .maybeSingle();
      final newCorrect = (themeRow?['correct_count'] as int? ?? 0) + correctCount;
      final newTotal = (themeRow?['total_count'] as int? ?? 0) + totalCount;
      await client.from('learning_theme_mastery').upsert({
        'user_id': user.id,
        'theme_key': themeKey,
        'correct_count': newCorrect,
        'total_count': newTotal,
      }, onConflict: 'user_id,theme_key');
    }

    // 3. Historique
    await client.from('learning_session_log').insert({
      'user_id': user.id,
      'session_type': sessionType,
      'theme_or_lesson_ref': themeKey ?? lessonRef,
      'direction': direction,
      'correct_count': correctCount,
      'total_count': totalCount,
      'xp_earned': xpEarned,
    });

    // 4. Compteurs unifiés (profil apprenant) + badges
    final unlocked = await _bumpAchievementsAndCheckBadges(
      lessonsCompletedDelta: sessionType == 'classe_lesson' ? 1 : 0,
      streakDays: newStreak,
      perfectScoresDelta: isPerfect ? 1 : 0,
    );

    return {
      'xpEarned': xpEarned,
      'newStreak': newStreak,
      'newXp': newXp,
      'unlockedBadges': unlocked,
    };
  }

  static Future<List<Map<String, dynamic>>> _bumpAchievementsAndCheckBadges({
    int lessonsCompletedDelta = 0,
    int? streakDays,
    int perfectScoresDelta = 0,
  }) async {
    final user = client.auth.currentUser;
    if (user == null) return const [];
    final existing = await client
        .from('user_achievements')
        .select()
        .eq('user_id', user.id)
        .maybeSingle();
    final lessonsCompleted = (existing?['lessons_completed'] as int? ?? 0) + lessonsCompletedDelta;
    final perfectScores = (existing?['perfect_scores'] as int? ?? 0) + perfectScoresDelta;
    final streak = streakDays ?? (existing?['learning_streak_days'] as int? ?? 0);
    await client.from('user_achievements').upsert({
      'user_id': user.id,
      'lessons_completed': lessonsCompleted,
      'learning_streak_days': streak,
      'perfect_scores': perfectScores,
    });
    return checkAndUnlockLearningBadges();
  }

  /// Compare les compteurs d'apprentissage de l'utilisateur aux exigences
  /// des badges définis en base, et débloque automatiquement ceux atteints.
  /// Retourne la liste des badges nouvellement débloqués.
  static Future<List<Map<String, dynamic>>> checkAndUnlockLearningBadges() async {
    final user = client.auth.currentUser;
    if (user == null) return const [];
    const learningRequirementTypes = [
      'lessons_completed',
      'learning_streak_days',
      'words_mastered',
      'perfect_scores',
      'themes_completed',
    ];
    final results = await Future.wait([
      client.from('user_achievements').select().eq('user_id', user.id).maybeSingle(),
      client.from('badges').select().filter('requirement_type', 'in', '(${learningRequirementTypes.join(',')})'),
      client.from('user_badges').select('badge_id').eq('user_id', user.id),
    ]);
    final achievements = results[0] as Map<String, dynamic>?;
    if (achievements == null) return const [];
    final badges = List<Map<String, dynamic>>.from(results[1] as List);
    final alreadyUnlocked = (results[2] as List).map((r) => r['badge_id']).toSet();

    final newlyUnlocked = <Map<String, dynamic>>[];
    for (final badge in badges) {
      if (alreadyUnlocked.contains(badge['id'])) continue;
      final reqType = badge['requirement_type'] as String;
      final reqValue = badge['requirement_value'] as int? ?? 0;
      final current = achievements[reqType] as int? ?? 0;
      if (current >= reqValue) {
        try {
          await client.from('user_badges').insert({
            'user_id': user.id,
            'badge_id': badge['id'],
          });
          newlyUnlocked.add(badge);
        } on PostgrestException catch (e) {
          if (e.code != '23505') rethrow;
        }
      }
    }
    return newlyUnlocked;
  }

  static Future<Map<String, dynamic>> fetchLearnerBadges() async {
    final user = client.auth.currentUser;
    if (user == null) return const {'unlocked': [], 'locked': []};
    final results = await Future.wait([
      client.from('badges').select(),
      client.from('user_badges').select('badge_id, earned_at').eq('user_id', user.id),
    ]);
    final allBadges = List<Map<String, dynamic>>.from(results[0] as List);
    final userBadges = List<Map<String, dynamic>>.from(results[1] as List);
    final unlockedIds = {for (final b in userBadges) b['badge_id']: b['earned_at']};
    final unlocked = <Map<String, dynamic>>[];
    final locked = <Map<String, dynamic>>[];
    for (final badge in allBadges) {
      if (unlockedIds.containsKey(badge['id'])) {
        unlocked.add({...badge, 'earned_at': unlockedIds[badge['id']]});
      } else {
        locked.add(badge);
      }
    }
    return {'unlocked': unlocked, 'locked': locked};
  }

  // ───────────────────────────────────────────────────────────────
  // Sagesse Battle — défi proverbe quotidien (réponse texte réelle,
  // scoring local côté client, fil communautaire des réponses).
  // Le XP/série/badges passent par recordLearningSession (thème
  // 'proverbes'), déjà utilisé par le module Apprendre.
  // ───────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> submitBattleResponse({
    required String challengeId,
    required String promptBariba,
    required String promptFrancais,
    required String answerText,
    required int score,
    required int xpAwarded,
  }) async {
    final user = client.auth.currentUser;
    if (user == null) throw const AuthException('Connexion requise.');
    final profile = await client
        .from('tamtam_profiles')
        .select('display_name, username, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();
    final data = await client
        .from('battle_responses')
        .insert({
          'user_id': user.id,
          'challenge_id': challengeId,
          'prompt_bariba': promptBariba,
          'prompt_francais': promptFrancais,
          'answer_text': answerText.trim(),
          'score': score,
          'xp_awarded': xpAwarded,
        })
        .select()
        .single();
    return {
      ...data,
      'display_name':
          profile?['display_name'] ?? profile?['username'] ?? 'Griot Fitila',
      'avatar_url': profile?['avatar_url'],
    };
  }

  static Future<List<Map<String, dynamic>>> fetchBattleChain({
    String? challengeId,
    int limit = 30,
  }) async {
    final rows = challengeId == null
        ? await client
              .from('battle_responses')
              .select()
              .order('created_at', ascending: false)
              .limit(limit)
        : await client
              .from('battle_responses')
              .select()
              .eq('challenge_id', challengeId)
              .order('created_at', ascending: false)
              .limit(limit);
    final responses = List<Map<String, dynamic>>.from(rows as List);
    final userIds = responses.map((r) => r['user_id'] as String).toSet().toList();
    if (userIds.isEmpty) return responses;
    final profiles = await client
        .from('tamtam_profiles')
        .select('user_id, username, display_name, avatar_url')
        .filter('user_id', 'in', '(${userIds.join(",")})');
    final profileMap = <String, Map<String, dynamic>>{
      for (final p in List<Map<String, dynamic>>.from(profiles as List))
        p['user_id'] as String: p,
    };
    return responses.map((row) {
      final profile = profileMap[row['user_id']];
      return {
        ...row,
        'display_name': profile?['display_name']?.toString().trim().isNotEmpty ==
                true
            ? profile!['display_name']
            : (profile?['username'] ?? 'Griot Fitila'),
        'avatar_url': profile?['avatar_url'],
      };
    }).toList(growable: false);
  }

  static Future<Map<String, dynamic>> fetchMyBattleStats() async {
    final user = client.auth.currentUser;
    if (user == null) {
      return const {'attempts': 0, 'total_xp': 0, 'wins': 0, 'history': []};
    }
    final rows = await client
        .from('battle_responses')
        .select('score, xp_awarded, challenge_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', ascending: false);
    final list = List<Map<String, dynamic>>.from(rows as List);
    final totalXp = list.fold<int>(
      0,
      (sum, r) => sum + ((r['xp_awarded'] as num?)?.toInt() ?? 0),
    );
    final wins = list.where((r) => ((r['score'] as num?)?.toInt() ?? 0) >= 80).length;
    return {
      'attempts': list.length,
      'total_xp': totalXp,
      'wins': wins,
      'history': list,
    };
  }

  // ───────────────────────────────────────────────────────────────
  // Sasara IA — traduction bilingue (réutilise FitilaServices.translate
  // / ai-translate) + corpus communautaire strictement opt-in.
  // ───────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> saveCorpusContribution({
    required String sourceLang,
    required String targetLang,
    required String sourceText,
    required String translatedText,
    String? audioUrl,
  }) async {
    final user = client.auth.currentUser;
    if (user == null) throw const AuthException('Connexion requise.');
    final data = await client
        .from('corpus_contributions')
        .insert({
          'user_id': user.id,
          'source_lang': sourceLang,
          'target_lang': targetLang,
          'source_text': sourceText.trim(),
          'translated_text': translatedText.trim(),
          'audio_url': audioUrl,
        })
        .select()
        .single();
    return Map<String, dynamic>.from(data);
  }

  static Future<int> fetchCorpusContributionCount() async {
    final user = client.auth.currentUser;
    if (user == null) return 0;
    final rows = await client
        .from('corpus_contributions')
        .select('id')
        .eq('user_id', user.id);
    return List.from(rows as List).length;
  }

  // ───────────────────────────────────────────────────────────────
  // Handunia Wasa — vision 10-15 ans, non fonctionnelle aujourd'hui.
  // Seul geste réel : enregistrer l'intérêt de l'utilisateur dans ses
  // préférences déjà existantes, pour une future priorisation produit.
  // ───────────────────────────────────────────────────────────────
  static Future<void> registerHanduniaWasaInterest(bool interested) async {
    await updatePreferences({'handunia_wasa_interested': interested});
  }
}
