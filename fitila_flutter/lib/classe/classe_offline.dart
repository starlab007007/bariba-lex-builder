import 'dart:typed_data';

import '../core/offline.dart';
import 'classe_store.dart';

Map<String, dynamic> answerToRow(StudentAnswer a) => {
  if (a.id != null) 'id': a.id,
  'level': a.level,
  'module': a.module,
  'lesson_id': a.lessonId,
  'section_key': a.sectionKey,
  'question_idx': a.questionIdx,
  'answer_text': a.text,
  'field_data': a.fieldData,
  'answer_audio_path': a.audioPath,
  'answer_audio_duration': a.audioDuration,
  'teacher_grade': a.teacherGrade,
  'teacher_comment': a.teacherComment,
  'graded_at': a.gradedAt?.toIso8601String(),
  'teacher_audio_personal_path': a.teacherAudioPersonalPath,
  'teacher_audio_generic_path': a.teacherAudioGenericPath,
  'submitted_at': a.submittedAt?.toIso8601String(),
};

Map<String, dynamic> progressToRow(ClasseProgress p) => {
  'completed_lessons': p.completedLessons.toList()..sort(),
  'lesson_stars': p.lessonStars,
  'tabs_completed': p.tabsCompleted,
  'last_lesson_id': p.lastLessonId,
  'theme_badges': p.themeBadges,
  'extra_data': p.extra,
  'evaluation_best': p.evaluationBest,
};

ClasseProgress progressFromRow(Map<String, dynamic> row) => ClasseProgress(
  completedLessons: {for (final e in (row['completed_lessons'] as List? ?? const [])) (e as num).toInt()},
  lessonStars: {for (final e in ((row['lesson_stars'] as Map?) ?? const {}).entries) e.key.toString(): (e.value as num).toInt()},
  tabsCompleted: {for (final e in ((row['tabs_completed'] as Map?) ?? const {}).entries) e.key.toString(): e.value == true},
  lastLessonId: (row['last_lesson_id'] as num?)?.toInt(),
  themeBadges: [for (final b in (row['theme_badges'] as List? ?? const [])) b.toString()],
  extra: ((row['extra_data'] as Map?) ?? const {}).cast<String, dynamic>(),
  evaluationBest: {for (final e in ((row['evaluation_best'] as Map?) ?? const {}).entries) e.key.toString(): (e.value as num).toInt()},
);

/// Décore un [ClasseStore] réseau : toute lecture a une copie locale, toute écriture est
/// gardée localement puis envoyée dès que le réseau revient.
class OfflineClasseStore implements ClasseStore {
  OfflineClasseStore(this.inner);

  final ClasseStore inner;

  @override
  String? get userId => inner.userId;

  String get _uid => userId ?? '_';

  /// Rejeu des écritures en attente (à appeler une fois au démarrage).
  static void registerHandlers(ClasseStore Function() makeStore) {
    FitilaOffline.register('classe_answer', (p) async {
      final store = makeStore();
      if (store.userId != p['uid']) return;
      await store.saveAnswer(StudentAnswer.fromJson(Map<String, dynamic>.from(p['row'] as Map)));
    });
    FitilaOffline.register('classe_progress', (p) async {
      final store = makeStore();
      if (store.userId != p['uid']) return;
      await store.saveProgress(p['level'] as String, progressFromRow(Map<String, dynamic>.from(p['row'] as Map)));
    });
    FitilaOffline.register('classe_eval', (p) async {
      final store = makeStore();
      if (store.userId != p['uid']) return;
      await store.saveEvaluationResult(p['level'] as String, p['evaluationId'] as String, p['score'] as int);
    });
  }

  String _answersKey(String level, String module, String lessonId) => 'classe:answers:$_uid:$level:$module:$lessonId';

  @override
  Future<Map<String, StudentAnswer>> loadAnswers({required String level, required String module, required String lessonId}) async {
    final key = _answersKey(level, module, lessonId);
    final local = await FitilaOffline.getJson<Map<String, dynamic>>(key) ?? const {};
    Future<Map<String, StudentAnswer>> fromLocal() async => {for (final e in local.entries) e.key: StudentAnswer.fromJson(Map<String, dynamic>.from(e.value as Map))};
    return offlineFirst<Map<String, StudentAnswer>>(() async {
      final remote = await inner.loadAnswers(level: level, module: module, lessonId: lessonId);
      // Les réponses écrites hors-ligne et pas encore envoyées priment.
      final pendingSlots = await FitilaOffline.getJson<List<dynamic>>('$key:pending') ?? const [];
      final merged = {...remote};
      for (final slot in pendingSlots) {
        final l = local[slot];
        if (l != null) merged[slot as String] = StudentAnswer.fromJson(Map<String, dynamic>.from(l as Map));
      }
      await FitilaOffline.putJson(key, {for (final e in merged.entries) e.key: answerToRow(e.value)});
      return merged;
    }, fromLocal);
  }

  @override
  Future<StudentAnswer> saveAnswer(StudentAnswer a) async {
    if (userId == null) throw StateError('Connectez-vous pour enregistrer vos réponses.');
    final key = _answersKey(a.level, a.module, a.lessonId);
    final local = Map<String, dynamic>.from(await FitilaOffline.getJson<Map<String, dynamic>>(key) ?? const {});
    Future<void> remember(StudentAnswer saved, {required bool pending}) async {
      local[saved.slot] = answerToRow(saved);
      await FitilaOffline.putJson(key, local);
      final slots = {...(await FitilaOffline.getJson<List<dynamic>>('$key:pending') ?? const []).cast<String>()};
      pending ? slots.add(saved.slot) : slots.remove(saved.slot);
      await FitilaOffline.putJson('$key:pending', slots.toList());
    }

    try {
      final saved = await inner.saveAnswer(a);
      await remember(saved, pending: false);
      FitilaOffline.reportSuccess();
      return saved;
    } catch (e) {
      if (!FitilaOffline.isNetworkError(e)) rethrow;
      FitilaOffline.reportFailure(e);
      final prev = local[a.slot] == null ? null : StudentAnswer.fromJson(Map<String, dynamic>.from(local[a.slot] as Map));
      final offline = StudentAnswer(
        id: prev?.id,
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
        submittedAt: DateTime.now(),
      );
      await remember(offline, pending: true);
      await FitilaOffline.enqueue(
        'classe_answer',
        {'uid': userId, 'row': answerToRow(offline)},
        dedupeKey: 'answer:${a.level}:${a.module}:${a.lessonId}:${a.slot}',
      );
      return offline;
    }
  }

  @override
  Future<Map<String, AnswerKey>> loadAnswerKeys({required String level, required String module, required String lessonId}) async {
    final key = 'classe:keys:$level:$module:$lessonId';
    return offlineFirst<Map<String, AnswerKey>>(() async {
      final keys = await inner.loadAnswerKeys(level: level, module: module, lessonId: lessonId);
      await FitilaOffline.putJson(key, {
        for (final e in keys.entries) e.key: {'accepted_answers': e.value.accepted, 'explanation': e.value.explanation, 'teacher_audio_path': e.value.audioPath},
      });
      return keys;
    }, () async {
      final c = await FitilaOffline.getJson<Map<String, dynamic>>(key) ?? const {};
      return {for (final e in c.entries) e.key: AnswerKey.fromJson(Map<String, dynamic>.from(e.value as Map))};
    });
  }

  @override
  Future<String> uploadVoice({required String subpath, required Uint8List bytes, required String contentType}) async {
    try {
      final path = await inner.uploadVoice(subpath: subpath, bytes: bytes, contentType: contentType);
      FitilaOffline.reportSuccess();
      return path;
    } catch (e) {
      if (FitilaOffline.isNetworkError(e)) {
        FitilaOffline.reportFailure(e);
        throw StateError('Hors connexion : la réponse vocale nécessite Internet. Écrivez votre réponse, elle sera envoyée plus tard.');
      }
      rethrow;
    }
  }

  @override
  Future<String?> signedUrl(String bucket, String path) => inner.signedUrl(bucket, path);

  @override
  Future<ClasseProgress> loadProgress(String level) async {
    final key = 'classe:progress:$_uid:$level';
    return offlineFirst<ClasseProgress>(() async {
      final remote = await inner.loadProgress(level);
      final pending = await FitilaOffline.getJson<Map<String, dynamic>>('$key:pending');
      final result = pending != null ? progressFromRow(pending) : remote;
      await FitilaOffline.putJson(key, progressToRow(result));
      return result.copyWith(evaluationBest: {...remote.evaluationBest, ...result.evaluationBest});
    }, () async {
      final c = await FitilaOffline.getJson<Map<String, dynamic>>(key);
      return c == null ? const ClasseProgress() : progressFromRow(c);
    });
  }

  @override
  Future<void> saveProgress(String level, ClasseProgress progress) async {
    if (userId == null) return;
    final key = 'classe:progress:$_uid:$level';
    final row = progressToRow(progress);
    await FitilaOffline.putJson(key, row);
    try {
      await inner.saveProgress(level, progress);
      await FitilaOffline.removeJson('$key:pending');
      FitilaOffline.reportSuccess();
    } catch (e) {
      if (!FitilaOffline.isNetworkError(e)) rethrow;
      FitilaOffline.reportFailure(e);
      await FitilaOffline.putJson('$key:pending', row);
      await FitilaOffline.enqueue('classe_progress', {'uid': userId, 'level': level, 'row': row}, dedupeKey: 'progress:$_uid:$level');
    }
  }

  @override
  Future<List<StudentAnswer>> loadGraded() async {
    final key = 'classe:graded:$_uid';
    return offlineFirst<List<StudentAnswer>>(() async {
      final r = await inner.loadGraded();
      await FitilaOffline.putJson(key, [for (final a in r) answerToRow(a)]);
      return r;
    }, () async {
      final c = await FitilaOffline.getJson<List<dynamic>>(key) ?? const [];
      return [for (final e in c) StudentAnswer.fromJson(Map<String, dynamic>.from(e as Map))];
    });
  }

  @override
  Future<int> pendingCount() async {
    final key = 'classe:pendingCount:$_uid';
    return offlineFirst<int>(() async {
      final n = await inner.pendingCount();
      await FitilaOffline.putJson(key, n);
      return n;
    }, () async => await FitilaOffline.getJson<int>(key) ?? 0);
  }

  @override
  Future<void> saveEvaluationResult(String level, String evaluationId, int scorePct, {Map<String, dynamic>? details}) async {
    if (userId == null) return;
    try {
      await inner.saveEvaluationResult(level, evaluationId, scorePct, details: details);
      FitilaOffline.reportSuccess();
    } catch (e) {
      if (!FitilaOffline.isNetworkError(e)) rethrow;
      FitilaOffline.reportFailure(e);
      await FitilaOffline.enqueue('classe_eval', {'uid': userId, 'level': level, 'evaluationId': evaluationId, 'score': scorePct});
    }
  }
}
