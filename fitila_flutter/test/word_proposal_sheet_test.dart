import 'package:fitila_native/core/signature_theme.dart';
import 'package:fitila_native/dictionary/dictionary_experience.dart';
import 'package:fitila_native/dictionary/word_proposal_sheet.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

const _entries = [
  DictEntry(word: 'dèmi', definition: 'Habitude.', partOfSpeech: 'n'),
];

/// Les champs mot/exemple-bariba intègrent leur propre clavier Bàátɔ̀nú (donc
/// la clé posée n'est pas toujours directement sur le `TextField` interne) ;
/// `matchRoot: true` fait marcher la recherche dans les deux cas.
Finder _field(String key) => find.descendant(of: find.byKey(ValueKey(key)), matching: find.byType(TextField), matchRoot: true);

/// Le bouton d'envoi est en bas d'un `ListView` dans la feuille : tant qu'il
/// n'a pas été scrollé dans la zone visible (+ cache), le sliver ne construit
/// même pas son élément, donc `find.text` le trouve à zéro widget et `tap()`
/// échoue — indépendamment du texte affiché. `scrollUntilVisible` fait défiler
/// la liste par petits pas jusqu'à ce qu'il apparaisse, puis on peut taper.
/// `scrollable:` doit être précisé : par défaut `find.byType(Scrollable)`
/// matche aussi le `Scrollable` interne de chaque `TextField`
/// (`EditableText`), ce qui le rend ambigu dès qu'il y a plus d'un champ —
/// `find.byType(ListView)` cible sans ambiguïté la liste du formulaire.
Future<void> _tapSend(WidgetTester tester) async {
  await tester.scrollUntilVisible(
    find.text('Envoyer la proposition'),
    -300,
    scrollable: find.byType(ListView),
  );
  await tester.tap(find.text('Envoyer la proposition'));
}

Future<void> _open(
  WidgetTester tester, {
  required WordProposalSubmit onSubmit,
  double width = 390,
  double height = 844,
}) async {
  tester.view.physicalSize = Size(width, height);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(MaterialApp(
    theme: SignatureTheme.light(),
    home: Scaffold(
      body: Builder(
        builder: (context) => ElevatedButton(
          onPressed: () => showWordProposalSheet(context, entries: _entries, onSubmit: onSubmit),
          child: const Text('open'),
        ),
      ),
    ),
  ));
  await tester.tap(find.text('open'));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('shows validation errors and keeps submit disabled until word+definition are filled', (tester) async {
    var calls = 0;
    await _open(tester, onSubmit: ({required word, required definition, phonetic, required partOfSpeech, exampleBariba, exampleFrancais}) async {
      calls++;
    });

    expect(find.text('Proposer un mot'), findsOneWidget);
    await _tapSend(tester);
    await tester.pump();
    expect(find.text('Entrez au moins 2 caractères.'), findsOneWidget);
    expect(find.text('La définition est obligatoire.'), findsOneWidget);
    expect(calls, 0);
    expect(tester.takeException(), isNull);
  });

  testWidgets('warns about an existing exact-match word without blocking submission', (tester) async {
    await _open(tester, onSubmit: ({required word, required definition, phonetic, required partOfSpeech, exampleBariba, exampleFrancais}) async {});
    await tester.enterText(_field('proposal-word'), 'dèmi');
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.textContaining('Déjà dans le dictionnaire'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('submits a valid proposal and shows the success confirmation', (tester) async {
    final sent = <Map<String, String?>>[];
    await _open(tester, onSubmit: ({required word, required definition, phonetic, required partOfSpeech, exampleBariba, exampleFrancais}) async {
      sent.add({'word': word, 'definition': definition, 'partOfSpeech': partOfSpeech});
    });

    await tester.enterText(_field('proposal-word'), 'kpɛrɛ');
    await tester.enterText(_field('proposal-definition'), 'Nouveau mot proposé.');
    await _tapSend(tester);
    await tester.pump(const Duration(milliseconds: 50));
    expect(sent.single, {'word': 'kpɛrɛ', 'definition': 'Nouveau mot proposé.', 'partOfSpeech': 'n'});
    expect(find.text('Mot envoyé !'), findsOneWidget);
    expect(tester.takeException(), isNull);
    // Draine le délai avant la fermeture automatique et l'animation de
    // fermeture de la feuille (sinon : timer/ticker encore actifs en fin de test).
    await tester.pumpAndSettle(const Duration(milliseconds: 100));
  });

  testWidgets('shows a dedicated message when sending fails', (tester) async {
    await _open(tester, onSubmit: ({required word, required definition, phonetic, required partOfSpeech, exampleBariba, exampleFrancais}) async {
      throw StateError('network down');
    });
    await tester.enterText(_field('proposal-word'), 'kpɛrɛ');
    await tester.enterText(_field('proposal-definition'), 'Nouveau mot proposé.');
    await _tapSend(tester);
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('Envoi impossible. Vérifiez votre connexion et réessayez.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('fits 320dp width without overflow', (tester) async {
    await _open(
      tester,
      onSubmit: ({required word, required definition, phonetic, required partOfSpeech, exampleBariba, exampleFrancais}) async {},
      width: 320,
    );
    expect(tester.takeException(), isNull);
  });
}
