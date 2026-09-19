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
