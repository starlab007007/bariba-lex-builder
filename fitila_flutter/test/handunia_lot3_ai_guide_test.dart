import 'package:fitila_native/handunia/handunia_ai_heritage_guide_route.dart';
import 'package:fitila_native/handunia/handunia_unified_map.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('Lot 3 exposes grounded multimodal heritage travel contracts', () {
    expect(HanduniaTravelMode.walking.serviceMode, 'walking');
    expect(HanduniaTravelMode.bicycle.serviceMode, 'bicycle');
    expect(HanduniaTravelMode.horse.serviceMode, 'horse');
    expect(HanduniaTravelMode.horse.requiresLocalValidation, isTrue);
    expect(HanduniaTravelMode.walking.requiresLocalValidation, isFalse);
  });

  testWidgets('unified map accepts a replayable heritage route', (tester) async {
    const places = <Map<String, dynamic>>[
      <String, dynamic>{
        'id': 'start',
        'name': 'Nikki',
        'latitude': 9.9401,
        'longitude': 3.2108,
        'voice_count': 2,
      },
      <String, dynamic>{
        'id': 'end',
        'name': 'Tasso',
        'latitude': 9.878,
        'longitude': 3.164,
        'voice_count': 1,
      },
    ];
    const route = <Map<String, double>>[
      <String, double>{'latitude': 9.9401, 'longitude': 3.2108},
      <String, double>{'latitude': 9.91, 'longitude': 3.19},
      <String, double>{'latitude': 9.878, 'longitude': 3.164},
    ];

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: HanduniaUnifiedMap(
            places: places,
            routePoints: route,
            routeProgress: .45,
            routeLabel: 'À pied · 8.4 km',
            immersive: true,
            showSelectionCard: false,
            height: 360,
          ),
        ),
      ),
    );

    expect(find.text('À pied · 8.4 km'), findsOneWidget);
    expect(find.textContaining('Nikki'), findsWidgets);
    expect(find.textContaining('Tasso'), findsWidgets);
    expect(tester.takeException(), isNull);
  });
}
