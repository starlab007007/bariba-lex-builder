import 'package:flutter_test/flutter_test.dart';
import 'package:fitila_native/dunya/voice/fitila_linguistic_refiner.dart';

void main() {
  test('FLRE preserves meaningful content and normalizes whitespace only', () {
    final result = FitilaLinguisticRefiner.refine(
      source: 'Bonjour',
      candidate: '  Aagu   wunɛ  ',
      toBariba: true,
      engine: 'offline',
    );
    expect(result.accepted, isTrue);
    expect(result.translation, 'Aagu wunɛ');
    expect(result.refinementApplied, isTrue);
    expect(result.provenance, 'offline');
  });

  test('FLRE flags number loss without inventing replacement', () {
    final result = FitilaLinguisticRefiner.refine(
      source: 'Les 12 femmes à Parakou',
      candidate: 'Une phrase sans chiffre',
      toBariba: true,
      engine: 'offline',
    );
    expect(result.warnings, contains('numbers_need_review'));
    expect(result.translation, 'Une phrase sans chiffre');
  });

  test('FLRE flags negation for linguistic review without guessing Baatɔnum', () {
    final result = FitilaLinguisticRefiner.refine(
      source: 'Je ne viens pas',
      candidate: 'Baatɔnum candidate',
      toBariba: true,
      engine: 'offline',
    );
    expect(result.warnings, contains('negation_review_required'));
  });

  test('FLRE rejects repeated generation loops', () {
    final result = FitilaLinguisticRefiner.refine(
      source: 'Bonjour',
      candidate: 'na na na na na na',
      toBariba: true,
      engine: 'offline',
    );
    expect(result.accepted, isFalse);
  });

  test('FLRE does not modify validated corpus entries', () {
    final result = FitilaLinguisticRefiner.refine(
      source: 'Bonjour',
      candidate: 'Aagu wunɛ.',
      toBariba: true,
      engine: 'memory',
    );
    expect(result.translation, 'Aagu wunɛ.');
    expect(result.warnings, isEmpty);
  });
}
