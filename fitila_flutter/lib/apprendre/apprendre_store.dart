import 'dart:convert';
import 'dart:math' as math;

import 'package:shared_preferences/shared_preferences.dart';

import 'apprendre_models.dart';

/// État d'un mot dans la révision espacée (boîtes de Leitner).
class SrsState {
  const SrsState({
    required this.box,
    required this.due,
    required this.reps,
    required this.lapses,
    this.lastReview,
  });

  /// 0 = jamais vu ; 1 à 7 = mémorisation croissante.
  final int box;
  final DateTime due;
  final int reps;
  final int lapses;
  final DateTime? lastReview;

  static const intervalsDays = <int>[0, 1, 2, 4, 8, 16, 32, 64];

  /// Un mot est « actif » quand il a été retrouvé au moins deux fois de suite.
  bool get active => box >= 2;

  /// Stabilité approximative de la mémoire (en jours).
  double get stability => math.max(0.5, intervalsDays[box.clamp(0, 7)] * 1.4);

  /// Probabilité estimée de se souvenir à [now] (courbe d'oubli exponentielle).
  double retention(DateTime now) {
    final last = lastReview;
    if (last == null) {
      return 0;
    }
    final days = now.difference(last).inMinutes / (60 * 24);
    return math.exp(-days / stability);
  }

  SrsState review({required bool correct, required DateTime now}) {
    if (correct) {
      final nextBox = math.min(box + 1, 7);
      return SrsState(
        box: nextBox,
        due: now.add(Duration(days: intervalsDays[nextBox])),
        reps: reps + 1,
        lapses: lapses,
        lastReview: now,
      );
    }
    return SrsState(
      box: 1,
      due: now.add(const Duration(minutes: 10)),
      reps: reps + 1,
      lapses: lapses + 1,
      lastReview: now,
    );
  }

  Map<String, dynamic> toJson() => {
    'b': box,
    'd': due.millisecondsSinceEpoch,
    'r': reps,
    'l': lapses,
    if (lastReview != null) 'lr': lastReview!.millisecondsSinceEpoch,
  };

  factory SrsState.fromJson(Map<String, dynamic> json) => SrsState(
    box: (json['b'] as num?)?.toInt() ?? 0,
    due: DateTime.fromMillisecondsSinceEpoch((json['d'] as num?)?.toInt() ?? 0),
    reps: (json['r'] as num?)?.toInt() ?? 0,
    lapses: (json['l'] as num?)?.toInt() ?? 0,
    lastReview: json['lr'] == null
        ? null
        : DateTime.fromMillisecondsSinceEpoch((json['lr'] as num).toInt()),
  );
}

/// Progression locale du module Apprendre, conservée hors-ligne.
class ApprendreProgress {
  ApprendreProgress({
    this.profile,
    this.direction = 'fr_to_ba',
    Map<String, int>? foundationScores,
    Map<String, SrsState>? srs,
    this.xp = 0,
    this.streak = 0,
    this.lastActiveDay,
    Map<String, int>? daily,
  }) : foundationScores = foundationScores ?? <String, int>{},
       srs = srs ?? <String, SrsState>{},
       daily = daily ?? <String, int>{};

  /// oral · fr · ba · both
  String? profile;

  /// fr_to_ba · ba_to_fr
  String direction;

  /// Meilleur score (0-100) obtenu au test de chaque fondation.
  final Map<String, int> foundationScores;
  final Map<String, SrsState> srs;
  int xp;
  int streak;
  String? lastActiveDay;

  /// Nombre de réponses par jour (clé AAAA-MM-JJ).
  final Map<String, int> daily;

  static const passMark = 60;

  bool foundationDone(String id) => (foundationScores[id] ?? 0) >= passMark;

  int get foundationsDone =>
      foundationScores.values.where((score) => score >= passMark).length;

  int get activeWords => srs.values.where((state) => state.active).length;

  int get seenWords => srs.length;

  List<String> dueCardIds(DateTime now) {
    final due = srs.entries
        .where((entry) => !entry.value.due.isAfter(now))
        .toList()
      ..sort((a, b) => a.value.due.compareTo(b.value.due));
    return due.map((entry) => entry.key).toList();
  }

  /// Mots qui passeront sous le seuil de révision chacun des [days] prochains jours.
  List<int> dueForecast(DateTime now, {int days = 7}) {
    final start = DateTime(now.year, now.month, now.day);
    final result = List<int>.filled(days, 0);
    for (final state in srs.values) {
      final dueDay = DateTime(state.due.year, state.due.month, state.due.day);
      final index = dueDay.difference(start).inDays;
      if (index < 0) {
        result[0]++;
      } else if (index < days) {
        result[index]++;
      }
    }
    return result;
  }

  int learnedIn(ApTheme theme) =>
      theme.cardIds.where((id) => srs[id]?.active ?? false).length;

  int seenIn(ApTheme theme) =>
      theme.cardIds.where((id) => srs.containsKey(id)).length;

  /// Nouveaux mots d'un thème, dans l'ordre d'apprentissage prévu.
  List<String> newCardIds(ApTheme theme, {int limit = 6}) =>
      theme.cardIds.where((id) => !srs.containsKey(id)).take(limit).toList();

  void recordAnswer(String? cardId, {required bool correct, required DateTime now}) {
    final key = dayKey(now);
    daily[key] = (daily[key] ?? 0) + 1;
    _touchStreak(now);
    if (correct) {
      xp += 8;
    }
    if (cardId == null) {
      return;
    }
    final current = srs[cardId] ??
        SrsState(box: 0, due: now, reps: 0, lapses: 0);
    srs[cardId] = current.review(correct: correct, now: now);
  }

  void recordFoundation(String id, int score, DateTime now) {
    final best = foundationScores[id] ?? 0;
    if (score > best) {
      foundationScores[id] = score;
    }
    if (score >= passMark) {
      xp += 30;
    }
    _touchStreak(now);
  }

  void _touchStreak(DateTime now) {
    final today = dayKey(now);
    if (lastActiveDay == today) {
      return;
    }
    final yesterday = dayKey(now.subtract(const Duration(days: 1)));
    streak = lastActiveDay == yesterday ? streak + 1 : 1;
    lastActiveDay = today;
  }

  static String dayKey(DateTime day) {
    String two(int value) => value.toString().padLeft(2, '0');
    return '${day.year}-${two(day.month)}-${two(day.day)}';
  }

  Map<String, dynamic> toJson() => {
    'v': 1,
    'profile': profile,
    'direction': direction,
    'foundations': foundationScores,
    'srs': srs.map((key, value) => MapEntry(key, value.toJson())),
    'xp': xp,
    'streak': streak,
    'last': lastActiveDay,
    'daily': daily,
  };

  factory ApprendreProgress.fromJson(Map<String, dynamic> json) {
    final srsRaw = json['srs'];
    final foundationsRaw = json['foundations'];
    final dailyRaw = json['daily'];
    return ApprendreProgress(
      profile: json['profile'] as String?,
      direction: (json['direction'] as String?) ?? 'fr_to_ba',
      foundationScores: foundationsRaw is Map
          ? foundationsRaw.map(
              (key, value) =>
                  MapEntry(key.toString(), (value as num?)?.toInt() ?? 0),
            )
          : null,
      srs: srsRaw is Map
          ? srsRaw.map(
              (key, value) => MapEntry(
                key.toString(),
                SrsState.fromJson((value as Map).cast<String, dynamic>()),
              ),
            )
          : null,
      xp: (json['xp'] as num?)?.toInt() ?? 0,
      streak: (json['streak'] as num?)?.toInt() ?? 0,
      lastActiveDay: json['last'] as String?,
      daily: dailyRaw is Map
          ? dailyRaw.map(
              (key, value) =>
                  MapEntry(key.toString(), (value as num?)?.toInt() ?? 0),
            )
          : null,
    );
  }
}

/// Lecture et écriture de [ApprendreProgress] dans les préférences locales.
class ApprendreStore {
  ApprendreStore._(this._prefs, this.progress);

  static const storageKey = 'fitila_apprendre_v2';

  final SharedPreferences _prefs;
  final ApprendreProgress progress;

  static Future<ApprendreStore> open() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(storageKey);
    var progress = ApprendreProgress();
    if (raw != null && raw.isNotEmpty) {
      try {
        progress = ApprendreProgress.fromJson(
          jsonDecode(raw) as Map<String, dynamic>,
        );
      } catch (_) {
        progress = ApprendreProgress();
      }
    }
    return ApprendreStore._(prefs, progress);
  }

  Future<void> save() =>
      _prefs.setString(storageKey, jsonEncode(progress.toJson()));
}
