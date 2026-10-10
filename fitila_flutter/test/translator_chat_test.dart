import 'dart:async';

import 'package:fitila_native/core/signature_theme.dart';
import 'package:fitila_native/translator/translator_chat.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> pumpChat(WidgetTester tester, TranslatorPorts ports, {double width = 390}) async {
  tester.view.physicalSize = Size(width, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(MaterialApp(theme: SignatureTheme.light(), home: Scaffold(body: Padding(padding: const EdgeInsets.all(12), child: TranslatorChat(ports: ports)))));
  await tester.pump(const Duration(milliseconds: 300));
}

void main() {
  test('detectChatLanguage recognises French and Bariba', () {
    expect(detectChatLanguage('Bonjour, comment allez-vous ?'), ChatLang.french);
    expect(detectChatLanguage('Je voudrais de l’eau'), ChatLang.french);
    expect(detectChatLanguage('Ǹ sɔ̃ɔ̀ wíru'), ChatLang.bariba);
    expect(detectChatLanguage('ab'), isNull);
  });

  testWidgets('chat shows welcome, modes and toggles without overflow at 320dp', (tester) async {
    await pumpChat(tester, TranslatorPorts(translate: (t, b) async => t), width: 320);
    for (final l in ['Voix', 'Texte', 'Photo', 'Coller', 'Doc']) {
      expect(find.text(l), findsOneWidget);
    }
    expect(find.text('Mode conversation'), findsOneWidget);
    expect(find.textContaining('Détection'), findsOneWidget);
    expect(find.text('Traduisez simplement'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('keyboard keeps text composer visible and hides non-essential welcome content', (tester) async {
    await pumpChat(tester, TranslatorPorts(translate: (t, b) async => t), width: 320);
    tester.view.viewInsets = const FakeViewPadding(bottom: 320);
    addTearDown(tester.view.resetViewInsets);
    await tester.pump();

    expect(find.byKey(const ValueKey('text-composer')), findsOneWidget);
    expect(find.byKey(const ValueKey('send')), findsOneWidget);
    for (final l in ['Voix', 'Texte', 'Photo', 'Coller', 'Doc']) {
      expect(find.text(l), findsOneWidget);
    }
    expect(tester.takeException(), isNull);
  });

  testWidgets('sending text produces a source bubble, typing dots then the translation, and saves history', (tester) async {
    final gate = Completer<String>();
    final saved = <String>[];
    await pumpChat(
      tester,
      TranslatorPorts(translate: (t, toBariba) => gate.future, saveHistory: (s, r, b, m) => saved.add('$s>$r>$b>$m')),
    );
    await tester.enterText(find.byType(TextField).first, 'Bonjour, comment allez-vous ?');
    await tester.pump();
    expect(find.textContaining('Détecté : Français'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('send')));
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('Bonjour, comment allez-vous ?'), findsOneWidget);
    expect(find.byKey(const ValueKey('typing-1')), findsOneWidget);
    gate.complete('Yɛ́ɛ̀ bɛ̀ɛ?');
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byKey(const ValueKey('result-1')), findsOneWidget);
    expect(find.text('Yɛ́ɛ̀ bɛ̀ɛ?'), findsOneWidget);
    expect(saved, ['Bonjour, comment allez-vous ?>Yɛ́ɛ̀ bɛ̀ɛ?>true>Texte']);
    expect(tester.takeException(), isNull);
  });

  testWidgets('auto-detect routes Bariba input to French', (tester) async {
    bool? seen;
    await pumpChat(tester, TranslatorPorts(translate: (t, b) async {
      seen = b;
      return 'Bonjour';
    }));
    await tester.enterText(find.byType(TextField).first, 'Ǹ sɔ̃ɔ̀ wíru');
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('send')));
    await tester.pump(const Duration(milliseconds: 400));
    expect(seen, isFalse);
    expect(tester.takeException(), isNull);
  });

  testWidgets('failure shows a readable error and Retry succeeds', (tester) async {
    var calls = 0;
    await pumpChat(tester, TranslatorPorts(translate: (t, b) async {
      if (++calls == 1) throw StateError('Serveur occupé');
      return 'Merci';
    }));
    await tester.tap(find.byKey(const ValueKey('sample-Merci beaucoup')));
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('Serveur occupé'), findsOneWidget);
    await tester.tap(find.text('Réessayer'));
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('Merci'), findsOneWidget);
    expect(calls, 2);
  });

  testWidgets('voice flow records, transcribes and translates', (tester) async {
    final calls = <String>[];
    await pumpChat(
      tester,
      TranslatorPorts(
        translate: (t, b) async => 'trad:$t',
        startVoice: () async => calls.add('start'),
        stopVoice: (bariba) async {
          calls.add('stop:$bariba');
          return 'Bonsoir';
        },
      ),
    );
    await tester.tap(find.text('Voix'));
    await tester.pump(const Duration(milliseconds: 300));
    await tester.tap(find.byKey(const ValueKey('voice')));
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('Je vous écoute…'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('voice')));
    await tester.pump(const Duration(milliseconds: 400));
    expect(calls, ['start', 'stop:false']);
    expect(find.text('trad:Bonsoir'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('swap changes direction and OCR adds a bubble', (tester) async {
    bool? seenTo;
    await pumpChat(
      tester,
      TranslatorPorts(
        translate: (t, b) async {
          seenTo = b;
          return 'x';
        },
        ocr: (toBariba, doc) async => (extracted: 'Texte du doc', translation: 'Traduit'),
      ),
    );
    await tester.tap(find.byKey(const ValueKey('swap')));
    await tester.pump();
    await tester.tap(find.text('Doc'));
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('Texte du doc'), findsOneWidget);
    expect(find.text('Traduit'), findsOneWidget);
    expect(seenTo, isNull);
    expect(tester.takeException(), isNull);
  });
}
