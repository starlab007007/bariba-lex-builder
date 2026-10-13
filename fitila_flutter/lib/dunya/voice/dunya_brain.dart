/// DUNYA native compact brain: Qwen3-1.7B INT4 through LiteRT-LM.
///
/// The model (~977 MB) is downloaded once, directly as a file (no archive, so
/// no double storage), with resume and SHA-256 verification — or copied from
/// another phone / SD card. Nothing is sent to any server during use.
library;

import 'dart:async';
import 'dart:io';
import 'dart:isolate';

import 'package:crypto/crypto.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import '../../dunya_v3/qwen_candidate.dart';


class DunyaBrainModel {
  const DunyaBrainModel({
    required this.id,
    required this.title,
    required this.fileName,
    required this.sizeBytes,
    required this.sha256,
    required this.urls,
    required this.minRamMb,
  });

  final String id;
  final String title;
  final String fileName;
  final int sizeBytes;
  final String sha256;

  /// Tried in order: public CDN first, fitila.bj mirror second.
  final List<String> urls;
  final int minRamMb;
}

/// Gemma 4 E2B instruction-tuned, LiteRT-LM format (Apache-2.0).
const dunyaBrainE2B = DunyaBrainModel(
  id: 'gemma-4-e2b',
  title: 'Cerveau DUNYA (Gemma 4 E2B)',
  fileName: 'gemma-4-E2B-it.litertlm',
  sizeBytes: 2588147712,
  sha256: '181938105e0eefd105961417e8da75903eacda102c4fce9ce90f50b97139a63c',
  urls: [
    'https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it.litertlm',
    'https://fitila.bj/dunya-packs/brain/gemma-4-E2B-it.litertlm',
  ],
  minRamMb: 3500,
);

/// Version-pinned lightweight language model. Keep Gemma catalogued for rollback.
const dunyaBrainQwen3 = DunyaBrainModel(
  id: DunyaQwenCandidate.id,
  title: 'Cerveau DUNYA (Qwen3-1.7B INT4)',
  fileName: DunyaQwenCandidate.fileName,
  sizeBytes: DunyaQwenCandidate.sizeBytes,
  sha256: '2eeffef7b51bc3e1225ea69fe7aa5f417397934b56a5b6c20cc068d6fd2c918b',
  urls: [DunyaQwenCandidate.downloadUrl],
  minRamMb: 4096,
);

class DunyaDeviceInfo {
  const DunyaDeviceInfo({
    required this.totalRamMb,
    required this.availRamMb,
    required this.lowRam,
    required this.cores,
    this.abi = '',
  });

  final int totalRamMb;
  final int availRamMb;
  final bool lowRam;
  final int cores;

  /// Primary processor ABI. The LiteRT-LM engine ships for arm64 only.
  final String abi;

  bool get supportedProcessor => abi.isEmpty || abi.contains('arm64') || abi.contains('x86_64');

  bool canRun(DunyaBrainModel model) => supportedProcessor && !lowRam && totalRamMb >= model.minRamMb;
}

class DunyaBrainException implements Exception {
  DunyaBrainException(this.message);

  final String message;

  @override
  String toString() => message;
}

enum DunyaBrainState { absent, installed, loading, ready, failed }

class DunyaBrain {
  DunyaBrain._() {
    _events.receiveBroadcastStream().listen(_onEvent, onError: (_) {});
  }

  static final instance = DunyaBrain._();

  static const _channel = MethodChannel('fitila/dunya_llm');
  static const _events = EventChannel('fitila/dunya_llm/stream');

  final model = dunyaBrainQwen3;
  DunyaBrainState state = DunyaBrainState.absent;
  String backend = '';
  String? lastError;
  final _streams = <int, StreamController<String>>{};
  var _requestId = 0;
  String? _conversationKey;
  Future<void>? _loading;

  Future<Directory> _dir() async {
    final base = await getApplicationSupportDirectory();
    final dir = Directory('${base.path}/dunya_brain');
    if (!dir.existsSync()) dir.createSync(recursive: true);
    return dir;
  }

  Future<File> modelFile() async => File('${(await _dir()).path}/${model.fileName}');

  Future<bool> isInstalled() async {
    final f = await modelFile();
    return f.existsSync() && f.lengthSync() == model.sizeBytes;
  }

  Future<DunyaDeviceInfo> deviceInfo() async {
    try {
      final m = await _channel.invokeMapMethod<String, Object?>('deviceInfo') ?? const {};
      return DunyaDeviceInfo(
        totalRamMb: (m['totalRamMb'] as int?) ?? 0,
        availRamMb: (m['availRamMb'] as int?) ?? 0,
        lowRam: (m['lowRam'] as bool?) ?? false,
        cores: (m['cores'] as int?) ?? Platform.numberOfProcessors,
        abi: m['abi']?.toString() ?? '',
      );
    } on MissingPluginException {
      return DunyaDeviceInfo(totalRamMb: 0, availRamMb: 0, lowRam: true, cores: Platform.numberOfProcessors);
    }
  }

  Future<void> refreshState() async {
    if (state == DunyaBrainState.ready || state == DunyaBrainState.loading) return;
    state = await isInstalled() ? DunyaBrainState.installed : DunyaBrainState.absent;
  }

  /// Downloads the model with resume. [onProgress] gets 0..1 and a label.
  Future<void> download({void Function(double? fraction, String label)? onProgress}) async {
    final target = await modelFile();
    final partial = File('${target.path}.part');
    Object? lastFailure;
    for (final url in model.urls) {
      final client = http.Client();
      try {
        var have = partial.existsSync() ? partial.lengthSync() : 0;
        if (have > model.sizeBytes) {
          partial.deleteSync();
          have = 0;
        }
        final request = http.Request('GET', Uri.parse(url));
        if (have > 0) request.headers['Range'] = 'bytes=$have-';
        final response = await client.send(request).timeout(const Duration(seconds: 40));
        if (response.statusCode == 200 && have > 0) {
          have = 0; // server ignored the range: restart cleanly
        } else if (response.statusCode != 200 && response.statusCode != 206) {
          lastFailure = 'code ${response.statusCode}';
          continue;
        }
        if ((response.headers['content-type'] ?? '').contains('text/html')) {
          lastFailure = 'page HTML';
          continue;
        }
        final sink = partial.openWrite(mode: have > 0 ? FileMode.append : FileMode.write);
        var received = have;
        var lastReport = 0;
        try {
          await for (final chunk in response.stream.timeout(const Duration(seconds: 60))) {
            sink.add(chunk);
            received += chunk.length;
            if (received - lastReport > 8 * 1024 * 1024) {
              lastReport = received;
              onProgress?.call(received / model.sizeBytes, '${received ~/ (1024 * 1024)} / ${model.sizeBytes ~/ (1024 * 1024)} Mo');
            }
          }
        } finally {
          await sink.close();
        }
        if (received != model.sizeBytes) {
          lastFailure = 'incomplet (${received ~/ (1024 * 1024)} Mo)';
          continue; // next attempt resumes from the partial file
        }
        onProgress?.call(null, 'Vérification de l’intégrité…');
        final digest = await _sha256(partial.path);
        if (digest != model.sha256) {
          partial.deleteSync();
          throw DunyaBrainException('Fichier altéré pendant le téléchargement. Réessayez.');
        }
        if (target.existsSync()) target.deleteSync();
        partial.renameSync(target.path);
        state = DunyaBrainState.installed;
        return;
      } on DunyaBrainException {
        rethrow;
      } on FileSystemException catch (error) {
        throw DunyaBrainException(
          'Espace insuffisant sur le téléphone (il faut au moins 1,1 Go libres). ${error.osError?.message ?? ''}',
        );
      } catch (error) {
        lastFailure = error;
      } finally {
        client.close();
      }
    }
    throw DunyaBrainException(
      'Téléchargement interrompu ($lastFailure). Il reprendra où il s’est arrêté : réessayez en Wi-Fi.',
    );
  }

  /// Installs a model file copied onto the phone (SD card, sharing).
  Future<void> installFromFile(String path, {void Function(double? fraction, String label)? onProgress, bool deleteSource = false}) async {
    final source = File(path);
    if (!source.existsSync()) throw DunyaBrainException('Fichier introuvable.');
    if (source.lengthSync() != model.sizeBytes) {
      throw DunyaBrainException('Ce fichier n’est pas le cerveau DUNYA attendu (taille différente).');
    }
    onProgress?.call(null, 'Vérification de l’intégrité…');
    if (await _sha256(path) != model.sha256) {
      throw DunyaBrainException('Fichier altéré ou incorrect. Recopiez-le et réessayez.');
    }
    final target = await modelFile();
    onProgress?.call(null, 'Installation…');
    if (target.existsSync()) target.deleteSync();
    if (deleteSource) {
      try {
        source.renameSync(target.path);
      } on FileSystemException {
        await source.copy(target.path);
        source.deleteSync();
      }
    } else {
      await source.copy(target.path);
    }
    state = DunyaBrainState.installed;
  }

  Future<void> remove() async {
    await unload();
    final f = await modelFile();
    if (f.existsSync()) f.deleteSync();
    final p = File('${f.path}.part');
    if (p.existsSync()) p.deleteSync();
    state = DunyaBrainState.absent;
  }

  /// Loads the model in memory (a few seconds to ~30 s on small phones).
  Future<void> ensureLoaded() {
    if (state == DunyaBrainState.ready) return Future.value();
    return _loading ??= _load().whenComplete(() => _loading = null);
  }

  Future<void> _load() async {
    final f = await modelFile();
    if (!f.existsSync()) {
      state = DunyaBrainState.absent;
      throw DunyaBrainException('Cerveau non installé.');
    }
    state = DunyaBrainState.loading;
    try {
      final cache = await getTemporaryDirectory();
      final result = await _channel.invokeMapMethod<String, Object?>('load', {
        'modelPath': f.path,
        'cacheDir': cache.path,
        'preferGpu': true,
        'maxTokens': 2048,
      });
      backend = result?['backend']?.toString() ?? '';
      state = DunyaBrainState.ready;
      _conversationKey = null;
    } on PlatformException catch (error) {
      state = DunyaBrainState.failed;
      lastError = error.message;
      throw DunyaBrainException('Le cerveau n’a pas pu démarrer : ${error.message}');
    } on MissingPluginException {
      state = DunyaBrainState.failed;
      throw DunyaBrainException('Cerveau indisponible sur cet appareil.');
    }
  }

  Future<void> unload() async {
    try {
      await _channel.invokeMethod('unload');
    } catch (_) {}
    if (state == DunyaBrainState.ready || state == DunyaBrainState.loading) {
      state = DunyaBrainState.installed;
    }
    _conversationKey = null;
  }

  /// (Re)starts a conversation when the system prompt or history base changes.
  Future<void> prepareConversation({
    required String key,
    required String system,
    required List<({String role, String text})> history,
    double temperature = 0.6,
    int maxOutput = 400,
  }) async {
    await ensureLoaded();
    if (_conversationKey == key) return;
    await _channel.invokeMethod('startConversation', {
      'system': system,
      'history': [for (final h in history) {'role': h.role, 'text': h.text}],
      'temperature': temperature,
      'maxOutput': maxOutput,
    });
    _conversationKey = key;
  }

  /// Forces a fresh conversation on the next [prepareConversation].
  void resetConversation() => _conversationKey = null;

  /// Streams text deltas of the reply.
  Stream<String> generate(String text) {
    final id = ++_requestId;
    final controller = StreamController<String>();
    _streams[id] = controller;
    controller.onCancel = () {
      // Only an interruption by the listener stops native generation.
      if (_streams.remove(id) != null) unawaited(cancel());
    };
    _channel.invokeMethod('generate', {'requestId': id, 'text': text}).catchError((Object error) {
      _streams.remove(id)?.addError(DunyaBrainException(error.toString()));
      return null;
    });
    return controller.stream;
  }

  Future<void> cancel() async {
    try {
      await _channel.invokeMethod('cancel');
    } catch (_) {}
  }

  void _onEvent(dynamic event) {
    if (event is! Map) return;
    final id = event['requestId'] as int?;
    final controller = id == null ? null : _streams[id];
    if (controller == null) return;
    switch (event['type']) {
      case 'delta':
        controller.add(event['text']?.toString() ?? '');
      case 'done':
        _streams.remove(id);
        controller.close();
      case 'error':
        _streams.remove(id);
        controller.addError(DunyaBrainException(event['text']?.toString() ?? 'erreur'));
        controller.close();
    }
  }
}

Future<String> _sha256(String path) => Isolate.run(() async {
      final digest = await sha256.bind(File(path).openRead()).first;
      return digest.toString();
    });

/// Helper used by the packs sheet to detect a brain file picked by the user.
bool looksLikeBrainFile(String path) => path.toLowerCase().endsWith('.litertlm');
