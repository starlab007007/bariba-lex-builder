// Portage fidèle de fitila_flutter/lib/apprendre/apprendre_session.dart (branche
// feat/apprendre-v2.4-build19-20260927) — état et résultat d'une séance
// d'exercices (moteur, indépendant de l'écran React qui le pilote).
//
// Référence : apprendre_v24_spec.md §6 (ApSessionResult, calcul du XP, _retry,
// skillIcon, éléments de calcul de l'écran de résultat).

import { ApTask, ApTaskFactory, CORE_SKILLS } from './tasks';
import { ApprendreStore, PASS_MARK } from './store';

/** Résultat d'une séance, renvoyé à l'écran appelant (spec §6.1). */
export interface ApSessionResult {
  correct: number;
  total: number;
  /** Nombre d'exercices et de bonnes réponses par type d'exercice. */
  skillTotals: Record<string, number>;
  skillCorrect: Record<string, number>;
  /** Points gagnés pendant la séance (voir note d'ordre exact dans `finish()`). */
  xpGained: number;
}

/** `percent = round(correct * 100 / total)`, 0 si `total == 0`. */
export function sessionPercent(result: Pick<ApSessionResult, 'correct' | 'total'>): number {
  return result.total === 0 ? 0 : Math.round((result.correct * 100) / result.total);
}

/**
 * Pilote une séance : accumule les réponses, puis construit `ApSessionResult`
 * en reproduisant l'ordre exact de `_finish()` (spec §6.2) — le `xpGained`
 * affiché à l'écran de résultat est calculé AVANT l'application du bonus de
 * fondation (+30 XP), qui n'est crédité qu'au store persistant, séparément.
 */
export class ApSessionRunner {
  readonly tasks: readonly ApTask[];
  private readonly store: ApprendreStore;
  private readonly xpStart: number;
  private correct = 0;
  private skipped = 0;
  private readonly skillTotals: Record<string, number> = {};
  private readonly skillCorrect: Record<string, number> = {};
  private readonly missed: ApTask[] = [];

  constructor(tasks: readonly ApTask[], store: ApprendreStore) {
    this.tasks = tasks;
    this.store = store;
    this.xpStart = store.progress.xp;
  }

  /**
   * Enregistre une réponse (choix, ordre, ou auto-évaluation orale) pour
   * [task]. Met à jour les compteurs par compétence ET la progression SRS
   * (Leitner, XP, série) via `ApprendreProgress.recordAnswer`.
   */
  answer(task: ApTask, ok: boolean, now: number = Date.now()): void {
    const skill = task.skill.length === 0 ? 'quiz' : task.skill;
    this.skillTotals[skill] = (this.skillTotals[skill] ?? 0) + 1;
    if (ok) {
      this.correct++;
      this.skillCorrect[skill] = (this.skillCorrect[skill] ?? 0) + 1;
    } else {
      this.missed.push(task);
    }
    this.store.progress.recordAnswer(task.cardId, ok, now);
  }

  /**
   * Passe une tâche sans y répondre (uniquement les exercices `speak` sans
   * micro disponible) — n'affecte ni `total`, ni les compteurs par
   * compétence, ni la progression SRS.
   */
  skip(): void {
    this.skipped++;
  }

  get missedTasks(): readonly ApTask[] {
    return this.missed;
  }

  get correctCount(): number {
    return this.correct;
  }

  get skippedCount(): number {
    return this.skipped;
  }

  /**
   * Termine la séance : construit `ApSessionResult`, applique séparément le
   * bonus de fondation (+30 XP si `percent >= PASS_MARK`) au store, puis
   * sauvegarde. Reproduit l'ordre exact de `_finish()` (spec §6.2) — ne pas
   * réordonner ces étapes, le `xpGained` retourné dépend de cet ordre.
   */
  finish(options: { foundationId?: string; now?: number } = {}): ApSessionResult {
    const now = options.now ?? Date.now();
    const result: ApSessionResult = {
      correct: this.correct,
      total: this.tasks.length - this.skipped,
      skillTotals: { ...this.skillTotals },
      skillCorrect: { ...this.skillCorrect },
      xpGained: this.store.progress.xp - this.xpStart,
    };
    if (options.foundationId) {
      this.store.progress.recordFoundation(options.foundationId, sessionPercent(result), now);
    }
    this.store.save();
    return result;
  }
}

/** Reconstruit une séance « Mes erreurs » à partir des tâches ratées (spec §6.3). */
export function retryTasks(missed: readonly ApTask[]): ApTask[] {
  return missed.map((t) => ApTaskFactory.replayOf(t));
}

/** Nom d'icône sémantique par compétence — l'écran React choisit le composant lucide-react correspondant (spec §6.4, mapping Material → web). */
export type ApSkillIconName = 'eye' | 'languages' | 'text-cursor' | 'copy' | 'clock' | 'shuffle' | 'mic' | 'graduation-cap';

export function skillIconName(skill: string): ApSkillIconName {
  switch (skill) {
    case 'recognize': return 'eye';
    case 'recall': return 'languages';
    case 'cloze': return 'text-cursor';
    case 'plural': return 'copy';
    case 'conjugate': return 'clock';
    case 'order': return 'shuffle';
    case 'speak': return 'mic';
    default: return 'graduation-cap';
  }
}

/** Titre de l'écran de résultat (spec §6.5). */
export function sessionHeadline(percent: number, foundationPassed: boolean | null): string {
  if (foundationPassed != null) {
    return foundationPassed ? 'Fondation validée' : 'Encore un effort';
  }
  if (percent >= 80) return 'Très belle séance';
  if (percent >= PASS_MARK) return 'Bonne séance';
  return 'Séance terminée';
}

/** Liste ordonnée [compétence, total, corrects] pour « Par type d'exercice » — ordre coreSkills puis quiz, filtré aux compétences pratiquées (spec §6.5). */
export function skillBreakdown(result: Pick<ApSessionResult, 'skillTotals' | 'skillCorrect'>): { skill: string; total: number; correct: number }[] {
  return [...CORE_SKILLS, 'quiz']
    .filter((skill) => (result.skillTotals[skill] ?? 0) > 0)
    .map((skill) => ({ skill, total: result.skillTotals[skill] ?? 0, correct: result.skillCorrect[skill] ?? 0 }));
}

/** Message de rétention affiché en bas de l'écran de résultat (spec §6.5). */
export function retentionMessage(missedCount: number): string {
  return missedCount === 0
    ? "Chaque mot réussi reviendra juste avant d'être oublié : 1, 2, 4, 8… jours."
    : 'Les mots manqués reviennent dans 10 minutes ; les autres selon ta mémoire (1, 2, 4, 8… jours).';
}
