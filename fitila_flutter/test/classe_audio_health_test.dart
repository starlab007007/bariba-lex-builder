import 'dart:async';

import 'package:fitila_native/classe/classe_audio.dart';
import 'package:flutter_test/flutter_test.dart';

class _FakeBackend implements AudioBackend {
  final _done = StreamController<void>.broadcast();
  int playCalls = 0;
  int stopCalls = 0;
  String? lastUrl;

  @override
  Stream<void> get onComplete => _done.stream;

  @override
  Future<void> play(String url) async {
    playCalls++;
    lastUrl = url;
  }

  @override
  Future<void> stop() async {
    stopCalls++;
  }

  @override
  Future<void> dispose() async {
    await _done.close();
  }
}

void main() {
  test('missing private answer audio is blocked before signed URL playback', () async {
    final backend = _FakeBackend();
    var resolverCalls = 0;
    final audio = ClasseAudio(
      backend: backend,
      healthResolver: (bucket, path) async => false,
      resolver: (bucket, path) async {
        resolverCalls++;
        return 'https://example.test/audio';
      },
      approvedLoader: (_) async => const {},
    );

    expect(
      await audio.storageAvailable('classe-answers-audio', 'old/missing.webm'),
      isFalse,
    );
    expect(
      await audio.playStorage(
        'answer-1',
        'classe-answers-audio',
        'old/missing.webm',
      ),
      isFalse,
    );
    expect(audio.error.value, contains('réenregistrer'));
    expect(resolverCalls, 0);
    expect(backend.playCalls, 0);
    await audio.dispose();
  });

  test('verified private answer audio remains playable', () async {
    final backend = _FakeBackend();
    var resolverCalls = 0;
    final audio = ClasseAudio(
      backend: backend,
      healthResolver: (bucket, path) async => true,
      resolver: (bucket, path) async {
        resolverCalls++;
        return 'https://example.test/audio';
      },
      approvedLoader: (_) async => const {},
    );

    expect(
      await audio.playStorage(
        'answer-2',
        'classe-answers-audio',
        'new/present.webm',
      ),
      isTrue,
    );
    expect(resolverCalls, 1);
    expect(backend.playCalls, 1);
    expect(backend.lastUrl, 'https://example.test/audio');
    await audio.dispose();
  });

  test('non answer-audio buckets keep their existing playback behavior', () async {
    final backend = _FakeBackend();
    var healthCalls = 0;
    final audio = ClasseAudio(
      backend: backend,
      healthResolver: (bucket, path) async {
        healthCalls++;
        return false;
      },
      resolver: (bucket, path) async => 'https://example.test/audio',
      approvedLoader: (_) async => const {},
    );

    expect(
      await audio.playStorage('x', 'other-bucket', 'file.webm'),
      isTrue,
    );
    expect(healthCalls, 0);
    expect(backend.playCalls, 1);
    await audio.dispose();
  });
}
