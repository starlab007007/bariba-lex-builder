import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'apprendre_tasks.dart';

String _s(Object? value, {String fallback = ''}) =>
    value == null ? fallback : value.toString();

List<Map<String, dynamic>> _maps(Object? value) => value is List
    ? value.whereType<Map>().map((m) => m.cast<String, dynamic>()).toList()
    : const [];

/// Thématique de scènes (salutations, marché, santé…).
class ScCategory {
  const ScCategory({
    required this.id,
    required this.title,
    required this.summary,
    required this.icon,
  });

  final String id;
  final String title;
  final String summary;
  final String icon;

  factory ScCategory.fromJson(Map<String, dynamic> json) => ScCategory(
    id: _s(json['id']),
    title: _s(json['title']),
    summary: _s(json['summary']),
    icon: _s(json['icon']),
  );
}

/// Une ligne de scène : réplique attestée ou narration en français.
class ScLine {
  const ScLine({
    required this.who,
    required this.ba,
    required this.fr,
    this.src = '',
    this.ref = '',
    this.status = 'atteste',
  });

  /// a · b · narrator
  final String who;
  final String ba;
  final String fr;
  final String src;
  final String ref;
  final String status;

  bool get isNarration => who == 'narrator' || ba.isEmpty;
  bool get verified => status != 'a_valider';
  String get source => src.isEmpty ? '' : 'Dictionnaire, $src';

  factory ScLine.fromJson(Map<String, dynamic> json) => ScLine(
    who: _s(json['who']),
    ba: _s(json['ba']),
    fr: _s(json['fr']),
    src: _s(json['src']),
    ref: _s(json['ref']),
    status: _s(json['status'], fallback: 'atteste'),
  );
}

class ScVocab {
  const ScVocab({required this.ba, required this.fr, this.ref = ''});

  final String ba;
  final String fr;
  final String ref;

  factory ScVocab.fromJson(Map<String, dynamic> json) =>
      ScVocab(ba: _s(json['ba']), fr: _s(json['fr']), ref: _s(json['ref']));
}

/// Scène de vie complète : contexte, rôles, dialogue, culture, vocabulaire.
class ScScene {
  const ScScene({
    required this.id,
    required this.category,
    required this.title,
    required this.place,
    required this.icon,
    required this.level,
    required this.intro,
    required this.roles,
    required this.learner,
    required this.lines,
    required this.culture,
    required this.vocab,
  });

  final String id;
  final String category;
  final String title;
  final String place;
  final String icon;
  final int level;
  final String intro;

  /// Rôles « a » et « b » : « Bio, le client ».
  final Map<String, String> roles;

  /// Rôle joué par l'apprenant par défaut.
  final String learner;
  final List<ScLine> lines;
  final String culture;
  final List<ScVocab> vocab;

  List<ScLine> get spoken => lines.where((line) => !line.isNarration).toList();

  String roleLabel(String who) => roles[who] ?? who;

  /// Prénom seul (« Bio » pour « Bio, le client »).
  String roleName(String who) {
    final label = roleLabel(who);
    final comma = label.indexOf(',');
    return comma < 0 ? label : label.substring(0, comma).trim();
  }

  String otherRole(String who) => who == 'a' ? 'b' : 'a';

  factory ScScene.fromJson(Map<String, dynamic> json) {
    final rolesRaw = json['roles'];
    return ScScene(
      id: _s(json['id']),
      category: _s(json['category']),
      title: _s(json['title']),
      place: _s(json['place']),
      icon: _s(json['icon']),
      level: (json['level'] as num?)?.toInt() ?? 1,
      intro: _s(json['intro']),
      roles: rolesRaw is Map
          ? rolesRaw.map((key, value) => MapEntry(key.toString(), value.toString()))
          : const {},
      learner: _s(json['learner'], fallback: 'a'),
      lines: _maps(json['lines']).map(ScLine.fromJson).toList(),
      culture: _s(json['culture']),
      vocab: _maps(json['vocab']).map(ScVocab.fromJson).toList(),
    );
  }
}

/// Contenu du module Scènes de vie (asset `scenes_v2.json`).
class ScenesContent {
  const ScenesContent({required this.categories, required this.scenes});

  static const assetPath = 'assets/data/scenes_v2.json';

  final List<ScCategory> categories;
  final List<ScScene> scenes;

  int get lineCount => scenes.fold<int>(0, (sum, scene) => sum + scene.spoken.length);

  static Future<ScenesContent> load({AssetBundle? bundle}) async {
    final raw = await (bundle ?? rootBundle).loadString(assetPath);
    return ScenesContent.fromJson(jsonDecode(raw) as Map<String, dynamic>);
  }

  factory ScenesContent.fromJson(Map<String, dynamic> json) => ScenesContent(
    categories: _maps(json['categories']).map(ScCategory.fromJson).toList(),
    scenes: _maps(json['scenes']).map(ScScene.fromJson).toList(),
  );

  List<ScScene> scenesOf(String categoryId) =>
      scenes.where((scene) => scene.category == categoryId).toList();

  ScCategory? categoryById(String id) {
    for (final category in categories) {
      if (category.id == id) {
        return category;
      }
    }
    return null;
  }

  /// Scène suivante dans l'ordre du module (ou null à la fin).
  ScScene? after(ScScene scene) {
    final index = scenes.indexWhere((s) => s.id == scene.id);
    if (index < 0 || index + 1 >= scenes.length) {
      return null;
    }
    return scenes[index + 1];
  }
}

/// Progression locale des scènes : dialogues joués, meilleur score,
/// nombre de tentatives et dernière activité. La lecture reste compatible
/// avec les données v1 déjà enregistrées sur le téléphone.
class ScenesProgress {
  ScenesProgress._(
    this._prefs,
    this.best,
    this.played,
    this.attempts,
    this.lastPlayed,
  );

  static const storageKey = 'fitila_apprendre_scenes_v1';
  static const passMark = 60;

  final SharedPreferences _prefs;
  final Map<String, int> best;
  final Set<String> played;
  final Map<String, int> attempts;
  final Map<String, int> lastPlayed;

  bool done(String id) => (best[id] ?? 0) >= passMark;
  bool started(String id) => played.contains(id) || best.containsKey(id);
  bool needsReview(String id) => started(id) && !done(id);
  int get doneCount => best.values.where((score) => score >= passMark).length;
  int get startedCount => <String>{...played, ...best.keys}.length;
  int attemptsFor(String id) => attempts[id] ?? 0;

  DateTime? lastPlayedAt(String id) {
    final millis = lastPlayed[id];
    return millis == null ? null : DateTime.fromMillisecondsSinceEpoch(millis);
  }

  void markPlayed(String id, {DateTime? now}) {
    played.add(id);
    attempts[id] = (attempts[id] ?? 0) + 1;
    lastPlayed[id] = (now ?? DateTime.now()).millisecondsSinceEpoch;
  }

  void recordScore(String id, int percent, {DateTime? now}) {
    final wasStarted = started(id);
    played.add(id);
    if (!wasStarted) {
      attempts[id] = (attempts[id] ?? 0) + 1;
    }
    lastPlayed[id] = (now ?? DateTime.now()).millisecondsSinceEpoch;
    if (percent > (best[id] ?? -1)) {
      best[id] = percent;
    }
  }

  /// Scènes commencées mais encore sous le seuil, les plus faibles d'abord.
  List<ScScene> reviewQueue(ScenesContent content) {
    final result = content.scenes.where((scene) => needsReview(scene.id)).toList();
    result.sort((a, b) {
      final score = (best[a.id] ?? -1).compareTo(best[b.id] ?? -1);
      if (score != 0) return score;
      return (lastPlayed[a.id] ?? 0).compareTo(lastPlayed[b.id] ?? 0);
    });
    return result;
  }

  /// Recommandation simple et déterministe : consolider d'abord une faiblesse,
  /// sinon découvrir une scène nouvelle du niveau le plus accessible.
  ScScene? recommended(ScenesContent content) {
    final review = reviewQueue(content);
    if (review.isNotEmpty) return review.first;
    final fresh = content.scenes.where((scene) => !started(scene.id)).toList()
      ..sort((a, b) {
        final level = a.level.compareTo(b.level);
        if (level != 0) return level;
        return content.scenes.indexOf(a).compareTo(content.scenes.indexOf(b));
      });
    if (fresh.isNotEmpty) return fresh.first;
    if (content.scenes.isEmpty) return null;
    // Tout est réussi : proposer la scène la moins récemment pratiquée.
    final mastered = List<ScScene>.from(content.scenes)
      ..sort((a, b) => (lastPlayed[a.id] ?? 0).compareTo(lastPlayed[b.id] ?? 0));
    return mastered.first;
  }

  static Future<ScenesProgress> open() async {
    final prefs = await SharedPreferences.getInstance();
    final best = <String, int>{};
    final played = <String>{};
    final attempts = <String, int>{};
    final lastPlayed = <String, int>{};
    final raw = prefs.getString(storageKey);
    if (raw != null && raw.isNotEmpty) {
      try {
        final json = jsonDecode(raw) as Map<String, dynamic>;
        final bestRaw = json['best'];
        if (bestRaw is Map) {
          for (final entry in bestRaw.entries) {
            best[entry.key.toString()] = (entry.value as num?)?.toInt() ?? 0;
          }
        }
        final playedRaw = json['played'];
        if (playedRaw is List) {
          played.addAll(playedRaw.map((e) => e.toString()));
        }
        final attemptsRaw = json['attempts'];
        if (attemptsRaw is Map) {
          for (final entry in attemptsRaw.entries) {
            attempts[entry.key.toString()] = (entry.value as num?)?.toInt() ?? 0;
          }
        }
        final lastRaw = json['lastPlayed'];
        if (lastRaw is Map) {
          for (final entry in lastRaw.entries) {
            lastPlayed[entry.key.toString()] = (entry.value as num?)?.toInt() ?? 0;
          }
        }
      } catch (_) {
        // Données illisibles : on repart de zéro.
      }
    }
    return ScenesProgress._(prefs, best, played, attempts, lastPlayed);
  }

  Future<void> save() => _prefs.setString(
    storageKey,
    jsonEncode({
      'v': 2,
      'best': best,
      'played': played.toList(),
      'attempts': attempts,
      'lastPlayed': lastPlayed,
    }),
  );
}

/// Questions de compréhension tirées des répliques d'une scène.
List<ApTask> buildSceneQuiz(ScScene scene, {math.Random? random, int maxTasks = 8}) {
  final rnd = random ?? math.Random();
  final spoken = scene.spoken;
  if (spoken.length < 2) {
    return const [];
  }
  List<String> pickDistinct(Iterable<String> values, String answer, int count) {
    final seen = <String>{baseForm(answer)};
    final result = <String>[];
    final pool = values.toList()..shuffle(rnd);
    for (final value in pool) {
      final key = baseForm(value);
      if (key.isEmpty || seen.contains(key)) {
        continue;
      }
      seen.add(key);
      result.add(value);
      if (result.length == count) {
        break;
      }
    }
    return result;
  }

  ApTask meaning(ScLine line) {
    final options = [line.fr, ...pickDistinct(spoken.map((l) => l.fr), line.fr, 3)]..shuffle(rnd);
    return ApTask(
      kind: ApTaskKind.choice,
      instruction: 'Que veut dire cette réplique ?',
      prompt: line.ba,
      promptIsBariba: true,
      promptSub: 'Dit par ${scene.roleName(line.who)}',
      options: options,
      answer: line.fr,
      explain: '${line.ba}\n${line.fr}',
      source: line.source,
      verified: line.verified,
      skill: 'recognize',
    );
  }

  ApTask recall(ScLine line) {
    final options = [line.ba, ...pickDistinct(spoken.map((l) => l.ba), line.ba, 3)]..shuffle(rnd);
    return ApTask(
      kind: ApTaskKind.choice,
      instruction: 'Quelle réplique veut dire… ?',
      prompt: line.fr,
      options: options,
      optionsAreBariba: true,
      answer: line.ba,
      explain: '${line.ba}\n${line.fr}',
      source: line.source,
      verified: line.verified,
      skill: 'recall',
    );
  }

  ApTask who(ScLine line) {
    final names = [scene.roleName('a'), scene.roleName('b')];
    return ApTask(
      kind: ApTaskKind.choice,
      instruction: 'Qui dit cette réplique dans la scène ?',
      prompt: line.ba,
      promptIsBariba: true,
      promptSub: line.fr,
      options: names,
      answer: scene.roleName(line.who),
      explain: '${scene.roleLabel(line.who)} : ${line.ba}',
      source: line.source,
      verified: line.verified,
      skill: 'quiz',
    );
  }

  ApTask order(ScLine line) {
    final words = sentenceWords(line.ba);
    return ApTask(
      kind: ApTaskKind.order,
      instruction: 'Remets la réplique dans l’ordre',
      prompt: line.fr,
      options: List<String>.from(words)..shuffle(rnd),
      optionsAreBariba: true,
      orderAnswer: words,
      answer: words.join(' '),
      explain: line.ba,
      source: line.source,
      verified: line.verified,
      skill: 'order',
    );
  }

  final lines = List<ScLine>.from(spoken)..shuffle(rnd);
  final tasks = <ApTask>[];
  final builders = <ApTask? Function(ScLine)>[
    meaning,
    recall,
    (line) {
      final count = sentenceWords(line.ba).length;
      return count >= 3 && count <= 7 ? order(line) : null;
    },
    (line) => scene.roleName('a') == scene.roleName('b') ? null : who(line),
  ];
  var turn = 0;
  for (final line in lines) {
    if (tasks.length >= maxTasks) {
      break;
    }
    for (var attempt = 0; attempt < builders.length; attempt++) {
      final task = builders[(turn + attempt) % builders.length](line);
      if (task != null && (task.kind != ApTaskKind.choice || task.options.length >= 2)) {
        tasks.add(task);
        break;
      }
    }
    turn++;
  }
  return tasks;
}
