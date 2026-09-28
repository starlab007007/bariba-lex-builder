// Portage fidèle de fitila_flutter/lib/apprendre/apprendre_scenes.dart (branche
// feat/apprendre-v2.4-build19-20260927) — progression locale des scènes et
// génération du quiz de compréhension de fin de scène.
//
// Référence : apprendre_v24_spec.md §7.

import { ScLine, ScScene, baseForm, scLineVerified, sentenceWords } from './content';
import { ApTask } from './tasks';

export const SCENES_PASS_MARK = 60;

export interface ScenesProgressJson {
  v: 2;
  best: Record<string, number>;
  played: string[];
  attempts: Record<string, number>;
  lastPlayed: Record<string, number>;
}

/**
 * Progression locale des scènes : dialogues joués, meilleur score, nombre
 * de tentatives et dernière activité (localStorage, même clé que Flutter).
 */
export class ScenesProgress {
  static readonly storageKey = 'fitila_apprendre_scenes_v1';

  private constructor(
    public readonly best: Record<string, number>,
    public readonly played: Set<string>,
    public readonly attempts: Record<string, number>,
    public readonly lastPlayed: Record<string, number>,
  ) {}

  done(id: string): boolean {
    return (this.best[id] ?? 0) >= SCENES_PASS_MARK;
  }
  started(id: string): boolean {
    return this.played.has(id) || id in this.best;
  }
  needsReview(id: string): boolean {
    return this.started(id) && !this.done(id);
  }
  get doneCount(): number {
    return Object.values(this.best).filter((s) => s >= SCENES_PASS_MARK).length;
  }
  get startedCount(): number {
    return new Set([...this.played, ...Object.keys(this.best)]).size;
  }
  attemptsFor(id: string): number {
    return this.attempts[id] ?? 0;
  }
  lastPlayedAt(id: string): Date | undefined {
    const ms = this.lastPlayed[id];
    return ms == null ? undefined : new Date(ms);
  }

  markPlayed(id: string, now = Date.now()): void {
    this.played.add(id);
    this.attempts[id] = (this.attempts[id] ?? 0) + 1;
    this.lastPlayed[id] = now;
  }

  recordScore(id: string, percent: number, now = Date.now()): void {
    const wasStarted = this.started(id);
    this.played.add(id);
    if (!wasStarted) this.attempts[id] = (this.attempts[id] ?? 0) + 1;
    this.lastPlayed[id] = now;
    if (percent > (this.best[id] ?? -1)) this.best[id] = percent;
  }

  /** Scènes commencées mais encore sous le seuil, les plus faibles d'abord. */
  reviewQueue(scenes: ScScene[]): ScScene[] {
    return scenes
      .filter((s) => this.needsReview(s.id))
      .sort((a, b) => {
        const score = (this.best[a.id] ?? -1) - (this.best[b.id] ?? -1);
        if (score !== 0) return score;
        return (this.lastPlayed[a.id] ?? 0) - (this.lastPlayed[b.id] ?? 0);
      });
  }

  /**
   * Recommandation simple et déterministe : consolider d'abord une faiblesse,
   * sinon découvrir une scène nouvelle du niveau le plus accessible.
   */
  recommended(scenes: ScScene[]): ScScene | undefined {
    const review = this.reviewQueue(scenes);
    if (review.length > 0) return review[0];
    const fresh = scenes
      .filter((s) => !this.started(s.id))
      .sort((a, b) => {
        const level = a.level - b.level;
        if (level !== 0) return level;
        return scenes.indexOf(a) - scenes.indexOf(b);
      });
    if (fresh.length > 0) return fresh[0];
    if (scenes.length === 0) return undefined;
    // Tout est réussi : proposer la scène la moins récemment pratiquée.
    return [...scenes].sort((a, b) => (this.lastPlayed[a.id] ?? 0) - (this.lastPlayed[b.id] ?? 0))[0];
  }

  static open(): ScenesProgress {
    const best: Record<string, number> = {};
    const played = new Set<string>();
    const attempts: Record<string, number> = {};
    const lastPlayed: Record<string, number> = {};
    try {
      const raw = window.localStorage.getItem(ScenesProgress.storageKey);
      if (raw) {
        const json = JSON.parse(raw) as Partial<ScenesProgressJson>;
        if (json.best) Object.assign(best, json.best);
        if (json.played) for (const id of json.played) played.add(id);
        if (json.attempts) Object.assign(attempts, json.attempts);
        if (json.lastPlayed) Object.assign(lastPlayed, json.lastPlayed);
      }
    } catch {
      // Données illisibles : on repart de zéro.
    }
    return new ScenesProgress(best, played, attempts, lastPlayed);
  }

  save(): void {
    try {
      const json: ScenesProgressJson = {
        v: 2,
        best: this.best,
        played: [...this.played],
        attempts: this.attempts,
        lastPlayed: this.lastPlayed,
      };
      window.localStorage.setItem(ScenesProgress.storageKey, JSON.stringify(json));
    } catch {
      // stockage indisponible — progression en mémoire pour la session.
    }
  }
}

// ---------------------------------------------------------------------
// buildSceneQuiz — spec §7.1 (algorithme exact, ordre de rotation)
// ---------------------------------------------------------------------

function pickDistinct(values: Iterable<string>, answer: string, count: number): string[] {
  const seen = new Set<string>([baseForm(answer)]);
  const result: string[] = [];
  const pool = [...values].sort(() => Math.random() - 0.5);
  for (const value of pool) {
    const key = baseForm(value);
    if (key.length === 0 || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length === count) break;
  }
  return result;
}

function baseTask(partial: Partial<ApTask> & Pick<ApTask, 'kind' | 'instruction' | 'prompt'>): ApTask {
  return {
    promptIsBariba: false, options: [], optionsAreBariba: false, answer: '', orderAnswer: [],
    explain: '', source: '', verified: true, skill: '', ...partial,
  };
}

/** Questions de compréhension tirées des répliques d'une scène. */
export function buildSceneQuiz(scene: ScScene, maxTasks = 8): ApTask[] {
  const spoken = scene.spoken;
  if (spoken.length < 2) return [];

  const meaning = (line: ScLine): ApTask => {
    const options = shuffleWith([line.fr, ...pickDistinct(spoken.map((l) => l.fr), line.fr, 3)]);
    return baseTask({
      kind: 'choice', instruction: 'Que veut dire cette réplique ?', prompt: line.ba, promptIsBariba: true,
      promptSub: `Dit par ${scene.roleName(line.who)}`, options, answer: line.fr,
      explain: `${line.ba}\n${line.fr}`, source: line.src ? `Dictionnaire, ${line.src}` : '',
      verified: scLineVerified(line), skill: 'recognize',
    });
  };
  const recall = (line: ScLine): ApTask => {
    const options = shuffleWith([line.ba, ...pickDistinct(spoken.map((l) => l.ba), line.ba, 3)]);
    return baseTask({
      kind: 'choice', instruction: 'Quelle réplique veut dire… ?', prompt: line.fr, options,
      optionsAreBariba: true, answer: line.ba, explain: `${line.ba}\n${line.fr}`,
      source: line.src ? `Dictionnaire, ${line.src}` : '', verified: scLineVerified(line), skill: 'recall',
    });
  };
  const who = (line: ScLine): ApTask => {
    const names = [scene.roleName('a'), scene.roleName('b')];
    return baseTask({
      kind: 'choice', instruction: 'Qui dit cette réplique dans la scène ?', prompt: line.ba, promptIsBariba: true,
      promptSub: line.fr, options: names, answer: scene.roleName(line.who),
      explain: `${scene.roleLabel(line.who)} : ${line.ba}`, source: line.src ? `Dictionnaire, ${line.src}` : '',
      verified: scLineVerified(line), skill: 'quiz',
    });
  };
  const order = (line: ScLine): ApTask => {
    const words = sentenceWords(line.ba);
    return baseTask({
      kind: 'order', instruction: 'Remets la réplique dans l’ordre', prompt: line.fr,
      options: shuffleWith(words), optionsAreBariba: true, orderAnswer: words, answer: words.join(' '),
      explain: line.ba, source: line.src ? `Dictionnaire, ${line.src}` : '', verified: scLineVerified(line),
      skill: 'order',
    });
  };

  const lines = shuffleWith(spoken.filter(() => true)) as ScLine[]; // copie mélangée
  const tasks: ApTask[] = [];
  const builders: ((line: ScLine) => ApTask | undefined)[] = [
    meaning,
    recall,
    (line) => {
      const count = sentenceWords(line.ba).length;
      return count >= 3 && count <= 7 ? order(line) : undefined;
    },
    (line) => (scene.roleName('a') === scene.roleName('b') ? undefined : who(line)),
  ];
  let turn = 0;
  for (const line of lines) {
    if (tasks.length >= maxTasks) break;
    for (let attempt = 0; attempt < builders.length; attempt++) {
      const task = builders[(turn + attempt) % builders.length](line);
      if (task && (task.kind !== 'choice' || task.options.length >= 2)) {
        tasks.push(task);
        break;
      }
    }
    turn++;
  }
  return tasks;
}

function shuffleWith<T>(values: T[]): T[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
