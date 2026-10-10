import 'dart:async';

import 'package:audioplayers/audioplayers.dart' as ap;
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../core/fitila_backend.dart';

/// Lecteur audio de la Classe : un seul son à la fois, états observables,
/// URL signées mises en cache, erreurs remontées proprement.
///
/// Le moteur de lecture est injectable ([AudioBackend]) pour les tests.
abstract class AudioBackend {
  Future<void> play(String url);
  Future<void> stop();
  Stream<void> get onComplete;
  Future<void> dispose();
}

class AudioplayersBackend implements AudioBackend {
  final ap.AudioPlayer _player = ap.AudioPlayer();

  @override
  Future<void> play(String url) => _player.play(ap.UrlSource(url));

  @override
  Future<void> stop() => _player.stop();

  @override
  Stream<void> get onComplete => _player.onPlayerComplete;

  @override
  Future<void> dispose() => _player.dispose();
}

typedef AudioUrlResolver = Future<String?> Function(String bucket, String path);
typedef StorageHealthResolver = Future<bool> Function(String bucket, String path);

class ClasseAudio {
  ClasseAudio({
    AudioBackend? backend,
    AudioUrlResolver? resolver,
    Future<Map<String, String>> Function(String prefix)? approvedLoader,
    StorageHealthResolver? healthResolver,
  }) : _backendFactory = backend == null ? AudioplayersBackend.new : (() => backend),
       _resolver = resolver ?? _defaultResolver,
       _approvedLoader = approvedLoader ?? _defaultApproved,
       _healthResolver = healthResolver ?? _defaultStorageHealth;

  static final ClasseAudio instance = ClasseAudio();

  final AudioBackend Function() _backendFactory;
  final AudioUrlResolver _resolver;
  final Future<Map<String, String>> Function(String prefix) _approvedLoader;
  final StorageHealthResolver _healthResolver;
  AudioBackend? _backend;
  StreamSubscription<void>? _sub;

  /// Identifiant du son en cours de lecture (ou null).
  final ValueNotifier<String?> playing = ValueNotifier(null);

  /// Identifiant du son en cours de chargement.
  final ValueNotifier<String?> loading = ValueNotifier(null);

  /// Dernière erreur (message affichable) ; remise à null à chaque lecture.
  final ValueNotifier<String?> error = ValueNotifier(null);

  final Map<String, String> _urlCache = {};
  final Map<String, Future<Map<String, String>>> _approved = {};
  final Map<String, Future<bool>> _storageHealth = {};

  static Future<String?> _defaultResolver(String bucket, String path) async {
    try {
      return await FitilaBackend.client.storage.from(bucket).createSignedUrl(path, 3600);
    } catch (_) {
      return null;
    }
  }

  static Future<bool> _defaultStorageHealth(String bucket, String path) async {
    if (bucket != 'classe-answers-audio') return true;
    if (!FitilaBackend.configured) return false;
    try {
      final row = await FitilaBackend.client
          .from('classe_answer_audio_health')
          .select('available')
          .eq('path', path)
          .maybeSingle();

      final known = row?['available'];
      if (known == true) return true;
      if (known == false) return false;

      // A signed URL alone is not proof that the Storage blob still exists.
      // Probe one byte before exposing the player.
      final url = await FitilaBackend.client.storage
          .from(bucket)
          .createSignedUrl(path, 120);
      final request = http.Request('GET', Uri.parse(url))
        ..headers['Range'] = 'bytes=0-0';
      final response = await http.Client().send(request);
      final ok = response.statusCode >= 200 && response.statusCode < 300;
      await response.stream.drain<void>();
      if (ok) {
        try {
          await FitilaBackend.client.rpc(
            'classe_mark_answer_audio_available',
            params: {'_path': path},
          );
        } catch (_) {
          // The current user may be allowed to listen to a teacher correction
          // but not to mutate its health row. Playback is still safe after probe.
        }
      }
      return ok;
    } catch (_) {
      return false;
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
        .eq('storage_available', true)
        .limit(5000);
    return {for (final r in rows) r['content_key'] as String: r['storage_path'] as String};
  }

  AudioBackend get _b {
    final b = _backend ??= _backendFactory();
    _sub ??= b.onComplete.listen((_) => playing.value = null);
    return b;
  }

  /// Registre des audios validés ET physiquement disponibles d'un préfixe
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

  /// Vrai uniquement si un fichier privé de réponse/correction est
  /// physiquement disponible. Les autres buckets sont inchangés.
  Future<bool> storageAvailable(String bucket, String path) {
    if (bucket != 'classe-answers-audio') return Future.value(true);
    final key = '$bucket/$path';
    return _storageHealth.putIfAbsent(key, () => _healthResolver(bucket, path));
  }

  /// Lit un fichier du stockage (réponse d'élève, correction d'enseignant…).
  Future<bool> playStorage(String id, String bucket, String path) async {
    error.value = null;
    if (bucket == 'classe-answers-audio' && !await storageAvailable(bucket, path)) {
      error.value = 'Audio indisponible ou à réenregistrer.';
      return false;
    }
    if (playing.value == id) {
      await stop();
      return true;
    }
    loading.value = id;
    try {
      final key = '$bucket/$path';
      var url = _urlCache[key];
      if (url == null) {
        url = await _resolver(bucket, path);
        if (url == null) {
          throw StateError('URL indisponible');
        }
        _urlCache[key] = url;
      }
      await _b.stop();
      await _b.play(url);
      playing.value = id;
      return true;
    } catch (_) {
      _urlCache.remove('$bucket/$path'); // une URL signée expirée sera recalculée
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
