import 'package:flutter_test/flutter_test.dart';
import 'package:fitila_native/dunya/voice/dunya_local_refiner.dart';

void main() {
  test('normalization and unchanged ByT5 output', () {
    final r = DunyaLocalRefiner.refine('  Na yaburu   da sia. ', toBariba: true);
    expect(r.text, 'Na yaburu da sia.');
    expect(r.status, 'unchanged');
  });
  test('untrusted UI content is never presented as a translation', () {
    final r = DunyaLocalRefiner.refine('Loading undefined', toBariba: true);
    expect(r.status, 'rejected');
  });
  test('conservative rules correct attested greeting', () {
    final r = DunyaLocalRefiner.refine('Kua wɛrɛ', toBariba: true);
    expect(r.status, 'applied');
    expect(r.text, 'Bɛɛ ka yoka');
  });
  test('French output is not modified using Bariba substitutions', () {
    final r = DunyaLocalRefiner.refine('Cette banane est bonne', toBariba: false);
    expect(r.text, 'Cette banane est bonne');
  });
}
