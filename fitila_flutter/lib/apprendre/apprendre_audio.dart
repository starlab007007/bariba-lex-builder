import 'dart:convert';
import 'dart:io';

import 'package:audioplayers/audioplayers.dart' as audio;
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/fitila_backend.dart';
import '../core/offline.dart';
import 'apprendre_ui.dart';
import 'apprendre_voice_analysis.dart';

/// Normalisation d'un texte avant empreinte : espaces réduits, bords coupés.
/// Doit rester identique à `normalize` de tool/audio_catalog/build_audio_catalog.py.
String apNormalizeText(String text) => text.replaceAll(RegExp(r'\s+'), ' ').trim();

final BigInt _fnvOffset = BigInt.parse('cbf29ce484222325', radix: 16);
final BigInt _fnvPrime = BigInt.parse('100000001b3', radix: 16);
final BigInt _mask64 = (BigInt.one << 64) - BigInt.one;
final Map<String, String> _keyCache = <String, String>{};

/// Empreinte FNV-1a 64 bits (hexadécimal sur 16 caractères) des octets UTF-8.
String apFnv1a64(String text) {
  var hash = _fnvOffset;
  for (final byte in utf8.encode(text)) {
    hash = ((hash ^ BigInt.from(byte)) * _fnvPrime) & _mask64;
  }
  return hash.toRadixString(16).padLeft(16, '0');
}

/// Clé audio d'un texte bariba : le même texte partage la même voix partout.
String apAudioKey(String text) =>
    _keyCache.putIfAbsent(text, () => 'ap:${apFnv1a64(apNormalizeText(text))}');

/// Une voix de référence active, telle que publiée par l'administration.
class ApAudioEntry {
  const ApAudioEntry({
    required this.key,
    required this.voice,
    required this.variant,
    required this.storagePath,
    required this.durationMs,
    this.speakerName,
    this.kind = '',
    this.pack = '',
    this.priority = 5,
  });

  final String key;
  final String voice;
  final String variant;
  final String storagePath;
  final int durationMs;
  final String? speakerName;

  /// Métadonnées pédagogiques du texte, utilisées pour les packs hors-ligne.
  final String kind;
  final String pack;
  final int priority;

  Map<String, Object?> toJson() => {
    'k': key,
    'v': voice,
    'r': variant,
    'p': storagePath,
    'd': durationMs,
    if (speakerName != null) 'n': speakerName,
    if (kind.isNotEmpty) 'kind': kind,
    if (pack.isNotEmpty) 'pack': pack,
    'priority': priority,
  };

  factory ApAudioEntry.fromJson(Map<String, dynamic> json) => ApAudioEntry(
    key: json['k'].toString(),
    voice: json['v'].toString(),
    variant: json['r']?.toString() ?? '',
    storagePath: json['p'].toString(),
    durationMs: (json['d'] as num?)?.toInt() ?? 0,
    speakerName: json['n']?.toString(),
    kind: json['kind']?.toString() ?? '',
    pack: json['pack']?.toString() ?? '',
    priority: (json['priority'] as num?)?.toInt() ?? 5,
  );
}

/// Paquets de voix hors-ligne : petits d'abord, jamais bloquants.
enum ApAudioOfflinePack { essential, scenes, all }

extension ApAudioOfflinePackLabel on ApAudioOfflinePack {
  String get label => switch (this) {
    ApAudioOfflinePack.essential => 'Essentiel',
    ApAudioOfflinePack.scenes => 'Scènes',
    ApAudioOfflinePack.all => 'Tout',
  };

  String get subtitle => switch (this) {
    ApAudioOfflinePack.essential => 'Leçons, proverbes, mots prioritaires et scènes niveau 1',
    ApAudioOfflinePack.scenes => 'Uniquement les dialogues des scènes de vie',
    ApAudioOfflinePack.all => 'Toutes les voix publiées',
  };
}

/// Voix de référence du module Apprendre : manifeste, cache hors-ligne, lecture.
class ApAudioService {
  ApAudioService._();

  static final ApAudioService instance = ApAudioService._();

  static const bucket = 'apprendre-audio';
  static const _manifestKey = 'fitila_apprendre_audio_manifest_v1';
  static const _voiceKey = 'fitila_apprendre_audio_voice';

  /// Change à chaque mise à jour du manifeste : les boutons se reconstruisent.
  final ValueNotifier<int> revision = ValueNotifier<int>(0);

  final Map<String, List<ApAudioEntry>> _byKey = <String, List<ApAudioEntry>>{};
  ApCompareSettings compareSettings = const ApCompareSettings();
  String preferredVoice = 'auto';
  DateTime? lastRefresh;
  bool _loaded = false;
  bool _refreshing = false;
  audio.AudioPlayer? _player;
  String? playingKey;

  int get count => _byKey.length;

  /// Durée totale des voix actives, pour estimer la taille d'un téléchargement.
  int get totalDurationMs =>
      _byKey.values.fold<int>(0, (sum, list) => sum + list.first.durationMs);

  /// Charge le manifeste enregistré, puis le rafraîchit en tâche de fond.
  Future<void> ensureLoaded({bool refresh = true}) async {
    if (!_loaded) {
      _loaded = true;
      try {
        final prefs = await SharedPreferences.getInstance();
        preferredVoice = prefs.getString(_voiceKey) ?? 'auto';
        final raw = prefs.getString(_manifestKey);
        if (raw != null && raw.isNotEmpty) {
          _apply(jsonDecode(raw) as Map<String, dynamic>);
        }
      } catch (_) {
        // Manifeste illisible : il sera reconstruit au prochain rafraîchissement.
      }
    }
    if (refresh) {
      final last = lastRefresh;
      if (last == null || DateTime.now().difference(last) > const Duration(hours: 6)) {
        await this.refresh();
      }
    }
  }

  void _apply(Map<String, dynamic> json) {
    _byKey.clear();
    final entries = json['entries'];
    if (entries is List) {
      for (final raw in entries.whereType<Map>()) {
        final entry = ApAudioEntry.fromJson(raw.cast<String, dynamic>());
        _byKey.putIfAbsent(entry.key, () => <ApAudioEntry>[]).add(entry);
      }
    }
    final settings = json['settings'];
    if (settings is Map) {
      compareSettings = ApCompareSettings.fromJson(settings.cast<String, dynamic>());
    }
    final at = json['at'];
    lastRefresh = at is int ? DateTime.fromMillisecondsSinceEpoch(at) : null;
    revision.value++;
  }

  /// Télécharge la liste publique sécurisée des voix validées et publiées.\n  Future<bool> refresh() async {
    if (_refreshing || !FitilaBackend.configured || !FitilaOffline.online.value) {
      return false;
    }
    _refreshing = true;
    try {
      final client = FitilaBackend.client;
      final entries = <Map<String, Object?>>[];
      const page = 1000;
      for (var from = 0; ; from += page) {
        final rows = await client
            .rpc('apprendre_audio_manifest')
            .range(from, from + page - 1);
        for (final row in rows) {
          entries.add(
            ApAudioEntry(
              key: row['audio_key'].toString(),
              voice: row['voice']?.toString() ?? 'femme',
              variant: row['variant']?.toString() ?? '',
              storagePath: row['storage_path'].toString(),
              durationMs: (row['duration_ms'] as num?)?.toInt() ?? 0,
              speakerName: row['speaker_name']?.toString(),
              kind: row['kind']?.toString() ?? '',
              pack: row['pack']?.toString() ?? '',
              priority: (row['priority'] as num?)?.toInt() ?? 5,
            ).toJson(),
          );
        }
        if (rows.length < page) {
          break;
        }
      }
      var settings = compareSettings.toJson();
      try {
        final row = await client
            .from('apprendre_audio_settings')
            .select('compare_very_close, compare_close, compare_mfcc_good, compare_mfcc_bad, compare_calibrated')
            .eq('id', 1)
            .maybeSingle();
        if (row != null) {
          settings = {
            'very_close': row['compare_very_close'] ?? 80,
            'close': row['compare_close'] ?? 60,
            'mfcc_good': row['compare_mfcc_good'] ?? 5,
            'mfcc_bad': row['compare_mfcc_bad'] ?? 14,
            'calibrated': row['compare_calibrated'] == true,
          };
        }
      } catch (_) {
        // Seuils par défaut.
      }
      final manifest = {
        'at': DateTime.now().millisecondsSinceEpoch,
        'entries': entries,
        'settings': settings,
      };
      _apply(jsonDecode(jsonEncode(manifest)) as Map<String, dynamic>);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_manifestKey, jsonEncode(manifest));
      return true;
    } catch (_) {
      return false;
    } finally {
      _refreshing = false;
    }
  }

  Future<void> setPreferredVoice(String voice) async {
    preferredVoice = voice;
    revision.value++;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_voiceKey, voice);
  }

  /// Voix de référence d'un texte, en respectant la voix préférée si possible.
  ApAudioEntry? entryFor(String text) {
    final list = _byKey[apAudioKey(text)];
    if (list == null || list.isEmpty) {
      return null;
    }
    if (preferredVoice != 'auto') {
      for (final entry in list) {
        if (entry.voice == preferredVoice) {
          return entry;
        }
      }
    }
    return list.first;
  }

  bool has(String text) => entryFor(text) != null;

  Future<Directory> _cacheDir() async {
    final base = await getApplicationSupportDirectory();
    final dir = Directory('${base.path}${Platform.pathSeparator}apprendre_audio');
    if (!dir.existsSync()) {
      dir.createSync(recursive: true);
    }
    return dir;
  }

  String _fileName(ApAudioEntry entry) =>
      entry.storagePath.replaceAll(RegExp(r'[^A-Za-z0-9._-]+'), '_');

  /// Fichier local de la voix (téléchargé si besoin).
  Future<File?> fileFor(ApAudioEntry entry) async {
    final dir = await _cacheDir();
    final file = File('${dir.path}${Platform.pathSeparator}${_fileName(entry)}');
    if (file.existsSync() && file.lengthSync() > 44) {
      return file;
    }
    if (!FitilaBackend.configured) {
      return null;
    }
    try {
      final bytes = await FitilaBackend.client.storage.from(bucket).download(entry.storagePath);
      await file.writeAsBytes(bytes, flush: true);
      return file;
    } catch (_) {
      return null;
    }
  }

  /// Joue la voix de référence d'un texte. Renvoie false si elle n'existe pas.
  Future<bool> play(String text, {double rate = 1.0}) async {
    final entry = entryFor(text);
    if (entry == null) {
      return false;
    }
    final file = await fileFor(entry);
    if (file == null) {
      return false;
    }
    final player = _player ??= audio.AudioPlayer();
    await player.stop();
    playingKey = entry.key;
    await player.setPlaybackRate(rate);
    await player.play(audio.DeviceFileSource(file.path));
    return true;
  }

  Future<void> playFile(String path, {double rate = 1.0}) async {
    final player = _player ??= audio.AudioPlayer();
    await player.stop();
    await player.setPlaybackRate(rate);
    await player.play(audio.DeviceFileSource(path));
  }

  Future<void> stop() async => _player?.stop();

  /// Télécharge pour le hors-ligne les voix des textes donnés.
  Future<int> downloadTexts(Iterable<String> texts, {void Function(int done, int total)? onProgress}) async {
    final entries = <String, ApAudioEntry>{};
    for (final text in texts) {
      final entry = entryFor(text);
      if (entry != null) {
        entries[entry.storagePath] = entry;
      }
    }
    var done = 0;
    var ok = 0;
    for (final entry in entries.values) {
      if (await fileFor(entry) != null) {
        ok++;
      }
      done++;
      onProgress?.call(done, entries.length);
    }
    return ok;
  }

  /// Entrées d'un paquet hors-ligne, dédupliquées par fichier.
  List<ApAudioEntry> entriesForPack(ApAudioOfflinePack pack) {
    final byPath = <String, ApAudioEntry>{};
    for (final list in _byKey.values) {
      if (list.isEmpty) continue;
      var entry = list.first;
      if (preferredVoice != 'auto') {
        for (final candidate in list) {
          if (candidate.voice == preferredVoice) {
            entry = candidate;
            break;
          }
        }
      }
      final include = switch (pack) {
        ApAudioOfflinePack.essential => entry.priority <= 2,
        ApAudioOfflinePack.scenes => entry.kind == 'scene',
        ApAudioOfflinePack.all => true,
      };
      if (include) {
        byPath.putIfAbsent(entry.storagePath, () => entry);
      }
    }
    final result = byPath.values.toList()
      ..sort((a, b) {
        final priority = a.priority.compareTo(b.priority);
        if (priority != 0) return priority;
        return a.key.compareTo(b.key);
      });
    return result;
  }

  int countForPack(ApAudioOfflinePack pack) => entriesForPack(pack).length;

  double megabytesForPack(ApAudioOfflinePack pack) {
    final ms = entriesForPack(pack).fold<int>(0, (sum, entry) => sum + entry.durationMs);
    return ms / 1000 * 32 / 1024;
  }

  Future<int> downloadPack(
    ApAudioOfflinePack pack, {
    void Function(int done, int total)? onProgress,
  }) async {
    final entries = entriesForPack(pack);
    var done = 0;
    var ok = 0;
    for (final entry in entries) {
      if (await fileFor(entry) != null) {
        ok++;
      }
      done++;
      onProgress?.call(done, entries.length);
    }
    return ok;
  }

  Future<int> cachedCount() async {
    final dir = await _cacheDir();
    if (!dir.existsSync()) return 0;
    return dir
        .listSync()
        .whereType<File>()
        .where((file) {
          try {
            return file.lengthSync() > 44;
          } catch (_) {
            return false;
          }
        })
        .length;
  }

  Future<double> cachedMegabytes() async {
    final dir = await _cacheDir();
    if (!dir.existsSync()) return 0;
    var bytes = 0;
    for (final file in dir.listSync().whereType<File>()) {
      try {
        bytes += file.lengthSync();
      } catch (_) {
        // Fichier supprimé pendant le calcul.
      }
    }
    return bytes / (1024 * 1024);
  }

  Future<void> clearOfflineCache() async {
    final dir = await _cacheDir();
    if (dir.existsSync()) {
      for (final entity in dir.listSync()) {
        if (entity is File) {
          try {
            await entity.delete();
          } catch (_) {
            // Le cache est opportuniste : un fichier verrouillé ne bloque pas l'app.
          }
        }
      }
    }
  }

  /// Télécharge toutes les voix actives (paquet hors-ligne complet).
  Future<int> downloadAll({void Function(int done, int total)? onProgress}) =>
      downloadPack(ApAudioOfflinePack.all, onProgress: onProgress);

  /// Taille estimée (Mo) de toutes les voix actives.
  double get totalMegabytes {
    var ms = 0;
    for (final list in _byKey.values) {
      for (final entry in list) {
        ms += entry.durationMs;
      }
    }
    return ms / 1000 * 32 / 1024;
  }

  /// Taille estimée (Mo) des voix de ces textes : WAV 16 kHz mono = 32 Ko/s.
  double estimateMegabytes(Iterable<String> texts) {
    final seen = <String>{};
    var ms = 0;
    for (final text in texts) {
      final entry = entryFor(text);
      if (entry != null && seen.add(entry.storagePath)) {
        ms += entry.durationMs;
      }
    }
    return ms / 1000 * 32 / 1024;
  }
}

/// Bouton d'écoute d'un texte bariba. N'apparaît que si une voix validée
/// et activée existe ; appui long = lecture ralentie.
class ApAudioButton extends StatelessWidget {
  const ApAudioButton(
    this.text, {
    super.key,
    this.size = 36,
    this.dark = false,
    this.placeholder = false,
  });

  final String text;
  final double size;
  final bool dark;

  /// Affiche une icône grisée quand la voix n'est pas encore disponible.
  final bool placeholder;

  @override
  Widget build(BuildContext context) {
    final service = ApAudioService.instance;
    return ValueListenableBuilder<int>(
      valueListenable: service.revision,
      builder: (context, _, _) {
        final entry = service.entryFor(text);
        if (entry == null) {
          if (!placeholder) {
            return const SizedBox.shrink();
          }
          return Tooltip(
            message: 'Voix de référence en préparation',
            child: SizedBox(
              width: size,
              height: size,
              child: Icon(
                Icons.volume_off_rounded,
                size: size * .5,
                color: dark ? ApColors.nightText : ApColors.lineStrong,
              ),
            ),
          );
        }
        final speaker = entry.speakerName;
        return Tooltip(
          message: speaker == null
              ? 'Écouter · appui long : ralenti'
              : 'Voix de $speaker · appui long : ralenti',
          child: Material(
            color: dark ? Colors.white.withValues(alpha: .12) : ApColors.goldTint,
            shape: const CircleBorder(),
            child: InkWell(
              customBorder: const CircleBorder(),
              onTap: () => _play(context, 1.0),
              onLongPress: () => _play(context, 0.75),
              child: SizedBox(
                width: size,
                height: size,
                child: Icon(
                  Icons.volume_up_rounded,
                  size: size * .5,
                  color: dark ? Colors.white : ApColors.goldDeep,
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Future<void> _play(BuildContext context, double rate) async {
    final messenger = ScaffoldMessenger.maybeOf(context);
    final ok = await ApAudioService.instance.play(text, rate: rate);
    if (!ok) {
      messenger?.showSnackBar(
        const SnackBar(content: Text('Voix indisponible hors connexion : télécharge-la d’abord.')),
      );
    }
  }
}
