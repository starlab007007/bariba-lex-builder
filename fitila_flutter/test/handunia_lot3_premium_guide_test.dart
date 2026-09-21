import 'package:fitila_native/handunia/handunia_premium_guide_route.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('Lot 3 travel modes expose explicit routing profiles', () {
    expect(HanduniaTravelMode.walking.apiValue, 'walking');
    expect(HanduniaTravelMode.bicycle.apiValue, 'bicycle');
    expect(HanduniaTravelMode.horse.apiValue, 'horse');
  });

  testWidgets('Lot 3 premium journey renders offline', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: HanduniaPremiumGuideRoute(
          places: <Map<String, dynamic>>[
            <String, dynamic>{
              'id': 'nikki',
              'name': 'Nikki',
              'latitude': 9.9401,
              'longitude': 3.2108,
              'memory_count': 0,
              'voice_count': 0,
            },
          ],
          initialPlaceId: 'nikki',
        ),
      ),
    );
    await tester.pump();
    expect(find.text('Voyage vivant'), findsOneWidget);
    expect(find.text('À pied'), findsOneWidget);
    expect(find.text('À vélo'), findsOneWidget);
    expect(find.text('À cheval'), findsOneWidget);
    expect(find.text('Zones d’ombre'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
