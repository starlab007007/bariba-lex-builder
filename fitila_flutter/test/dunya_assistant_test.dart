import 'package:fitila_native/dunya/voice/dunya_assistant.dart';
import 'package:fitila_native/dunya/voice/dunya_settings.dart';
import 'package:fitila_native/dunya/voice/dunya_translator.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Sentence splitter (speak while the brain thinks)', () {
    test('emits complete sentences as tokens arrive', () {
      final s = DunyaSentenceSplitter();
      expect(s.add('Bonjour, je suis Du'), isEmpty);
      expect(s.add('nya. Comment puis-je '), ['Bonjour, je suis Dunya.']);
      expect(s.add('vous aider ? Je'), ['Comment puis-je vous aider ?']);
      expect(s.flush(), 'Je');
    });

    test('does not cut decimals or short abbreviations', () {
      final s = DunyaSentenceSplitter();
      expect(s.add('Le prix est 3.5 euros'), isEmpty);
      expect(s.add(' le kilo. Fin'), ['Le prix est 3.5 euros le kilo.']);
    });

    test('cuts very long sentences at a comma', () {
      final s = DunyaSentenceSplitter();
      final long = '${'mot ' * 30}, ${'suite ' * 20}';
      expect(s.add(long), isNotEmpty);
    });
  });

  group('Speech cleaning', () {
    test('removes markdown, bullets, links and emojis', () {
      expect(cleanForSpeech('**Bonjour** 👋\n- point un\n[lien](https://x.y)'), 'Bonjour point un lien');
    });
  });

  group('Language modes', () {
    test('each mode has its own conversation', () {
      final ids = DunyaLanguageMode.values.map((m) => m.conversationId).toSet();
      expect(ids.length, 2);
      expect(DunyaLanguageModeX.parse('bba'), DunyaLanguageMode.bariba);
      expect(DunyaLanguageModeX.parse('both'), DunyaLanguageMode.french);
      expect(DunyaLanguageModeX.parse(null), DunyaLanguageMode.french);
    });
  });

  group('DUNYA hybrid execution preferences', () {
    test('automatic is the default, including unknown values', () {
      expect(DunyaExecutionModeX.parse(null), DunyaExecutionMode.automatic);
      expect(DunyaExecutionModeX.parse('unknown'), DunyaExecutionMode.automatic);
      expect(DunyaExecutionModeX.parse('online'), DunyaExecutionMode.online);
      expect(DunyaExecutionModeX.parse('offline'), DunyaExecutionMode.offline);
    });
  });

  group('Translator chain', () {
    setUp(() {
      DunyaTranslator.allowRemote = () => true;
      DunyaTranslator.preferRemote = () => false;
    });
    tearDown(() {
      DunyaTranslator.allowRemote = null;
      DunyaTranslator.preferRemote = null;
      DunyaTranslator.offline = null;
      DunyaTranslator.online = null;
    });

    test('prefers the on-device engine, then online', () async {
      DunyaTranslator.offline = (text, toBariba) async => null;
      DunyaTranslator.online = (text, toBariba) async => toBariba ? 'a kua' : 'merci';
      final t = await DunyaTranslator.translate('merci', toBariba: true);
      expect(t?.text, 'a kua');
      expect(t?.engine, 'online');
    });

    test('online-first policy uses server instead of an installed local model', () async {
      DunyaTranslator.preferRemote = () => true;
      var offlineCalls = 0;
      DunyaTranslator.offline = (text, direction) async {
        offlineCalls++;
        return 'ancienne traduction locale';
      };
      DunyaTranslator.online = (text, direction) async => 'traduction serveur';
      final result = await DunyaTranslator.translate('phrase nouvelle', toBariba: true);
      expect(result?.engine, 'online');
      expect(result?.text, 'traduction serveur');
      expect(offlineCalls, 0);
    });

    test('explicit offline mode never invokes server translation', () async {
      var requests = 0;
      DunyaTranslator.allowRemote = () => false;
      DunyaTranslator.offline = null;
      DunyaTranslator.online = (text, direction) async {
        requests++;
        return 'réponse distante';
      };
      final output = await DunyaTranslator.translate('phrase non attestée', toBariba: true);
      expect(output, isNull);
      expect(requests, 0);
    });

    test('rejects echoes and failures', () async {
      DunyaTranslator.online = (text, toBariba) async => text;
      expect(await DunyaTranslator.translate('bonjour', toBariba: true), isNull);
      DunyaTranslator.online = (text, toBariba) async => throw Exception('réseau');
      expect(await DunyaTranslator.translate('bonjour', toBariba: true), isNull);
    });
  });
}
