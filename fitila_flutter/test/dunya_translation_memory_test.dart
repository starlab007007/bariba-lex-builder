import 'package:fitila_native/dunya/voice/dunya_translation_memory.dart';
import 'package:fitila_native/dunya/voice/dunya_translator.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final memory = DunyaTranslationMemory([
    ['Salut ! Bonne arrivée !', 'Aagu wunɛ ka weru.', 'A'],
    ['Quand es-tu venu ?', 'Domma a na?', 'A'],
    ['Si tu salues le forgeron, salue aussi celui qui active les soufflets.', 'À n seko tɔbura, a maa wãa wuro tɔbiri.', 'A'],
  ]);

  group('translation memory', () {
    test('French lookup ignores case, accents and spacing before punctuation', () {
      expect(memory.lookup('salut! bonne arrivee', toBariba: true)?.text, 'Aagu wunɛ ka weru.');
      expect(memory.lookup('Quand es-tu venu?', toBariba: true)?.exact, isTrue);
    });

    test('Baatɔnum lookup ignores tones and recogniser spellings', () {
      expect(memory.lookup('domma a na', toBariba: false)?.text, 'Quand es-tu venu ?');
      expect(memory.lookup('Dòmma a nà', toBariba: false)?.text, 'Quand es-tu venu ?');
    });

    test('one-letter recogniser error on a long sentence is a near hit, never exact', () {
      final hit = memory.lookup('a n seko tɔbura a maa wãa wuro tɔbirj', toBariba: false);
      expect(hit, isNotNull);
      expect(hit!.exact, isFalse);
      expect(hit.text, startsWith('Si tu salues le forgeron'));
    });

    test('near hits are suggestions only, not automatic translations', () async {
      const misspelt = 'a n seko tɔbura a maa wãa wuro tɔbirj';
      expect(memory.lookup(misspelt, toBariba: false)?.exact, isFalse);
      expect(await memory.translate(misspelt, false), isNull);
    });

    test('short or unknown sentences do not match approximately', () {
      expect(memory.lookup('domma a nu', toBariba: false), isNull);
      expect(memory.lookup('une phrase inconnue du corpus', toBariba: true), isNull);
    });

    test('conflicting French source is never automatically translated', () async {
      final conflicting = DunyaTranslationMemory([
        ['La mère allaite son enfant.', 'Bii mɛro u win bii bɔm kɛ̃mɔ.', 'A'],
        ['La mère allaite son enfant.', 'Autre traduction', 'A'],
      ]);
      expect(conflicting.lookup('La mère allaite son enfant.', toBariba: true), isNull);
      expect(await conflicting.translate('La mère allaite son enfant.', true), isNull);
    });

    test('conflicting Baatɔnum source is never automatically translated', () async {
      final conflicting = DunyaTranslationMemory([
        ['Une traduction', 'Bii mɛro u win bii bɔm kɛ̃mɔ.', 'A'],
        ['Autre traduction', 'Bii mɛro u win bii bɔm kɛ̃mɔ.', 'A'],
      ]);
      expect(conflicting.lookup('Bii mɛro u win bii bɔm kɛ̃mɔ.', toBariba: false), isNull);
      expect(await conflicting.translate('Bii mɛro u win bii bɔm kɛ̃mɔ.', false), isNull);
    });

    test('identical duplicates are accepted', () {
      final duplicate = DunyaTranslationMemory([
        ['La mère allaite son enfant.', 'Bii mɛro u win bii bɔm kɛ̃mɔ.', 'A'],
        ['La mère allaite son enfant.', 'Bii mɛro u win bii bɔm kɛ̃mɔ.', 'A'],
      ]);
      expect(duplicate.lookup('La mère allaite son enfant.', toBariba: true)?.text,
          'Bii mɛro u win bii bɔm kɛ̃mɔ.');
    });

    test('similar examples are advisory, not automatic translations', () async {
      final candidates = memory.suggestSimilar(
        'Si tu salues le forgeron, salue le forgeron demain.',
        toBariba: true,
      );
      expect(candidates, isNotEmpty);
      expect(candidates.first.source, contains('forgeron'));
      expect(await memory.translate(
        'Si tu salues le forgeron, salue le forgeron demain.', true), isNull);
    });

    test('similar examples require meaningful overlap', () {
      expect(memory.suggestSimilar('xyz inconnu', toBariba: true), isEmpty);
      expect(memory.suggestSimilar('salut', toBariba: true), isEmpty);
    });

    test('edit distance helper stops early', () {
      expect(boundedEditDistance('abc', 'abd', 1), 1);
      expect(boundedEditDistance('abc', 'xyz', 1), greaterThan(1));
    });
  });

  group('translator engine order', () {
    setUp(() {
      // Tests that require a server must enable it explicitly, as main.dart
      // does after checking mode and connectivity. Production defaults deny.
      DunyaTranslator.allowRemote = () => true;
      DunyaTranslator.preferRemote = () => false;
    });
    tearDown(() {
      DunyaTranslator.memory = null;
      DunyaTranslator.offline = null;
      DunyaTranslator.online = null;
      DunyaTranslator.allowRemote = null;
      DunyaTranslator.preferRemote = null;
    });

    test('default secure policy never makes an unapproved cloud request', () async {
      DunyaTranslator.allowRemote = null;
      var cloudCalls = 0;
      DunyaTranslator.memory = null;
      DunyaTranslator.offline = null;
      DunyaTranslator.online = (text, direction) async {
        cloudCalls++;
        return 'translation cloud';
      };
      final result = await DunyaTranslator.translate('une nouvelle phrase', toBariba: true);
      expect(result, isNull);
      expect(cloudCalls, 0);
    });

    test('memory answers first and the network is never used for known sentences', () async {
      var onlineCalls = 0;
      DunyaTranslator.memory = (t, toBariba) async => memory.translate(t, toBariba);
      DunyaTranslator.online = (t, toBariba) async {
        onlineCalls++;
        return 'réponse réseau';
      };
      final known = await DunyaTranslator.translate('Quand es-tu venu ?', toBariba: true);
      expect(known?.engine, 'memory');
      expect(known?.text, 'Domma a na?');
      final unknown = await DunyaTranslator.translate('Une autre phrase', toBariba: true);
      expect(unknown?.engine, 'online');
      expect(onlineCalls, 1);
    });
  });
}
