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
      expect(ids.length, 3);
      expect(DunyaLanguageModeX.parse('bba'), DunyaLanguageMode.bariba);
      expect(DunyaLanguageModeX.parse('both'), DunyaLanguageMode.bilingual);
      expect(DunyaLanguageModeX.parse(null), DunyaLanguageMode.french);
    });
  });

  group('Translator chain', () {
    tearDown(() {
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

    test('rejects echoes and failures', () async {
      DunyaTranslator.online = (text, toBariba) async => text;
      expect(await DunyaTranslator.translate('bonjour', toBariba: true), isNull);
      DunyaTranslator.online = (text, toBariba) async => throw Exception('réseau');
      expect(await DunyaTranslator.translate('bonjour', toBariba: true), isNull);
    });
  });
}
