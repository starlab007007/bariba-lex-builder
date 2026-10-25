import 'package:fitila_native/dunya/voice/dunya_byt5_policy.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const beta = {'id': 'dunya-translate-byt5', 'format': 'dunya-pack/1', 'tested': false, 'channel': 'beta'};
  test('a beta download never activates translation without consent', () {
    expect(mayUseByt5Manifest(beta, experimentalConsent: false), isFalse);
    expect(mayUseByt5Manifest(beta, experimentalConsent: true), isTrue);
  });
  test('claiming tested alone is not a release certificate', () {
    expect(mayUseByt5Manifest({...beta, 'tested': true}, experimentalConsent: true), isFalse);
  });
  test('a certified pack works without experimental consent', () {
    expect(mayUseByt5Manifest({...beta, 'tested': true,
      'certification': 'fr-bba-bidirectional-android-v1', 'evaluation_report_sha256': 'verified-report'},
      experimentalConsent: false), isTrue);
  });
  test('unknown or incomplete manifests never activate a model', () {
    expect(mayUseByt5Manifest({}, experimentalConsent: true), isFalse);
    expect(mayUseByt5Manifest({...beta, 'id': 'other'}, experimentalConsent: true), isFalse);
  });
}
