import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:fitila_native/dunya/voice/dunya_fr_numbers.dart';
import 'package:fitila_native/dunya/voice/dunya_cloud_voice.dart';
import 'package:fitila_native/dunya/voice/dunya_mic_capture.dart';
import 'package:fitila_native/dunya/voice/dunya_speech_engine.dart';
import 'package:fitila_native/dunya/voice/dunya_voice_brain.dart';
import 'package:fitila_native/dunya/voice/dunya_voice_intents.dart';
import 'package:fitila_native/dunya/voice/dunya_voice_pack.dart';
import 'package:flutter_test/flutter_test.dart';

const _dictionary = <Map<String, String>>[
  {'word': 'a kua', 'definition': 'merci.'},
  {'word': 'ginɛ (ka)', 'definition': 'merci pour la fois passée.'},
  {'word': 'nim', 'definition': 'eau, intérêt'},
  {'word': 'nim sum', 'definition': 'eau chaude'},
  {'word': 'gbereru', 'definition': 'maïs'},
  {'word': 'gbare kpɛndu', 'definition': 'maïs frais'},
  {'word': 'tem3', 'definition': 'manger, croquer'},
  {'word': 'gbaaru (2)', 'definition': 'champ, parcelle'},
  {'word': 'gura', 'definition': 'Pluie.'},
  {'word': 'yɛnu', 'definition': 'maison.'},
];

void main() {
  test('Omnilingual cloud input WAV uses RIFF PCM 16 kHz mono', () {
    final wav = DunyaCloudVoice.wav16k(Float32List.fromList([0, 0.5, -0.5]));
    expect(String.fromCharCodes(wav.take(4)), 'RIFF');
    expect(String.fromCharCodes(wav.skip(8).take(4)), 'WAVE');
    final bytes = ByteData.sublistView(wav);
    expect(bytes.getUint16(22, Endian.little), 1);
    expect(bytes.getUint32(24, Endian.little), 16000);
    expect(bytes.getUint16(34, Endian.little), 16);
    expect(bytes.getUint32(40, Endian.little), 6);
    expect(bytes.getInt16(46, Endian.little), 16384);
    expect(bytes.getInt16(48, Endian.little), -16384);
  });

  group('French spoken numbers', () {
    test('words become digits', () {
      expect(digitizeFrench('trois sacs à quinze mille'), '3 sacs à 15000');
      expect(digitizeFrench('quatre-vingt-dix vaches'), '90 vaches');
      expect(digitizeFrench('soixante-dix'), '70');
      expect(digitizeFrench('vingt et un'), '21');
      expect(digitizeFrench('deux cent cinquante'), '250');
      expect(digitizeFrench('mille deux cents'), '1200');
      expect(digitizeFrench('un million cinq cent mille'), '1500000');
      expect(digitizeFrench('15 000 francs'), '15000 francs');
    });

    test('articles stay words', () {
      expect(digitizeFrench('une vache'), 'une vache');
    });

    test('formatting for speech', () {
      expect(formatFrenchNumber(45000), '45 000');
      expect(formatFrenchNumber(2.5), '2,50');
    });
  });

  group('Intents', () {
    test('translation to Baatɔnum', () {
      final i = parseDunyaIntent('Comment dit-on merci en baatɔnum ?');
      expect(i.kind, DunyaIntentKind.translateToBariba);
      expect(i.term, 'merci');
      expect(parseDunyaIntent('comment on dit la pluie en bariba').term, 'pluie');
      expect(parseDunyaIntent('maison en bariba').kind, DunyaIntentKind.translateToBariba);
    });

    test('meaning of a Baatɔnum word', () {
      final i = parseDunyaIntent('Que veut dire gbereru ?');
      expect(i.kind, DunyaIntentKind.meaningOfBariba);
      expect(i.term, 'gbereru');
    });

    test('remember', () {
      final i = parseDunyaIntent('Retiens que la pluie a commencé aujourd’hui');
      expect(i.kind, DunyaIntentKind.remember);
      expect(i.label, 'la pluie a commencé aujourd\'hui');
    });

    test('alarm with label', () {
      final i = parseDunyaIntent('Rappelle-moi de traire les vaches à 17 h 30');
      expect(i.kind, DunyaIntentKind.alarm);
      expect(i.hour, 17);
      expect(i.minute, 30);
      expect(i.label, 'traire les vaches');
    });

    test('alarm spoken in words', () {
      final i = parseDunyaIntent('réveille-moi à cinq heures demain');
      expect(i.kind, DunyaIntentKind.alarm);
      expect(i.hour, 5);
      expect(i.tomorrow, isTrue);
    });

    test('timer', () {
      final i = parseDunyaIntent('Rappelle-moi dans dix minutes de sortir le pain');
      expect(i.kind, DunyaIntentKind.timer);
      expect(i.seconds, 600);
      expect(i.label, 'sortir le pain');
    });

    test('calculations', () {
      final a = parseDunyaIntent('Combien font 3 sacs à 15 000 ?');
      expect(a.kind, DunyaIntentKind.calculate);
      expect(a.value, 45000);
      final b = parseDunyaIntent('combien font douze fois quatre');
      expect(b.value, 48);
      final c = parseDunyaIntent('calcule 10 pour cent de 25000');
      expect(c.value, 2500);
    });

    test('confirmation only when an action waits', () {
      expect(parseDunyaIntent('oui', awaitingConfirmation: true).kind, DunyaIntentKind.confirmYes);
      expect(parseDunyaIntent('non merci', awaitingConfirmation: true).kind, DunyaIntentKind.confirmNo);
      expect(parseDunyaIntent('oui').kind, isNot(DunyaIntentKind.confirmYes));
    });

    test('small talk and search', () {
      expect(parseDunyaIntent('Bonjour Dunya').kind, DunyaIntentKind.greeting);
      expect(parseDunyaIntent('Quelle heure est-il ?').kind, DunyaIntentKind.time);
      expect(parseDunyaIntent('').kind, DunyaIntentKind.empty);
      expect(parseDunyaIntent('les semis de sorgho').kind, DunyaIntentKind.search);
    });
  });

  group('Dictionary', () {
    test('French -> Baatɔnum ranks the plain entry first', () {
      expect(translateFrenchToBariba('eau', _dictionary).first.bariba, 'nim');
      expect(translateFrenchToBariba('maïs', _dictionary).first.bariba, 'gbereru');
      expect(translateFrenchToBariba('merci', _dictionary).first.bariba, 'a kua');
      expect(translateFrenchToBariba('manger', _dictionary).first.bariba, 'tem');
      expect(translateFrenchToBariba('champ', _dictionary).first.bariba, 'gbaaru');
      expect(translateFrenchToBariba('ordinateur', _dictionary), isEmpty);
    });

    test('Baatɔnum lookup tolerates tones and recogniser spellings', () {
      expect(lookupBariba('gbereru', _dictionary).first.french, 'maïs');
      expect(lookupBariba('Yɛ̀nu', _dictionary).first.french, 'maison.');
      expect(lookupBariba('gbereʋ', _dictionary).first.bariba, 'gbereru');
      expect(lookupBariba('a kʋa', _dictionary).first.bariba, 'a kua');
    });

    test('headwords and folding', () {
      expect(cleanHeadword('tem3'), 'tem');
      expect(cleanHeadword('gbaaru (2)'), 'gbaaru');
      expect(foldBariba('Bààtɔ̀nú'), 'baatɔnu');
    });
  });

  group('Voice text preparation', () {
    test('maps characters to the voice alphabet', () {
      expect(prepareTextForVoice('A Kua’', {"'": '', 'à': 'a'}), 'a kua');
    });
  });

  group('Microphone', () {
    test('PCM16 decoding carries odd bytes', () {
      final decoder = DunyaPcm16Decoder();
      final first = decoder.decode(Uint8List.fromList([0x00, 0x40, 0x00]));
      final second = decoder.decode(Uint8List.fromList([0xC0]));
      expect(first, [0.5]);
      expect(second, [-0.5]);
    });

    test('detector stops after speech then silence', () {
      final d = DunyaUtteranceDetector(silenceToStop: const Duration(milliseconds: 300));
      d.add(Float32List(1600)); // silence
      expect(d.shouldStop, isFalse);
      d.add(Float32List.fromList(List.filled(4800, 0.3))); // 300 ms of voice
      expect(d.heardSpeech, isTrue);
      d.add(Float32List(4800)); // 300 ms silence
      expect(d.shouldStop, isTrue);
    });
  });

  group('Packs', () {
    late Directory tmp;
    setUp(() => tmp = Directory.systemTemp.createTempSync('dunya_pack_test'));
    tearDown(() => tmp.deleteSync(recursive: true));

    test('installs a verified pack and rejects a tampered one', () async {
      final model = utf8.encode('fake onnx bytes');
      final tokens = utf8.encode('a 1\nb 2\n');
      Map<String, Object> manifest(List<int> modelBytes) => {
            'format': 'dunya-pack/1',
            'id': 'dunya-voice-core',
            'title': 'test',
            'version': 1,
            'files': [
              {'path': 'asr/model.int8.onnx', 'size': model.length, 'sha256': sha256.convert(modelBytes).toString()},
              {'path': 'asr/tokens.txt', 'size': tokens.length, 'sha256': sha256.convert(tokens).toString()},
            ],
            'total_bytes': model.length + tokens.length,
          };

      final good = File('${tmp.path}/good.zip')
        ..writeAsBytesSync(_storedZip({
          'manifest.json': utf8.encode(jsonEncode(manifest(model))),
          'asr/model.int8.onnx': model,
          'asr/tokens.txt': tokens,
        }));
      final installed = await installDunyaPackFile(good.path, tmp.path);
      expect(installed['id'], 'dunya-voice-core');
      expect(File('${tmp.path}/dunya-voice-core/asr/tokens.txt').readAsStringSync(), 'a 1\nb 2\n');

      final bad = File('${tmp.path}/bad.zip')
        ..writeAsBytesSync(_storedZip({
          'manifest.json': utf8.encode(jsonEncode(manifest(utf8.encode('other bytes!!!!')))),
          'asr/model.int8.onnx': model,
          'asr/tokens.txt': tokens,
        }));
      await expectLater(installDunyaPackFile(bad.path, '${tmp.path}/b'), throwsA(isA<DunyaPackException>()));
    });
  });
}

/// Minimal ZIP writer (stored entries) mirroring what the CI produces.
Uint8List _storedZip(Map<String, List<int>> files) {
  final out = BytesBuilder();
  final central = BytesBuilder();
  var count = 0;
  for (final entry in files.entries) {
    final name = utf8.encode(entry.key);
    final data = entry.value;
    final offset = out.length;
    final local = ByteData(30)
      ..setUint32(0, 0x04034b50, Endian.little)
      ..setUint16(4, 20, Endian.little)
      ..setUint16(8, 0, Endian.little)
      ..setUint32(18, data.length, Endian.little)
      ..setUint32(22, data.length, Endian.little)
      ..setUint16(26, name.length, Endian.little);
    out
      ..add(local.buffer.asUint8List())
      ..add(name)
      ..add(data);
    final cd = ByteData(46)
      ..setUint32(0, 0x02014b50, Endian.little)
      ..setUint16(4, 20, Endian.little)
      ..setUint16(6, 20, Endian.little)
      ..setUint16(10, 0, Endian.little)
      ..setUint32(20, data.length, Endian.little)
      ..setUint32(24, data.length, Endian.little)
      ..setUint16(28, name.length, Endian.little)
      ..setUint32(42, offset, Endian.little);
    central
      ..add(cd.buffer.asUint8List())
      ..add(name);
    count++;
  }
  final cdOffset = out.length;
  final cdBytes = central.toBytes();
  out.add(cdBytes);
  final eocd = ByteData(22)
    ..setUint32(0, 0x06054b50, Endian.little)
    ..setUint16(8, count, Endian.little)
    ..setUint16(10, count, Endian.little)
    ..setUint32(12, cdBytes.length, Endian.little)
    ..setUint32(16, cdOffset, Endian.little);
  out.add(eocd.buffer.asUint8List());
  return out.toBytes();
}
