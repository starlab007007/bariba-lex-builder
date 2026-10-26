/// DUNYA installable packs ("bibliothèques voyageuses").
///
/// A pack is an uncompressed ZIP with a manifest.json listing each file and its
/// SHA-256. It arrives either by an occasional Wi-Fi download or by a plain file
/// transfer (SD card, phone-to-phone sharing, Bluetooth). Installation and
/// integrity checks are 100 % offline.
library;

import 'dart:convert';
import 'dart:io';
import 'dart:isolate';
import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

const dunyaVoiceCorePackId = 'dunya-voice-core';
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
    id: dunyaVoiceCorePackId,
    title: 'Voix DUNYA : écoute français + baatɔnum, voix baatɔnum',
    zipUrl: '$_releaseBase/dunya-voice-core-v1.zip',
    manifestUrl: '$_releaseBase/dunya-voice-core-v1.manifest.json',
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

  /// Téléchargements en cours par pack : deux écrans peuvent proposer le
  /// même pack (le bandeau d'accueil et la page DUNYA) ; un second appel
  /// rejoint le premier au lieu d'écrire en parallèle dans le même fichier.
  final Map<String, Future<Map<String, dynamic>>> _inFlight = {};

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
      if (entity is! Directory || entity.path.endsWith('.partial')) continue;
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

    return DunyaVoicePaths(
      asrModel: existing(dunyaVoiceCorePackId, 'asr/model.int8.onnx'),
      asrTokens: existing(dunyaVoiceCorePackId, 'asr/tokens.txt'),
      ttsBba: voice(dunyaVoiceCorePackId, 'tts-bba'),
      ttsFra: voice(dunyaVoiceFrPackId, 'tts-fra'),
    );
  }

  /// Size announced by the published manifest (small JSON, needs a network).
  Future<int?> remoteSize(DunyaPackSource source) async {
    try {
      final res = await http.get(Uri.parse(source.manifestUrl)).timeout(const Duration(seconds: 20));
      if (res.statusCode != 200) return null;
      final decoded = jsonDecode(utf8.decode(res.bodyBytes));
      if (decoded is! Map) return null;
      // Publishing untested converted weights is insufficient. A public
      // offline translation pack requires a quality-reviewed manifest.
      if (source.id == dunyaTranslationPackId && decoded['tested'] is! bool) return null;
      return (decoded['total_bytes'] as num?)?.toInt();
    } catch (_) {
      return null;
    }
  }

  /// Do not download identical archives on repeated visits. The installed
  /// manifest is the local source of truth; missing remote metadata must
  /// not invalidate an already usable offline installation.
  Future<bool> isCurrent(DunyaPackSource source) async {
    final installed = (await installedManifests())[source.id];
    if (installed == null) return false;
    try {
      final response = await http.get(Uri.parse(source.manifestUrl))
          .timeout(const Duration(seconds: 12));
      if (response.statusCode != 200) return true;
      final remote = jsonDecode(utf8.decode(response.bodyBytes));
      if (remote is! Map || remote['id'] != source.id) return true;
      final oldVersion = installed['version']?.toString();
      final newVersion = remote['version']?.toString();
      if (oldVersion != null && newVersion != null) {
        return oldVersion == newVersion;
      }
      final oldFiles = installed['files'];
      final newFiles = remote['files'];
      return jsonEncode(oldFiles) == jsonEncode(newFiles);
    } catch (_) {
      return true;
    }
  }

  /// Occasional Wi-Fi download, then the same offline install as a file.
  ///
  /// Reprenable : une coupure réseau laisse le fichier partiel sur
  /// l'appareil (`<id>.download.zip`) au lieu de le supprimer. Le prochain
  /// appel redemande seulement la suite au serveur (en-tête `Range`), ce qui
  /// évite de tout retélécharger sur un réseau instable — essentiel pour un
  /// pack de plusieurs dizaines de Mo.
  ///
  /// Un même pack peut être proposé par deux écrans à la fois (le bandeau
  /// d'accueil et la page DUNYA) : un second appel pendant que le premier
  /// tourne encore rejoint silencieusement son résultat au lieu d'écrire en
  /// parallèle dans le même fichier (ses propres [onProgress] ne reçoivent
  /// alors que l'étape finale, pas la progression détaillée du premier).
  Future<Map<String, dynamic>> download(
    DunyaPackSource source, {
    void Function(DunyaPackProgress progress)? onProgress,
  }) {
    final existing = _inFlight[source.id];
    if (existing != null) return existing;
    final future = _downloadImpl(source, onProgress: onProgress);
    _inFlight[source.id] = future;
    future.whenComplete(() => _inFlight.remove(source.id));
    return future;
  }

  Future<Map<String, dynamic>> _downloadImpl(
    DunyaPackSource source, {
    void Function(DunyaPackProgress progress)? onProgress,
  }) async {
    if (await isCurrent(source)) {
      onProgress?.call(const DunyaPackProgress('done', 1, 'Pack déjà installé et à jour.'));
      return (await installedManifests())[source.id]!;
    }
    final root = await _root();
    final target = File('${root.path}/${source.id}.download.zip');
    final client = http.Client();
    try {
      // An unreviewed ByT5 export must never be offered as a usable model.
      // Check the release manifest before spending storage or bandwidth.
      if (source.id == dunyaTranslationPackId) {
        final meta = await client.get(Uri.parse(source.manifestUrl))
            .timeout(const Duration(seconds: 20));
        if (meta.statusCode != 200) {
          throw DunyaPackException('Le pack ByT5 vérifié n’est pas encore publié.');
        }
        final dynamic parsed = jsonDecode(utf8.decode(meta.bodyBytes));
        if (parsed is! Map || parsed['id'] != dunyaTranslationPackId ||
            parsed['format'] != 'dunya-pack/1' || parsed['tested'] is! bool) {
          throw DunyaPackException('Le pack ByT5 ne déclare pas son statut (test ou certifié).');
        }
      }
      var existing = await target.exists() ? await target.length() : 0;
      final request = http.Request('GET', Uri.parse(source.zipUrl));
      if (existing > 0) {
        request.headers['Range'] = 'bytes=$existing-';
      }
      final response = await client.send(request);
      if (response.statusCode == 404) {
        throw DunyaPackException(
          'Ce pack n’est pas encore disponible sur fitila.bj. Réessayez plus tard ou installez-le depuis un fichier.',
        );
      }
      if (existing > 0 && response.statusCode == 416) {
        // Fichier partiel déjà complet (ou incohérent) : on repart de zéro.
        _deleteQuietly(target);
        throw DunyaPackException('Reprise impossible : relancez, le téléchargement repartira de zéro.');
      }
      // Reject a partial HTTP response starting at the wrong byte.
      if (existing > 0 && response.statusCode == 206) {
        final contentRange = response.headers['content-range'] ?? '';
        final requestedOffset = existing.toString();
        if (!contentRange.startsWith('bytes $requestedOffset-')) {
          throw DunyaPackException('Point de reprise invalide. Fichier partiel conservé.');
        }
      }
      final resumed = existing > 0 && response.statusCode == 206;
      if (existing > 0 && response.statusCode == 200) {
        // Le serveur ne gère pas les requêtes partielles : on repart de zéro
        // plutôt que de corrompre le fichier déjà sur l'appareil.
        existing = 0;
      } else if (response.statusCode != 200 && response.statusCode != 206) {
        throw DunyaPackException('Téléchargement impossible (code ${response.statusCode}).');
      }
      final type = response.headers['content-type'] ?? '';
      if (type.contains('text/html')) {
        throw DunyaPackException('Le serveur a renvoyé une page au lieu du pack. Réessayez plus tard.');
      }
      final remaining = response.contentLength;
      final total = remaining == null ? null : existing + remaining;
      final sink = target.openWrite(mode: resumed ? FileMode.append : FileMode.write);
      var received = existing;
      var lastReport = existing;
      try {
        await for (final chunk in response.stream) {
          sink.add(chunk);
          received += chunk.length;
          if (received - lastReport > 2 * 1024 * 1024) {
            lastReport = received;
            onProgress?.call(DunyaPackProgress('download', total == null || total == 0 ? null : received / total, _mb(received)));
          }
        }
      } finally {
        await sink.close();
      }
      if (total != null && total > 0 && received != total) {
        // Coupure en cours de flux : le fichier partiel reste sur l'appareil
        // (voir `existing` ci-dessus), relancer reprend où l'on s'est arrêté.
        throw DunyaPackException('Téléchargement incomplet (${_mb(received)} sur ${_mb(total)}). Relancez : il reprendra où il s’est arrêté, de préférence en Wi-Fi.');
      }
      return await installFromFile(target.path, onProgress: onProgress, deleteSource: true);
    } on DunyaPackException {
      rethrow;
    } on SocketException {
      throw DunyaPackException('Connexion coupée. Relancez quand le réseau revient : le téléchargement reprendra où il s’est arrêté, de préférence en Wi-Fi.');
    } catch (error) {
      throw DunyaPackException('Téléchargement interrompu ($error). Relancez : il reprendra où il s’est arrêté.');
    } finally {
      client.close();
    }
  }

  void _deleteQuietly(File file) {
    try {
      if (file.existsSync()) file.deleteSync();
    } catch (_) {}
  }

  /// Install a pack ZIP already on the phone. Fully offline.
  Future<Map<String, dynamic>> installFromFile(
    String zipPath, {
    void Function(DunyaPackProgress progress)? onProgress,
    bool deleteSource = false,
  }) async {
    final root = await _root();
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
      // Fichier corrompu (ex. checksum invalide) : un fichier géré par
      // `download` est supprimé pour repartir d'un téléchargement complet au
      // prochain essai ; un fichier fourni par l'utilisateur est conservé.
      if (deleteSource) {
        try {
          File(zipPath).deleteSync();
        } catch (_) {}
      }
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
    if (manifest['id'] == dunyaTranslationPackId && manifest['tested'] is! bool) {
      throw DunyaPackException('Pack ByT5 sans statut (test ou certifié) : refusé.');
    }
    final id = manifest['id'].toString();
    if (!RegExp(r'^[a-z0-9-]{3,64}$').hasMatch(id)) throw DunyaPackException('Identifiant de pack invalide.');
    final files = (manifest['files'] as List).cast<Map<String, dynamic>>();
    final total = files.fold<int>(0, (sum, f) => sum + (f['size'] as num).toInt());

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
      if (entry.method != 0) throw DunyaPackException('Le pack doit être un ZIP non compressé.');
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
    if (finalDir.existsSync()) finalDir.deleteSync(recursive: true);
    partial.renameSync(finalDir.path);
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
).firstMatch(contentRange);
        if (match == null || int.tryParse(match.group(1)!) != existing) {
          throw DunyaPackException(
            'Le serveur ne confirme pas le bon point de reprise. Le fichier partiel est conservé.',
          );
        }
      }
      final resumed = existing > 0 && response.statusCode == 206;
      if (existing > 0 && response.statusCode == 200) {
        // Le serveur ne gère pas les requêtes partielles : on repart de zéro
        // plutôt que de corrompre le fichier déjà sur l'appareil.
        existing = 0;
      } else if (response.statusCode != 200 && response.statusCode != 206) {
        throw DunyaPackException('Téléchargement impossible (code ${response.statusCode}).');
      }
      final type = response.headers['content-type'] ?? '';
      if (type.contains('text/html')) {
        throw DunyaPackException('Le serveur a renvoyé une page au lieu du pack. Réessayez plus tard.');
      }
      final remaining = response.contentLength;
      final total = remaining == null ? null : existing + remaining;
      final sink = target.openWrite(mode: resumed ? FileMode.append : FileMode.write);
      var received = existing;
      var lastReport = existing;
      try {
        await for (final chunk in response.stream) {
          sink.add(chunk);
          received += chunk.length;
          if (received - lastReport > 2 * 1024 * 1024) {
            lastReport = received;
            onProgress?.call(DunyaPackProgress('download', total == null || total == 0 ? null : received / total, _mb(received)));
          }
        }
      } finally {
        await sink.close();
      }
      if (total != null && total > 0 && received != total) {
        // Coupure en cours de flux : le fichier partiel reste sur l'appareil
        // (voir `existing` ci-dessus), relancer reprend où l'on s'est arrêté.
        throw DunyaPackException('Téléchargement incomplet (${_mb(received)} sur ${_mb(total)}). Relancez : il reprendra où il s’est arrêté, de préférence en Wi-Fi.');
      }
      return await installFromFile(target.path, onProgress: onProgress, deleteSource: true);
    } on DunyaPackException {
      rethrow;
    } on SocketException {
      throw DunyaPackException('Connexion coupée. Relancez quand le réseau revient : le téléchargement reprendra où il s’est arrêté, de préférence en Wi-Fi.');
    } catch (error) {
      throw DunyaPackException('Téléchargement interrompu ($error). Relancez : il reprendra où il s’est arrêté.');
    } finally {
      client.close();
    }
  }

  void _deleteQuietly(File file) {
    try {
      if (file.existsSync()) file.deleteSync();
    } catch (_) {}
  }

  /// Install a pack ZIP already on the phone. Fully offline.
  Future<Map<String, dynamic>> installFromFile(
    String zipPath, {
    void Function(DunyaPackProgress progress)? onProgress,
    bool deleteSource = false,
  }) async {
    final root = await _root();
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
      // Fichier corrompu (ex. checksum invalide) : un fichier géré par
      // `download` est supprimé pour repartir d'un téléchargement complet au
      // prochain essai ; un fichier fourni par l'utilisateur est conservé.
      if (deleteSource) {
        try {
          File(zipPath).deleteSync();
        } catch (_) {}
      }
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
    if (manifest['id'] == dunyaTranslationPackId && manifest['tested'] is! bool) {
      throw DunyaPackException('Pack ByT5 sans statut (test ou certifié) : refusé.');
    }
    final id = manifest['id'].toString();
    if (!RegExp(r'^[a-z0-9-]{3,64}$').hasMatch(id)) throw DunyaPackException('Identifiant de pack invalide.');
    final files = (manifest['files'] as List).cast<Map<String, dynamic>>();
    final total = files.fold<int>(0, (sum, f) => sum + (f['size'] as num).toInt());

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
      if (entry.method != 0) throw DunyaPackException('Le pack doit être un ZIP non compressé.');
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
    if (finalDir.existsSync()) finalDir.deleteSync(recursive: true);
    partial.renameSync(finalDir.path);
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
