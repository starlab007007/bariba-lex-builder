import 'package:fitila_native/dunya/voice/dunya_online_routing.dart';
import 'package:fitila_native/dunya/voice/dunya_settings.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('explicit language modes override detection', () {
    expect(dunyaOnlineLanguage(DunyaLanguageMode.french, 'bba'), 'fr');
    expect(dunyaOnlineLanguage(DunyaLanguageMode.bariba, 'fr'), 'bba');
  });

  test('unverified Baatonum histories never leak into French reasoning', () {
    final turns = [
      {'role': 'user', 'content': 'A kua'},
      {'role': 'assistant', 'content': 'Bɛɛ ka weru'},
    ];
    expect(dunyaFrenchReasoningHistory(DunyaLanguageMode.bariba, turns), isEmpty);
  });

  test('French reasoning history keeps only the last eight nonempty turns', () {
    final turns = [
      for (var i = 0; i < 10; i++)
        {'role': i.isEven ? 'user' : 'assistant', 'content': 'Phrase $i'},
    ];
    final result = dunyaFrenchReasoningHistory(DunyaLanguageMode.french, turns);
    expect(result.length, 8);
    expect(result.first['content'], 'Phrase 2');
    expect(result.last['content'], 'Phrase 9');
  });
}
