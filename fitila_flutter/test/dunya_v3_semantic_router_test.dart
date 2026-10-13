import 'package:flutter_test/flutter_test.dart';
import 'package:fitila_native/dunya_v3/semantic_router.dart';

void main() {
  test('French voice and text take the same route', () {
    final text = routeDunyaInput('Bonjour', DunyaLanguage.french, DunyaInputMode.text);
    final voice = routeDunyaInput('Bonjour', DunyaLanguage.french, DunyaInputMode.voice);
    expect(text.route, DunyaRoute.fast);
    expect(voice.route, text.route);
  });
  test('Bariba retains original orthography and is not French-classified', () {
    const original = 'Dòmma a nà ? ɔ̃';
    final request = routeDunyaInput(original, DunyaLanguage.baatonum, DunyaInputMode.text);
    expect(request.original, original);
    expect(request.route, DunyaRoute.reasoning);
  });
  test('French destructive operations require confirmation', () {
    final request = routeDunyaInput('Supprime ma note', DunyaLanguage.french, DunyaInputMode.text);
    expect(request.requiresConfirmation, true);
    expect(request.route, DunyaRoute.action);
  });
}
