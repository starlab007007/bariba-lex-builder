import 'dart:convert';
import 'dart:io';

import 'package:fitila_native/dunya/voice/dunya_refine.dart';
import 'package:fitila_native/dunya/voice/dunya_voice_brain.dart' show foldBariba;
import 'package:flutter_test/flutter_test.dart';

/// Same vectors as the server (`supabase/functions/_shared/deterministic-refine_test.ts`):
/// the phone, the app and the server must refine a translation the same way.
void main() {
  final vectors = jsonDecode(File('test/fixtures/refine-vectors.json').readAsStringSync()) as Map<String, dynamic>;
  final lexicon = DunyaRefineLexicon.fromTexts((vectors['lexicon'] as List).cast<String>(), foldBariba);
  for (final raw in vectors['cases'] as List) {
    final c = raw as Map<String, dynamic>;
    test('refine: ${c['name']}', () {
      final result = dunyaRefine(
        c['source'] as String,
        c['candidate'] as String,
        c['toBariba'] as bool,
        lexicon: (c['toBariba'] as bool) ? lexicon : null,
      );
      expect(result.text, c['expected']);
    });
  }
  test('an already clean translation is left untouched', () {
    final result = dunyaRefine('Bonjour.', 'Aagu wunɛ.', true, lexicon: lexicon);
    expect(result.text, 'Aagu wunɛ.');
    expect(result.changed, isFalse);
  });
}
