import 'package:fitila_native/classe/classe_content.dart';
import 'package:fitila_native/classe/classe_hub.dart';
import 'package:fitila_native/classe/classe_session.dart';
import 'package:fitila_native/classe/classe_store.dart';
import 'package:fitila_native/core/signature_theme.dart';
import 'package:fitila_native/core/web_parity_models.dart';
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
}
