import 'package:fitila_native/handunia/handunia_consultation_model.dart';
import 'package:fitila_native/handunia/handunia_consultation_routes.dart';
import 'package:fitila_native/handunia/handunia_consultation_ui.dart';
import 'package:fitila_native/handunia/handunia_creation_ai_route.dart';
import 'package:fitila_native/handunia/handunia_heritage_feed.dart';
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

  testWidgets('Handunia immersive feed loops and exposes animated social actions', (
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
        'display_name': 'Awa S.',
        'voice_count': 7,
        'like_count': 12,
        'liked_by_me': false,
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
      {
        'id': 'div-1',
        'item_type': 'divergence',
        'subject': 'Déplacement du marché',
        'created_at': '2026-09-20T12:00:00Z',
      },
    ];

    String? likedId;
    bool? likedValue;
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
          onLikeChanged: (id, liked) async {
            likedId = id;
            likedValue = liked;
          },
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Autour de moi'), findsNothing);
    expect(find.text('Ma lignée'), findsNothing);
    expect(find.text('Tout'), findsNothing);
    expect(find.bySemanticsLabel('Autour de moi'), findsOneWidget);
    expect(find.bySemanticsLabel('Ma lignée'), findsOneWidget);
    expect(find.bySemanticsLabel('Tout'), findsOneWidget);
    expect(find.byType(PageView), findsOneWidget);
    expect(
      find.textContaining('Votre voix attend le réseau.'),
      findsOneWidget,
    );
    expect(find.text('Partager'), findsNothing);
    expect(find.bySemanticsLabel('Partager'), findsOneWidget);
    expect(
      find.byKey(const ValueKey<String>('handunia-like-local-1')),
      findsOneWidget,
    );

    await tester.drag(find.byType(PageView), const Offset(0, -620));
    await tester.pump(const Duration(milliseconds: 450));

    expect(
      find.textContaining('La voix traversait la place avant le marché.'),
      findsOneWidget,
    );
    expect(find.textContaining('7 voix'), findsOneWidget);
    expect(find.text('12'), findsOneWidget);

    final memoryLike = find.byKey(
      const ValueKey<String>('handunia-like-memory-1'),
    );
    expect(memoryLike, findsOneWidget);
    // The validated luminous layout intentionally lets the reaction rail
    // overlap the story card edge. Invoke the keyed InkWell directly so this
    // state test remains independent from viewport-specific hit coordinates.
    final likeInkWell = tester.widget<InkWell>(memoryLike);
    likeInkWell.onTap?.call();
    await tester.pump(const Duration(milliseconds: 500));
    expect(likedId, 'memory-1');
    expect(likedValue, isTrue);
    expect(find.byIcon(Icons.favorite_rounded), findsOneWidget);
    expect(find.text('13'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Handunia divergence stays readable with animations disabled', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MediaQuery(
        data: const MediaQueryData(disableAnimations: true),
        child: MaterialApp(
          home: HanduniaFilView(
            items: const [
              {
                'id': 'div-static',
                'item_type': 'divergence',
                'subject': 'Deux mémoires du même départ',
              },
            ],
            loading: false,
            offline: false,
            filter: HanduniaFeedFilter.all,
            pendingCount: 0,
            onBack: () {},
            onRefresh: () async {},
            onFilterChanged: (_) {},
            onOpenMemory: (_) {},
            onFindMissingVoice: () {},
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Une mémoire se sépare en deux'), findsOneWidget);
    expect(find.text('Deux mémoires du même départ'), findsOneWidget);
    expect(tester.takeException(), isNull);
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
    expect(find.text('Aucune voix ici'), findsNothing);
    expect(find.byIcon(Icons.lock_outline_rounded), findsOneWidget);
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

    expect(find.text('Question'), findsOneWidget);
    expect(find.text('Interroger'), findsNothing);
    expect(find.byIcon(Icons.send_rounded), findsOneWidget);
    expect(
      find.bySemanticsLabel(
        'Maintenir pour poser une question par la voix',
      ),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });



  testWidgets('Handunia source pills stay attached to cited claims', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: HanduniaSourcedAnswer(
            answer: 'Le marché a changé de place [1].',
            sources: [
              {'index': 1, 'witness': 'AS', 'year': '1978'},
            ],
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('AS · 1978'), findsOneWidget);
    expect(find.textContaining('[1]'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Handunia waveform remains readable without animation', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MediaQuery(
        data: MediaQueryData(disableAnimations: true),
        child: MaterialApp(
          home: Scaffold(
            body: SizedBox(
              width: 260,
              child: OndeAudio(progression: .42, actif: true),
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.byType(OndeAudio), findsOneWidget);
    expect(tester.takeException(), isNull);
  });


  testWidgets('Handunia Lumiere IA starts from a human-memory threshold', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      const MaterialApp(
        home: HanduniaAiCreationRoute(
          lieu: <String, dynamic>{
            'id': 'nikki',
            'name': 'Nikki',
          },
          voiceCount: 34,
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Tisser'), findsOneWidget);
    expect(find.text('Nikki'), findsWidgets);
    expect(find.text('34 voix'), findsOneWidget);
    expect(find.text('PARLER'), findsOneWidget);
    expect(find.text('AIDE IA'), findsOneWidget);
    expect(find.text('Voix'), findsOneWidget);
    expect(find.text('Mémoire'), findsOneWidget);
    expect(find.text('Explorer'), findsOneWidget);
    expect(find.textContaining('Votre voix reste la source.'), findsNothing);
    expect(tester.takeException(), isNull);
  });


  testWidgets('Handunia living map keeps place names visible', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      const MaterialApp(
        home: HanduniaLivingMapRoute(
          initialPlaces: <Map<String, dynamic>>[
            <String, dynamic>{
              'id': 'nikki',
              'name': 'Nikki',
              'voice_count': 4,
            },
            <String, dynamic>{
              'id': 'caravanes',
              'name': 'Chemin des caravanes',
              'voice_count': 0,
            },
            <String, dynamic>{
              'id': 'biro',
              'name': 'Biro',
              'voice_count': 2,
            },
          ],
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Carte vivante'), findsOneWidget);
    expect(find.textContaining('0 lieu'), findsOneWidget);
    expect(find.text('Chemin des caravanes'), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Handunia living map remains readable at 125 percent text size', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      const MaterialApp(
        home: MediaQuery(
          data: MediaQueryData(textScaler: TextScaler.linear(1.25)),
          child: HanduniaLivingMapRoute(
            initialPlaces: <Map<String, dynamic>>[
              <String, dynamic>{
                'id': 'long-name',
                'name': 'Chemin des caravanes',
                'voice_count': 0,
              },
              <String, dynamic>{
                'id': 'nikki',
                'name': 'Nikki ancien marché',
                'voice_count': 7,
              },
            ],
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Chemin des caravanes'), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Handunia trace validates and continues automatically', (
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
                          fragmentId: 'fragment-test',
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
                  builder: (context, value, child) => Text(value),
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

    await tester.timedDragFrom(
      const Offset(90, 300),
      const Offset(180, 220),
      const Duration(milliseconds: 280),
    );
    await tester.pump();
    expect(find.text('Trajet validé'), findsOneWidget);
    expect(
      find.text('Trajet validé · étape suivante automatique…'),
      findsOneWidget,
    );

    await tester.pump(const Duration(milliseconds: 120));
    await tester.pumpAndSettle();
    expect(find.text('trace-ok'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });


  testWidgets('Handunia feed exposes a clear publish action', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    var published = false;

    await tester.pumpWidget(
      MaterialApp(
        home: MediaQuery(
          data: const MediaQueryData(textScaler: TextScaler.linear(1.25)),
          child: HanduniaFilView(
            items: const <Map<String, dynamic>>[],
            loading: false,
            offline: false,
            filter: HanduniaFeedFilter.all,
            pendingCount: 0,
            onBack: () {},
            onRefresh: () async {},
            onFilterChanged: (_) {},
            onOpenMemory: (_) {},
            onFindMissingVoice: () {},
            onPublish: () => published = true,
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('PUBLIER UN SOUVENIR'), findsNothing);
    final publishAction = find.bySemanticsLabel('Tisser un souvenir');
    expect(publishAction, findsOneWidget);
    await tester.tap(publishAction);
    await tester.pump();

    expect(published, isTrue);
    expect(tester.takeException(), isNull);
  });


  testWidgets('Handunia memory question offers quick prompts and retry UX', (
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

    expect(find.text('Comment ?'), findsOneWidget);
    expect(find.text('Quand ?'), findsOneWidget);
    expect(find.text('Qui ?'), findsOneWidget);
    expect(find.byIcon(Icons.send_rounded), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Handunia timeline periods are directly selectable', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      const MaterialApp(
        home: HanduniaTimelineRoute(
          lieuId: 'nikki',
          initialPeriods: <Map<String, dynamic>>[
            <String, dynamic>{
              'label': 'Avant 1960',
              'memory_count': 1,
              'voice_count': 2,
            },
            <String, dynamic>{
              'label': '1960–1979',
              'memory_count': 0,
              'voice_count': 0,
            },
            <String, dynamic>{
              'label': '1980–1999',
              'memory_count': 2,
              'voice_count': 3,
            },
            <String, dynamic>{
              'label': '2000–2019',
              'memory_count': 1,
              'voice_count': 1,
            },
            <String, dynamic>{
              'label': 'Depuis 2020',
              'memory_count': 0,
              'voice_count': 0,
            },
          ],
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Avant 1960'), findsWidgets);
    expect(find.text('1960–1979'), findsOneWidget);

    await tester.tap(find.text('1960–1979'));
    await tester.pump();

    expect(find.text('Aucune voix'), findsOneWidget);
    expect(find.text('PARLER'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });


  test('Handunia heritage ranking never uses likes as historical value', () {
    final base = <String, dynamic>{
      'id': 'memory',
      'distance_m': 700.0,
      'voice_count': 4,
      'lacuna_filled': true,
      'audio_url': 'https://example.test/memory.opus',
      'period_label': '1960–1979',
      'theme_key': 'marche',
      'created_at': '2026-09-20T10:00:00Z',
    };
    final withoutLikes = HanduniaHeritageFeed.score(
      {...base, 'like_count': 0},
      filter: HanduniaFeedFilter.all,
    );
    final viral = HanduniaHeritageFeed.score(
      {...base, 'like_count': 1000000},
      filter: HanduniaFeedFilter.all,
    );

    expect(viral, withoutLikes);
  });

  test('Handunia journey favors cultural continuity without author repetition', () {
    final journey = HanduniaHeritageFeed.buildJourney(
      <Map<String, dynamic>>[
        {
          'id': 'a',
          'lieu_id': 'nikki',
          'user_id': 'u1',
          'period_label': '1960–1979',
          'theme_key': 'marche',
          'voice_count': 5,
          'distance_m': 100,
        },
        {
          'id': 'b',
          'lieu_id': 'nikki',
          'user_id': 'u2',
          'period_label': '1980–1999',
          'theme_key': 'marche',
          'voice_count': 4,
          'distance_m': 120,
        },
        {
          'id': 'c',
          'lieu_id': 'nikki',
          'user_id': 'u1',
          'period_label': '1980–1999',
          'theme_key': 'marche',
          'voice_count': 4,
          'distance_m': 115,
        },
      ],
      filter: HanduniaFeedFilter.all,
    );

    expect(journey.length, 3);
    expect(
      journey[1]['_handunia_transition_label'],
      anyOf('Même lieu · autre époque', 'Même thème · autre voix'),
    );
    expect(journey[1]['user_id'], isNot(journey[0]['user_id']));
  });

  testWidgets('Handunia feed renders memory gaps as calls for human voices', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    var called = false;
    await tester.pumpWidget(
      MaterialApp(
        home: HanduniaFilView(
          items: const <Map<String, dynamic>>[
            <String, dynamic>{
              'id': 'gap:1',
              'item_type': 'memory_gap',
              'lieu_name': 'Marché de Nikki',
              'gap_value': 'Avant 1960',
              'source_count': 0,
            },
          ],
          loading: false,
          offline: false,
          filter: HanduniaFeedFilter.all,
          pendingCount: 0,
          onBack: () {},
          onRefresh: () async {},
          onFilterChanged: (_) {},
          onOpenMemory: (_) {},
          onFindMissingVoice: () => called = true,
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Handunia cherche une voix'), findsNothing);
    expect(find.textContaining('Avant 1960'), findsOneWidget);
    final helpAction = find.bySemanticsLabel(
      'Aider à compléter cette mémoire par la voix',
    );
    expect(helpAction, findsOneWidget);
    await tester.tap(helpAction);
    await tester.pump();
    expect(called, isTrue);
    expect(tester.takeException(), isNull);
  });


  testWidgets('Handunia architecture is visible as three connected layers', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: Padding(
            padding: EdgeInsets.all(16),
            child: HanduniaArchitectureMap(
              active: HanduniaArchitectureLayer.memory,
              compact: true,
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Voix'), findsOneWidget);
    expect(find.text('Mémoire'), findsOneWidget);
    expect(find.text('Explorer'), findsOneWidget);
    expect(find.text('IA'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

}
