import 'package:fitila_native/handunia/handunia_consultation_routes.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Handunia map labels stay visible on a phone', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      const MaterialApp(
        home: HanduniaLivingMapRoute(
          initialPlaces: <Map<String, dynamic>>[
            <String, dynamic>{
              'id': 'caravanes',
              'name': 'Chemin des caravanes',
              'voice_count': 0,
            },
            <String, dynamic>{
              'id': 'nikki',
              'name': 'Nikki',
              'voice_count': 6,
            },
          ],
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Chemin des caravanes'), findsWidgets);
    expect(find.text('Nikki'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
