import 'package:fitila_native/dunya/voice/dunya_french_speech.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const channel = MethodChannel('fitila/french_speech');
  final messenger = TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
  tearDown(() => messenger.setMockMethodCallHandler(channel, null));

  test('French recognition requests fr-FR and sends the final transcript', () async {
    final calls = <MethodCall>[];
    messenger.setMockMethodCallHandler(channel, (call) async {
      calls.add(call);
      if (call.method == 'available') return true;
      if (call.method == 'listen') return 'Bonjour, comment vas-tu ?';
      return null;
    });
    final speech = DunyaFrenchSpeech();
    expect(await speech.available(), isTrue);
    expect(await speech.listen(), 'Bonjour, comment vas-tu ?');
    expect(calls.last.arguments, {'locale': 'fr-FR'});
    await speech.cancel();
    expect(calls.last.method, 'cancel');
  });

  test('missing French platform service leaves the PCM fallback available', () async {
    messenger.setMockMethodCallHandler(channel, (_) async => null);
    expect(await DunyaFrenchSpeech().available(), isFalse);
  });
}
