import 'package:flutter_test/flutter_test.dart';
import 'package:fitila_native/dunya/voice/dunya_linguistic_quality.dart';
import 'package:fitila_native/dunya/voice/dunya_translator.dart';

void main() {
  const engine = DunyaLinguisticQualityEngine();
  test('flags corrupted UTF-8 output', () {
    final q = engine.assess(source: "L'enfant tient son poignet.",
        candidate: 'Bii wi u win nɔɔ nɔɔ �', toBariba: true);
    expect(q.accepted, isFalse);
    expect(q.flags, contains('invalid_utf8'));
  });

  test('rejects repeated ngrams', () {
    final q = engine.assess(source: 'Ferme la porte',
        candidate: 'A de a kɔnnɔ kɔnnɔ kɔnnɔ kɔnnɔ',
        toBariba: true);
    expect(q.accepted, isFalse);
    expect(q.flags, contains('repeated_ngram'));
  });

  test('rejects silently changed numbers', () {
    final q = engine.assess(source: 'Nous avons 90 enfants',
        candidate: 'Ba 19 mɔ', toBariba: true);
    expect(q.accepted, isFalse);
    expect(q.flags, contains('number_mismatch'));
  });

  test('does not reject ordinary short output', () {
    final q = engine.assess(source: 'Bonjour',
        candidate: 'Yɛ́ɛ̀ bɛ̀ɛ', toBariba: true);
    expect(q.accepted, isTrue);
  });

  test('marks uncertain negation for review without inventing a correction', () {
    final q = engine.assess(source: 'A ku man nukiri.',
        candidate: 'Je te regarde.', toBariba: false);
    expect(q.accepted, isTrue);
    expect(q.flags, contains('review_negation'));
  });

  test('translator skips invalid offline answer', () async {
    DunyaTranslator.memory = (text, toBariba) async => null;
    DunyaTranslator.offline = (text, toBariba) async => 'kɔnnɔ kɔnnɔ kɔnnɔ kɔnnɔ';
    DunyaTranslator.online = null;
    DunyaTranslator.allowRemote = () => false;
    final output = await DunyaTranslator.translate(
        'Ferme complètement cette autre porte', toBariba: true);
    expect(output, isNull);
    DunyaTranslator.offline = null;
    DunyaTranslator.memory = null;
  });
}
