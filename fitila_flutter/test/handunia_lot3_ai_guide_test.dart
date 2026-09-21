import 'package:fitila_native/handunia/handunia_ai_guide_route.dart';
import 'package:fitila_native/handunia/handunia_guide_data.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  final places = <Map<String, dynamic>>[
    <String, dynamic>{
      'id': 'nikki',
      'name': 'Nikki',
      'latitude': 9.94,
      'longitude': 3.21,
      'department': 'Borgou',
      'commune': 'Nikki',
      'memory_count': 8,
      'voice_count': 5,
    },
    <String, dynamic>{
      'id': 'biro',
      'name': 'Biro',
      'latitude': 10.02,
      'longitude': 3.18,
      'department': 'Borgou',
      'commune': 'Nikki',
      'memory_count': 4,
      'voice_count': 3,
    },
    <String, dynamic>{
      'id': 'ndali',
      'name': "N'Dali",
      'latitude': 9.86,
      'longitude': 2.72,
      'department': 'Borgou',
      'commune': "N'Dali",
      'memory_count': 2,
      'voice_count': 2,
    },
    <String, dynamic>{
      'id': 'legacy',
      'name': 'Lieu non positionné',
      'memory_count': 20,
      'voice_count': 12,
    },
  ];

  test('Lot 3 planner keeps the requested starting place and real locations', () {
    final stops = HanduniaGuideData.planStops(
      places: places,
      mode: HanduniaTravelMode.walk,
      initialPlace: places[1],
      maxStops: 3,
    );

    expect(stops, hasLength(3));
    expect(stops.first['id'], 'biro');
    expect(stops.any((item) => item['id'] == 'legacy'), isFalse);
    expect(stops.map((item) => item['id']).toSet(), hasLength(3));
  });

  test('Lot 3 travel modes expose distinct mobility assumptions', () {
    expect(
      HanduniaTravelMode.bicycle.speedKmh,
      greaterThan(HanduniaTravelMode.horse.speedKmh),
    );
    expect(
      HanduniaTravelMode.horse.speedKmh,
      greaterThan(HanduniaTravelMode.walk.speedKmh),
    );
    expect(HanduniaGuideData.distanceLabel(850), '850 m');
    expect(HanduniaGuideData.distanceLabel(12500), '12 km');
    expect(HanduniaGuideData.durationLabel(5400), '1 h 30');
  });

  test('Lot 3 planner stays empty instead of inventing coordinates', () {
    final stops = HanduniaGuideData.planStops(
      places: const <Map<String, dynamic>>[
        <String, dynamic>{
          'id': 'old',
          'name': 'Ancien lieu',
          'memory_count': 7,
        },
      ],
      mode: HanduniaTravelMode.walk,
    );
    expect(stops, isEmpty);
  });

  testWidgets('Lot 3 guided journey renders sourced guide and memory gaps', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    Future<Map<String, dynamic>> journeyBuilder(
      List<Map<String, dynamic>> input,
      HanduniaTravelMode mode,
      Map<String, dynamic>? initial,
    ) async {
      return <String, dynamic>{
        'state': 'ready',
        'mode': mode.key,
        'stops': <Map<String, dynamic>>[
          <String, dynamic>{
            ...places[0],
            'guide_index': 1,
            'leg_distance_m': 0,
          },
          <String, dynamic>{
            ...places[1],
            'guide_index': 2,
            'leg_distance_m': 9200,
          },
        ],
        'path_points': const <Map<String, double>>[
          <String, double>{'latitude': 9.94, 'longitude': 3.21},
          <String, double>{'latitude': 10.02, 'longitude': 3.18},
        ],
        'distance_m': 9200,
        'estimated_duration_s': mode == HanduniaTravelMode.bicycle
            ? 2208
            : 7360,
        'route_quality': 'road-reference',
        'routing_notice': 'Trajet indicatif de test.',
      };
    }

    Future<Map<String, dynamic>> askBuilder(
      Map<String, dynamic> place,
      String intent,
    ) async {
      if (intent == 'reconstruction') {
        return <String, dynamic>{
          'state': 'sourced',
          'answer':
              'Les voix décrivent un lieu de rencontre et de transmission. [1]',
          'sources': const <Map<String, dynamic>>[
            <String, dynamic>{'witness': 'AB', 'year': '1974'},
          ],
        };
      }
      return <String, dynamic>{
        'state': 'sourced',
        'answer': 'Les témoins racontent les échanges autour du lieu. [1]',
        'sources': const <Map<String, dynamic>>[
          <String, dynamic>{'witness': 'AB', 'year': '1974'},
        ],
      };
    }

    Future<Map<String, dynamic>> gapsBuilder(String placeId) async =>
        <String, dynamic>{
          'state': 'ready',
          'missing_axes': const <String>['Lignée'],
          'empty_periods': const <String>['Avant 1960'],
        };

    await tester.pumpWidget(
      MaterialApp(
        home: HanduniaAiGuideRoute(
          initialPlace: places[0],
          initialPlaces: places,
          journeyBuilder: journeyBuilder,
          askBuilder: askBuilder,
          gapsBuilder: gapsBuilder,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Guide Handunia IA'), findsOneWidget);
    expect(find.text('Marche'), findsOneWidget);
    expect(find.text('Vélo'), findsOneWidget);
    expect(find.text('Cheval'), findsOneWidget);
    expect(find.textContaining('2 étapes'), findsOneWidget);
    expect(find.text('Le guide raconte'), findsOneWidget);
    expect(
      find.textContaining('Les témoins racontent les échanges'),
      findsOneWidget,
    );
    expect(find.text('Reconstitution immersive'), findsOneWidget);
    expect(find.text('Voix à rechercher'), findsOneWidget);
    expect(find.textContaining('Lignée'), findsOneWidget);
    expect(find.textContaining('Avant 1960'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.tap(find.text('RECONSTITUER DEPUIS LES VOIX'));
    await tester.pumpAndSettle();

    expect(
      find.textContaining('Les voix décrivent un lieu de rencontre'),
      findsOneWidget,
    );
    expect(find.text('Perspective immersive 2.5D'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
