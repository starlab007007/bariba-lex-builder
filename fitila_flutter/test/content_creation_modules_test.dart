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

  final modules = <String, ({Widget Function() screen, String anchor})>{
    'Echo Sɔ̃ɔ': (
      screen: () => EchoSonScreen(onPostCreated: (_) {}),
      anchor: 'Echo Sɔ̃ɔ',
    ),
    'Live Griot IA': (
      screen: () => LiveGriotScreen(onPostCreated: (_) {}),
      anchor: 'Nouveau direct',
    ),
    'Sagesse Battle': (
      screen: () => const SagesseBattleScreen(),
      anchor: 'Sagesse Battle',
    ),
    'Aburu Fim IA': (
      screen: () => AburuFimScreen(onPostCreated: (_) {}),
      anchor: 'Modèles intelligents',
    ),
    'Sasara IA': (
      screen: () => SasaraIaScreen(onPostCreated: (_) {}),
      anchor: 'Rendre bilingue ?',
    ),
    'Handunia Wasa': (
      screen: () => const HanduniaWasaScreen(),
      anchor: 'Handunia',
    ),
  };

  for (final module in modules.entries) {
    testWidgets('${module.key} renders on a phone without crashing', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(phoneApp(module.value.screen()));
      await tester.pump(const Duration(milliseconds: 600));
      await tester.pump();

      expect(find.text(module.value.anchor), findsWidgets);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('creator hub exposes only Handunia Wasa and Sagesse Battle', (
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

    expect(find.text('Créer'), findsOneWidget);
    expect(find.text('Handunia Wasa'), findsOneWidget);
    expect(find.text('Sagesse Battle'), findsOneWidget);
    expect(find.text('Echo Sɔ̃ɔ'), findsNothing);
    expect(find.text('Live Griot IA'), findsNothing);
    expect(find.text('Aburu Fim IA'), findsNothing);
    expect(find.text('Sasara IA'), findsNothing);
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

    expect(find.textContaining('Raconte quelque chose'), findsOneWidget);
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

    expect(find.text('Nouveau direct'), findsOneWidget);
    expect(find.text('SUJET DU DIRECT'), findsOneWidget);
    expect(find.textContaining('faute de serveur relais dédié'), findsNothing);
    expect(find.byType(Scrollable), findsWidgets);
    expect(tester.takeException(), isNull);

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
    expect(tester.takeException(), isNull);
  });

  testWidgets('Sagesse Battle reference shell remains stable while data loads', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(phoneApp(const SagesseBattleScreen()));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 800));

    expect(find.text('Sagesse Battle'), findsOneWidget);
    expect(find.textContaining('Impossible de charger'), findsNothing);
    expect(tester.takeException(), isNull);

    // If the local proverb bank has completed loading, validate the reference
    // challenge treatment as well; the test must not depend on remote sync.
    if (find.text('COMPLÈTE LE PROVERBE').evaluate().isNotEmpty) {
      expect(find.text('COMPLÈTE LE PROVERBE'), findsOneWidget);
      expect(find.byType(Scrollable), findsWidgets);
      expect(tester.takeException(), isNull);
    }
  });

  testWidgets('Sagesse user challenge creator exposes publish flow', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      phoneApp(const SagesseUserChallengeCreateScreen()),
    );
    await tester.pump();

    expect(find.text('Créer un défi'), findsOneWidget);
    expect(find.byIcon(Icons.arrow_back_rounded), findsOneWidget);
    expect(find.text('Compléter'), findsOneWidget);
    expect(find.text('Interpréter'), findsOneWidget);

    final theme = find.text('Sagesse');
    await tester.scrollUntilVisible(
      theme,
      240,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pump();
    expect(find.text('Thème'), findsOneWidget);
    expect(theme, findsOneWidget);

    final publish = find.text('Publier le défi');
    await tester.scrollUntilVisible(
      publish,
      280,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pump();
    expect(publish, findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Aburu Fim follows the reference template gallery on phone', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(phoneApp(AburuFimScreen(onPostCreated: (_) {})));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 600));

    expect(find.text('Modèles intelligents'), findsOneWidget);
    expect(find.text('Connectés à tes données'), findsOneWidget);
    expect(find.text('Filmer un seul plan'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Sasara matches the bilingual consent reference screen', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(phoneApp(SasaraIaScreen(onPostCreated: (_) {})));
    await tester.pump();

    expect(find.text('Rendre bilingue ?'), findsOneWidget);
    expect(find.text('Après ta publication'), findsOneWidget);
    expect(find.text('Rendre bilingue avec l’IA'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Handunia consultation feed is stable on entry', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(phoneApp(const HanduniaWasaScreen()));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    expect(find.text('Handunia'), findsOneWidget);
    expect(find.bySemanticsLabel('Autour de moi'), findsOneWidget);
    expect(find.bySemanticsLabel('Ma lignée'), findsOneWidget);
    expect(find.bySemanticsLabel('Tout'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Handunia consultation route owns Material interactions', (
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
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 350));

    expect(find.text('Handunia'), findsOneWidget);
    expect(find.bySemanticsLabel('Autour de moi'), findsOneWidget);
    expect(find.bySemanticsLabel('Ma lignée'), findsOneWidget);
    expect(find.bySemanticsLabel('Tout'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Handunia opens from the creation hub into publish flow', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      phoneApp(ContentCreatorScreen(onPostCreated: (_) {})),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 350));

    await tester.tap(find.text('Handunia Wasa'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 350));

    expect(find.text('Carte'), findsOneWidget);
    expect(find.text('Voix'), findsOneWidget);
    expect(find.text('Mémoire'), findsOneWidget);
    expect(find.text('Explorer'), findsOneWidget);
    expect(find.text('Fil Handunia Wasa'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Handunia Wasa exposes consultation without social counters', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(phoneApp(const HanduniaWasaScreen()));
    await tester.pump(const Duration(milliseconds: 500));

    expect(find.text('Handunia'), findsOneWidget);
    expect(find.text('J’aime'), findsNothing);
    expect(find.text('Partager'), findsNothing);
    expect(find.text('vues'), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
