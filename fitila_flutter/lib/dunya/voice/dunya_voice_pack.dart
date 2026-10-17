/// DUNYA installable packs ("bibliothèques voyageuses").
///
/// A pack is an uncompressed ZIP with a manifest.json listing each file and its
/// SHA-256. It arrives either by an occasional Wi-Fi download or by a plain file
/// transfer (SD card, phone-to-phone sharing, Bluetooth). Installation and
/// integrity checks are 100 % offline.
library;

import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:isolate';
import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:flutter/services.dart';

import 'dunya_resumable_download.dart';

const dunyaVoiceCorePackId = 'dunya-voice-core';
const dunyaVoiceBbaPackId = 'dunya-voice-bba';
const dunyaAsrOmniPackId = 'dunya-asr-omni';

// Exact hashes from the deterministic GitHub CI conversion run 39020622279.
// Shipped in the APK, so replacing both a ZIP and its hosted manifest cannot
// silently install different model weights.
const trustedVillagePackSha256 = <String, String>{
  dunyaVoiceBbaPackId: '6c047ac26f83f0f4a90cdfeb72615b0514afcd7cd7892d2a041e9074be5398bf',
  dunyaAsrOmniPackId: '2cf5d651d508199a664dd51479c9fc576e634a44c7a5c73250445df72b16d67b',
  // Previously published and inspectable release assets (11 Oct 2026).
  dunyaVoiceCorePackId: '623f17b2cf774dd99ef2ac85aad72fa9740d3c2cfd870ca8609f07956d25839c',
  dunyaVoiceFrPackId: 'c8352f9c98e9b06159d867628aa13bb547c64fd01d354dffa0f75d76bfe85077',
};
const dunyaVoiceFrPackId = 'dunya-voice-fr';
const dunyaTranslationPackId = 'dunya-translate-byt5';

/// Public mirror on fitila.bj (the GitHub repository is private, so its
/// release assets are not downloadable by phones).
const _releaseBase = 'https://fitila.bj/dunya-packs/v1';

class DunyaPackSource {
  const DunyaPackSource({required this.id, required this.title, required this.zipUrl, required this.manifestUrl});

  final String id;
  final String title;
  final String zipUrl;
  final String manifestUrl;
}

const dunyaVoicePackSources = <DunyaPackSource>[
  DunyaPackSource(
    id: dunyaVoiceBbaPackId,
    title: 'Voix Baatɔnum seule · utilisable sans Internet',
    zipUrl: '$_releaseBase/dunya-voice-bba-v1.zip',
    manifestUrl: '$_releaseBase/dunya-voice-bba-v1.manifest.json',
  ),
  DunyaPackSource(
    id: dunyaAsrOmniPackId,
    title: 'Écoute vocale Omnilingual · optionnelle',
    zipUrl: '$_releaseBase/dunya-asr-omni-v1.zip',
    manifestUrl: '$_releaseBase/dunya-asr-omni-v1.manifest.json',
  ),
  DunyaPackSource(
    id: dunyaVoiceFrPackId,
    title: 'Voix française de secours (si le téléphone n’en a pas)',
    zipUrl: '$_releaseBase/dunya-voice-fr-v1.zip',
    manifestUrl: '$_releaseBase/dunya-voice-fr-v1.manifest.json',
  ),
  DunyaPackSource(
    id: dunyaTranslationPackId,
    title: 'ByT5 Français ↔ Baatɔnum (traduction sans Internet)',
    zipUrl: '$_releaseBase/dunya-translate-byt5-v1.zip',
    manifestUrl: '$_releaseBase/dunya-translate-byt5-v1.manifest.json',
  ),
];

/// Resolved model files of the installed voice packs.
class DunyaVoicePaths {
  const DunyaVoicePaths({this.asrModel, this.asrTokens, this.ttsBba, this.ttsFra});

  final String? asrModel;
  final String? asrTokens;
  final DunyaTtsVoiceFiles? ttsBba;
  final DunyaTtsVoiceFiles? ttsFra;

  bool get canListen => asrModel != null && asrTokens != null;
  bool get canSpeakBariba => ttsBba != null;
  bool get canSpeakFrenchOffline => ttsFra != null;
}

class DunyaTtsVoiceFiles {
  const DunyaTtsVoiceFiles({required this.model, required this.tokens, required this.normalization});

  final String model;
  final String tokens;

  /// Character substitutions so text matches the voice's alphabet.
  final Map<String, String> normalization;
}

class DunyaPackProgress {
  const DunyaPackProgress(this.stage, this.fraction, [this.detail = '']);

  /// download | extract | verify | done
  final String stage;
  final double? fraction;
  final String detail;
}

class DunyaPackException implements Exception {
  DunyaPackException(this.message);

  final String message;

  @override
  String toString() => message;
}

class DunyaVoicePackManager {
  DunyaVoicePackManager._();

  static final instance = DunyaVoicePackManager._();

  Future<Directory> _root() async {
    final base = await getApplicationSupportDirectory();
    final dir = Directory('${base.path}/dunya_packs');
    if (!dir.existsSync()) dir.createSync(recursive: true);
    return dir;
  }

  Future<Map<String, Map<String, dynamic>>> installedManifests() async {
    final root = await _root();
    final result = <String, Map<String, dynamic>>{};
    for (final entity in root.listSync()) {
      if (entity is! Directory ||
          entity.path.endsWith('.partial') ||
          entity.path.endsWith('.backup')) {
        continue;
      }
      final manifest = File('${entity.path}/manifest.json');
      if (!manifest.existsSync()) continue;
      try {
        final decoded = jsonDecode(manifest.readAsStringSync());
        if (decoded is Map<String, dynamic>) result[decoded['id'].toString()] = decoded;
      } catch (_) {}
    }
    return result;
  }

  Future<DunyaVoicePaths> resolvePaths() async {
    final root = await _root();
    String? existing(String packId, String rel) {
      final f = File('${root.path}/$packId/$rel');
      return f.existsSync() ? f.path : null;
    }

    DunyaTtsVoiceFiles? voice(String packId, String folder) {
      final model = existing(packId, '$folder/model.onnx');
      final tokens = existing(packId, '$folder/tokens.txt');
      if (model == null || tokens == null) return null;
      var normalization = <String, String>{};
      final normFile = existing(packId, '$folder/normalize.json');
      if (normFile != null) {
        try {
          final decoded = jsonDecode(File(normFile).readAsStringSync());
          if (decoded is Map) {
            normalization = {for (final e in decoded.entries) e.key.toString(): e.value.toString()};
          }
        } catch (_) {}
      }
      return DunyaTtsVoiceFiles(model: model, tokens: tokens, normalization: normalization);
    }

    final separateModel = existing(dunyaAsrOmniPackId, 'asr/model.int8.onnx');
    final separateTokens = existing(dunyaAsrOmniPackId, 'asr/tokens.txt');
    // Never pair an incomplete ASR pack with the old complete core.
    final separateIsComplete = separateModel != null && separateTokens != null;
    return DunyaVoicePaths(
      asrModel: separateIsComplete
          ? separateModel
          : existing(dunyaVoiceCorePackId, 'asr/model.int8.onnx'),
      asrTokens: separateIsComplete
          ? separateTokens
          : existing(dunyaVoiceCorePackId, 'asr/tokens.txt'),
      ttsBba: voice(dunyaVoiceBbaPackId, 'tts-bba') ?? voice(dunyaVoiceCorePackId, 'tts-bba'),
      ttsFra: voice(dunyaVoiceFrPackId, 'tts-fra'),
    );
  }

  /// Size announced by the published manifest (small JSON, needs a network).
  Future<int?> remoteSize(DunyaPackSource source) async {
    try {
      final res = await http.get(Uri.parse(source.manifestUrl)).timeout(const Duration(seconds: 20));
      if (res.statusCode != 200) { return null; }
      final decoded = jsonDecode(utf8.decode(res.bodyBytes));
      if (decoded is! Map) { return null; }
      // Publishing untested converted weights is insufficient. A public
      // offline translation pack requires a quality-reviewed manifest.
      if (source.id == dunyaTranslationPackId && decoded['tested'] != true) { return null; }
      // Split packs are only advertised after a published checksum and real
      // voice QA approval. Candidate CI artifacts are not public downloads.
      if ((source.id == dunyaVoiceBbaPackId || source.id == dunyaAsrOmniPackId) &&
          (decoded['tested'] != true || decoded['quality_certified'] != true ||
           decoded['archive_sha256'] != trustedVillagePackSha256[source.id])) { return null; }
      return (decoded['total_download_bytes'] as num?)?.toInt() ??
          (decoded['total_bytes'] as num?)?.toInt();
    } catch (_) {
      return null;
    }
  }

  /// Available storage reported by Android StatFs; null on other platforms.
  static const _storage = MethodChannel('fitila/offline/storage');
  Future<int?> freeBytes() async {
    try {
      return await _storage.invokeMethod<int>('freeBytes');
    } on MissingPluginException {
      return null;
    } on PlatformException {
      return null;
    }
  }

  /// Resume partial downloads after weak-network interruptions. Every new
  /// split pack requires its release sidecar SHA-256 before acceptance.
  Future<Map<String, dynamic>> download(
    DunyaPackSource source, {
    void Function(DunyaPackProgress progress)? onProgress,
  }) async {
    final root = await _root();
    final target = File('${root.path}/${source.id}.download.part');
    final client = http.Client();
    try {
      final remote = await client.get(Uri.parse(source.manifestUrl))
          .timeout(const Duration(seconds: 25));
      if (remote.statusCode != 200) {
        throw DunyaPackException('Pack non publié : ${source.id}. Installez un fichier vérifié si disponible.');
      }
      final manifest = jsonDecode(utf8.decode(remote.bodyBytes)) as Map<String, dynamic>;
      if (manifest['id'] != source.id) throw DunyaPackException('Manifeste du pack inattendu.');
      final split = source.id == dunyaVoiceBbaPackId || source.id == dunyaAsrOmniPackId;
      if (source.id == dunyaTranslationPackId && manifest['tested'] != true ||
          split && (manifest['tested'] != true || manifest['quality_certified'] != true)) {
        throw DunyaPackException('Ce modèle attend sa validation et sa publication officielle.');
      }
      final hash = manifest['archive_sha256']?.toString() ?? '';
      if (split && hash != trustedVillagePackSha256[source.id]) {
        throw DunyaPackException('Empreinte officielle du modèle non reconnue. Mise à jour FITILA requise.');
      }
      final expectedSize = (manifest['total_download_bytes'] as num?)?.toInt();
      final expectedUnpacked = (manifest['total_bytes'] as num?)?.toInt() ?? 0;
      final free = await freeBytes();
      if (free != null && free < expectedUnpacked + 32 * 1024 * 1024) {
        throw DunyaPackException('Espace insuffisant pour installer ce modèle.');
      }
      final expectedHash = trustedVillagePackSha256[source.id] ??
          manifest['archive_sha256']?.toString() ?? '';
      if (!RegExp(r'^[a-f0-9]{64}$').hasMatch(expectedHash)) {
        throw DunyaPackException('SHA-256 officiel du pack non publié.');
      }
      try {
        await DunyaResumableDownload.save(
          client: client,
          uri: Uri.parse(source.zipUrl),
          target: target,
          sha256Expected: expectedHash,
          expectedSize: expectedSize,
          progress: (received, total) => onProgress?.call(DunyaPackProgress(
              'download', total == null ? null : received / total, _mb(received))),
        );
      } on FormatException catch (error) {
        throw DunyaPackException('Téléchargement rejeté : ${error.message}');
      } on HttpException catch (error) {
        throw DunyaPackException(error.message);
      }
      return await installFromFile(target.path, onProgress: onProgress, deleteSource: true);
    } on SocketException {
      throw DunyaPackException('Connexion interrompue. Votre téléchargement est conservé pour une reprise.');
    } on TimeoutException {
      throw DunyaPackException('Réseau lent. Votre téléchargement est conservé pour une reprise.');
    } on http.ClientException {
      throw DunyaPackException('Réseau instable. Le téléchargement pourra reprendre.');
    } finally {
      client.close();
    }
  }

  /// Install a pack ZIP already on the phone. Fully offline.
  Future<Map<String, dynamic>> installFromFile(
    String zipPath, {
    void Function(DunyaPackProgress progress)? onProgress,
    bool deleteSource = false,
  }) async {
    final root = await _root();
    // Old versions of a pack remain available if a replacement fails.
    final available = await freeBytes();
    if (available != null) {
      final bytes = File(zipPath).lengthSync();
      // Uncompressed ZIP requires approximately its own size again while
      // staged. Subtract the source only after the atomic install succeeds.
      if (available < bytes + 32 * 1024 * 1024) {
        throw DunyaPackException('Stockage insuffisant pour extraire le pack : libérez de l’espace.');
      }
    }
    onProgress?.call(const DunyaPackProgress('extract', null, 'Ouverture du pack…'));
    final port = ReceivePort();
    final sub = port.listen((message) {
      if (message is List && message.length == 3) {
        onProgress?.call(DunyaPackProgress(message[0] as String, (message[1] as num?)?.toDouble(), message[2] as String));
      }
    });
    try {
      final manifest = await _runInstall(zipPath, root.path, port.sendPort);
      if (deleteSource) {
        try {
          File(zipPath).deleteSync();
        } catch (_) {}
      }
      onProgress?.call(const DunyaPackProgress('done', 1, 'Pack installé.'));
      return manifest;
    } on DunyaPackException {
      rethrow;
    } catch (error) {
      throw DunyaPackException('Pack illisible : $error');
    } finally {
      await sub.cancel();
      port.close();
    }
  }

  Future<void> remove(String packId) async {
    final root = await _root();
    final dir = Directory('${root.path}/$packId');
    if (dir.existsSync()) dir.deleteSync(recursive: true);
  }
}

Future<Map<String, dynamic>> _runInstall(String zipPath, String rootPath, SendPort progress) =>
    Isolate.run(() => _installPack(zipPath, rootPath, progress));

String _mb(int bytes) => '${(bytes / (1024 * 1024)).toStringAsFixed(0)} Mo';

// ---------------------------------------------------------------------------
// Isolate side: minimal ZIP reader (stored entries) + SHA-256 verification.
// ---------------------------------------------------------------------------

class _ZipEntry {
  _ZipEntry(this.name, this.method, this.compressedSize, this.size, this.localHeaderOffset);

  final String name;
  final int method;
  final int compressedSize;
  final int size;
  final int localHeaderOffset;
}

Future<Map<String, dynamic>> _installPack(String zipPath, String rootPath, SendPort progress) async {
  final file = File(zipPath);
  if (!file.existsSync()) throw DunyaPackException('Fichier introuvable.');
  final raf = file.openSync();
  try {
    final entries = _readStoredZipDirectory(raf);
    final manifestEntry = entries.where((e) => e.name == 'manifest.json').firstOrNull;
    if (manifestEntry == null) throw DunyaPackException('Ce fichier n’est pas un pack DUNYA (manifest absent).');
    final manifest = jsonDecode(utf8.decode(_readEntry(raf, manifestEntry))) as Map<String, dynamic>;
    if (manifest['format'] != 'dunya-pack/1') throw DunyaPackException('Format de pack inconnu.');
    final id = manifest['id'].toString();
    if (!RegExp(r'^[a-z0-9-]{3,64}$').hasMatch(id)) {
      throw DunyaPackException('Identifiant de pack invalide.');
    }
    // Archive identities are pinned in the signed FITILA APK.
    final trusted = trustedVillagePackSha256[id];
    if (trusted != null) {
      final actual = await sha256.bind(file.openRead()).first;
      if (actual.toString() != trusted) {
        throw DunyaPackException('Ce pack local ne correspond pas à l’édition officielle FITILA.');
      }
    }
    final files = (manifest['files'] as List).cast<Map<String, dynamic>>();
    if (files.isEmpty || files.length > 128 ||
        files.map((f) => f['path']).toSet().length != files.length) {
      throw DunyaPackException('Manifeste vide ou doublons.');
    }
    final total = files.fold<int>(0, (sum, f) => sum + (f['size'] as num).toInt());
    if (total > 4 * 1024 * 1024 * 1024) throw DunyaPackException('Archive trop volumineuse.');

    final partial = Directory('$rootPath/$id.partial');
    if (partial.existsSync()) partial.deleteSync(recursive: true);
    partial.createSync(recursive: true);

    var done = 0;
    for (final f in files) {
      final rel = f['path'].toString();
      if (rel.startsWith('/') || rel.contains('..') || rel.contains('\\')) {
        throw DunyaPackException('Chemin interdit dans le pack : $rel');
      }
      final entry = entries.where((e) => e.name == rel).firstOrNull;
      if (entry == null) throw DunyaPackException('Fichier manquant dans le pack : $rel');
      if (entry.method != 0 || entry.size != (f['size'] as num).toInt()) {
        throw DunyaPackException('ZIP non compressé attendu, dimensions incohérentes.');
      }
      final out = File('${partial.path}/$rel');
      out.parent.createSync(recursive: true);
      final digest = await _copyEntryAndHash(raf, entry, out, (copied) {
        progress.send(['extract', total == 0 ? null : (done + copied) / total, rel]);
      });
      if (digest != f['sha256']) {
        partial.deleteSync(recursive: true);
        throw DunyaPackException('Fichier altéré : $rel. Recopiez le pack et réessayez.');
      }
      done += entry.size;
      progress.send(['verify', total == 0 ? null : done / total, rel]);
    }
    File('${partial.path}/manifest.json').writeAsStringSync(jsonEncode(manifest));

    final finalDir = Directory('$rootPath/$id');
    final previous = Directory('$rootPath/$id.backup');
    if (previous.existsSync()) previous.deleteSync(recursive: true);
    if (finalDir.existsSync()) finalDir.renameSync(previous.path);
    try {
      partial.renameSync(finalDir.path);
      if (previous.existsSync()) previous.deleteSync(recursive: true);
    } catch (_) {
      if (previous.existsSync() && !finalDir.existsSync()) previous.renameSync(finalDir.path);
      rethrow;
    }
    return manifest;
  } finally {
    raf.closeSync();
  }
}

/// Reads the central directory of a ZIP (ZIP64 aware).
List<_ZipEntry> _readStoredZipDirectory(RandomAccessFile raf) {
  final length = raf.lengthSync();
  final tailSize = length < 65557 ? length : 65557;
  raf.setPositionSync(length - tailSize);
  final tail = raf.readSync(tailSize);
  var eocd = -1;
  for (var i = tail.length - 22; i >= 0; i--) {
    if (tail[i] == 0x50 && tail[i + 1] == 0x4b && tail[i + 2] == 0x05 && tail[i + 3] == 0x06) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw DunyaPackException('Fichier ZIP invalide.');
  final bd = ByteData.sublistView(tail);
  var count = bd.getUint16(eocd + 10, Endian.little);
  var cdSize = bd.getUint32(eocd + 12, Endian.little);
  var cdOffset = bd.getUint32(eocd + 16, Endian.little);

  if (count == 0xFFFF || cdSize == 0xFFFFFFFF || cdOffset == 0xFFFFFFFF) {
    final locator = eocd - 20;
    if (locator < 0 || bd.getUint32(locator, Endian.little) != 0x07064b50) {
      throw DunyaPackException('ZIP64 invalide.');
    }
    final zip64Offset = bd.getUint64(locator + 8, Endian.little);
    raf.setPositionSync(zip64Offset);
    final rec = ByteData.sublistView(raf.readSync(56));
    if (rec.getUint32(0, Endian.little) != 0x06064b50) throw DunyaPackException('ZIP64 invalide.');
    count = rec.getUint64(32, Endian.little);
    cdSize = rec.getUint64(40, Endian.little);
    cdOffset = rec.getUint64(48, Endian.little);
  }

  raf.setPositionSync(cdOffset);
  final cd = raf.readSync(cdSize);
  final c = ByteData.sublistView(cd);
  final entries = <_ZipEntry>[];
  var p = 0;
  for (var n = 0; n < count; n++) {
    if (c.getUint32(p, Endian.little) != 0x02014b50) throw DunyaPackException('Répertoire ZIP invalide.');
    final method = c.getUint16(p + 10, Endian.little);
    var compressed = c.getUint32(p + 20, Endian.little);
    var size = c.getUint32(p + 24, Endian.little);
    final nameLen = c.getUint16(p + 28, Endian.little);
    final extraLen = c.getUint16(p + 30, Endian.little);
    final commentLen = c.getUint16(p + 32, Endian.little);
    var offset = c.getUint32(p + 42, Endian.little);
    final name = utf8.decode(cd.sublist(p + 46, p + 46 + nameLen));
    var e = p + 46 + nameLen;
    final extraEnd = e + extraLen;
    while (e + 4 <= extraEnd) {
      final id = c.getUint16(e, Endian.little);
      final len = c.getUint16(e + 2, Endian.little);
      if (id == 0x0001) {
        var q = e + 4;
        if (size == 0xFFFFFFFF) {
          size = c.getUint64(q, Endian.little);
          q += 8;
        }
        if (compressed == 0xFFFFFFFF) {
          compressed = c.getUint64(q, Endian.little);
          q += 8;
        }
        if (offset == 0xFFFFFFFF) {
          offset = c.getUint64(q, Endian.little);
        }
      }
      e += 4 + len;
    }
    entries.add(_ZipEntry(name, method, compressed, size, offset));
    p = extraEnd + commentLen;
  }
  return entries;
}

int _dataStart(RandomAccessFile raf, _ZipEntry entry) {
  raf.setPositionSync(entry.localHeaderOffset);
  final header = ByteData.sublistView(raf.readSync(30));
  if (header.getUint32(0, Endian.little) != 0x04034b50) throw DunyaPackException('Entrée ZIP invalide.');
  return entry.localHeaderOffset + 30 + header.getUint16(26, Endian.little) + header.getUint16(28, Endian.little);
}

Uint8List _readEntry(RandomAccessFile raf, _ZipEntry entry) {
  if (entry.method != 0) throw DunyaPackException('Le pack doit être un ZIP non compressé.');
  raf.setPositionSync(_dataStart(raf, entry));
  return raf.readSync(entry.size);
}

Future<String> _copyEntryAndHash(
  RandomAccessFile raf,
  _ZipEntry entry,
  File out,
  void Function(int copied) onCopied,
) async {
  final start = _dataStart(raf, entry);
  final digestSink = _DigestSink();
  final hasher = sha256.startChunkedConversion(digestSink);
  final writer = out.openSync(mode: FileMode.write);
  try {
    const chunk = 1 << 20;
    var copied = 0;
    raf.setPositionSync(start);
    while (copied < entry.size) {
      final want = entry.size - copied < chunk ? entry.size - copied : chunk;
      final bytes = raf.readSync(want);
      if (bytes.isEmpty) throw DunyaPackException('Pack tronqué : ${entry.name}');
      writer.writeFromSync(bytes);
      hasher.add(bytes);
      copied += bytes.length;
      if (copied % (8 * chunk) < chunk) onCopied(copied);
    }
  } finally {
    writer.closeSync();
  }
  hasher.close();
  return digestSink.value.toString();
}

class _DigestSink implements Sink<Digest> {
  late Digest value;

  @override
  void add(Digest data) => value = data;

  @override
  void close() {}
}

/// Installs a pack synchronously in the current isolate (tests, tooling).
Future<Map<String, dynamic>> installDunyaPackFile(String zipPath, String rootPath) {
  final port = ReceivePort();
  return _installPack(zipPath, rootPath, port.sendPort).whenComplete(port.close);
}
