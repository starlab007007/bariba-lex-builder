import 'dart:math' as math;

import 'apprendre_models.dart';
import 'apprendre_store.dart';

enum ApTaskKind { choice, order, speak }

/// Une question de séance, construite à partir du contenu vérifié.
class ApTask {
  const ApTask({
    required this.kind,
    required this.instruction,
    required this.prompt,
    this.promptIsBariba = false,
    this.promptSub,
    this.transcription,
    this.options = const [],
    this.optionsAreBariba = false,
    this.answer = '',
    this.orderAnswer = const [],
    this.explain = '',
    this.source = '',
    this.verified = true,
    this.cardId,
  });

  final ApTaskKind kind;
  final String instruction;
  final String prompt;
  final bool promptIsBariba;
  final String? promptSub;
  final String? transcription;
  final List<String> options;
  final bool optionsAreBariba;
  final String answer;
  final List<String> orderAnswer;
  final String explain;
  final String source;
  final bool verified;
  final String? cardId;

  bool isCorrectChoice(String option) => option == answer;

  bool isCorrectOrder(List<String> words) {
    if (words.length != orderAnswer.length) {
      return false;
    }
    for (var i = 0; i < words.length; i++) {
      if (baseForm(words[i]) != baseForm(orderAnswer[i])) {
        return false;
      }
    }
    return true;
  }
}

/// Forme de comparaison : minuscules, sans ponctuation ni accents de ton.
/// Les voyelles ɔ, ɛ et le tilde de nasalisation sont conservés.
String baseForm(String text) {
  const precomposed = <String, String>{
    'à': 'a', 'á': 'a', 'â': 'a', 'ǎ': 'a', 'ā': 'a',
    'è': 'e', 'é': 'e', 'ê': 'e', 'ě': 'e', 'ē': 'e',
    'ì': 'i', 'í': 'i', 'î': 'i', 'ǐ': 'i', 'ī': 'i',
    'ò': 'o', 'ó': 'o', 'ô': 'o', 'ǒ': 'o', 'ō': 'o',
    'ù': 'u', 'ú': 'u', 'û': 'u', 'ǔ': 'u', 'ū': 'u',
    'ǹ': 'n', 'ń': 'n', 'ḿ': 'm',
  };
  final buffer = StringBuffer();
  for (final rune in text.toLowerCase().runes) {
    final char = String.fromCharCode(rune);
    // accents de ton combinants (grave, aigu, circonflexe, macron, caron)
    if (rune == 0x0300 ||
        rune == 0x0301 ||
        rune == 0x0302 ||
        rune == 0x0304 ||
        rune == 0x030C) {
      continue;
    }
    if ('.,;:!?«»"“”()'.contains(char)) {
      continue;
    }
    buffer.write(precomposed[char] ?? char);
  }
  return buffer.toString().replaceAll(RegExp(r'\s+'), ' ').trim();
}

/// Découpe une phrase bariba en mots (ponctuation retirée).
List<String> sentenceWords(String sentence) => sentence
    .split(RegExp(r'\s+'))
    .map((word) => word.replaceAll(RegExp(r'[.,;:!?«»"“”]'), ''))
    .where((word) => word.isNotEmpty)
    .toList();

class ApTaskFactory {
  ApTaskFactory(this.content, {math.Random? random})
    : _random = random ?? math.Random();

  final ApprendreContent content;
  final math.Random _random;

  /// Questions du test de fin de fondation.
  List<ApTask> foundationQuiz(ApFoundation unit) {
    final tasks = <ApTask>[];
    for (final quiz in unit.quiz) {
      if (quiz.type == 'order' && quiz.answerOrder.isNotEmpty) {
        tasks.add(
          ApTask(
            kind: ApTaskKind.order,
            instruction: 'Remets les mots dans l’ordre',
            prompt: quiz.prompt,
            orderAnswer: quiz.answerOrder,
            options: _shuffled(quiz.answerOrder),
            optionsAreBariba: true,
            answer: quiz.answer,
            explain: quiz.explain,
            source: quiz.src,
          ),
        );
      } else {
        tasks.add(
          ApTask(
            kind: ApTaskKind.choice,
            instruction: 'Choisis la bonne réponse',
            prompt: quiz.prompt,
            options: _shuffled(quiz.options),
            optionsAreBariba: quiz.options.any(_looksBariba),
            answer: quiz.answer,
            explain: quiz.explain,
            source: quiz.src,
          ),
        );
      }
    }
    return tasks;
  }

  /// Séance de vocabulaire : révisions dues du thème puis nouveaux mots.
  List<ApTask> themeSession(
    ApTheme theme,
    ApprendreProgress progress, {
    required DateTime now,
    int newWords = 6,
    int maxTasks = 12,
  }) {
    final pool = content.cardsOf(theme);
    final due = progress
        .dueCardIds(now)
        .where(theme.cardIds.contains)
        .map((id) => content.cards[id])
        .whereType<ApCard>()
        .take(6)
        .toList();
    final fresh = progress
        .newCardIds(theme, limit: newWords)
        .map((id) => content.cards[id])
        .whereType<ApCard>()
        .toList();
    final tasks = <ApTask>[];
    for (final card in fresh) {
      tasks.add(_recognize(card, pool));
    }
    for (final card in due) {
      tasks.add(_practice(card, pool, progress));
    }
    for (final card in fresh.take(3)) {
      tasks.add(_practice(card, pool, progress));
    }
    if (progress.profile == 'oral' && fresh.isNotEmpty) {
      tasks.add(_speak(fresh.first));
    }
    return tasks.take(maxTasks).toList();
  }

  /// Séance de révision espacée sur tous les thèmes.
  List<ApTask> reviewSession(
    ApprendreProgress progress, {
    required DateTime now,
    int maxTasks = 12,
  }) {
    final cards = progress
        .dueCardIds(now)
        .map((id) => content.cards[id])
        .whereType<ApCard>()
        .take(maxTasks)
        .toList();
    return [
      for (final card in cards)
        _practice(card, _poolFor(card), progress),
    ];
  }

  List<ApCard> _poolFor(ApCard card) {
    final theme = card.themeIds.isEmpty
        ? null
        : content.themeById(card.themeIds.first);
    if (theme == null) {
      return content.cards.values.take(200).toList();
    }
    return content.cardsOf(theme);
  }

  ApTask _practice(ApCard card, List<ApCard> pool, ApprendreProgress progress) {
    final options = <ApTask Function()>[
      () => _recall(card, pool),
      () => _recognize(card, pool),
    ];
    if (progress.direction == 'fr_to_ba') {
      options.add(() => _recall(card, pool));
    } else {
      options.add(() => _recognize(card, pool));
    }
    if (card.cloze && card.hasExample && progress.profile != 'oral') {
      options.add(() => _cloze(card, pool));
    }
    if (card.plural != null && progress.profile != 'oral') {
      options.add(() => _plural(card, pool));
    }
    if ((card.conjugation['inacc'] ?? '').isNotEmpty &&
        progress.profile == 'both') {
      options.add(() => _conjugate(card, pool));
    }
    if (card.hasExample &&
        progress.profile == 'both' &&
        sentenceWords(card.exampleBa!).length <= 6) {
      options.add(() => _order(card));
    }
    return options[_random.nextInt(options.length)]();
  }

  ApTask _recognize(ApCard card, List<ApCard> pool) {
    final distractors = _distinct(
      pool.where((c) => c.id != card.id).map((c) => c.fr),
      exclude: card.fr,
    );
    return ApTask(
      kind: ApTaskKind.choice,
      instruction: 'Que veut dire ce mot ?',
      prompt: card.ba,
      promptIsBariba: true,
      transcription: card.transcription,
      options: _shuffled([card.fr, ...distractors.take(3)]),
      answer: card.fr,
      explain: card.hasExample ? '${card.exampleBa}\n${card.exampleFr}' : '',
      source: card.source,
      verified: card.verified,
      cardId: card.id,
    );
  }

  ApTask _recall(ApCard card, List<ApCard> pool) {
    final distractors = _distinct(
      pool.where((c) => c.id != card.id).map((c) => c.ba),
      exclude: card.ba,
    );
    return ApTask(
      kind: ApTaskKind.choice,
      instruction: 'Comment dit-on en bàátɔ̀nú ?',
      prompt: card.fr,
      options: _shuffled([card.ba, ...distractors.take(3)]),
      optionsAreBariba: true,
      answer: card.ba,
      explain: card.hasExample ? '${card.exampleBa}\n${card.exampleFr}' : '',
      source: card.source,
      verified: card.verified,
      cardId: card.id,
    );
  }

  ApTask _cloze(ApCard card, List<ApCard> pool) {
    final words = sentenceWords(card.exampleBa!);
    final target = baseForm(card.ba);
    final index = words.indexWhere((w) => baseForm(w) == target);
    if (index < 0) {
      return _recall(card, pool);
    }
    final hole = words[index];
    final shown = [
      for (var i = 0; i < words.length; i++) i == index ? '_____' : words[i],
    ].join(' ');
    final distractors = _distinct(
      pool.where((c) => c.id != card.id && c.pos == card.pos).map((c) => c.ba),
      exclude: hole,
    );
    return ApTask(
      kind: ApTaskKind.choice,
      instruction: 'Complète la phrase',
      prompt: shown,
      promptIsBariba: true,
      promptSub: card.exampleFr,
      options: _shuffled([hole, ...distractors.take(3)]),
      optionsAreBariba: true,
      answer: hole,
      explain: '${card.ba} : ${card.fr}',
      source: card.source,
      verified: card.verified,
      cardId: card.id,
    );
  }

  ApTask _plural(ApCard card, List<ApCard> pool) {
    final plural = card.plural!;
    final distractors = _distinct(
      [
        '${card.ba}ba',
        '${card.ba}nu',
        '${card.ba}su',
        '${card.ba}bu',
        ...pool.where((c) => c.plural != null && c.id != card.id).map((c) => c.plural!),
      ],
      exclude: plural,
    );
    final cls = card.nounClass == null ? '' : ' (classe ${card.nounClass})';
    return ApTask(
      kind: ApTaskKind.choice,
      instruction: 'Quel est le pluriel ?',
      prompt: card.ba,
      promptIsBariba: true,
      promptSub: card.fr,
      options: _shuffled([plural, ...distractors.take(3)]),
      optionsAreBariba: true,
      answer: plural,
      explain: '${card.ba} → $plural$cls',
      source: card.source,
      verified: card.verified,
      cardId: card.id,
    );
  }

  ApTask _conjugate(ApCard card, List<ApCard> pool) {
    final form = card.conjugation['inacc']!;
    final distractors = _distinct(
      [
        if ((card.conjugation['neg'] ?? '').isNotEmpty) card.conjugation['neg']!,
        if ((card.conjugation['imp'] ?? '').isNotEmpty) card.conjugation['imp']!,
        ...pool
            .where((c) => c.id != card.id && (c.conjugation['inacc'] ?? '').isNotEmpty)
            .map((c) => c.conjugation['inacc']!),
      ],
      exclude: form,
    );
    return ApTask(
      kind: ApTaskKind.choice,
      instruction: 'Forme « en train de… » (inaccompli)',
      prompt: card.ba,
      promptIsBariba: true,
      promptSub: card.fr,
      options: _shuffled([form, ...distractors.take(3)]),
      optionsAreBariba: true,
      answer: form,
      explain: 'Inaccompli : ${card.ba} → $form',
      source: card.source,
      verified: card.verified,
      cardId: card.id,
    );
  }

  ApTask _order(ApCard card) {
    final words = sentenceWords(card.exampleBa!);
    return ApTask(
      kind: ApTaskKind.order,
      instruction: 'Remets les mots dans l’ordre',
      prompt: card.exampleFr ?? '',
      options: _shuffled(words),
      optionsAreBariba: true,
      orderAnswer: words,
      answer: words.join(' '),
      explain: card.exampleBa ?? '',
      source: card.source,
      verified: card.verified,
      cardId: card.id,
    );
  }

  ApTask _speak(ApCard card) {
    return ApTask(
      kind: ApTaskKind.speak,
      instruction: 'Dis-le à voix haute',
      prompt: card.ba,
      promptIsBariba: true,
      promptSub: card.fr,
      transcription: card.transcription,
      answer: card.ba,
      source: card.source,
      verified: card.verified,
      cardId: card.id,
    );
  }

  List<String> _shuffled(List<String> values) {
    final copy = List<String>.from(values)..shuffle(_random);
    return copy;
  }

  List<String> _distinct(Iterable<String> values, {required String exclude}) {
    final seen = <String>{baseForm(exclude)};
    final result = <String>[];
    final shuffled = values.toList()..shuffle(_random);
    for (final value in shuffled) {
      final key = baseForm(value);
      if (key.isEmpty || seen.contains(key)) {
        continue;
      }
      seen.add(key);
      result.add(value);
    }
    return result;
  }

  static bool _looksBariba(String text) =>
      RegExp('[ɔɛƆƐ̃ǹ]').hasMatch(text);
}
