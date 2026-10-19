import 'package:flutter_test/flutter_test.dart';
import 'package:fitila_native/dunya/voice/dunya_translation_memory.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test('Memory matches both translation directions without a network dependency', () {
    final memory = DunyaTranslationMemory([
      ['Cette banane est bonne', 'Agɛdɛ ye ya do', 'A'],
    ]);
    expect(memory.lookup('Cette banane est bonne', toBariba: true)?.text, 'Agɛdɛ ye ya do');
    expect(memory.lookup('Agɛdɛ ye ya do', toBariba: false)?.text, 'Cette banane est bonne');
    expect(memory.lookup('Phrase inconnue', toBariba: true), isNull);
  });
}
