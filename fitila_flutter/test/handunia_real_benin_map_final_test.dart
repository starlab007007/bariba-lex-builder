import 'package:fitila_native/handunia/handunia_geo_trace_route.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Handunia real Benin map flow is present and readable', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        home: HanduniaGeoTraceRoute(
          fragmentId: 'qa-real-map',
          mapBuilder: (onTap) => const ColoredBox(
            key: Key('real-map-placeholder'),
            color: Color(0xFF101722),
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
      find.text('Carte réelle du Bénin · OpenStreetMap/OpenFreeMap · itinéraire OSRM'),
      findsOneWidget,
    );
    expect(find.byKey(const Key('real-map-placeholder')), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
