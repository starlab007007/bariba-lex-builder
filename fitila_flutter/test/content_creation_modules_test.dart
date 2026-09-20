import 'package:fitila_native/core/signature_theme.dart';
import 'package:fitila_native/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  Widget phoneApp(Widget child) => MaterialApp(
    debugShowCheckedModeBanner: false,
    theme: SignatureTheme.light(),
    home: Scaffold(body: SafeArea(child: child)),
  );

  final modules = <String, Widget Function()>{
    'Echo Sɔ̃ɔ': () => EchoSonScreen(onPostCreated: (_) {}),
    'Live Griot IA': () => LiveGriotScreen(onPostCreated: (_) {}),
    'Aburu Fim IA': () => AburuFimScreen(onPostCreated: (_) {}),
    'Sasara IA': () => SasaraIaScreen(onPostCreated: (_) {}),
    'Handunia Wasa': () => const HanduniaWasaScreen(),
  };

  for (final module in modules.entries) {
    testWidgets('${module.key} renders on a phone without crashing', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(phoneApp(module.value()));
      await tester.pump(const Duration(milliseconds: 600));
      await tester.pump();

      expect(find.text(module.key), findsWidgets);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('Echo opens from creator hub without Material or overflow errors', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      phoneApp(ContentCreatorScreen(onPostCreated: (_) {})),
    );
    await tester.pump(const Duration(milliseconds: 300));

    await tester.tap(find.text('Echo Sɔ̃ɔ').first);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 350));

    expect(find.text('Raconte quelque chose…'), findsOneWidget);
    expect(find.text('Bàátɔ̀nú'), findsOneWidget);
    expect(find.text('Français'), findsOneWidget);
    expect(find.byType(ChoiceChip), findsWidgets);
    expect(tester.takeException(), isNull);

    await tester.tap(find.text('Écrire à la place'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 350));
    expect(find.text('Français → Bariba'), findsOneWidget);
    expect(find.text('Bariba → Français'), findsOneWidget);
    expect(find.byType(TextField), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Echo remains scrollable on a short Android viewport', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(phoneApp(EchoSonScreen(onPostCreated: (_) {})));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 350));

    expect(find.text('Raconte quelque chose…'), findsOneWidget);
    expect(find.byType(Scrollable), findsWidgets);
    expect(tester.takeException(), isNull);

    await tester.drag(find.byType(Scrollable).first, const Offset(0, -300));
    await tester.pump();
    expect(find.text('Écrire à la place'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Live Griot premium studio is stable on a short phone', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      phoneApp(LiveGriotScreen(onPostCreated: (_) {})),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 700));

    expect(find.text('LIVE STUDIO'), findsOneWidget);
    expect(find.textContaining('faute de serveur relais dédié'), findsNothing);
    expect(find.byType(Scrollable), findsWidgets);
    expect(tester.takeException(), isNull);

    final prepare = find.text('Préparer le direct');
    await tester.scrollUntilVisible(
      prepare,
      260,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pump();
    expect(prepare, findsOneWidget);

    final startButton = find.text('Démarrer le direct');
    await tester.scrollUntilVisible(
      startButton,
      260,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pump();
    expect(startButton, findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Live Griot draft title updates the premium launch stage', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      phoneApp(LiveGriotScreen(onPostCreated: (_) {})),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    final titleField = find.byType(TextField).first;
    await tester.ensureVisible(titleField);
    await tester.enterText(titleField, 'Veillée des griots');
    await tester.pump();

    expect(find.text('Veillée des griots'), findsWidgets);
    expect(find.byType(ChoiceChip), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Sagesse Battle remains playable when community sync is down', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(phoneApp(const SagesseBattleScreen()));
    await tester.pump();
    for (
      var attempt = 0;
      attempt < 30 && find.text('Complète le proverbe').evaluate().isEmpty;
      attempt++
    ) {
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 100)),
      );
      await tester.pump(const Duration(milliseconds: 100));
    }

    expect(find.text('Impossible de charger le défi du jour.'), findsNothing);
    expect(
      find.text('Complète le proverbe'),
      findsOneWidget,
      reason: tester
          .widgetList<Text>(find.byType(Text))
          .map((widget) => widget.data)
          .whereType<String>()
          .join(' | '),
    );

    await tester.drag(find.byType(Scrollable).first, const Offset(0, -500));
    await tester.pump();
    final answer = find.byType(TextField).first;
    await tester.enterText(answer, 'test');
    final submit = find.text('Valider ma réponse');
    await tester.ensureVisible(submit);
    await tester.tap(submit);
    await tester.pump(const Duration(milliseconds: 300));

    expect(
      find.textContaining('Score calculé sur cet appareil'),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('Handunia premium shell is stable before opening a place', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(phoneApp(const HanduniaWasaScreen()));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    expect(find.text('Handunia Wasa'), findsWidgets);
    expect(find.text('Monde vivant · mémoire collective'), findsOneWidget);
    expect(find.text('Entrer dans le monde'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Handunia route owns a Material ancestor for text inputs', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: SignatureTheme.light(),
        home: Builder(
          builder: (context) => Scaffold(
            body: Center(
              child: FilledButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => const HanduniaWasaScreen(),
                  ),
                ),
                child: const Text('Ouvrir Handunia'),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Ouvrir Handunia'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Entrer dans le monde'));
    await tester.pump();

    expect(find.byType(TextField), findsWidgets);
    expect(find.text('Rechercher un lieu…'), findsOneWidget);

    final worldFeed = find.text('Fil du monde');
    await tester.tap(worldFeed);
    await tester.pump();
    expect(
      find.textContaining('synchronisation du serveur'),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('Handunia opens from the creation hub without Material errors', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      phoneApp(ContentCreatorScreen(onPostCreated: (_) {})),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Handunia Wasa'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);

    final enter = find.text('Entrer dans le monde');
    await tester.ensureVisible(enter);
    await tester.tap(enter);
    await tester.pump();

    expect(find.text('Rechercher un lieu…'), findsOneWidget);
    expect(find.byType(TextField), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Handunia Wasa exposes its offline continuity path', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(phoneApp(const HanduniaWasaScreen()));
    await tester.pump(const Duration(milliseconds: 500));

    final enter = find.text('Entrer dans le monde');
    await tester.ensureVisible(enter);
    await tester.tap(enter);
    await tester.pump();

    expect(find.text('Marché de Nikki'), findsOneWidget);
    expect(find.textContaining('Mode hors ligne'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
