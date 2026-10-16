import 'dart:typed_data';

import 'package:fitila_native/classe/classe_offline.dart';
import 'package:fitila_native/classe/classe_store.dart';
import 'package:fitila_native/core/offline.dart';
import 'package:fitila_native/core/signature_theme.dart';
import 'package:fitila_native/main.dart';
import 'package:fitila_native/ui/offline_banner.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class _Net implements Exception {
  @override
  String toString() => 'SocketException: Failed host lookup';
}

/// Store distant simulé : coupé ou non.
class _FakeRemote implements ClasseStore {
  bool down = false;
  final answers = <String, StudentAnswer>{};
  final progress = <String, ClasseProgress>{};

  void _check() {
    if (down) throw _Net();
  }

  @override
  String? get userId => 'u1';

  @override
  Future<StudentAnswer> saveAnswer(StudentAnswer a) async {
    _check();
    final saved = StudentAnswer(id: 'srv-${answers.length}', level: a.level, module: a.module, lessonId: a.lessonId, sectionKey: a.sectionKey, questionIdx: a.questionIdx, text: a.text);
    answers[a.slot] = saved;
    return saved;
  }

  @override
  Future<Map<String, StudentAnswer>> loadAnswers({required String level, required String module, required String lessonId}) async {
    _check();
    return Map.of(answers);
  }

  @override
  Future<Map<String, AnswerKey>> loadAnswerKeys({required String level, required String module, required String lessonId}) async {
    _check();
    return {'reagis|0': const AnswerKey(accepted: ['tii'], explanation: 'ok')};
  }

  @override
  Future<ClasseProgress> loadProgress(String level) async {
    _check();
    return progress[level] ?? const ClasseProgress();
  }

  @override
  Future<void> saveProgress(String level, ClasseProgress p) async {
    _check();
    progress[level] = p;
  }

  @override
  Future<String> uploadVoice({required String subpath, required Uint8List bytes, required String contentType}) async {
    _check();
    return 'u1/x.m4a';
  }

  @override
  Future<String?> signedUrl(String bucket, String path) async => null;

  @override
  Future<List<StudentAnswer>> loadGraded() async {
    _check();
    return [];
  }

  @override
  Future<int> pendingCount() async {
    _check();
    return 0;
  }

  @override
  Future<void> saveEvaluationResult(String level, String evaluationId, int scorePct, {Map<String, dynamic>? details}) async {
    _check();
  }
}

class _ThrowingClient extends http.BaseClient {
  int calls = 0;
  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    calls++;
    throw _Net();
  }
}

void main() {
  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    await FitilaOffline.resetForTest();
  });

  test('isNetworkError recognises connectivity failures only', () {
    expect(FitilaOffline.isNetworkError(_Net()), isTrue);
    expect(FitilaOffline.isNetworkError(StateError('AuthRetryableFetchException(message: x)')), isTrue);
    expect(FitilaOffline.isNetworkError(StateError('permission denied')), isFalse);
  });

  test('cache JSON round-trips and offlineFirst falls back to it', () async {
    await FitilaOffline.putJson('k', {'a': 1});
    expect(await FitilaOffline.getJson<Map<String, dynamic>>('k'), {'a': 1});
    final v = await offlineFirst<String>(() async => throw _Net(), () async => 'cache');
    expect(v, 'cache');
    expect(FitilaOffline.online.value, isFalse);
    FitilaOffline.online.value = true;
    expect(() => offlineFirst<String>(() async => throw StateError('refus'), () async => 'cache'), throwsStateError);
  });

  test('outbox merges, replays in order, stops on network failure and keeps the rest', () async {
    final seen = <String>[];
    var fail = true;
    FitilaOffline.register('prefs', (p) async {
      if (fail) throw _Net();
      seen.add('prefs:${p.keys.toList()..sort()}');
    });
    FitilaOffline.register('note', (p) async => seen.add('note:${p['n']}'));
    await FitilaOffline.enqueue('prefs', {'a': true}, dedupeKey: 'prefs', merge: true);
    await FitilaOffline.enqueue('note', {'n': 1});
    await FitilaOffline.enqueue('prefs', {'b': false}, dedupeKey: 'prefs', merge: true);
    expect(FitilaOffline.pending.value, 2);

    expect(await FitilaOffline.flush(), 0);
    expect(FitilaOffline.pending.value, 2, reason: 'nothing lost while offline');
    expect(FitilaOffline.online.value, isFalse);

    fail = false;
    expect(await FitilaOffline.flush(), 2);
    expect(seen, ['prefs:[a, b]', 'note:1']);
    expect(FitilaOffline.pending.value, 0);
    expect(FitilaOffline.online.value, isTrue);
  });

  test('a server refusal is retried a few times then dropped', () async {
    FitilaOffline.register('bad', (p) async => throw StateError('refus'));
    await FitilaOffline.enqueue('bad', {});
    for (var i = 0; i < 5; i++) {
      await FitilaOffline.flush();
    }
    expect(FitilaOffline.pending.value, 0);
  });

  test('Classe store: answers written offline are kept, shown, then synced', () async {
    final remote = _FakeRemote();
    final store = OfflineClasseStore(remote);
    OfflineClasseStore.registerHandlers(() => remote);

    remote.down = true;
    const a = StudentAnswer(level: 'N1', module: 'lesson', lessonId: '1', sectionKey: 'reagis', questionIdx: 0, text: 'Tii dobonu');
    final saved = await store.saveAnswer(a);
    expect(saved.text, 'Tii dobonu');
    expect(FitilaOffline.pending.value, 1);
    final read = await store.loadAnswers(level: 'N1', module: 'lesson', lessonId: '1');
    expect(read['reagis|0']!.text, 'Tii dobonu', reason: 'visible offline');

    await store.saveProgress('N1', const ClasseProgress(completedLessons: {1, 2}));
    expect((await store.loadProgress('N1')).completedLessons, {1, 2});
    await expectLater(store.uploadVoice(subpath: 's', bytes: Uint8List(1), contentType: 'audio/mp4'), throwsA(isA<StateError>()));

    remote.down = false;
    expect(await FitilaOffline.flush(), 2);
    expect(remote.answers['reagis|0']!.text, 'Tii dobonu');
    expect(remote.progress['N1']!.completedLessons, {1, 2});
    expect(FitilaOffline.pending.value, 0);
  });

  test('Classe answer keys are served from cache when the network drops', () async {
    final remote = _FakeRemote();
    final store = OfflineClasseStore(remote);
    expect((await store.loadAnswerKeys(level: 'N1', module: 'lesson', lessonId: '1')).length, 1);
    remote.down = true;
    final keys = await store.loadAnswerKeys(level: 'N1', module: 'lesson', lessonId: '1');
    expect(keys['reagis|0']!.accepted, ['tii']);
  });

  test('translation works offline from the embedded dictionary without touching the network', () async {
    TestWidgetsFlutterBinding.ensureInitialized();
    FitilaOffline.online.value = false;
    final client = _ThrowingClient();
    final entries = await FitilaServices.loadDictionary();
    final e = entries.firstWhere((x) => !x.word.contains(' ') && x.definition.length < 25 && !x.definition.contains(' '));
    final out = await FitilaServices.translate(e.word, TranslationDirection.baribaToFrench, accessToken: 'tok', client: client);
    expect(out, isNotEmpty);
    expect(client.calls, 0);
  });

  testWidgets('offline banner shows only when offline or pending', (tester) async {
    await tester.pumpWidget(MaterialApp(theme: SignatureTheme.light(), home: const Scaffold(body: OfflineBanner())));
    expect(find.byKey(const ValueKey('offline-banner')), findsNothing);
    FitilaOffline.online.value = false;
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.textContaining('Hors connexion'), findsOneWidget);
    FitilaOffline.pending.value = 2;
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.textContaining('2 modifications'), findsOneWidget);
  });
}
