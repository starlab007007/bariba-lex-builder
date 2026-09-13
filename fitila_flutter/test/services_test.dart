import 'dart:convert';

import 'package:fitila_native/main.dart';
import 'package:fitila_native/core/fitila_backend.dart';
import 'package:fitila_native/core/foncier_rag.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  Future<List<DictionaryEntry>> dictionary() async => const [
    DictionaryEntry(word: 'test-baatonum', definition: 'exemple français'),
  ];

  test('loads a usable embedded dictionary', () async {
    final entries = await FitilaServices.loadDictionary();
    expect(entries, isNotEmpty);
    expect(
      entries.every(
        (entry) => entry.word.isNotEmpty && entry.definition.isNotEmpty,
      ),
      isTrue,
    );
  });

  test('normalizes Benin phone numbers like the React phone flow', () {
    expect(FitilaBackend.normalizeLocalPhone('65 65 34 68'), '65653468');
    expect(FitilaBackend.normalizeLocalPhone('+229 65 65 34 68'), '65653468');
    expect(FitilaBackend.emailFromPhone('+22965653468'), '65653468@fitila.app');
  });

  test(
    'answers an explicit land-code article from the embedded corpus',
    () async {
      final result = await FoncierRag.answer('Saria 14se');
      expect(result.isFallback, isFalse);
      expect(result.sources, isNotEmpty);
      expect(
        result.sources.any(
          (source) => source.id == 14 || source.number.contains('14se'),
        ),
        isTrue,
      );
      expect(result.answer, isNotEmpty);
    },
  );

  test('translates a known dictionary entry in both directions', () async {
    expect(
      await FitilaServices.translate(
        ' TEST-BAATONUM ',
        TranslationDirection.baribaToFrench,
        dictionaryLoader: dictionary,
      ),
      'exemple français',
    );
    expect(
      await FitilaServices.translate(
        'exemple français',
        TranslationDirection.frenchToBariba,
        dictionaryLoader: dictionary,
      ),
      'test-baatonum',
    );
  });

  test('never presents untranslated source text as a translation', () async {
    await expectLater(
      FitilaServices.translate(
        'unknown phrase',
        TranslationDirection.frenchToBariba,
        dictionaryLoader: dictionary,
      ),
      throwsStateError,
    );
  });

  test('uses the existing authenticated API contract', () async {
    final client = MockClient((request) async {
      expect(request.url.path, '/functions/v1/ai-translate');
      expect(request.headers['Authorization'], 'Bearer test-token');
      expect(jsonDecode(request.body), {
        'text': 'bonjour',
        'sourceLang': 'french',
        'targetLang': 'bariba',
      });
      return http.Response(jsonEncode({'translation': 'réponse de test'}), 200);
    });
    expect(
      await FitilaServices.translate(
        'bonjour',
        TranslationDirection.frenchToBariba,
        accessToken: 'test-token',
        client: client,
        dictionaryLoader: dictionary,
      ),
      'réponse de test',
    );
    client.close();
  });

  test('uses a dictionary match when the API is unavailable', () async {
    final client = MockClient((_) async => http.Response('unavailable', 503));
    expect(
      await FitilaServices.translate(
        'test-baatonum',
        TranslationDirection.baribaToFrench,
        accessToken: 'test-token',
        client: client,
        dictionaryLoader: dictionary,
      ),
      'exemple français',
    );
    client.close();
  });
}
