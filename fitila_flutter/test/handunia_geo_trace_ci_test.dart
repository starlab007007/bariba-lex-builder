import 'package:fitila_native/handunia/handunia_geo_trace_route.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Handunia geographic trace QA shell renders on phone', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        home: HanduniaGeoTraceRoute(
          fragmentId: 'qa-map',
          mapBuilder: (onTap) => const ColoredBox(color: Colors.black12),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Tracer sur la carte'), findsOneWidget);
    expect(find.text('Suivre les routes'), findsOneWidget);
    expect(find.text('Historique libre'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
