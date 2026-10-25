import 'dart:async';
import 'dart:io';
import 'dart:typed_data';
import 'package:fitila_native/dunya/voice/dunya_byt5.dart';
import 'package:fitila_native/dunya/voice/dunya_settings.dart';
import 'package:fitila_native/dunya/voice/dunya_shared_speech.dart';
import 'package:fitila_native/dunya/voice/dunya_translator.dart';
import 'package:fitila_native/dunya/voice/dunya_voice_pack.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

// Copied into integration_test only by the Android model validation workflow.
// No test dependency or diagnostic screen is included in the production APK.
Float32List pcm16(Uint8List wav) {
  final bytes = ByteData.sublistView(wav);
  var at = 12;
  while (at + 8 <= wav.length) {
    final tag = String.fromCharCodes(wav.sublist(at, at + 4));
    final length = bytes.getUint32(at + 4, Endian.little);
    if (tag == 'data') {
      return Float32List.fromList([
        for (var n = at + 8; n + 1 < at + 8 + length; n += 2)
          bytes.getInt16(n, Endian.little) / 32768,
      ]);
    }
    at += 8 + length + length % 2;
  }
  throw StateError('WAV fixture has no PCM data');
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('real ASR, ByT5 and MMS work together with Android network disabled', (tester) async {
    final status = ValueNotifier('Téléchargement des packs vérifiés');
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: Center(child:
      ValueListenableBuilder(valueListenable: status, builder: (_, value, _) => Text(value))))));
    await tester.runAsync(() async {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('dunya_experimental_translation_consent', false);
      await prefs.setBool('dunya_translation_choice_v35', false);
      final settings = DunyaSettings.instance;
      await settings.load();
      final packs = DunyaVoicePackManager.instance;
      for (final id in [dunyaVoiceCorePackId, dunyaTranslationPackId]) {
        await packs.download(dunyaVoicePackSources.firstWhere((source) => source.id == id));
      }
      debugPrint('FITILA_PACKS_READY_FOR_NETWORK_OFF');
      var disconnected = false;
      for (var attempt = 0; attempt < 45; attempt++) {
        final client = HttpClient()..connectionTimeout = const Duration(seconds: 1);
        try {
          final request = await client.getUrl(Uri.parse(
            'https://fitila.bj/dunya-packs/android/releases.json?offline-probe=$attempt')).timeout(const Duration(seconds: 1));
          final response = await request.close().timeout(const Duration(seconds: 1));
          await response.drain<void>();
        } catch (_) { disconnected = true; break; }
        finally { client.close(force: true); }
        await Future<void>.delayed(const Duration(seconds: 1));
      }
      expect(disconnected, isTrue, reason: 'The host must disable emulator Wi-Fi and mobile data');
      await settings.update(execution: DunyaExecutionMode.offline, mode: DunyaLanguageMode.bariba);
      DunyaTranslator.allowRemote = () => false;
      DunyaTranslator.online = (_, _) => throw StateError('No remote fallback is permitted');
      final engine = await DunyaSharedSpeech.instance.ensureStarted();
      expect(engine, isNotNull);
      final root = await getApplicationSupportDirectory();
      final fixture = File('${root.path}/dunya_packs/$dunyaVoiceCorePackId/asr/test_wavs/fr.wav');
      final transcript = await engine!.transcribe(pcm16(await fixture.readAsBytes()));
      expect(transcript.trim(), isNotEmpty);
      expect(await DunyaByt5.instance.activateIfInstalled(userRequested: true), isTrue);
      final translation = await DunyaTranslator.offline!('Le champ contient trois arbres.', true);
      expect(translation?.trim(), isNotEmpty);
      final speech = await DunyaSharedSpeech.instance.synthesizeBariba('A kua');
      expect(speech, isNotNull);
      expect(await File(speech!).length(), greaterThan(44));
      debugPrint('FITILA_OFFLINE_MODELS_OK ASR=local ByT5=local TTS=local network=off');
      status.value = 'Android hors ligne : ASR, ByT5 et MMS validés';
    });
    await tester.pump();
    await Future<void>.delayed(const Duration(seconds: 3));
  }, timeout: const Timeout(Duration(minutes: 12)));
}
