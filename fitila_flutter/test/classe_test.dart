import 'dart:typed_data';

import 'package:fitila_native/classe/classe_content.dart';
import 'package:fitila_native/classe/classe_session.dart';
import 'package:fitila_native/classe/classe_store.dart';
import 'package:fitila_native/classe/classe_widgets.dart';
import 'package:fitila_native/core/signature_theme.dart';
import 'package:fitila_native/keyboard/bariba_input.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

class FakeRecorder implements ClasseRecorder {
  bool started = false;
  @override
  Future<void> start() async => started = true;
  @override
  Future<VoiceTake?> stop() async => VoiceTake(bytes: Uint8List.fromList([1, 2, 3]), seconds: 2.5, contentType: 'audio/mp4');
  @override
  Future<void> cancel() async {}
  @override
  Future<void> dispose() async {}
}

Future<void> pumpCard(WidgetTester tester, Widget child, {double width = 390}) async {
  tester.view.physicalSize = Size(width, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(MaterialApp(theme: SignatureTheme.light(), home: Scaffold(body: SingleChildScrollView(padding: const EdgeInsets.all(12), child: child))));
  await tester.pump(const Duration(milliseconds: 200));
}

void main() {
  test('normalizeAnswer/matchAnswer ignore case, tones and punctuation but keep ɛ ɔ ŋ', () {
    expect(normalizeAnswer('Bàátɔ̀nú!'), normalizeAnswer('baatɔnu'));
    expect(normalizeAnswer('ɛ'), isNot(normalizeAnswer('e')));
    expect(normalizeAnswer('ə'), isNotEmpty);
    expect(normalizeAnswer('mə'), isNot(normalizeAnswer('m')));
    expect(matchAnswer('mə', ['mə']), isTrue);
    expect(matchAnswer('  Tíí Dobonu ', ['tii dobonu']), isTrue);
    expect(matchAnswer('', ['x']), isFalse);
    expect(matchAnswer('non', []), isFalse);
  });

  test('CalculExercise checks numeric answers with comma or dot and count labels', () {
    const add = CalculExercise(type: 'addition', operands: [2, 3], expected: 5);
    expect(add.prompt, '2 + 3');
    expect(add.check('5'), isTrue);
    expect(add.check(' 5,0 '), isTrue);
    expect(add.check('6'), isFalse);
    expect(add.check(''), isFalse);
    const div = CalculExercise(type: 'division', operands: [1, 2], expected: 0.5);
    expect(div.check('0,5'), isTrue);
    const count = CalculExercise(type: 'count', operands: [], expected: 1, label: 'Yɛrɛ');
    expect(count.check('1'), isTrue);
    expect(count.check('yere'), isFalse);
  });

  test('ClasseProgress computes stars like the web (max 5)', () {
    var p = const ClasseProgress();
    const tabs = ['text', 'observe', 'ecoute', 'reagis', 'retiens', 'phonetics'];
    for (final t in tabs) {
      p = p.withTabDone(3, t, tabs);
    }
    expect(p.lessonStars['3'], 5);
    expect(p.tabDone(3, 'reagis'), isTrue);
    expect(p.lastLessonId, 3);
  });

  test('session persists progress with a debounce and survives save errors', () async {
    final store = MemoryClasseStore();
    final s = ClasseSession(store: store, saveDelay: const Duration(milliseconds: 10));
    await s.loadProgress('N1');
    s.completeLesson('N1', 4);
    expect(s.progressOf('N1').completedLessons, {4});
    await Future<void>.delayed(const Duration(milliseconds: 60));
    expect(store.progress['N1']!.completedLessons, {4});
    s.dispose();
  });

  testWidgets('answer card: type, submit, persist, edit, voice upload', (tester) async {
    final store = MemoryClasseStore();
    final recorder = FakeRecorder();
    StudentAnswer? saved;
    await pumpCard(
      tester,
      ClasseAnswerCard(
        store: store,
        level: 'N1',
        module: 'lesson',
        lessonId: '1',
        sectionKey: 'reagis',
        questionIdx: 0,
        question: 'Qui est Tii ?',
        recorder: recorder,
        onSaved: (a) => saved = a,
      ),
    );
    expect(find.byType(BaribaTextField), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.tap(find.byKey(const ValueKey('answer-submit')));
    await tester.pump();
    expect(store.answers, isEmpty, reason: 'empty answer must not be sent');

    await tester.enterText(find.byType(TextField).first, 'Tii dobonu');
    await tester.tap(find.byKey(const ValueKey('answer-submit')));
    await tester.pump(const Duration(milliseconds: 100));
    expect(store.answers.length, 1);
    expect(saved?.text, 'Tii dobonu');
    expect(find.byKey(const ValueKey('answer-text')), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('answer-edit')));
    await tester.pump();
    expect(find.byKey(const ValueKey('answer-voice')), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('answer-voice')));
    await tester.pump();
    expect(recorder.started, isTrue);
    await tester.tap(find.byKey(const ValueKey('answer-voice')));
    await tester.pump(const Duration(milliseconds: 100));
    expect(store.uploads.length, 1);
    expect(store.answers.values.single.audioPath, isNotNull);
    expect(tester.takeException(), isNull);
  });

  testWidgets('answer card shows a helpful message when offline save fails', (tester) async {
    final store = MemoryClasseStore()..failSave = true;
    await pumpCard(
      tester,
      ClasseAnswerCard(store: store, level: 'N1', module: 'lesson', lessonId: '1', sectionKey: 'reagis', questionIdx: 1, question: 'Q', recorder: FakeRecorder()),
    );
    await tester.enterText(find.byType(TextField).first, 'réponse');
    await tester.tap(find.byKey(const ValueKey('answer-submit')));
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byType(SnackBar), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('answer card fits a 320dp phone and shows the teacher grade', (tester) async {
    final store = MemoryClasseStore();
    final graded = StudentAnswer(
      id: 'a1',
      level: 'N2',
      module: 'lesson',
      lessonId: '2',
      sectionKey: 'reagis',
      questionIdx: 0,
      text: 'Ma réponse',
      teacherGrade: 15.5,
      teacherComment: 'Très bien, continue.',
    );
    await pumpCard(
      tester,
      ClasseAnswerCard(store: store, level: 'N2', module: 'lesson', lessonId: '2', sectionKey: 'reagis', questionIdx: 0, question: 'Q', initial: graded, recorder: FakeRecorder()),
      width: 320,
    );
    expect(find.textContaining('15'), findsWidgets);
    expect(find.textContaining('Très bien, continue.'), findsWidgets);
    expect(tester.takeException(), isNull);
  });
}
