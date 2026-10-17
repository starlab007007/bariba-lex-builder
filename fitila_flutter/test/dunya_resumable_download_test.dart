import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:fitila_native/dunya/voice/dunya_resumable_download.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  late Directory directory;
  late File archive;
  final body = utf8.encode('verified-baatonum-model-test');
  final signature = sha256.convert(body).toString();
  final uri = Uri.parse('https://fitila.test/model.zip');

  setUp(() {
    directory = Directory.systemTemp.createTempSync('fitila-voice-download-');
    archive = File('${directory.path}/model.part');
  });
  tearDown(() => directory.deleteSync(recursive: true));

  test('resumes HTTP 206 at correct byte offset', () async {
    archive.writeAsBytesSync(body.take(8).toList());
    var observed = '';
    final client = MockClient((request) async {
      observed = request.headers['Range'] ?? '';
      return http.Response.bytes(
        body.skip(8).toList(),
        206,
        headers: {'content-range': 'bytes 8-${body.length - 1}/${body.length}'},
      );
    });
    await DunyaResumableDownload.save(
      client: client, uri: uri, target: archive, sha256Expected: signature,
      expectedSize: body.length,
    );
    expect(observed, 'bytes=8-');
    expect(archive.readAsBytesSync(), body);
    client.close();
  });

  test('server ignoring Range sends HTTP 200; restarts from zero', () async {
    archive.writeAsBytesSync(body.take(9).toList());
    final client = MockClient((request) async {
      expect(request.headers['Range'], 'bytes=9-');
      return http.Response.bytes(body, 200);
    });
    await DunyaResumableDownload.save(
      client: client, uri: uri, target: archive, sha256Expected: signature,
      expectedSize: body.length,
    );
    expect(archive.readAsBytesSync(), body);
    client.close();
  });

  test('complete verified archive never redownloaded', () async {
    archive.writeAsBytesSync(body);
    final client = MockClient((_) async {
      fail('Aucun accès réseau attendu');
    });
    await DunyaResumableDownload.save(
      client: client, uri: uri, target: archive, sha256Expected: signature,
      expectedSize: body.length,
    );
    client.close();
  });

  test('wrong archive SHA-256 fails closed and deletes corruption', () async {
    final client = MockClient((_) async => http.Response.bytes(
        utf8.encode('corrupted-content'),
        200));
    await expectLater(
      DunyaResumableDownload.save(
        client: client, uri: uri, target: archive, sha256Expected: signature,
        expectedSize: utf8.encode('corrupted-content').length,
      ),
      throwsA(isA<FormatException>()),
    );
    expect(archive.existsSync(), isFalse);
    client.close();
  });

  test('wrong Content-Range rejects resumed bytes', () async {
    archive.writeAsBytesSync(body.take(3).toList());
    final client = MockClient((_) async => http.Response.bytes(
        body.skip(3).toList(), 206,
        headers: {'content-range': 'bytes 0-${body.length - 4}/${body.length}'}));
    await expectLater(
      DunyaResumableDownload.save(
        client: client, uri: uri, target: archive, sha256Expected: signature,
        expectedSize: body.length,
      ),
      throwsA(isA<FormatException>()),
    );
    expect(archive.readAsBytesSync(), body.take(3).toList());
    client.close();
  });

  test('416 resets stale partial and retries safely', () async {
    archive.writeAsBytesSync(body.take(4).toList());
    var count = 0;
    final client = MockClient((request) async {
      count++;
      if (count == 1) {
        expect(request.headers['Range'], 'bytes=4-');
        return http.Response('', 416);
      }
      expect(request.headers.containsKey('Range'), isFalse);
      return http.Response.bytes(body, 200);
    });
    await DunyaResumableDownload.save(
      client: client, uri: uri, target: archive, sha256Expected: signature,
      expectedSize: body.length,
    );
    expect(count, 2);
    expect(archive.readAsBytesSync(), body);
    client.close();
  });

  test('interrupted download keeps bytes to resume', () async {
    final client = MockClient((_) async =>
        http.Response.bytes(body.take(4).toList(), 200));
    await expectLater(
      DunyaResumableDownload.save(
        client: client, uri: uri, target: archive, sha256Expected: signature,
        expectedSize: body.length,
      ),
      throwsA(isA<SocketException>()),
    );
    expect(archive.readAsBytesSync(), body.take(4).toList());
    client.close();
  });
}
