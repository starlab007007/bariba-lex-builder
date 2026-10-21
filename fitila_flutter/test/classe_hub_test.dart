import 'package:fitila_native/classe/classe_content.dart';
import 'package:fitila_native/classe/classe_hub.dart';
import 'package:fitila_native/classe/classe_session.dart';
import 'package:fitila_native/classe/classe_store.dart';
import 'package:fitila_native/core/signature_theme.dart';
import 'package:fitila_native/core/web_parity_models.dart';
import 'package:fitila_native/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final width in [320.0, 390.0, 900.0]) {
    testWidgets('every Classe section opens without errors at ${width.toInt()}dp', (tester) async {
      tester.view.physicalSize = Size(width, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final lessons = (await tester.runAsync(WebClasseContent.loadLessons))!;
      final content = (await tester.runAsync(ClasseContent.load))!;
      ClasseContent.debugSet(content);
      addTearDown(() => ClasseContent.debugSet(null));
      final session = ClasseSession(store: MemoryClasseStore(), saveDelay: const Duration(milliseconds: 1));
      addTearDown(session.dispose);

      Future<void> settle() async {
        for (var i = 0; i < 6; i++) {
          await tester.pump(const Duration(milliseconds: 120));
        }
      }

      for (final level in ['N1', 'N2']) {
        final key = GlobalKey();
        await tester.pumpWidget(
          MaterialApp(
            theme: SignatureTheme.light(),
            home: Scaffold(body: Padding(padding: const EdgeInsets.all(12), child: ClasseHub(key: key, session: session, initialLessons: lessons))),
          ),
        );
        await settle();
        if (level == 'N2') {
          await tester.tap(find.textContaining('Niveau 2'));
          await settle();
        }
        expect(tester.takeException(), isNull, reason: 'home $level');

        // Ouvre chaque tuile de section puis revient.
        final tiles = find.byIcon(Icons.chevron_right_rounded).evaluate().length;
        expect(tiles, greaterThanOrEqualTo(6));
        for (var i = 0; i < tiles; i++) {
          final chevrons = find.byIcon(Icons.chevron_right_rounded);
          await tester.ensureVisible(chevrons.at(i));
          await tester.tap(chevrons.at(i), warnIfMissed: false);
          await settle();
          expect(tester.takeException(), isNull, reason: '$level section #$i');
          final back = find.byTooltip('Retour');
          if (back.evaluate().isNotEmpty) {
            await tester.tap(back.first);
            await settle();
          }
        }
      }
    });
  }

  testWidgets('ouvrir une leçon demande une connexion si ensureSignedIn est fourni et refusée', (tester) async {
    final lessons = (await tester.runAsync(WebClasseContent.loadLessons))!;
    final content = (await tester.runAsync(ClasseContent.load))!;
    ClasseContent.debugSet(content);
    addTearDown(() => ClasseContent.debugSet(null));
    final session = ClasseSession(store: MemoryClasseStore(), saveDelay: const Duration(milliseconds: 1));
    addTearDown(session.dispose);

    Future<void> settle() async {
      for (var i = 0; i < 6; i++) {
        await tester.pump(const Duration(milliseconds: 120));
      }
    }

    var calls = 0;
    String? lastReason;
    await tester.pumpWidget(
      MaterialApp(
        theme: SignatureTheme.light(),
        home: Scaffold(
          body: ClasseHub(
            session: session,
            initialLessons: lessons,
            ensureSignedIn: (context, {required reason}) async {
              calls++;
              lastReason = reason;
              return false; // le visiteur annule la connexion
            },
          ),
        ),
      ),
    );
    await settle();

    // Entre dans la section "Leçons" (première tuile) puis tape la première leçon.
    await tester.tap(find.byIcon(Icons.chevron_right_rounded).first, warnIfMissed: false);
    await settle();
    expect(tester.takeException(), isNull);

    final firstLesson = lessons.firstWhere((l) => l.level == 'N1');
    await tester.ensureVisible(find.byKey(ValueKey('classe-lesson-${firstLesson.id}')));
    await tester.tap(find.byKey(ValueKey('classe-lesson-${firstLesson.id}')), warnIfMissed: false);
    await settle();

    expect(calls, 1, reason: 'ensureSignedIn doit être appelé une seule fois');
    expect(lastReason, isNotNull);
    // Refusé : on reste sur la liste des leçons, jamais sur le détail.
    expect(find.byKey(const ValueKey('lesson-text')), findsNothing);
    expect(find.byKey(ValueKey('classe-lesson-${firstLesson.id}')), findsOneWidget);
  });

  testWidgets('ouvrir une leçon réussit quand ensureSignedIn accepte', (tester) async {
    final lessons = (await tester.runAsync(WebClasseContent.loadLessons))!;
    final content = (await tester.runAsync(ClasseContent.load))!;
    ClasseContent.debugSet(content);
    addTearDown(() => ClasseContent.debugSet(null));
    final session = ClasseSession(store: MemoryClasseStore(), saveDelay: const Duration(milliseconds: 1));
    addTearDown(session.dispose);

    Future<void> settle() async {
      for (var i = 0; i < 6; i++) {
        await tester.pump(const Duration(milliseconds: 120));
      }
    }

    await tester.pumpWidget(
      MaterialApp(
        theme: SignatureTheme.light(),
        home: Scaffold(
          body: ClasseHub(
            session: session,
            initialLessons: lessons,
            ensureSignedIn: (context, {required reason}) async => true,
          ),
        ),
      ),
    );
    await settle();

    await tester.tap(find.byIcon(Icons.chevron_right_rounded).first, warnIfMissed: false);
    await settle();
    expect(tester.takeException(), isNull);

    final firstLesson = lessons.firstWhere((l) => l.level == 'N1');
    await tester.ensureVisible(find.byKey(ValueKey('classe-lesson-${firstLesson.id}')));
    await tester.tap(find.byKey(ValueKey('classe-lesson-${firstLesson.id}')), warnIfMissed: false);
    await settle();

    expect(tester.takeException(), isNull);
    // Accepté : le détail de la leçon s'affiche.
    expect(find.byKey(const ValueKey('lesson-text')), findsOneWidget);
  });

  testWidgets('FitilaSession.guest() est bien un visiteur sans jeton', (tester) async {
    final guest = FitilaSession.guest();
    expect(guest.isGuest, isTrue);
    expect(guest.accessToken, isEmpty);
    final signedIn = const FitilaSession(userId: 'u1', phone: '+229', displayName: 'A', role: 'member', accessToken: 'tok');
    expect(signedIn.isGuest, isFalse);
  });
}
