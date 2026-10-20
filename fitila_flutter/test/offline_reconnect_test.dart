import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:fitila_native/core/offline.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('outbox survives offline restart and replays after reconnect exactly once', () async {
    SharedPreferences.setMockInitialValues({});
    await FitilaOffline.resetForTest();
    FitilaOffline.probe = () async => false;
    expect(await FitilaOffline.refresh(), isFalse);

    await FitilaOffline.enqueue('sync_test', {'id': 'reconnect-1'});
    expect(FitilaOffline.pending.value, 1);

    // A new app session re-registers its Supabase handlers.
    await FitilaOffline.resetForTest();
    final delivered = <String>[];
    FitilaOffline.register('sync_test', (payload) async {
      delivered.add(payload['id'] as String);
    });
    FitilaOffline.probe = () async => true;
    expect(await FitilaOffline.refresh(), isTrue);
    await FitilaOffline.flush();
    // refresh may start a flush asynchronously: wait until it has completed.
    for (var i = 0; i < 30 && FitilaOffline.pending.value != 0; i++) {
      await Future<void>.delayed(const Duration(milliseconds: 20));
      await FitilaOffline.flush();
    }
    expect(delivered, ['reconnect-1']);
    expect(FitilaOffline.pending.value, 0);

    await FitilaOffline.flush();
    expect(delivered, ['reconnect-1']);
    await FitilaOffline.resetForTest();
  });

  test('a network failure preserves the pending operation for retry', () async {
    SharedPreferences.setMockInitialValues({});
    await FitilaOffline.resetForTest();
    FitilaOffline.register('sync_test', (_) async {
      throw const SocketException('No network');
    });
    await FitilaOffline.enqueue('sync_test', {'id': 'retry-1'});
    expect(await FitilaOffline.flush(), 0);
    expect(FitilaOffline.pending.value, 1);
    await FitilaOffline.resetForTest();
  });
}
