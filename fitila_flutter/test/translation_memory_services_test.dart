import 'package:fitila_native/dunya/voice/dunya_translation_memory.dart';
import 'package:fitila_native/main.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('the shipped memory loads from the asset bundle', () async {
    final memory = await DunyaTranslationMemory.shared();
    expect(memory.size, greaterThan(7000));
  });

  test('general translator answers an attested sentence offline, without any network', () async {
    final out = await FitilaServices.translate(
      "Quand il est venu ici, il a laissé l'enfant.",
      TranslationDirection.frenchToBariba,
      dictionaryLoader: () async => const [],
    );
    expect(out, 'Yè u sisi mini, u bii wi kerema.');
    final back = await FitilaServices.translate(
      'Yè u sisi mini, u bii wi kerema',
      TranslationDirection.baribaToFrench,
      dictionaryLoader: () async => const [],
    );
    expect(back, "Quand il est venu ici, il a laissé l'enfant.");
  });

  test('online: an attested sentence never calls the cloud chain', () async {
    var calls = 0;
    final client = MockClient((request) async {
      calls++;
      return http.Response('{"translation":"réponse réseau"}', 200);
    });
    final out = await FitilaServices.translate(
      "Quand il est venu ici, il a laissé l'enfant.",
      TranslationDirection.frenchToBariba,
      accessToken: 'token',
      client: client,
      dictionaryLoader: () async => const [],
    );
    expect(out, 'Yè u sisi mini, u bii wi kerema.');
    expect(calls, 0);
  });
}
