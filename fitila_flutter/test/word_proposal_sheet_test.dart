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
/// échoue — indépendamment du texte affiché. On défile donc par petits pas
/// jusqu'à ce qu'il apparaisse, puis on tape.
///
/// `scrollUntilVisible` aurait été plus direct, mais son argument
/// `scrollable:` doit résolument être un `Scrollable` (il le caste tel
/// quel) : `find.byType(Scrollable)` matche aussi le `Scrollable` interne de
/// chaque `TextField` (`EditableText`) et devient ambigu, et
/// `find.byType(ListView)` échoue le cast. On pilote donc le défilement à
/// la main sur le `ListView` du formulaire (clé dédiée), qui n'a pas besoin
/// d'être du type exact `Scrollable` pour qu'on puisse le faire glisser.
Future<void> _tapSend(WidgetTester tester) async {
  final list = find.byKey(const ValueKey('proposal-form-list'));
  for (var i = 0; i < 10 && find.text('Envoyer la proposition').evaluate().isEmpty; i++) {
    await tester.drag(list, const Offset(0, -300));
    await tester.pump(const Duration(milliseconds: 50));
  }
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
    // `pumpAndSettle(100ms)` ne suffit pas : tant que rien ne redemande de
    // frame (ce qui est le cas pendant toute l'attente), il considère que
    // c'est déjà « réglé » après un seul pas et s'arrête — sans jamais
    // atteindre les 1300ms du délai, dont le minuteur resterait actif à la
    // fin du test. On avance donc d'abord explicitement au-delà du délai
    // (ce qui déclenche la fermeture), puis on laisse `pumpAndSettle()`
    // terminer l'animation de fermeture de la feuille qui s'ensuit.
    await tester.pump(const Duration(milliseconds: 1350));
    await tester.pumpAndSettle();
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
