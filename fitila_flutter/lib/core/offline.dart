import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Socle hors-ligne de FITILA :
///  - [FitilaOffline.online] : état réseau observable (sonde légère + signalement des échecs) ;
///  - cache JSON local (`putJson` / `getJson`) pour relire profil, réglages, progression sans réseau ;
///  - file d'envoi (`enqueue`) rejouée automatiquement au retour du réseau.
abstract final class FitilaOffline {
  /// true tant qu'aucune panne réseau n'a été constatée.
  static final ValueNotifier<bool> online = ValueNotifier(true);

  /// Nombre d'opérations en attente d'envoi.
  static final ValueNotifier<int> pending = ValueNotifier(0);

  /// Hôte sondé (résolution DNS) ; remplacé en test.
  static String probeHost = 'dvswhjawiooprghzeyol.supabase.co';
  static Future<bool> Function() probe = _defaultProbe;

  static final Map<String, Future<void> Function(Map<String, dynamic>)> _handlers = {};
  static Timer? _timer;
  static bool _flushing = false;

  static const _queueKey = 'fitila_outbox_v1';
  static const _cachePrefix = 'fitila_cache_v1:';

  static Future<bool> _defaultProbe() async {
    try {
      final r = await InternetAddress.lookup(probeHost).timeout(const Duration(seconds: 3));
      return r.isNotEmpty && r.first.rawAddress.isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  /// Vrai si l'erreur vient du réseau (et non d'un refus du serveur).
  static bool isNetworkError(Object e) {
    if (e is SocketException || e is TimeoutException || e is HttpException) return true;
    final s = e.toString();
    return s.contains('SocketException') ||
        s.contains('ClientException') ||
        s.contains('Failed host lookup') ||
        s.contains('Connection refused') ||
        s.contains('Connection closed') ||
        s.contains('Connection reset') ||
        s.contains('Network is unreachable') ||
        s.contains('AuthRetryableFetchException') ||
        s.contains('TimeoutException') ||
        s.contains('HandshakeException');
  }

  /// À appeler quand une requête échoue pour cause réseau.
  static void reportFailure(Object e) {
    if (isNetworkError(e) && online.value) online.value = false;
  }

  static void reportSuccess() {
    if (!online.value) {
      online.value = true;
      unawaited(flush());
    }
  }

  /// Démarre la surveillance périodique du réseau.
  static void start({Duration every = const Duration(seconds: 20)}) {
    _timer?.cancel();
    unawaited(refresh());
    _timer = Timer.periodic(every, (_) => refresh());
    unawaited(_countPending());
  }

  static void stop() {
    _timer?.cancel();
    _timer = null;
  }

  /// Sonde le réseau maintenant ; rejoue la file au retour de la connexion.
  static Future<bool> refresh() async {
    final ok = await probe();
    final was = online.value;
    online.value = ok;
    if (ok && (!was || pending.value > 0)) unawaited(flush());
    return ok;
  }

  // ------------------------------------------------------------ cache JSON

  static Future<void> putJson(String key, Object? value) async {
    try {
      final p = await SharedPreferences.getInstance();
      await p.setString('$_cachePrefix$key', jsonEncode({'at': DateTime.now().millisecondsSinceEpoch, 'v': value}));
    } catch (_) {
      /* stockage indisponible : on continue sans cache */
    }
  }

  static Future<T?> getJson<T>(String key) async {
    try {
      final p = await SharedPreferences.getInstance();
      final raw = p.getString('$_cachePrefix$key');
      if (raw == null) return null;
      final v = (jsonDecode(raw) as Map<String, dynamic>)['v'];
      return v is T ? v : null;
    } catch (_) {
      return null;
    }
  }

  static Future<void> removeJson(String key) async {
    try {
      final p = await SharedPreferences.getInstance();
      await p.remove('$_cachePrefix$key');
    } catch (_) {}
  }

  // ------------------------------------------------------------ fichiers (images)

  /// Fichier local d'une image distante : renvoie la copie si elle existe, sinon la télécharge
  /// (null si impossible). Sert aux avatars, visibles ensuite sans réseau.
  static Future<File?> cachedFile(String url, {bool download = true}) async {
    if (url.isEmpty) return null;
    try {
      final dir = Directory('${(await getApplicationSupportDirectory()).path}${Platform.pathSeparator}fitila_media');
      if (!dir.existsSync()) dir.createSync(recursive: true);
      final file = File('${dir.path}${Platform.pathSeparator}${sha1.convert(utf8.encode(url))}');
      if (file.existsSync() && file.lengthSync() > 0) return file;
      if (!download || !online.value) return null;
      final res = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 12));
      if (res.statusCode != 200 || res.bodyBytes.isEmpty) return null;
      await file.writeAsBytes(res.bodyBytes, flush: true);
      return file;
    } catch (_) {
      return null;
    }
  }

  // ------------------------------------------------------------ file d'envoi

  /// Déclare comment rejouer une opération d'un type donné (lève en cas d'échec réseau).
  static void register(String kind, Future<void> Function(Map<String, dynamic> payload) handler) => _handlers[kind] = handler;

  static Future<List<Map<String, dynamic>>> _load() async {
    try {
      final p = await SharedPreferences.getInstance();
      final raw = p.getString(_queueKey);
      if (raw == null || raw.isEmpty) return [];
      return [for (final e in jsonDecode(raw) as List) Map<String, dynamic>.from(e as Map)];
    } catch (_) {
      return [];
    }
  }

  static Future<void> _save(List<Map<String, dynamic>> q) async {
    try {
      final p = await SharedPreferences.getInstance();
      await p.setString(_queueKey, jsonEncode(q));
    } catch (_) {}
    pending.value = q.length;
  }

  static Future<void> _countPending() async => pending.value = (await _load()).length;

  /// Met une opération en file. Avec [dedupeKey], remplace (ou fusionne si [merge]) l'opération en attente de même clé.
  static Future<void> enqueue(String kind, Map<String, dynamic> payload, {String? dedupeKey, bool merge = false}) async {
    final q = await _load();
    if (dedupeKey != null) {
      final i = q.indexWhere((e) => e['dedupe'] == dedupeKey);
      if (i >= 0) {
        final old = Map<String, dynamic>.from(q[i]['payload'] as Map);
        q[i] = {...q[i], 'payload': merge ? {...old, ...payload} : payload};
        await _save(q);
        return;
      }
    }
    q.add({'kind': kind, 'payload': payload, 'dedupe': dedupeKey, 'at': DateTime.now().millisecondsSinceEpoch, 'tries': 0});
    await _save(q);
  }

  /// Rejoue la file dans l'ordre ; s'arrête à la première panne réseau. Renvoie le nombre d'opérations envoyées.
  static Future<int> flush() async {
    if (_flushing) return 0;
    _flushing = true;
    var sent = 0;
    try {
      final q = await _load();
      final rest = <Map<String, dynamic>>[];
      var stop = false;
      for (final op in q) {
        if (stop) {
          rest.add(op);
          continue;
        }
        final handler = _handlers[op['kind']];
        if (handler == null) {
          rest.add(op); // gestionnaire pas encore enregistré
          continue;
        }
        try {
          await handler(Map<String, dynamic>.from(op['payload'] as Map));
          sent++;
        } catch (e) {
          if (isNetworkError(e)) {
            online.value = false;
            stop = true;
            rest.add(op);
          } else {
            final tries = (op['tries'] as int? ?? 0) + 1;
            if (tries < 5) rest.add({...op, 'tries': tries}); // refus serveur : quelques essais puis abandon
          }
        }
      }
      await _save(rest);
      if (sent > 0) online.value = true;
    } finally {
      _flushing = false;
    }
    return sent;
  }

  /// Efface caches et file d'envoi de l'utilisateur (déconnexion).
  static Future<void> clearUserData() async {
    try {
      final p = await SharedPreferences.getInstance();
      for (final k in p.getKeys().where((k) => k.startsWith(_cachePrefix) || k == _queueKey).toList()) {
        await p.remove(k);
      }
    } catch (_) {}
    pending.value = 0;
  }

  @visibleForTesting
  static Future<void> resetForTest() async {
    stop();
    _handlers.clear();
    online.value = true;
    pending.value = 0;
    probe = _defaultProbe;
  }
}

/// Exécute [remote] ; en cas de panne réseau, renvoie [fallback] (et signale l'état hors-ligne).
Future<T> offlineFirst<T>(Future<T> Function() remote, Future<T> Function() fallback) async {
  if (!FitilaOffline.online.value) {
    try {
      return await fallback();
    } catch (_) {
      // Pas de copie locale : on tente quand même le réseau.
    }
  }
  try {
    final v = await remote();
    FitilaOffline.reportSuccess();
    return v;
  } catch (e) {
    if (FitilaOffline.isNetworkError(e)) {
      FitilaOffline.reportFailure(e);
      return fallback();
    }
    rethrow;
  }
}

/// Message lisible pour l'utilisateur : « Hors connexion » plutôt qu'une trace réseau.
String friendlyError(Object e, {String prefix = 'Erreur'}) {
  if (FitilaOffline.isNetworkError(e)) {
    return 'Hors connexion : cette action nécessite Internet. Réessayez au retour du réseau.';
  }
  if (e is StateError) return e.message;
  return '$prefix : $e';
}
