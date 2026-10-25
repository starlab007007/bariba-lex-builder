import 'dart:convert';
import 'dart:io';
import 'package:fitila_native/dunya/voice/dunya_byt5.dart';
import 'package:fitila_native/dunya/voice/dunya_settings.dart';
import 'package:fitila_native/dunya/voice/dunya_translator.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test('installed pack activates on requested offline use, stays loaded, and respects revocation', () async {
    SharedPreferences.setMockInitialValues({});
    final root = Directory.systemTemp.createTempSync('fitila-installed-');
    addTearDown(() => root.deleteSync(recursive: true));
    final pack = Directory('${root.path}/dunya_packs/dunya-translate-byt5')..createSync(recursive: true);
    File('${pack.path}/manifest.json').writeAsStringSync(jsonEncode({
      'id': 'dunya-translate-byt5', 'format': 'dunya-pack/1', 'tested': false, 'channel': 'beta',
    }));
    Directory('${pack.path}/byt5').createSync();
    for (final name in ['encoder.onnx', 'decoder.onnx']) {
      File('${pack.path}/byt5/$name').writeAsBytesSync([1, 2, 3]);
    }
    File('${pack.path}/byt5/config.json').writeAsStringSync(jsonEncode({
      'format': 'fitila-byt5-mobile/1', 'tokenizer': 'byt5-bytes-plus-3',
    }));
    const channel = MethodChannel('fitila/dunya_byt5');
    var loads = 0;
    final messenger = TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
    messenger.setMockMethodCallHandler(channel, (call) async {
      if (call.method == 'load') { loads++; return null; }
      if (call.method == 'translate') return 'A kua.';
      return null;
    });
    addTearDown(() { messenger.setMockMethodCallHandler(channel, null); DunyaTranslator.offline = null; });
    final model = DunyaByt5.forTesting(root);
    expect(await model.activateIfInstalled(), isFalse);
    expect(await model.activateIfInstalled(userRequested: true), isTrue);
    expect(DunyaSettings.instance.translationChoiceMade, isTrue);
    expect(await DunyaTranslator.offline!('Merci.', true), 'A kua.');
    expect(await model.activateIfInstalled(), isTrue);
    expect(await DunyaTranslator.offline!('Merci beaucoup.', true), 'A kua.');
    expect(loads, 1);
    await DunyaSettings.instance.update(experimentalTranslation: false);
    expect(await model.activateIfInstalled(userRequested: true), isFalse);
    expect(DunyaTranslator.offline, isNull);
  });
}
