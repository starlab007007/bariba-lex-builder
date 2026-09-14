import 'package:fitila_native/core/signature_theme.dart';
import 'package:fitila_native/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> pumpPhone(WidgetTester tester, Widget child) async {
  tester.view.physicalSize = const Size(390, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  await tester.pumpWidget(
    MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: SignatureTheme.light(),
      home: Scaffold(body: SafeArea(child: child)),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('dictionary reproduces web search and detailed card', (
    tester,
  ) async {
    const entry = DictionaryEntry(
      word: 'dèmi',
      definition: 'Habitude.',
      phonetic: 'dèmi',
      partOfSpeech: 'n',
      exampleBariba: 'Dèmi ka n yã.',
      exampleFrancais: 'C’est une habitude.',
    );

    await pumpPhone(
      tester,
      DictionaryScreen(loadEntries: () async => const [entry]),
    );

    expect(find.text('Dictionnaire'), findsOneWidget);
    expect(find.text('Clavier'), findsOneWidget);
    expect(find.text('Vocal'), findsOneWidget);
    expect(find.text('Proposer un mot'), findsOneWidget);

    final field = find.byType(TextField).first;
    await tester.enterText(field, 'dèmi');
    await tester.pump();

    expect(find.text('dèmi'), findsWidgets);
    await tester.tap(find.text('dèmi').last);
    await tester.pumpAndSettle();

    expect(find.text('Habitude.'), findsOneWidget);
    expect(find.textContaining('Définition'), findsOneWidget);
    expect(find.textContaining('Exemple en Bàátɔ̀nú'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('translator exposes all web multimodal modes on phone', (
    tester,
  ) async {
    await pumpPhone(tester, const TranslatorScreen(accessToken: ''));

    expect(find.text('Traducteur IA'), findsOneWidget);
    expect(find.text('Voix'), findsOneWidget);
    expect(find.text('Texte'), findsOneWidget);
    expect(find.text('Photo'), findsOneWidget);
    expect(find.text('Coller'), findsOneWidget);
    expect(find.text('Doc'), findsOneWidget);
    expect(find.text('Mode conversation'), findsOneWidget);
    expect(find.textContaining('Détection'), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Fitila IA reproduces Bariba chat landing', (tester) async {
    await pumpPhone(tester, const AiScreen());

    expect(find.text('Fitila IA'), findsOneWidget);
    expect(
      find.text('Yaa sɔ̃ɔ wírú Bariba mɛ̀, ǹ nɛ́ɛ̀ daa gɔ!'),
      findsOneWidget,
    );
    expect(find.text('Posez vos questions en Bàátɔ̀nú'), findsOneWidget);
    expect(find.byTooltip('Clavier Bàátɔ̀nú'), findsOneWidget);
    expect(find.byTooltip('Envoyer'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Tem IA reproduces local land-code assistant landing', (
    tester,
  ) async {
    await pumpPhone(tester, const TemIaScreen());

    expect(find.text('Fitila Tem IA'), findsOneWidget);
    expect(
      find.textContaining('Assistant basé uniquement sur le Code Foncier'),
      findsOneWidget,
    );
    expect(find.text('Saria gbiika gari mba?'), findsOneWidget);
    expect(find.text('Saria 14se ya nɛɛ mba?'), findsOneWidget);
    expect(find.text('Tem bausu mba ba mɔ̀ Benɛ temɔ?'), findsOneWidget);
    expect(find.textContaining('100% locale'), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Classe opens real web lesson Tii dobonu and its tabs', (
    tester,
  ) async {
    await pumpPhone(tester, const ClasseScreen());

    expect(find.text('Niveau 1'), findsOneWidget);
    expect(find.text('Niveau 2'), findsOneWidget);
    expect(find.text('Leçons'), findsOneWidget);

    await tester.tap(find.text('Leçons'));
    await tester.pumpAndSettle();

    expect(find.text('Tii dobonu'), findsWidgets);
    await tester.ensureVisible(find.text('Tii dobonu').last);
    await tester.tap(find.text('Tii dobonu').last);
    await tester.pumpAndSettle();

    expect(find.text('Leçon 1'), findsOneWidget);
    expect(find.textContaining('Texte'), findsWidgets);
    expect(find.textContaining('Mɛɛrio'), findsOneWidget);
    expect(find.textContaining('Faagi'), findsOneWidget);
    expect(find.textContaining('Geruo'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
