import 'package:fitila_native/handunia/handunia_creation_ai_route.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Lumiere IA creation keeps human voice as source', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      const MaterialApp(
        home: HanduniaAiCreationRoute(
          lieu: <String, dynamic>{'id': 'nikki', 'name': 'Nikki'},
          voiceCount: 34,
        ),
      ),
    );
    await tester.pump();

    expect(find.text('TISSER PAR LA VOIX'), findsOneWidget);
    expect(find.text('ÊTRE GUIDÉ PAR LUMIÈRE IA'), findsOneWidget);
    expect(
      find.textContaining('Votre voix reste la source.'),
      findsOneWidget,
    );
    expect(find.byIcon(Icons.light_mode_outlined), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
  testWidgets('Lumiere IA remains readable with larger text', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      const MaterialApp(
        home: MediaQuery(
          data: MediaQueryData(
            textScaler: TextScaler.linear(1.25),
          ),
          child: HanduniaAiCreationRoute(
            lieu: <String, dynamic>{'id': 'nikki', 'name': 'Nikki'},
            voiceCount: 34,
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('TISSER PAR LA VOIX'), findsOneWidget);
    expect(find.text('ÊTRE GUIDÉ PAR LUMIÈRE IA'), findsOneWidget);
    expect(find.text('Collecte humaine'), findsWidgets);
    expect(tester.takeException(), isNull);
  });

}
