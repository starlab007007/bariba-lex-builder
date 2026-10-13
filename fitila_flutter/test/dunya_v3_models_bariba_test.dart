import 'package:flutter_test/flutter_test.dart';
import 'package:fitila_native/dunya_v3/qwen_candidate.dart';
import 'package:fitila_native/dunya_v3/semantic_router.dart';

void main() {
  test('Qwen model has pinned published checksum and size', () {
    expect(DunyaQwenCandidate.safeToInstall, true);
    expect(DunyaQwenCandidate.sizeBytes, 977184032);
    expect(DunyaQwenCandidate.contextTokens, 4096);
  });
  test('Bariba orthography and nasalisation remain untouched', () {
    const examples = ['Dòmma a nà ?', 'sɔ̃ɔ', 'sɔɔ', 'Bɛɛ ka weru'];
    for (final example in examples) {
      final input = routeDunyaInput(
        example, DunyaLanguage.baatonum, DunyaInputMode.text,
      );
      expect(input.original, example);
      expect(input.route, DunyaRoute.reasoning);
    }
  });
  test('Both French and Bariba voice use same router contract', () {
    for (final lang in DunyaLanguage.values) {
      final request = routeDunyaInput(
        'test voix', lang, DunyaInputMode.voice,
      );
      expect(request.language, lang);
      expect(request.mode, DunyaInputMode.voice);
    }
  });
}
