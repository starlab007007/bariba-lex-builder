import 'package:fitila_native/espace/espace_models.dart';
import 'package:fitila_native/espace/espace_smart_editor.dart';
import 'package:fitila_native/keyboard/bariba_input.dart';
import 'package:fitila_native/keyboard/bariba_keyboard_engine.dart';
import 'package:fitila_native/keyboard/bariba_virtual_keyboard.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

BaribaKeyboardEngine _engine() => BaribaKeyboardEngine.fromJson({
  'entries': [
    {'ba': 'nɛɛ', 'fr': 'inv', 'freq': 90},
    {'ba': 'na', 'fr': 'venir', 'freq': 80},
    {'ba': 'nàrú', 'fr': 'viande, chair', 'freq': 10},
    {'ba': 'wɔ', 'fr': 'maison', 'freq': 40},
    {'ba': 'wo', 'fr': 'maison', 'freq': 20},
    {'ba': 'sia', 'fr': 'eau', 'freq': 30},
  ],
  'phrases': [
    {'ba': 'A nɛɛ a wa?', 'fr': 'Quand es-tu venu?'},
  ],
  'bigrams': {
    'nɛɛ': ['na'],
  },
});

void main() {
  group('engine additions', () {
    test('grammar-only glosses are not translations', () {
      expect(BaribaKeyboardEngine.glossHead('inv'), '');
      expect(BaribaKeyboardEngine.glossHead('int'), '');
      expect(BaribaKeyboardEngine.glossHead('viande, chair (voir …)'), 'viande');
      final e = _engine();
      expect(e.translateOffline('nɛɛ', KeyboardTranslationDirection.baribaToFrench), isNull);
    });

    test('lookup, lookupFrench and direction detection', () {
      final e = _engine();
      expect(e.lookup('nare').map((x) => x.ba), isEmpty);
      expect(e.lookup('naru').map((x) => x.ba), ['nàrú']);
      expect(e.lookupFrench('maison').map((x) => x.ba), containsAll(['wɔ', 'wo']));
      expect(e.detectDirection('venir'), KeyboardTranslationDirection.frenchToBariba);
      expect(e.detectDirection('sia na'), KeyboardTranslationDirection.baribaToFrench);
    });

    test('OCR correction restores special letters and tolerates missing tones', () {
      final e = _engine();
      final r = e.correctText('nee na naru');
      expect(r.text, 'nɛɛ na nàrú');
      expect(r.corrections, 2);
      expect(e.isKnown('nárú'), isTrue); // ton aigu accepté
    });
  });

  group('html <-> plain', () {
    test('paragraphs and entities round trip', () {
      const html = '<h1>Titre</h1><p>Nɛɛ <b>na</b> &amp; wɔ<br>ligne</p><p>Deux</p>';
      final plain = htmlToPlain(html);
      expect(plain, 'Titre\n\nNɛɛ na & wɔ\nligne\n\nDeux');
      expect(plainToHtml('A & B\n\nC'), '<p>A &amp; B</p><p>C</p>');
      expect(hasRichFormatting(html), isTrue);
      expect(hasRichFormatting('<p>simple</p>'), isFalse);
    });
  });

  group('smart editor', () {
    Future<TextEditingController> pump(WidgetTester tester, {KeyboardTranslator? translator}) async {
      BaribaKeyboardServices.translator = translator;
      final c = TextEditingController();
      addTearDown(() {
        BaribaKeyboardServices.translator = null;
        c.dispose();
      });
      await tester.pumpWidget(MaterialApp(home: Scaffold(body: EspaceSmartEditor(controller: c, engine: _engine()))));
      await tester.pump();
      return c;
    }

    testWidgets('typing shows word gloss and predictions, tapping completes', (tester) async {
      final c = await pump(tester);
      await tester.enterText(find.byType(TextField), 'si');
      await tester.pump();
      expect(find.byKey(const ValueKey('espace-suggestion-sia')), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('espace-suggestion-sia')));
      await tester.pump();
      expect(c.text, 'sia ');
      // le mot précédent est traduit
      expect(find.byKey(const ValueKey('espace-gloss')), findsOneWidget);
      expect(find.textContaining('= eau'), findsOneWidget);
    });

    testWidgets('live translation of the paragraph (FR -> BA auto)', (tester) async {
      final c = await pump(tester);
      c.text = 'venir';
      await tester.pump();
      expect(find.byKey(const ValueKey('espace-live-strip')), findsOneWidget);
      expect(find.text('na'), findsWidgets);
      expect(find.textContaining('FR→BA'), findsOneWidget);
    });

    testWidgets('selecting a word opens the card and replaces it with an equivalent', (tester) async {
      final c = await pump(tester);
      c.text = 'maison ici';
      c.selection = const TextSelection(baseOffset: 0, extentOffset: 6);
      await tester.pump();
      expect(find.byKey(const ValueKey('espace-selection-card')), findsOneWidget);
      // équivalents Bariba à choisir (wɔ / wo)
      expect(find.text('wɔ'), findsWidgets);
      await tester.tap(find.widgetWithText(ActionChip, 'wo'));
      await tester.pump();
      expect(c.text, 'wo ici');
      expect(find.byKey(const ValueKey('espace-selection-card')), findsNothing);
    });

    testWidgets('online translation upgrades the offline answer', (tester) async {
      final c = await pump(tester, translator: (t, d) async => 'IA:$t');
      c.text = 'venir vite';
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 900));
      expect(find.text('IA:venir vite'), findsOneWidget);
      expect(find.text('traduction IA'), findsOneWidget);
    });

    testWidgets('fits a 320dp phone without overflow with card + strip', (tester) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      final c = await pump(tester);
      c.text = 'maison';
      c.selection = const TextSelection(baseOffset: 0, extentOffset: 6);
      await tester.pump();
      expect(tester.takeException(), isNull);
    });
  });
}
