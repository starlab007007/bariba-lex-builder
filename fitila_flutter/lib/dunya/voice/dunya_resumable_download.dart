/// Deterministic HTTP Range downloads for FITILA's rural model archives.
/// Network is used only to *install* the optional pack, never for local TTS.
library;

import 'dart:async';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:http/http.dart' as http;

/// Transfers only an archive whose release checksum has been verified.
/// Interrupted data remains on disk, allowing resume after network drop.
/// A server ignoring Range is handled with a clean overwrite.
abstract final class DunyaResumableDownload {
  static Future<void> save({
    required http.Client client,
    required Uri uri,
    required File target,
    required String sha256Expected,
    required int? expectedSize,
    void Function(int received, int? total)? progress,
  }) async {
    if (!RegExp(r'^[a-f0-9]{64}$').hasMatch(sha256Expected)) {
      throw const FormatException('Archive sans SHA-256 fiable');
    }
    if (expectedSize != null && expectedSize <= 0) {
      throw const FormatException('Taille annoncée invalide');
    }

    for (var attempt = 0; attempt < 2; attempt++) {
      var offset = await target.exists() ? await target.length() : 0;
      if (offset > 0 && expectedSize != null && offset >= expectedSize) {
        if (offset == expectedSize &&
            (await sha256.bind(target.openRead()).first).toString() == sha256Expected) {
          progress?.call(offset, expectedSize);
          return; // Fully cached and verified: zero extra network usage.
        }
        await target.delete();
        offset = 0;
      }
      final request = http.Request('GET', uri);
      if (offset > 0) request.headers['Range'] = 'bytes=$offset-';
      final response = await client.send(request).timeout(const Duration(seconds: 30));

      if (response.statusCode == 416 && offset > 0) {
        if (await target.exists()) await target.delete();
        continue;
      }
      if (response.statusCode != 200 && response.statusCode != 206) {
        throw HttpException('Téléchargement impossible (HTTP ${response.statusCode})',
            uri: uri);
      }
      if ((response.headers['content-type'] ?? '').contains('text/html')) {
        throw const FormatException('Page HTML reçue à la place du pack');
      }
      if (response.statusCode == 206) {
        final range = RegExp(r'^bytes (\d+)-(\d+)/(\d+)$')
            .firstMatch(response.headers['content-range'] ?? '');
        if (offset == 0 || range == null ||
            int.parse(range.group(1)!) != offset ||
            int.parse(range.group(2)!) < offset ||
            (expectedSize != null && int.parse(range.group(3)!) != expectedSize) ||
            int.parse(range.group(2)!) >= int.parse(range.group(3)!)) {
          throw const FormatException('Content-Range HTTP incohérent');
        }
      } else {
        // A proxy may ignore Range and reply 200. Truncate, never append.
        offset = 0;
      }
      final stream = target.openWrite(
          mode: offset > 0 ? FileMode.append : FileMode.write);
      var received = offset;
      try {
        await for (final bytes in response.stream.timeout(const Duration(seconds: 45))) {
          received += bytes.length;
          if (expectedSize != null && received > expectedSize) {
            throw const FormatException('Archive plus grande que le manifeste');
          }
          stream.add(bytes);
          progress?.call(received, expectedSize);
        }
      } finally {
        await stream.close();
      }
      if (expectedSize != null && received != expectedSize) {
        throw const SocketException('Téléchargement incomplet, reprise possible');
      }
      final actualSha = (await sha256.bind(target.openRead()).first).toString();
      if (actualSha != sha256Expected) {
        // Incomplete/mixed releases must never be installed.
        if (await target.exists()) await target.delete();
        throw const FormatException('Archive altérée : SHA-256 incorrect');
      }
      return;
    }
    throw const FormatException('Serveur incapable de reprendre ce fichier');
  }
}
