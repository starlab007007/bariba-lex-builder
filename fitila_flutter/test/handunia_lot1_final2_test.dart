import 'package:fitila_native/handunia/handunia_consultation_routes.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Handunia Lot 1 final2 memory prompts are visible', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      const MaterialApp(home: HanduniaMemoryAnswerRoute()),
    );
    await tester.pump();

    expect(find.text('Comment ?'), findsNothing);
    expect(find.text('Quand ?'), findsNothing);
    expect(find.text('Qui ?'), findsNothing);
    expect(find.bySemanticsLabel('Comment ?'), findsOneWidget);
    expect(find.bySemanticsLabel('Quand ?'), findsOneWidget);
    expect(find.bySemanticsLabel('Qui ?'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Handunia Lot 1 final2 timeline selection works', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      const MaterialApp(
        home: HanduniaTimelineRoute(
          lieuId: 'nikki',
          initialPeriods: <Map<String, dynamic>>[
            <String, dynamic>{
              'label': 'Avant 1960',
              'memory_count': 1,
              'voice_count': 2,
            },
            <String, dynamic>{
              'label': '1960–1979',
              'memory_count': 0,
              'voice_count': 0,
            },
            <String, dynamic>{
              'label': '1980–1999',
              'memory_count': 2,
              'voice_count': 3,
            },
            <String, dynamic>{
              'label': '2000–2019',
              'memory_count': 1,
              'voice_count': 1,
            },
            <String, dynamic>{
              'label': 'Depuis 2020',
              'memory_count': 0,
              'voice_count': 0,
            },
          ],
        ),
      ),
    );
    await tester.pump();

    await tester.tap(find.text('1960–1979'));
    await tester.pump();

    expect(find.text('Aucune voix'), findsOneWidget);
    expect(find.text('PARLER'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
