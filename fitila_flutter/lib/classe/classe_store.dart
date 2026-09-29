
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/fitila_backend.dart';

/// Réponse d'un apprenant (ligne `classe_student_answers`).
@immutable
class StudentAnswer {
  const StudentAnswer({
    required this.level,
    required this.module,
    required this.lessonId,
    required this.sectionKey,
    required this.questionIdx,
    this.id,
    this.text,
    this.fieldData,
    this.audioPath,
    this.audioDuration,
    this.teacherGrade,
    this.teacherComment,
    this.gradedAt,
    this.teacherAudioPersonalPath,
    this.teacherAudioGenericPath,
    this.submittedAt,
  });

  final String? id;
  final String level;
  final String module;
  final String lessonId;
  final String sectionKey;
  final int questionIdx;
  final String? text;
  final Map<String, dynamic>? fieldData;
  final String? audioPath;
  final double? audioDuration;
  final double? teacherGrade;
  final String? teacherComment;
  final DateTime? gradedAt;
  final String? teacherAudioPersonalPath;
  final String? teacherAudioGenericPath;
  final DateTime? submittedAt;

  bool get graded => teacherGrade != null;
  bool get hasContent => (text?.trim().isNotEmpty ?? false) || audioPath != null;
  String get slot => '$sectionKey|$questionIdx';

  factory StudentAnswer.fromJson(Map<String, dynamic> j) => StudentAnswer(
    id: j['id'] as String?,
    level: (j['level'] as String?) ?? 'N1',
    module: (j['module'] as String?) ?? 'lesson',
    lessonId: (j['lesson_id'] ?? '').toString(),
    sectionKey: (j['section_key'] as String?) ?? '',
    questionIdx: (j['question_idx'] as num?)?.toInt() ?? 0,
    text: j['answer_text'] as String?,
    fieldData: j['field_data'] is Map ? (j['field_data'] as Map).cast<String, dynamic>() : null,
    audioPath: j['answer_audio_path'] as String?,
    audioDuration: (j['answer_audio_duration'] as num?)?.toDouble(),
    teacherGrade: (j['teacher_grade'] as num?)?.toDouble(),
    teacherComment: j['teacher_comment'] as String?,
    gradedAt: DateTime.tryParse((j['graded_at'] as String?) ?? ''),
    teacherAudioPersonalPath: j['teacher_audio_personal_path'] as String?,
    teacherAudioGenericPath: j['teacher_audio_generic_path'] as String?,
    submittedAt: DateTime.tryParse((j['submitted_at'] as String?) ?? ''),
  );
}

/// Corrigé enseignant (ligne `classe_answer_keys`).
@immutable
class AnswerKey {
  const AnswerKey({required this.accepted, this.explanation, this.audioPath});

  final List<String> accepted;
  final String? explanation;
  final String? audioPath;

  factory AnswerKey.fromJson(Map<String, dynamic> j) => AnswerKey(
    accepted: [for (final a in (j['accepted_answers'] as List? ?? const [])) a.toString()],
    explanation: j['explanation'] as String?,
    audioPath: j['teacher_audio_path'] as String?,
  );
}

/// Progression d'un niveau (ligne `classe_student_progress`), même format que le web :
/// `tabs_completed = {"lesson_3_observe": true}`, `lesson_stars = {"3": 2}`.
@immutable
class ClasseProgress {
  const ClasseProgress({
    this.completedLessons = const {},
    this.lessonStars = const {},
    this.tabsCompleted = const {},
    this.lastLessonId,
    this.themeBadges = const [],
    this.extra = const {},
    this.evaluationBest = const {},
  });

  final Set<int> completedLessons;
  final Map<String, int> lessonStars;
  final Map<String, bool> tabsCompleted;
  final int? lastLessonId;
  final List<String> themeBadges;
  final Map<String, dynamic> extra;

  /// Évaluation -> meilleur score (%), lu dans `classe_evaluation_results`.
  final Map<String, int> evaluationBest;

  bool tabDone(int lessonId, String tab) => tabsCompleted['lesson_${lessonId}_$tab'] == true;

  ClasseProgress copyWith({
    Set<int>? completedLessons,
    Map<String, int>? lessonStars,
    Map<String, bool>? tabsCompleted,
    int? lastLessonId,
    Map<String, int>? evaluationBest,
  }) => ClasseProgress(
    completedLessons: completedLessons ?? this.completedLessons,
    lessonStars: lessonStars ?? this.lessonStars,
    tabsCompleted: tabsCompleted ?? this.tabsCompleted,
    lastLessonId: lastLessonId ?? this.lastLessonId,
    themeBadges: themeBadges,
    extra: extra,
    evaluationBest: evaluationBest ?? this.evaluationBest,
  );

  /// Marque un onglet terminé et recalcule les étoiles (max 5), comme le web.
  ClasseProgress withTabDone(int lessonId, String tab, List<String> activeTabs) {
    final tabs = {...tabsCompleted, 'lesson_${lessonId}_$tab': true};
    final done = activeTabs.where((t) => tabs['lesson_${lessonId}_$t'] == true).length;
    return copyWith(tabsCompleted: tabs, lessonStars: {...lessonStars, '$lessonId': done > 5 ? 5 : done}, lastLessonId: lessonId);
  }
}

/// Accès données de la Classe. `SupabaseClasseStore` en production,
/// `MemoryClasseStore` pour les tests.
abstract class ClasseStore {
  String? get userId;

  Future<Map<String, StudentAnswer>> loadAnswers({required String level, required String module, required String lessonId});

  Future<StudentAnswer> saveAnswer(StudentAnswer answer);

  Future<Map<String, AnswerKey>> loadAnswerKeys({required String level, required String module, required String lessonId});

  /// Envoie une réponse vocale et renvoie le chemin de stockage.
  Future<String> uploadVoice({required String subpath, required Uint8List bytes, required String contentType});

  Future<String?> signedUrl(String bucket, String path);

  Future<ClasseProgress> loadProgress(String level);

  Future<void> saveProgress(String level, ClasseProgress progress);

  /// Toutes les réponses corrigées de l'apprenant.
  Future<List<StudentAnswer>> loadGraded();

  Future<int> pendingCount();

  /// Enregistre un résultat d'évaluation (meilleur score et tentatives conservés).
  Future<void> saveEvaluationResult(String level, String evaluationId, int scorePct, {Map<String, dynamic>? details});
}

class SupabaseClasseStore implements ClasseStore {
  SupabaseClasseStore([SupabaseClient? client]) : _client = client;

  final SupabaseClient? _client;
  SupabaseClient get _db => _client ?? FitilaBackend.client;

  @override
  String? get userId => FitilaBackend.configured ? _db.auth.currentUser?.id : null;

  @override
  Future<Map<String, StudentAnswer>> loadAnswers({required String level, required String module, required String lessonId}) async {
    final uid = userId;
    if (uid == null) {
      return {};
    }
    final rows = await _db.from('classe_student_answers').select().eq('user_id', uid).eq('level', level).eq('module', module).eq('lesson_id', lessonId);
    return {
      for (final r in rows) StudentAnswer.fromJson(r).slot: StudentAnswer.fromJson(r),
    };
  }

  @override
  Future<StudentAnswer> saveAnswer(StudentAnswer a) async {
    final uid = userId;
    if (uid == null) {
      throw StateError('Connectez-vous pour enregistrer vos réponses.');
    }
    final row = await _db
        .from('classe_student_answers')
        .upsert({
          'user_id': uid,
          'level': a.level,
          'module': a.module,
          'lesson_id': a.lessonId,
          'section_key': a.sectionKey,
          'question_idx': a.questionIdx,
          'answer_text': a.text,
          'field_data': a.fieldData,
          'answer_audio_path': a.audioPath,
          'answer_audio_duration': a.audioDuration,
          'submitted_at': DateTime.now().toUtc().toIso8601String(),
        }, onConflict: 'user_id,level,module,lesson_id,section_key,question_idx')
        .select()
        .single();
    return StudentAnswer.fromJson(row);
  }

  @override
  Future<Map<String, AnswerKey>> loadAnswerKeys({required String level, required String module, required String lessonId}) async {
    final rows = await _db.from('classe_answer_keys').select().eq('level', level).eq('module', module).eq('lesson_id', lessonId);
    return {
      for (final r in rows) '${r['section_key'] ?? ''}|${r['question_idx'] ?? 0}': AnswerKey.fromJson(r),
    };
  }

  @override
  Future<String> uploadVoice({required String subpath, required Uint8List bytes, required String contentType}) async {
    final uid = userId;
    if (uid == null) {
      throw StateError('Connectez-vous pour envoyer un message vocal.');
    }
    final ext = contentType.contains('mp4') || contentType.contains('m4a') || contentType.contains('aac') ? 'm4a' : 'webm';
    // Le premier dossier doit être l'identifiant de l'utilisateur (politique de stockage).
    final path = '$uid/$subpath/${DateTime.now().millisecondsSinceEpoch}.$ext';
    await _db.storage.from('classe-answers-audio').uploadBinary(path, bytes, fileOptions: FileOptions(contentType: contentType, upsert: true));
    return path;
  }

  @override
  Future<String?> signedUrl(String bucket, String path) async {
    try {
      return await _db.storage.from(bucket).createSignedUrl(path, 3600);
    } catch (_) {
      return null;
    }
  }

  @override
  Future<ClasseProgress> loadProgress(String level) async {
    final uid = userId;
    if (uid == null) {
      return const ClasseProgress();
    }
    final row = await _db.from('classe_student_progress').select().eq('user_id', uid).eq('level', level).maybeSingle();
    final results = await _db.from('classe_evaluation_results').select('evaluation_id,best_score').eq('user_id', uid).eq('level', level);
    final best = {for (final r in results) r['evaluation_id'].toString(): (r['best_score'] as num?)?.round() ?? 0};
    if (row == null) {
      return ClasseProgress(evaluationBest: best);
    }
    final tabs = (row['tabs_completed'] as Map?) ?? const {};
    final stars = (row['lesson_stars'] as Map?) ?? const {};
    return ClasseProgress(
      completedLessons: {for (final e in (row['completed_lessons'] as List? ?? const [])) (e as num).toInt()},
      lessonStars: {for (final e in stars.entries) e.key.toString(): (e.value as num).toInt()},
      tabsCompleted: {for (final e in tabs.entries) e.key.toString(): e.value == true},
      lastLessonId: (row['last_lesson_id'] as num?)?.toInt(),
      themeBadges: [for (final b in (row['theme_badges'] as List? ?? const [])) b.toString()],
      extra: ((row['extra_data'] as Map?) ?? const {}).cast<String, dynamic>(),
      evaluationBest: best,
    );
  }

  @override
  Future<void> saveProgress(String level, ClasseProgress p) async {
    final uid = userId;
    if (uid == null) {
      return;
    }
    await _db.from('classe_student_progress').upsert({
      'user_id': uid,
      'level': level,
      'completed_lessons': p.completedLessons.toList()..sort(),
      'lesson_stars': p.lessonStars,
      'tabs_completed': p.tabsCompleted,
      'last_lesson_id': p.lastLessonId,
      'theme_badges': p.themeBadges,
      'extra_data': p.extra,
    }, onConflict: 'user_id,level');
  }

  @override
  Future<void> saveEvaluationResult(String level, String evaluationId, int scorePct, {Map<String, dynamic>? details}) async {
    final uid = userId;
    if (uid == null) {
      return;
    }
    final existing = await _db
        .from('classe_evaluation_results')
        .select('best_score,attempts')
        .eq('user_id', uid)
        .eq('level', level)
        .eq('evaluation_id', evaluationId)
        .maybeSingle();
    final best = ((existing?['best_score'] as num?)?.toInt() ?? 0);
    await _db.from('classe_evaluation_results').upsert({
      'user_id': uid,
      'level': level,
      'evaluation_id': evaluationId,
      'score': scorePct,
      'best_score': scorePct > best ? scorePct : best,
      'max_score': 100,
      'attempts': ((existing?['attempts'] as num?)?.toInt() ?? 0) + 1,
      'details': details,
      'completed_at': DateTime.now().toUtc().toIso8601String(),
    }, onConflict: 'user_id,level,evaluation_id');
  }

  @override
  Future<List<StudentAnswer>> loadGraded() async {
    final uid = userId;
    if (uid == null) {
      return const [];
    }
    final rows = await _db.from('classe_student_answers').select().eq('user_id', uid).not('teacher_grade', 'is', null).order('graded_at', ascending: false).limit(500);
    return [for (final r in rows) StudentAnswer.fromJson(r)];
  }

  @override
  Future<int> pendingCount() async {
    final uid = userId;
    if (uid == null) {
      return 0;
    }
    final res = await _db.from('classe_student_answers').select('id').eq('user_id', uid).isFilter('teacher_grade', null).count(CountOption.exact);
    return res.count;
  }
}

/// Implémentation en mémoire (tests, mode démo).
class MemoryClasseStore implements ClasseStore {
  MemoryClasseStore({this.userId = 'test-user'});

  @override
  final String? userId;

  final Map<String, StudentAnswer> answers = {};
  final Map<String, AnswerKey> keys = {};
  final Map<String, ClasseProgress> progress = {};
  final List<String> uploads = [];
  bool failSave = false;

  String _k(StudentAnswer a) => '${a.level}|${a.module}|${a.lessonId}|${a.slot}';

  @override
  Future<Map<String, StudentAnswer>> loadAnswers({required String level, required String module, required String lessonId}) async => {
    for (final a in answers.values)
      if (a.level == level && a.module == module && a.lessonId == lessonId) a.slot: a,
  };

  @override
  Future<StudentAnswer> saveAnswer(StudentAnswer a) async {
    if (failSave) {
      throw StateError('réseau indisponible');
    }
    final prev = answers[_k(a)];
    final saved = StudentAnswer(
      id: prev?.id ?? 'id-${answers.length + 1}',
      level: a.level,
      module: a.module,
      lessonId: a.lessonId,
      sectionKey: a.sectionKey,
      questionIdx: a.questionIdx,
      text: a.text,
      fieldData: a.fieldData,
      audioPath: a.audioPath ?? prev?.audioPath,
      audioDuration: a.audioDuration ?? prev?.audioDuration,
      teacherGrade: prev?.teacherGrade,
      teacherComment: prev?.teacherComment,
      gradedAt: prev?.gradedAt,
      submittedAt: DateTime.now(),
    );
    answers[_k(a)] = saved;
    return saved;
  }

  @override
  Future<Map<String, AnswerKey>> loadAnswerKeys({required String level, required String module, required String lessonId}) async => keys;

  @override
  Future<String> uploadVoice({required String subpath, required Uint8List bytes, required String contentType}) async {
    final path = '$userId/$subpath/${uploads.length}.m4a';
    uploads.add(path);
    return path;
  }

  @override
  Future<String?> signedUrl(String bucket, String path) async => 'https://example.test/$bucket/$path';

  @override
  Future<ClasseProgress> loadProgress(String level) async => progress[level] ?? const ClasseProgress();

  @override
  Future<void> saveProgress(String level, ClasseProgress p) async => progress[level] = p;

  @override
  Future<List<StudentAnswer>> loadGraded() async => [for (final a in answers.values) if (a.graded) a];

  @override
  Future<int> pendingCount() async => answers.values.where((a) => !a.graded).length;

  final Map<String, int> evaluations = {};

  @override
  Future<void> saveEvaluationResult(String level, String evaluationId, int scorePct, {Map<String, dynamic>? details}) async {
    final k = '$level|$evaluationId';
    if (scorePct > (evaluations[k] ?? -1)) evaluations[k] = scorePct;
  }
}
