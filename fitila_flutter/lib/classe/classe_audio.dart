import 'dart:async';

import 'package:audioplayers/audioplayers.dart' as ap;
import 'package:flutter/foundation.dart';

import '../core/fitila_backend.dart';

/// Lecteur audio de la Classe : un seul son à la fois, états observables,
/// URL signées mises en cache, erreurs remontées proprement.
///
/// Le moteur de lecture est injectable ([AudioBackend]) pour les tests.
abstract class AudioBackend {
  Future<void> play(Uint8List bytes);
  Future<void> stop();
  Stream<void> get onComplete;
  Future<void> dispose();
}

class AudioplayersBackend implements AudioBackend {
  final ap.AudioPlayer _player = ap.AudioPlayer();

  @override
  Future<void> play(Uint8List bytes) async {
    if (bytes.length < 44) {
      throw StateError('Fichier audio vide ou tronqué');
    }
    await _player.play(ap.BytesSource(bytes, mimeType: 'audio/wav'));
  }

  @override
  Future<void> stop() => _player.stop();

  @override
  Stream<void> get onComplete => _player.onPlayerComplete;

  @override
  Future<void> dispose() => _player.dispose();
}

typedef AudioBytesResolver = Future<Uint8List?> Function(String bucket, String path);

class ClasseAudio {
  ClasseAudio({AudioBackend? backend, AudioBytesResolver? resolver, Future<Map<String, String>> Function(String prefix)? approvedLoader})
    : _backendFactory = backend == null ? AudioplayersBackend.new : (() => backend),
      _resolver = resolver ?? _defaultResolver,
      _approvedLoader = approvedLoader ?? _defaultApproved;

  static final ClasseAudio instance = ClasseAudio();

  final AudioBackend Function() _backendFactory;
  final AudioBytesResolver _resolver;
  final Future<Map<String, String>> Function(String prefix) _approvedLoader;
  AudioBackend? _backend;
  StreamSubscription<void>? _sub;

  /// Identifiant du son en cours de lecture (ou null).
  final ValueNotifier<String?> playing = ValueNotifier(null);

  /// Identifiant du son en cours de chargement.
  final ValueNotifier<String?> loading = ValueNotifier(null);

  /// Dernière erreur (message affichable) ; remise à null à chaque lecture.
  final ValueNotifier<String?> error = ValueNotifier(null);

  final Map<String, Uint8List> _bytesCache = {};
  final Map<String, Future<Map<String, String>>> _approved = {};

  static Future<Uint8List?> _defaultResolver(String bucket, String path) async {
    try {
      return await FitilaBackend.client.storage.from(bucket).download(path);
    } catch (_) {
      return null;
    }
  }

  static Future<Map<String, String>> _defaultApproved(String prefix) async {
    if (!FitilaBackend.configured) {
      return {};
    }
    final rows = await FitilaBackend.client
        .from('classe_content_audios')
        .select('content_key,storage_path')
        .like('content_key', '$prefix%')
        .eq('status', 'approved')
        .eq('is_current', true)
        .limit(5000);
    return {for (final r in rows) r['content_key'] as String: r['storage_path'] as String};
  }

  AudioBackend get _b {
    final b = _backend ??= _backendFactory();
    _sub ??= b.onComplete.listen((_) => playing.value = null);
    return b;
  }

  /// Registre des audios validés d'un préfixe. La lecture télécharge le blob via Storage/RLS
  /// (`classe/N1/lang/`), chargé une seule fois.
  Future<Map<String, String>> approvedFor(String prefix) => _approved.putIfAbsent(prefix, () async {
    try {
      return await _approvedLoader(prefix);
    } catch (_) {
      _approved.remove(prefix); // permet de réessayer plus tard
      return {};
    }
  });

  /// Lit un audio validé de la Classe par sa clé de contenu. Renvoie false s'il n'existe pas.
  Future<bool> playContent(String contentKey) async {
    final parts = contentKey.split('/');
    final prefix = parts.length >= 3 ? '${parts.take(3).join('/')}/' : contentKey;
    final path = (await approvedFor(prefix))[contentKey];
    if (path == null) {
      error.value = 'Voix de référence non disponible ou à restaurer pour ce contenu.';
      return false;
    }
    return playStorage(contentKey, 'classe-audio', path);
  }

  /// Lit un fichier du stockage (réponse d'élève, correction d'enseignant…).
  Future<bool> playStorage(String id, String bucket, String path) async {
    error.value = null;
    if (playing.value == id) {
      await stop();
      return true;
    }
    loading.value = id;
    try {
      final key = '$bucket/$path';
      var bytes = _bytesCache[key];
      if (bytes == null) {
        bytes = await _resolver(bucket, path);
        if (bytes == null || bytes.length < 44) {
          throw StateError('Audio indisponible');
        }
        // Petit cache mémoire : évite de recharger la même voix à chaque appui.
        if (_bytesCache.length >= 12) {
          _bytesCache.remove(_bytesCache.keys.first);
        }
        _bytesCache[key] = bytes;
      }
      await _b.stop();
      await _b.play(bytes);
      playing.value = id;
      return true;
    } catch (_) {
      _bytesCache.remove('$bucket/$path');
      error.value = 'Lecture audio impossible. Vérifiez votre connexion.';
      playing.value = null;
      return false;
    } finally {
      loading.value = null;
    }
  }

  Future<void> stop() async {
    playing.value = null;
    try {
      await _backend?.stop();
    } catch (_) {}
  }

  Future<void> dispose() async {
    await _sub?.cancel();
    await _backend?.dispose();
    _backend = null;
    _sub = null;
  }
}
