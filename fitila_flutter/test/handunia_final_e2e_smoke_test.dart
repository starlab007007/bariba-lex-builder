import 'package:fitila_native/handunia/handunia_consultation_routes.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Handunia map keeps names readable including zero-voice places', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      const MaterialApp(
        home: MediaQuery(
          data: MediaQueryData(textScaler: TextScaler.linear(1.20)),
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
                'voice_count': 6,
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

    expect(find.text('Chemin des caravanes'), findsWidgets);
    expect(find.text('Nikki ancien marché'), findsOneWidget);
    expect(find.text('Biro'), findsOneWidget);
    expect(find.text('0 voix'), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Handunia trace validates and returns automatically', (
    tester,
  ) async {
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
                  key: const Key('open-trace'),
                  onPressed: () async {
                    final completed = await Navigator.of(context).push<bool>(
                      MaterialPageRoute<bool>(
                        builder: (_) => HanduniaTraceRoute(
                          fragmentId: 'fragment-e2e',
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
                  builder: (_, value, __) => Text(value),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.byKey(const Key('open-trace')));
    await tester.pumpAndSettle();
    expect(
      find.text('Dessinez le trajet puis relâchez votre doigt pour valider.'),
      findsOneWidget,
    );

    await tester.dragFrom(
      const Offset(90, 300),
      const Offset(180, 180),
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
