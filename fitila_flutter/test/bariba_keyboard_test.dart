import 'dart:convert';
import 'dart:io';

import 'package:fitila_native/keyboard/bariba_input.dart';
import 'package:fitila_native/keyboard/bariba_keyboard_engine.dart';
import 'package:fitila_native/keyboard/bariba_virtual_keyboard.dart';
import 'package:fitila_native/keyboard/keyboard_onboarding.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

BaribaKeyboardEngine _engine() => BaribaKeyboardEngine.fromJson({
  'entries': [
    {'ba': 'nɛɛ', 'fr': 'quand', 'freq': 50},
    {'ba': 'na', 'fr': 'venir', 'freq': 90},
    {'ba': 'nàrú', 'fr': 'viande, chair', 'freq': 10},
    {'ba': 'bɔ̃', 'fr': 'chose', 'freq': 30},
  ],
  'phrases': [
    {'ba': 'A nɛɛ a wa?', 'fr': 'Quand es-tu venu?'},
  ],
  'bigrams': {
    'nɛɛ': ['na', 'bɔ̃'],
  },
});

void main() {
  group('engine', () {
    test('folds tones, nasals and Bariba letters', () {
      expect(BaribaKeyboardEngine.foldKey('Nɛ̃ɛ̀'), 'nee');
      expect(BaribaKeyboardEngine.foldKey('ŋɔ́'), 'no');
      expect(BaribaKeyboardEngine.foldKey('ã ĩ ũ õ ẽ'), 'a i u o e');
    });

    test('predicts by prefix ranked by frequency, plain keys match accents', () {
      final e = _engine();
      expect(e.predict('n').map((x) => x.ba), ['na', 'nɛɛ', 'nàrú']);
      expect(e.predict('nar').map((x) => x.ba), ['nàrú']);
      expect(e.predict('b').map((x) => x.ba), ['bɔ̃']);
    });

    test('empty prefix uses bigrams of the previous word', () {
      final e = _engine();
      expect(e.predict('', previous: 'nɛɛ').map((x) => x.ba), ['na', 'bɔ̃']);
    });

    test('current/previous word and suggestion application', () {
      const text = 'nɛɛ na';
      expect(BaribaKeyboardEngine.currentWord(text, text.length), 'na');
      expect(BaribaKeyboardEngine.previousWord(text, text.length), 'nɛɛ');
      final r = BaribaKeyboardEngine.applySuggestion('nɛɛ n', 5, 'na');
      expect(r.text, 'nɛɛ na ');
      expect(r.cursor, 7);
    });

    test('combining tone marks are appended after the cursor letter', () {
      final r = BaribaKeyboardEngine.applyCombining('ɛ', 1, BaribaKeyboardEngine.combiningTilde);
      expect(r.text, 'ɛ̃');
      expect(r.cursor, 2);
    });

    test('offline translation both ways, phrase and word', () {
      final e = _engine();
      expect(e.translateOffline('na', KeyboardTranslationDirection.baribaToFrench), 'venir');
      expect(e.translateOffline('venir', KeyboardTranslationDirection.frenchToBariba), 'na');
      expect(e.translateOffline('nàrú', KeyboardTranslationDirection.baribaToFrench), 'viande');
      expect(
        e.translateOffline('Quand es-tu venu?', KeyboardTranslationDirection.frenchToBariba),
        'A nɛɛ a wa?',
      );
      expect(e.translateOffline('zzz', KeyboardTranslationDirection.baribaToFrench), isNull);
    });

    test('bundled dictionary loads and predicts', () {
      final json = jsonDecode(
        File('assets/data/bariba_keyboard_dictionary.json').readAsStringSync(),
      ) as Map<String, dynamic>;
      final e = BaribaKeyboardEngine.fromJson(json);
      expect(e.entryCount, greaterThan(5000));
      expect(e.predict('n'), isNotEmpty);
    });
  });

  group('virtual keyboard', () {
    Future<TextEditingController> pump(
      WidgetTester tester, {
      KeyboardTranslator? translator,
    }) async {
      final controller = TextEditingController();
      addTearDown(controller.dispose);
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Align(
              alignment: Alignment.bottomCenter,
              child: BaribaVirtualKeyboard(
                controller: controller,
                engine: _engine(),
                translator: translator,
              ),
            ),
          ),
        ),
      );
      return controller;
    }

    testWidgets('types letters, nasals and tones into the controller', (tester) async {
      final c = await pump(tester);
      await tester.tap(find.byKey(const ValueKey('key-n')));
      await tester.tap(find.byKey(const ValueKey('key-ɛ')));
      await tester.tap(find.byKey(const ValueKey('key-◌̃')));
      await tester.tap(find.byKey(const ValueKey('key-ã')));
      await tester.tap(find.byKey(const ValueKey('key-ə')));
      expect(c.text, 'nɛ̃ãə');
      await tester.tap(find.byKey(const ValueKey('key-backspace')));
      await tester.pump(const Duration(milliseconds: 20));
      await tester.pump(const Duration(milliseconds: 500));
      expect(c.text, 'nɛ̃ã');
    });

    testWidgets('fits a 320dp phone in translate mode without overflow', (tester) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      final c = await pump(tester, translator: (t, d) async => null);
      await tester.tap(find.byKey(const ValueKey('translate-toggle')));
      await tester.pumpAndSettle();
      c.text = 'nɛ̃ɛ̀ ba';
      await tester.pump(const Duration(seconds: 1));
      expect(tester.takeException(), isNull);
    });

    testWidgets('suggestion bar completes the current word', (tester) async {
      final c = await pump(tester);
      await tester.tap(find.byKey(const ValueKey('key-n')));
      await tester.pump();
      expect(find.byKey(const ValueKey('suggestion-na')), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('suggestion-na')));
      expect(c.text, 'na ');
    });

    testWidgets('Saisir et Traduire shows offline then online translation', (tester) async {
      final c = await pump(
        tester,
        translator: (text, dir) async => 'traduit: $text',
      );
      await tester.tap(find.byKey(const ValueKey('translate-toggle')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('key-n')));
      await tester.tap(find.byKey(const ValueKey('key-a')));
      await tester.pump();
      // Default direction is FR→BA; swap to BA→FR for the offline hit.
      await tester.tap(find.byKey(const ValueKey('direction-swap')));
      await tester.pump();
      expect(find.text('venir'), findsOneWidget);
      await tester.pump(const Duration(seconds: 1));
      expect(find.text('traduit: na'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('translation-apply')));
      await tester.pump();
      expect(c.text, 'traduit: na');
    });
  });

  group('onboarding + bridge', () {
    const channel = MethodChannel('fitila/keyboard');

    tearDown(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, null);
    });

    testWidgets('android steps reflect native status', (tester) async {
      final calls = <String>[];
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (call) async {
        calls.add(call.method);
        if (call.method == 'getKeyboardStatus') {
          return {'enabled': true, 'selected': false, 'platform': 'android'};
        }
        return null;
      });
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(body: KeyboardOnboarding()),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Ajouté, pas encore sélectionné'), findsOneWidget);
      await tester.tap(find.text('Choisir le clavier'));
      await tester.pump(const Duration(seconds: 1));
      expect(calls, contains('showInputMethodPicker'));
    });

    testWidgets('unsupported platform falls back to in-app keyboard message', (tester) async {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (call) async {
        throw MissingPluginException();
      });
      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: KeyboardOnboarding())),
      );
      await tester.pumpAndSettle();
      expect(find.text('Clavier système indisponible ici'), findsOneWidget);
      expect(find.byType(BaribaTextField), findsOneWidget);
    });

    testWidgets('BaribaTextField docks the virtual keyboard when no system IME', (tester) async {
      final c = TextEditingController();
      addTearDown(c.dispose);
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: SingleChildScrollView(child: BaribaTextField(controller: c))),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byType(BaribaVirtualKeyboard), findsNothing);
      await tester.tap(find.byType(TextField));
      await tester.pumpAndSettle();
      expect(find.byType(BaribaVirtualKeyboard), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('key-ŋ')));
      expect(c.text, 'ŋ');
    });
  });
}
