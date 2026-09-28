// Portage fidèle de fitila_flutter/lib/apprendre/apprendre_tasks.dart (branche
// feat/apprendre-v2.4-build19-20260927) — génération des 7 types d'exercices
// d'une séance et des questions de test de fondation.
//
// Référence : apprendre_v24_spec.md §3 (ApTaskFactory) et §7 (buildSceneQuiz,
// dans scenes.ts) pour les règles exactes de distracteurs à reproduire.

import { ApCard, ApFoundation, ApprendreContent, baseForm, cardConjugation, cardHasExample, cardSource, cardVerified, sentenceWords } from './content';
import type { ApprendreProgress } from './store';

export type ApTaskKind = 'choice' | 'order' | 'speak';

/** Les sept types d'exercices d'une séance complète. */
export const CORE_SKILLS = ['recognize', 'recall', 'cloze', 'plural', 'conjugate', 'order', 'speak'] as const;
export type ApSkill = (typeof CORE_SKILLS)[number] | 'quiz';

export function skillLabel(skill: string): string {
  switch (skill) {
    case 'recognize': return 'Reconnaître un mot';
    case 'recall': return 'Retrouver le mot bariba';
    case 'cloze': return 'Phrase à trous';
    case 'plural': return 'Pluriel';
    case 'conjugate': return 'Conjugaison';
    case 'order': return 'Ordre des mots';
    case 'speak': return 'Prononciation';
    case 'quiz': return 'Question de leçon';
    default: return 'Exercice';
  }
}

export interface ApTask {
  kind: ApTaskKind;
  instruction: string;
  prompt: string;
  promptIsBariba: boolean;
  promptSub?: string;
  transcription?: string;
  options: string[];
  optionsAreBariba: boolean;
  answer: string;
  orderAnswer: string[];
  explain: string;
  source: string;
  verified: boolean;
  cardId?: string;
  skill: string;
}

function baseTask(partial: Partial<ApTask> & Pick<ApTask, 'kind' | 'instruction' | 'prompt'>): ApTask {
  return {
    promptIsBariba: false,
    options: [],
    optionsAreBariba: false,
    answer: '',
    orderAnswer: [],
    explain: '',
    source: '',
    verified: true,
    skill: '',
    ...partial,
  };
}

export function isCorrectChoice(task: ApTask, option: string): boolean {
  return option === task.answer;
}

export function isCorrectOrder(task: ApTask, words: string[]): boolean {
  if (words.length !== task.orderAnswer.length) return false;
  return words.every((w, i) => baseForm(w) === baseForm(task.orderAnswer[i]));
}

// ---------------------------------------------------------------------
// Utilitaire aléatoire (équivalent minimal de dart:math Random pour
// shuffle/pick — pas besoin de reproduire le même PRNG que Dart, chaque
// plateforme tire ses propres séances).
// ---------------------------------------------------------------------

function shuffled<T>(values: T[]): T[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function randomIndex(max: number): number {
  return Math.floor(Math.random() * max);
}

function distinctValues(values: Iterable<string>, exclude: string): string[] {
  const seen = new Set<string>([baseForm(exclude)]);
  const result: string[] = [];
  for (const value of shuffled([...values])) {
    const key = baseForm(value);
    if (key.length === 0 || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

const LOOKS_BARIBA = /[ɔɛƆƐ̃ǹ]/;
function looksBariba(text: string): boolean {
  return LOOKS_BARIBA.test(text);
}

export class ApTaskFactory {
  constructor(private readonly content: ApprendreContent) {}

  /** Questions du test de fin de fondation. */
  foundationQuiz(unit: ApFoundation): ApTask[] {
    const tasks: ApTask[] = [];
    for (const quiz of unit.quiz) {
      if (quiz.type === 'order' && quiz.answer.length > 0) {
        tasks.push(baseTask({
          kind: 'order',
          instruction: 'Remets les mots dans l’ordre',
          prompt: quiz.prompt,
          orderAnswer: quiz.answer,
          options: shuffled(quiz.answer),
          optionsAreBariba: true,
          answer: quiz.answer.join(' '),
          explain: quiz.explain,
          source: quiz.src,
          skill: 'order',
        }));
      } else if (quiz.type === 'mcq') {
        tasks.push(baseTask({
          kind: 'choice',
          instruction: 'Choisis la bonne réponse',
          prompt: quiz.prompt,
          options: shuffled(quiz.options),
          optionsAreBariba: quiz.options.some(looksBariba),
          answer: quiz.answer,
          explain: quiz.explain,
          source: quiz.src,
          skill: 'quiz',
        }));
      }
    }
    return tasks;
  }

  /** Mots proches (même thème) servant de distracteurs. */
  poolFor(card: ApCard): ApCard[] {
    const theme = card.th.length === 0 ? undefined : this.content.themeById(card.th[0]);
    if (!theme) return [...this.content.cards.values()].slice(0, 200);
    return this.content.cardsOf(theme);
  }

  /**
   * Séance de révision : un exercice par mot dû (le même algorithme que
   * `practice`, donc recall/recognize/cloze/plural/conjugate/order selon le
   * profil), plafonné à [maxTasks] mots, les plus en retard d'abord —
   * `progress.dueCardIds` les trie déjà par échéance croissante.
   *
   * Portage fidèle de `ApTaskFactory.reviewSession` (apprendre_tasks.dart,
   * branche feat/apprendre-v2.4-build19-20260927) : construit les mots dus
   * puis appelle `_practice`/`_poolFor` (ici `practice`/`poolFor`) pour
   * chacun, sans logique supplémentaire.
   */
  reviewSession(progress: ApprendreProgress, { now, maxTasks = 12 }: { now: number; maxTasks?: number }): ApTask[] {
    const cards = progress
      .dueCardIds(now)
      .slice(0, maxTasks)
      .map((id) => this.content.cards.get(id))
      .filter((c): c is ApCard => !!c);
    return cards.map((card) => this.practice(card, this.poolFor(card), progress));
  }

  /** Choisit aléatoirement un exercice pertinent pour [card] selon le profil. */
  practice(card: ApCard, pool: ApCard[], progress: ApprendreProgress): ApTask {
    const options: (() => ApTask)[] = [
      () => this.recall(card, pool),
      () => this.recognize(card, pool),
    ];
    if (progress.direction === 'fr_to_ba') {
      options.push(() => this.recall(card, pool));
    } else {
      options.push(() => this.recognize(card, pool));
    }
    if (card.cloze && cardHasExample(card) && progress.profile !== 'oral') {
      options.push(() => this.cloze(card, pool));
    }
    if (card.pl != null && progress.profile !== 'oral') {
      options.push(() => this.plural(card, pool));
    }
    if ((cardConjugation(card).inacc ?? '').length > 0 && progress.profile === 'both') {
      options.push(() => this.conjugate(card, pool));
    }
    if (cardHasExample(card) && progress.profile === 'both' && sentenceWords(card.ex_ba!).length <= 6) {
      options.push(() => this.order(card));
    }
    return options[randomIndex(options.length)]();
  }

  recognize(card: ApCard, pool: ApCard[]): ApTask {
    const distractors = distinctValues(pool.filter((c) => c.id !== card.id).map((c) => c.fr), card.fr);
    return baseTask({
      kind: 'choice',
      instruction: 'Que veut dire ce mot ?',
      prompt: card.ba,
      promptIsBariba: true,
      transcription: card.tr,
      options: shuffled([card.fr, ...distractors.slice(0, 3)]),
      answer: card.fr,
      explain: cardHasExample(card) ? `${card.ex_ba}\n${card.ex_fr}` : '',
      source: cardSource(card),
      verified: cardVerified(card),
      cardId: card.id,
      skill: 'recognize',
    });
  }

  recall(card: ApCard, pool: ApCard[]): ApTask {
    const distractors = distinctValues(pool.filter((c) => c.id !== card.id).map((c) => c.ba), card.ba);
    return baseTask({
      kind: 'choice',
      instruction: 'Comment dit-on en bàátɔ̀nú ?',
      prompt: card.fr,
      options: shuffled([card.ba, ...distractors.slice(0, 3)]),
      optionsAreBariba: true,
      answer: card.ba,
      explain: cardHasExample(card) ? `${card.ex_ba}\n${card.ex_fr}` : '',
      source: cardSource(card),
      verified: cardVerified(card),
      cardId: card.id,
      skill: 'recall',
    });
  }

  cloze(card: ApCard, pool: ApCard[]): ApTask {
    const words = sentenceWords(card.ex_ba!);
    const target = baseForm(card.ba);
    const index = words.findIndex((w) => baseForm(w) === target);
    if (index < 0) return this.recall(card, pool);
    const hole = words[index];
    const shown = words.map((w, i) => (i === index ? '_____' : w)).join(' ');
    const distractors = distinctValues(
      pool.filter((c) => c.id !== card.id && c.pos === card.pos).map((c) => c.ba),
      hole,
    );
    return baseTask({
      kind: 'choice',
      instruction: 'Complète la phrase',
      prompt: shown,
      promptIsBariba: true,
      promptSub: card.ex_fr,
      options: shuffled([hole, ...distractors.slice(0, 3)]),
      optionsAreBariba: true,
      answer: hole,
      explain: `${card.ba} : ${card.fr}`,
      source: cardSource(card),
      verified: cardVerified(card),
      cardId: card.id,
      skill: 'cloze',
    });
  }

  plural(card: ApCard, pool: ApCard[]): ApTask {
    const plural = card.pl!;
    const distractors = distinctValues(
      [
        `${card.ba}ba`, `${card.ba}nu`, `${card.ba}su`, `${card.ba}bu`,
        ...pool.filter((c) => c.pl != null && c.id !== card.id).map((c) => c.pl!),
      ],
      plural,
    );
    const cls = card.cls ? ` (classe ${card.cls})` : '';
    return baseTask({
      kind: 'choice',
      instruction: 'Quel est le pluriel ?',
      prompt: card.ba,
      promptIsBariba: true,
      promptSub: card.fr,
      options: shuffled([plural, ...distractors.slice(0, 3)]),
      optionsAreBariba: true,
      answer: plural,
      explain: `${card.ba} → ${plural}${cls}`,
      source: cardSource(card),
      verified: cardVerified(card),
      cardId: card.id,
      skill: 'plural',
    });
  }

  conjugate(card: ApCard, pool: ApCard[]): ApTask {
    const conj = cardConjugation(card);
    const form = conj.inacc!;
    const distractors = distinctValues(
      [
        ...(conj.neg ? [conj.neg] : []),
        ...(conj.imp ? [conj.imp] : []),
        ...pool.filter((c) => c.id !== card.id && (c.conj?.inacc ?? '').length > 0).map((c) => c.conj!.inacc!),
      ],
      form,
    );
    return baseTask({
      kind: 'choice',
      instruction: 'Forme « en train de… » (inaccompli)',
      prompt: card.ba,
      promptIsBariba: true,
      promptSub: card.fr,
      options: shuffled([form, ...distractors.slice(0, 3)]),
      optionsAreBariba: true,
      answer: form,
      explain: `Inaccompli : ${card.ba} → ${form}`,
      source: cardSource(card),
      verified: cardVerified(card),
      cardId: card.id,
      skill: 'conjugate',
    });
  }

  order(card: ApCard): ApTask {
    const words = sentenceWords(card.ex_ba!);
    return baseTask({
      kind: 'order',
      instruction: 'Remets les mots dans l’ordre',
      prompt: card.ex_fr ?? '',
      options: shuffled(words),
      optionsAreBariba: true,
      orderAnswer: words,
      answer: words.join(' '),
      explain: card.ex_ba ?? '',
      source: cardSource(card),
      verified: cardVerified(card),
      cardId: card.id,
      skill: 'order',
    });
  }

  speak(card: ApCard): ApTask {
    return baseTask({
      kind: 'speak',
      instruction: 'Dis-le à voix haute',
      prompt: card.ba,
      promptIsBariba: true,
      promptSub: card.fr,
      transcription: card.tr,
      answer: card.ba,
      source: cardSource(card),
      verified: cardVerified(card),
      cardId: card.id,
      skill: 'speak',
    });
  }

  /** Vrai si [card] permet de construire un exercice de type [skill]. */
  static supports(skill: string, card: ApCard): boolean {
    switch (skill) {
      case 'recognize':
      case 'recall':
      case 'speak':
        return card.ba.length > 0 && card.fr.length > 0;
      case 'cloze': {
        if (!card.cloze || !cardHasExample(card)) return false;
        const target = baseForm(card.ba);
        return sentenceWords(card.ex_ba!).some((w) => baseForm(w) === target);
      }
      case 'plural':
        return (card.pl ?? '').length > 0 && baseForm(card.pl!) !== baseForm(card.ba);
      case 'conjugate':
        return (card.conj?.inacc ?? '').length > 0;
      case 'order': {
        if (!cardHasExample(card)) return false;
        const count = sentenceWords(card.ex_ba!).length;
        return count >= 3 && count <= 6;
      }
      default:
        return false;
    }
  }

  /** Construit un exercice du type [skill] sur [card], ou undefined si le mot ne s'y prête pas. */
  buildSkill(skill: string, card: ApCard): ApTask | undefined {
    if (!ApTaskFactory.supports(skill, card)) return undefined;
    const pool = this.poolFor(card);
    switch (skill) {
      case 'recognize': return this.recognize(card, pool);
      case 'recall': return this.recall(card, pool);
      case 'cloze': return this.cloze(card, pool);
      case 'plural': return this.plural(card, pool);
      case 'conjugate': return this.conjugate(card, pool);
      case 'order': return this.order(card);
      case 'speak': return this.speak(card);
      default: return undefined;
    }
  }

  /** Même exercice avec les propositions remélangées (refaire ses erreurs). */
  static replayOf(task: ApTask): ApTask {
    return { ...task, options: shuffled(task.options) };
  }
}
