import 'package:fitila_native/auth/auth_flow.dart';
import 'package:fitila_native/core/signature_theme.dart';
import 'package:fitila_native/dictionary/dictionary_experience.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

Future<void> pump(WidgetTester tester, Widget child, {double width = 390, double height = 844}) async {
  tester.view.physicalSize = Size(width, height);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(MaterialApp(theme: SignatureTheme.light(), home: Scaffold(body: Padding(padding: const EdgeInsets.all(12), child: child))));
  await tester.pump(const Duration(milliseconds: 300));
}

const _entries = [
  DictEntry(word: 'dèmi', definition: 'Habitude.', phonetic: 'dèmi', partOfSpeech: 'n', exampleBariba: 'Dèmi ka n yã.', exampleFrench: 'C’est une habitude.'),
  DictEntry(word: 'dèra', definition: 'Marcher.', partOfSpeech: 'v'),
  DictEntry(word: 'bɔ̀ɔ', definition: 'Maison.'),
];

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('foldDict ignores tones and case but keeps open vowels distinct', () {
    expect(foldDict('Bàátɔ̀nú'), 'baatɔnu');
    expect(foldDict('ɛ'), isNot(foldDict('e')));
  });

  test('searchDict ranks exact, prefix, contains and supports both directions', () {
    final r = searchDict(_entries, 'DEMI', baToFr: true);
    expect(r.first.word, 'dèmi');
    expect(searchDict(_entries, 'de', baToFr: true).map((e) => e.word), containsAll(['dèmi', 'dèra']));
    expect(searchDict(_entries, 'maison', baToFr: false).single.word, 'bɔ̀ɔ');
    expect(searchDict(_entries, '', baToFr: true), isEmpty);
  });

  testWidgets('dictionary: word of the day, search, detail, favorite and recents persist', (tester) async {
    await pump(tester, DictionaryExperience(entries: _entries, now: DateTime(2026, 1, 1), speak: (t, b) async {}, onPropose: () {}));
    expect(find.text('MOT DU JOUR'), findsOneWidget);
    expect(find.text('Clavier'), findsOneWidget);
    expect(find.text('Vocal'), findsOneWidget);

    await tester.enterText(find.byType(TextField).first, 'demi');
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('1 résultat'), findsOneWidget);
    await tester.tap(find.text('dèmi').last);
    await tester.pump(const Duration(milliseconds: 500));
    expect(find.text('Habitude.'), findsOneWidget);
    expect(find.textContaining('Définition'), findsOneWidget);
    expect(find.textContaining('Exemple en Bàátɔ̀nú'), findsOneWidget);

    await tester.tap(find.byTooltip('Ajouter aux favoris'));
    await tester.pump();
    expect(find.byTooltip('Retirer des favoris'), findsOneWidget);
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getStringList('dict_favs'), isNotEmpty);
    expect(prefs.getStringList('dict_recent'), ['dèmi']);
    expect(tester.takeException(), isNull);
  });

  testWidgets('dictionary: empty result offers to propose a word, 320dp has no overflow', (tester) async {
    await pump(tester, DictionaryExperience(entries: _entries, onPropose: () {}), width: 320);
    await tester.enterText(find.byType(TextField).first, 'zzzz');
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.textContaining('Aucun résultat'), findsOneWidget);
    expect(find.text('Proposer ce mot'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('auth: two slides, validation, sign-in and sign-up flows', (tester) async {
    final calls = <String>[];
    await pump(
      tester,
      AuthFlow(
        autoPlay: false,
        onSignIn: (p, pin) async {
          calls.add('in:$p:$pin');
          if (pin == '000000') throw StateError('Numéro ou PIN incorrect.');
        },
        onSignUp: (n, p, pin) async => calls.add('up:$n:$p:$pin'),
      ),
    );
    expect(find.text('Parlez sans frontières'), findsOneWidget);
    await tester.drag(find.byKey(const ValueKey('landing-slides')), const Offset(-400, 0));
    await tester.pump(const Duration(milliseconds: 800));
    expect(find.text('Apprenez, transmettez'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('auth-submit')));
    await tester.pump();
    expect(find.byKey(const ValueKey('auth-error')), findsOneWidget);

    await tester.enterText(find.byKey(const ValueKey('auth-phone')), '65653468');
    await tester.enterText(find.byKey(const ValueKey('auth-pin')), '000000');
    await tester.tap(find.byKey(const ValueKey('auth-submit')));
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('Numéro ou PIN incorrect.'), findsOneWidget);

    await tester.tap(find.text('Inscription'));
    await tester.pump(const Duration(milliseconds: 400));
    await tester.enterText(find.byKey(const ValueKey('auth-name')), 'Awa');
    await tester.enterText(find.byKey(const ValueKey('auth-pin')), '123456');
    await tester.enterText(find.byKey(const ValueKey('auth-pin2')), '654321');
    await tester.tap(find.byKey(const ValueKey('auth-submit')));
    await tester.pump();
    expect(find.textContaining('ne correspondent pas'), findsOneWidget);
    await tester.enterText(find.byKey(const ValueKey('auth-pin2')), '123456');
    await tester.tap(find.byKey(const ValueKey('auth-submit')));
    await tester.pump(const Duration(milliseconds: 100));
    expect(calls.last, 'up:Awa:65653468:123456');
    expect(tester.takeException(), isNull);
  });

  for (final w in [320.0, 900.0]) {
    testWidgets('auth fits ${w.toInt()}dp without overflow', (tester) async {
      await pump(tester, AuthFlow(autoPlay: false, onSignIn: (a, b) async {}, onSignUp: (a, b, c) async {}), width: w, height: w > 500 ? 800 : 640);
      await tester.tap(find.text('Inscription'));
      await tester.pump(const Duration(milliseconds: 400));
      expect(tester.takeException(), isNull);
    });
  }
}
