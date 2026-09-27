import 'dart:math' as math;

import 'apprendre_models.dart';
import 'apprendre_store.dart';
import 'apprendre_tasks.dart';

/// Compose les séances du module : séance du jour (les sept types
/// d'exercices), entraînement libre et reprise des erreurs.
class ApSessionPlanner {
  ApSessionPlanner(this.content, {math.Random? random})
    : _random = random ?? math.Random(),
      _factory = ApTaskFactory(content, random: random);

  final ApprendreContent content;
  final math.Random _random;
  final ApTaskFactory _factory;

  /// Types d'exercices proposés selon le profil. Le profil oral garde les
  /// exercices sans lecture de phrase ; les autres profils ont les sept.
  static List<String> skillsFor(String? profile) {
    if (profile == 'oral') {
      return const ['recognize', 'recall', 'speak'];
    }
    return ApTask.coreSkills;
  }

  /// Thème en cours : le premier thème commencé et non terminé, sinon le
  /// premier thème qui a encore des mots nouveaux.
  ApTheme? currentTheme(ApprendreProgress progress) {
    for (final theme in content.themes) {
      final seen = progress.seenIn(theme);
      if (seen > 0 && seen < theme.cardIds.length) {
        return theme;
      }
    }
    for (final theme in content.themes) {
      if (progress.newCardIds(theme, limit: 1).isNotEmpty) {
        return theme;
      }
    }
    return content.themes.isEmpty ? null : content.themes.first;
  }

  /// Séance du jour : nouveaux mots, puis un exercice de chaque type,
  /// puis les révisions dues.
  List<ApTask> dailySession(
    ApprendreProgress progress, {
    required DateTime now,
    int newWords = 3,
    int maxTasks = 14,
  }) {
    final skills = skillsFor(progress.profile);
    final due = _cards(progress.dueCardIds(now));
    final theme = currentTheme(progress);
    final fresh = theme == null
        ? <ApCard>[]
        : _cards(progress.newCardIds(theme, limit: newWords));
    final seen = _cards(progress.srs.keys);

    final tasks = <ApTask>[];
    final used = <String>{};

    void add(ApTask? task) {
      if (task == null || tasks.length >= maxTasks) {
        return;
      }
      tasks.add(task);
      final id = task.cardId;
      if (id != null) {
        used.add('${task.skill}:$id');
      }
    }

    // 1. Découverte des nouveaux mots.
    for (final card in fresh) {
      add(_factory.buildSkill('recognize', card));
    }

    // 2. Un exercice de chaque type, sur les mots du moment si possible.
    final preferred = <ApCard>[...due, ...fresh, ...seen];
    for (final skill in skills) {
      if (skill == 'recognize' && tasks.any((t) => t.skill == 'recognize')) {
        continue;
      }
      final card = _pick(skill, preferred, used, theme);
      if (card != null) {
        add(_factory.buildSkill(skill, card));
      }
    }

    // 3. Révisions dues restantes, avec un type d'exercice varié.
    for (final card in due) {
      if (tasks.length >= maxTasks) {
        break;
      }
      if (tasks.any((t) => t.cardId == card.id)) {
        continue;
      }
      add(_varied(card, skills));
    }

    // 4. Compléter avec les nouveaux mots pour ancrer la mémoire.
    for (final card in fresh) {
      if (tasks.length >= maxTasks) {
        break;
      }
      add(_varied(card, skills.where((s) => s != 'recognize').toList()));
    }
    return tasks;
  }

  /// Entraînement libre : mots déjà vus, les plus fragiles d'abord, même
  /// s'ils ne sont pas encore dus.
  List<ApTask> practiceSession(
    ApprendreProgress progress, {
    required DateTime now,
    int maxTasks = 12,
  }) {
    final skills = skillsFor(progress.profile);
    final ids = progress.srs.keys.toList()
      ..sort(
        (a, b) => progress.srs[a]!.retention(now).compareTo(progress.srs[b]!.retention(now)),
      );
    final tasks = <ApTask>[];
    var turn = 0;
    for (final card in _cards(ids)) {
      if (tasks.length >= maxTasks) {
        break;
      }
      final rotated = [
        for (var i = 0; i < skills.length; i++) skills[(turn + i) % skills.length],
      ];
      final task = _firstBuildable(card, rotated);
      if (task != null) {
        tasks.add(task);
        turn++;
      }
    }
    return tasks;
  }

  /// Rejoue les exercices manqués, propositions remélangées.
  List<ApTask> retrySession(List<ApTask> missed) => [
    for (final task in missed) ApTaskFactory.replayOf(task, random: _random),
  ];

  List<ApCard> _cards(Iterable<String> ids) =>
      ids.map((id) => content.cards[id]).whereType<ApCard>().toList();

  ApTask? _varied(ApCard card, List<String> skills) {
    if (skills.isEmpty) {
      return null;
    }
    final shuffled = List<String>.from(skills)..shuffle(_random);
    return _firstBuildable(card, shuffled);
  }

  ApTask? _firstBuildable(ApCard card, List<String> skills) {
    for (final skill in skills) {
      final task = _factory.buildSkill(skill, card);
      if (task != null) {
        return task;
      }
    }
    return null;
  }

  /// Choisit un mot pour [skill] : d'abord parmi les mots du moment, puis
  /// dans le thème en cours, puis parmi les mots attestés les plus fréquents.
  ApCard? _pick(String skill, List<ApCard> preferred, Set<String> used, ApTheme? theme) {
    bool ok(ApCard card) =>
        !used.contains('$skill:${card.id}') && ApTaskFactory.supports(skill, card);

    for (final card in preferred) {
      if (ok(card)) {
        return card;
      }
    }
    if (theme != null) {
      final inTheme = content.cardsOf(theme).where((c) => c.verified && ok(c)).toList();
      if (inTheme.isNotEmpty) {
        return inTheme[_random.nextInt(math.min(inTheme.length, 20))];
      }
    }
    final frequent = content.cards.values.where((c) => c.verified && ok(c)).toList()
      ..sort((a, b) => b.frequency.compareTo(a.frequency));
    if (frequent.isEmpty) {
      return null;
    }
    return frequent[_random.nextInt(math.min(frequent.length, 40))];
  }
}
