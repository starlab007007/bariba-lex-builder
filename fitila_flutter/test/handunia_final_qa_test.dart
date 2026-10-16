import 'package:fitila_native/handunia/handunia_consultation_routes.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Handunia final QA keeps living-map labels readable', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      const MaterialApp(
        home: MediaQuery(
          data: MediaQueryData(textScaler: TextScaler.linear(1.25)),
          child: HanduniaLivingMapRoute(
            initialPlaces: <Map<String, dynamic>>[
              <String, dynamic>{
                'id': 'caravanes',
                'name': 'Chemin des caravanes',
                'voice_count': 0,
              },
              <String, dynamic>{
                'id': 'nikki',
                'name': 'Nikki ancien marché',
                'voice_count': 7,
              },
              <String, dynamic>{
                'id': 'biro',
                'name': 'Biro',
                'voice_count': 2,
              },
            ],
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Carte vivante'), findsOneWidget);
    expect(find.textContaining('0 lieu'), findsNothing);
    expect(find.text('Chemin des caravanes'), findsNothing);
    expect(find.textContaining('0 voix'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Handunia final QA trace auto-validates and returns', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final result = ValueNotifier<String>('idle');
    addTearDown(result.dispose);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => Column(
              children: [
                ElevatedButton(
                  key: const Key('open-trace-final-qa'),
                  onPressed: () async {
                    final completed = await Navigator.of(context).push<bool>(
                      MaterialPageRoute<bool>(
                        builder: (_) => HanduniaTraceRoute(
                          fragmentId: 'fragment-final-qa',
                          completionDelay: const Duration(milliseconds: 80),
                          saveOverride: (points, capturedAt) async {},
                        ),
                      ),
                    );
                    result.value = completed == true ? 'trace-ok' : 'trace-cancel';
                  },
                  child: const Text('Ouvrir tracer'),
                ),
                ValueListenableBuilder<String>(
                  valueListenable: result,
                  builder: (context, value, child) => Text(value),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.byKey(const Key('open-trace-final-qa')));
    await tester.pumpAndSettle();

    expect(
      find.text('Dessinez le trajet puis relâchez votre doigt pour valider.'),
      findsOneWidget,
    );

    await tester.timedDragFrom(
      const Offset(95, 310),
      const Offset(170, 190),
      const Duration(milliseconds: 260),
    );
    await tester.pump();

    expect(find.text('Trajet validé'), findsOneWidget);
    expect(
      find.text('Trajet validé · étape suivante automatique…'),
      findsOneWidget,
    );

    await tester.pump(const Duration(milliseconds: 140));
    await tester.pumpAndSettle();

    expect(find.text('trace-ok'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
