import 'package:fitila_native/handunia/handunia_unified_map.dart';
import 'package:fitila_native/handunia/handunia_territory_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test('Handunia Lot 2 builds a normalized territorial breadcrumb', () {
    final segments = handuniaTerritorySegments(<String, dynamic>{
      'department': 'Borgou',
      'commune': 'Nikki',
      'arrondissement': 'Nikki',
      'village_quartier': 'Tasso',
    });

    expect(segments, <String>['Tasso', 'Nikki', 'Borgou', 'Bénin']);
  });

  test('Handunia Lot 2 keeps Benin as the root without invented levels', () {
    expect(handuniaTerritorySegments(<String, dynamic>{}), <String>['Bénin']);
    expect(handuniaTerritorySegments(null), <String>['Bénin']);
  });

  testWidgets('territorial breadcrumb exposes real hierarchy labels', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: HanduniaTerritoryPath(
            place: <String, dynamic>{
              'department': 'Alibori',
              'commune': 'Kandi',
              'arrondissement': 'Kandi I',
              'village_quartier': 'Banigourou',
            },
          ),
        ),
      ),
    );

    expect(find.text('Bénin'), findsOneWidget);
    expect(find.text('Alibori'), findsOneWidget);
    expect(find.text('Kandi'), findsOneWidget);
    expect(find.text('Kandi I'), findsOneWidget);
    expect(find.text('Banigourou'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });  test('Handunia Lot 2 ships the validated national hierarchy offline', () async {
    final counts = await HanduniaTerritoryRepository.counts();
    expect(counts['departments'], 12);
    expect(counts['communes'], 77);
    expect(counts['arrondissements'], 546);

    final communes = await HanduniaTerritoryRepository.communes('Borgou');
    expect(communes, contains('Nikki'));

    final arrondissements =
        await HanduniaTerritoryRepository.arrondissements(
      department: 'Borgou',
      commune: 'Nikki',
    );
    expect(arrondissements, isNotEmpty);
  });

  test('territory selection creates a precise geographic search path', () {
    const selection = HanduniaTerritorySelection(
      department: 'Borgou',
      commune: 'Nikki',
      arrondissement: 'Tasso',
      villageQuartier: 'Gah-Maro',
    );
    expect(selection.mostSpecific, 'Gah-Maro');
    expect(
      selection.searchQuery,
      'Gah-Maro, Tasso, Nikki, Borgou, Bénin',
    );
  });

}
