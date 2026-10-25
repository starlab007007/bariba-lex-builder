import 'dart:convert';
import 'dart:io';

import 'package:fitila_native/core/offline.dart';
import 'package:fitila_native/dunya/voice/dunya_assistant.dart';
import 'package:fitila_native/dunya/voice/dunya_online_routing.dart';
import 'package:fitila_native/dunya/voice/dunya_settings.dart';
import 'package:fitila_native/dunya/voice/dunya_translator.dart';
import 'package:fitila_native/main.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

/// Matrice d'audit : traducteur / clavier (FitilaServices.translate) et DUNYA (DunyaTranslator),
/// en ligne, hors ligne, avec et sans le modèle ByT5 du téléphone (bêta).
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  Future<List<DictionaryEntry>> dictionary() async => const [
        DictionaryEntry(word: 'test-baatonum', definition: 'exemple français'),
      ];
  http.Client failing() => MockClient((_) async => throw StateError('le réseau ne doit pas être appelé'));

  setUp(() {
    FitilaOffline.online.value = true;
    DunyaTranslator.offline = null;
    DunyaOfflineBeta.lastUsed = false;
  });
  tearDown(() {
    FitilaOffline.online.value = true;
    DunyaTranslator.offline = null;
    DunyaTranslator.online = null;
    DunyaTranslator.allowRemote = null;
    DunyaTranslator.preferRemote = null;
    DunyaOfflineBeta.lastUsed = false;
  });

  group('Traducteur / clavier (FitilaServices.translate)', () {
    test('S1 en ligne : le serveur traduit, l\'affinage est laissé au serveur (pas de skipRefine)', () async {
      Map<String, dynamic>? sent;
      final client = MockClient((r) async {
        sent = jsonDecode(r.body) as Map<String, dynamic>;
        return http.Response(jsonEncode({'translation': 'réponse serveur'}), 200);
      });
      final out = await FitilaServices.translate('une phrase très nouvelle xyz', TranslationDirection.frenchToBariba,
          accessToken: 't', client: client, dictionaryLoader: dictionary, allowOfflineBeta: true);
      expect(out, 'réponse serveur');
      expect(sent!.containsKey('skipRefine'), isFalse);
      expect(DunyaOfflineBeta.lastUsed, isFalse);
    });

    test('S2 en ligne, serveur en panne, modèle téléphone installé : bêta utilisée et signalée', () async {
      DunyaTranslator.offline = (t, toBa) async => 'sortie modèle bêta';
      final client = MockClient((_) async => http.Response('down', 503));
      final out = await FitilaServices.translate('une phrase très nouvelle xyz', TranslationDirection.frenchToBariba,
          accessToken: 't', client: client, dictionaryLoader: dictionary, allowOfflineBeta: true);
      expect(out, 'sortie modèle bêta');
      expect(DunyaOfflineBeta.lastUsed, isTrue);
    });

    test('S3 sans internet : aucun appel réseau, modèle bêta utilisé, jamais d\'affinage', () async {
      FitilaOffline.online.value = false;
      DunyaTranslator.offline = (t, toBa) async => 'sortie modèle bêta';
      final out = await FitilaServices.translate('une phrase très nouvelle xyz', TranslationDirection.frenchToBariba,
          accessToken: 't', client: failing(), dictionaryLoader: dictionary, allowOfflineBeta: true);
      expect(out, 'sortie modèle bêta');
      expect(DunyaOfflineBeta.lastUsed, isTrue);
    });

    test('S4 sans internet, bêta non autorisée par l\'appelant : le modèle n\'est pas utilisé', () async {
      FitilaOffline.online.value = false;
      DunyaTranslator.offline = (t, toBa) async => 'ne doit pas sortir';
      await expectLater(
        FitilaServices.translate('une phrase très nouvelle xyz', TranslationDirection.frenchToBariba,
            accessToken: 't', client: failing(), dictionaryLoader: dictionary),
        throwsA(isA<StateError>()),
      );
      expect(DunyaOfflineBeta.lastUsed, isFalse);
    });

    test('S5 sans internet et sans modèle : mot du dictionnaire OK, phrase inconnue = erreur claire', () async {
      FitilaOffline.online.value = false;
      expect(
        await FitilaServices.translate('test-baatonum', TranslationDirection.baribaToFrench,
            accessToken: 't', client: failing(), dictionaryLoader: dictionary, allowOfflineBeta: true),
        'exemple français',
      );
      await expectLater(
        FitilaServices.translate('une phrase très nouvelle xyz', TranslationDirection.frenchToBariba,
            accessToken: 't', client: failing(), dictionaryLoader: dictionary, allowOfflineBeta: true),
        throwsA(predicate((e) => e is StateError && e.message.contains('Hors connexion'))),
      );
    });

    test('S6 le modèle renvoie le texte source : sortie refusée (jamais de faux résultat)', () async {
      FitilaOffline.online.value = false;
      DunyaTranslator.offline = (t, toBa) async => t;
      await expectLater(
        FitilaServices.translate('une phrase très nouvelle xyz', TranslationDirection.frenchToBariba,
            accessToken: 't', client: failing(), dictionaryLoader: dictionary, allowOfflineBeta: true),
        throwsA(isA<StateError>()),
      );
    });

    test('S7 coupure réseau pendant l\'appel : bascule hors ligne et bêta', () async {
      DunyaTranslator.offline = (t, toBa) async => 'sortie modèle bêta';
      final client = MockClient((_) async => throw const SocketException('Failed host lookup'));
      final out = await FitilaServices.translate('une phrase très nouvelle xyz', TranslationDirection.baribaToFrench,
          accessToken: 't', client: client, dictionaryLoader: dictionary, allowOfflineBeta: true);
      expect(out, 'sortie modèle bêta');
      expect(FitilaOffline.online.value, isFalse);
    });
  });

  group('DUNYA (DunyaTranslator)', () {
    test('D1 mode Hors ligne forcé : le serveur n\'est jamais appelé', () async {
      DunyaTranslator.allowRemote = () => false;
      DunyaTranslator.preferRemote = () => false;
      var onlineCalls = 0;
      DunyaTranslator.online = (t, toBa) async {
        onlineCalls++;
        return 'serveur';
      };
      DunyaTranslator.offline = (t, toBa) async => 'phrase locale bêta';
      final r = await DunyaTranslator.translate('texte inédit d1', toBariba: true);
      expect(r?.engine, 'offline');
      expect(onlineCalls, 0);
    });

    test('D2 sans internet et sans modèle : aucune traduction (DUNYA l\'annonce)', () async {
      DunyaTranslator.allowRemote = () => false;
      DunyaTranslator.offline = null;
      DunyaTranslator.online = (t, toBa) async => 'serveur';
      expect(await DunyaTranslator.translate('texte inédit d2', toBariba: true), isNull);
    });

    test('D3 automatique en ligne : le serveur prime sur le modèle du téléphone', () async {
      DunyaTranslator.allowRemote = () => true;
      DunyaTranslator.preferRemote = () => true;
      DunyaTranslator.online = (t, toBa) async => 'serveur d3';
      DunyaTranslator.offline = (t, toBa) async => 'local d3';
      final r = await DunyaTranslator.translate('texte inédit d3', toBariba: false);
      expect(r?.engine, 'online');
      expect(r?.text, 'serveur d3');
    });

    test('D4 serveur indisponible en ligne : repli sur le modèle du téléphone', () async {
      DunyaTranslator.allowRemote = () => true;
      DunyaTranslator.preferRemote = () => true;
      DunyaTranslator.online = (t, toBa) async => throw StateError('503');
      DunyaTranslator.offline = (t, toBa) async => 'local d4';
      final r = await DunyaTranslator.translate('texte inédit d4', toBariba: true);
      expect(r?.engine, 'offline');
    });

    test('D5 routage des langues : français seul ou baatɔnum seul', () {
      expect(dunyaOnlineLanguage(DunyaLanguageMode.french, 'bba'), 'fr');
      expect(dunyaOnlineLanguage(DunyaLanguageMode.bariba, 'fr'), 'bba');
    });

    test('D6 historique envoyé au cerveau : français seulement (jamais de baatɔnum non vérifié)', () {
      final turns = [
        {'role': 'user', 'content': 'Bonjour'},
        {'role': 'assistant', 'content': 'Salut'},
      ];
      expect(dunyaFrenchReasoningHistory(DunyaLanguageMode.french, turns), hasLength(2));
      expect(dunyaFrenchReasoningHistory(DunyaLanguageMode.bariba, turns), isEmpty);
    });

    test('D7 réponse baatɔnum courte : au plus 2 phrases et 200 caractères', () {
      final long = ['Phrase un.', 'Phrase deux.', 'Phrase trois.', 'Phrase quatre.'];
      expect(dunyaShortBariba(long), ['Phrase un.', 'Phrase deux.']);
      expect(dunyaShortBariba(['a' * 150, 'b' * 150]), ['a' * 150]);
      expect(dunyaShortBariba([]), isEmpty);
    });
  });
}
