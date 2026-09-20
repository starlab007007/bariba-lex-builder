import 'package:fitila_native/handunia/handunia_geo_trace_route.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Handunia real-map trace exposes road and historical modes', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        home: HanduniaGeoTraceRoute(
          fragmentId: 'fragment-map-test',
          mapBuilder: (onTap) => Container(
            key: const Key('fake-benin-map'),
            color: Colors.black12,
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Tracer sur la carte'), findsOneWidget);
    expect(find.text('Village, quartier, ville…'), findsOneWidget);
    expect(find.text('Suivre les routes'), findsOneWidget);
    expect(find.text('Historique libre'), findsOneWidget);
    expect(find.text('VALIDER CE TRAJET'), findsOneWidget);
    expect(
      find.text(
        'Carte réelle du Bénin · OpenStreetMap/OpenFreeMap · itinéraire OSRM',
      ),
      findsOneWidget,
    );
    expect(find.byKey(const Key('fake-benin-map')), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Handunia real-map trace historical mode stays clear', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        home: HanduniaGeoTraceRoute(
          fragmentId: 'fragment-map-test',
          mapBuilder: (onTap) => const SizedBox.expand(),
        ),
      ),
    );
    await tester.pump();

    await tester.tap(find.text('Historique libre'));
    await tester.pump();

    expect(
      find.text('Touchez la carte pour placer le premier point.'),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });
}
