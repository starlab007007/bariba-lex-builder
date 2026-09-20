import 'package:fitila_native/handunia/handunia_consultation_model.dart';
import 'package:fitila_native/handunia/handunia_consultation_routes.dart';
import 'package:fitila_native/handunia/handunia_consultation_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Handunia feed orders proximity before corroboration', () {
    final items = <Map<String, dynamic>>[
      {
        'id': 'far-fresh',
        'distance_m': 900.0,
        'latest_corroboration_at': '2026-09-20T20:00:00Z',
        'lacuna_filled': true,
        'created_at': '2026-09-20T20:00:00Z',
      },
      {
        'id': 'near-old',
        'distance_m': 40.0,
        'latest_corroboration_at': '2026-09-01T10:00:00Z',
        'lacuna_filled': false,
        'created_at': '2026-09-01T10:00:00Z',
      },
    ]..sort(compareHanduniaFeedItems);

    expect(items.first['id'], 'near-old');
  });

  test('Handunia feed then orders fresh corroboration', () {
    final items = <Map<String, dynamic>>[
      {
        'id': 'old',
        'distance_m': 100.0,
        'latest_corroboration_at': '2026-09-01T10:00:00Z',
        'lacuna_filled': true,
        'created_at': '2026-09-20T10:00:00Z',
      },
      {
        'id': 'fresh',
        'distance_m': 100.0,
        'latest_corroboration_at': '2026-09-20T10:00:00Z',
        'lacuna_filled': false,
        'created_at': '2026-09-01T10:00:00Z',
      },
    ]..sort(compareHanduniaFeedItems);

    expect(items.first['id'], 'fresh');
  });

  test('Handunia feed then prioritizes a filled gap', () {
    final items = <Map<String, dynamic>>[
      {
        'id': 'ordinary',
        'distance_m': 100.0,
        'latest_corroboration_at': '2026-09-20T10:00:00Z',
        'lacuna_filled': false,
        'created_at': '2026-09-20T10:00:00Z',
      },
      {
        'id': 'gap',
        'distance_m': 100.0,
        'latest_corroboration_at': '2026-09-20T10:00:00Z',
        'lacuna_filled': true,
        'created_at': '2026-09-19T10:00:00Z',
      },
    ]..sort(compareHanduniaFeedItems);

    expect(items.first['id'], 'gap');
  });

  test('Handunia counts distinct voices only once', () {
    expect(
      handuniaDistinctVoiceCount(
        'author-1',
        const ['author-1', 'witness-2', 'witness-2', 'witness-3'],
      ),
      3,
    );
  });

  testWidgets('Handunia feed shows voices without social engagement', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final items = <Map<String, dynamic>>[
      {
        'id': 'memory-1',
        'item_type': 'memory',
        'text': 'La voix traversait la place avant le marché.',
        'lieu_name': 'Marché de Nikki',
        'period_label': 'années 1970',
        'author_initials': 'AS',
        'voice_count': 7,
        'scope_level': 'community',
        'created_at': '2026-09-20T10:00:00Z',
      },
      {
        'id': 'local-1',
        'item_type': 'memory',
        'text': 'Votre voix attend le réseau.',
        'lieu_name': 'Puits du village',
        'author_initials': 'MO',
        'voice_count': 1,
        'scope_level': 'community',
        'local_only': true,
        'created_at': '2026-09-20T11:00:00Z',
      },
    ];

    await tester.pumpWidget(
      MaterialApp(
        home: HanduniaFilView(
          items: items,
          loading: false,
          offline: true,
          filter: HanduniaFeedFilter.around,
          pendingCount: 1,
          onBack: () {},
          onRefresh: () async {},
          onFilterChanged: (_) {},
          onOpenMemory: (_) {},
          onFindMissingVoice: () {},
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Autour de moi'), findsOneWidget);
    expect(find.text('Ma lignée'), findsOneWidget);
    expect(find.text('Tout'), findsOneWidget);
    expect(find.text('7 voix'), findsOneWidget);
    expect(find.text('1 à envoyer'), findsOneWidget);
    expect(find.text('J’aime'), findsNothing);
    expect(find.text('Partager'), findsNothing);
    expect(find.text('vues'), findsNothing);
  });

  testWidgets('Handunia access denied is not rendered as a lacuna', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        home: HanduniaFilView(
          items: const [],
          loading: false,
          offline: false,
          notice: 'Accès réservé',
          filter: HanduniaFeedFilter.lineage,
          pendingCount: 0,
          onBack: () {},
          onRefresh: () async {},
          onFilterChanged: (_) {},
          onOpenMemory: (_) {},
          onFindMissingVoice: () {},
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Accès réservé'), findsWidgets);
    expect(find.text('Portée non autorisée'), findsOneWidget);
    expect(find.text('Aucune voix ici'), findsNothing);
  });
  testWidgets('Handunia memory answer exposes keyboard and voice entry', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      const MaterialApp(home: HanduniaMemoryAnswerRoute()),
    );
    await tester.pump();

    expect(find.text('La mémoire répond'), findsOneWidget);
    expect(find.text('Question'), findsOneWidget);
    expect(find.text('Interroger'), findsOneWidget);
    expect(
      find.bySemanticsLabel('Maintenir pour poser la question'),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });


}
