// Portage fidèle de fitila_flutter/lib/apprendre/apprendre_daily.dart (branche
// feat/apprendre-v2.4-build19-20260927) — compose les séances du module :
// séance du jour (les sept types d'exercices), entraînement libre et reprise
// des erreurs.
//
// Référence : apprendre_v24_spec.md §4 (algorithme pas à pas à reproduire
// strictement — ordre des opérations, constantes exactes).

import { ApCard, ApTheme, ApprendreContent } from './content';
import { ApprendreProgress } from './store';
import { ApTask, ApTaskFactory, CORE_SKILLS } from './tasks';

/** Types d'exercices proposés selon le profil (spec §4, `skillsFor`). */
export function skillsFor(profile: string | null): readonly string[] {
  if (profile === 'oral') return ['recognize', 'recall', 'speak'];
  return CORE_SKILLS;
}

export class ApSessionPlanner {
  private readonly factory: ApTaskFactory;

  constructor(private readonly content: ApprendreContent) {
    this.factory = new ApTaskFactory(content);
  }

  /** Thème en cours : premier thème commencé et non terminé, sinon premier thème avec des mots nouveaux. */
  currentTheme(progress: ApprendreProgress): ApTheme | undefined {
    for (const theme of this.content.themes) {
      const seen = progress.seenIn(theme);
      if (seen > 0 && seen < theme.cards.length) return theme;
    }
    for (const theme of this.content.themes) {
      if (progress.newCardIds(theme, 1).length > 0) return theme;
    }
    return this.content.themes[0];
  }

  private cards(ids: Iterable<string>): ApCard[] {
    const out: ApCard[] = [];
    for (const id of ids) {
      const c = this.content.cards.get(id);
      if (c) out.push(c);
    }
    return out;
  }

  /** Séance du jour : nouveaux mots, puis un exercice de chaque type, puis les révisions dues. */
  dailySession(progress: ApprendreProgress, now: number, newWords = 3, maxTasks = 14): ApTask[] {
    const skills = skillsFor(progress.profile);
    const due = this.cards(progress.dueCardIds(now));
    const theme = this.currentTheme(progress);
    const fresh = theme ? this.cards(progress.newCardIds(theme, newWords)) : [];
    const seen = this.cards(Object.keys(progress.srs));

    const tasks: ApTask[] = [];
    const used = new Set<string>();

    const add = (task: ApTask | undefined) => {
      if (!task || tasks.length >= maxTasks) return;
      tasks.push(task);
      if (task.cardId) used.add(`${task.skill}:${task.cardId}`);
    };

    // 1. Découverte des nouveaux mots.
    for (const card of fresh) add(this.factory.buildSkill('recognize', card));

    // 2. Un exercice de chaque type, sur les mots du moment si possible.
    const preferred = [...due, ...fresh, ...seen];
    for (const skill of skills) {
      if (skill === 'recognize' && tasks.some((t) => t.skill === 'recognize')) continue;
      const card = this.pick(skill, preferred, used, theme);
      if (card) add(this.factory.buildSkill(skill, card));
    }

    // 3. Révisions dues restantes, avec un type d'exercice varié.
    for (const card of due) {
      if (tasks.length >= maxTasks) break;
      if (tasks.some((t) => t.cardId === card.id)) continue;
      add(this.varied(card, [...skills]));
    }

    // 4. Compléter avec les nouveaux mots pour ancrer la mémoire.
    for (const card of fresh) {
      if (tasks.length >= maxTasks) break;
      add(this.varied(card, skills.filter((s) => s !== 'recognize')));
    }
    return tasks;
  }

  /** Entraînement libre : mots déjà vus, les plus fragiles d'abord. */
  practiceSession(progress: ApprendreProgress, now: number, maxTasks = 12): ApTask[] {
    const skills = skillsFor(progress.profile);
    const ids = Object.keys(progress.srs).sort(
      (a, b) => progress.srs[a].retention(now) - progress.srs[b].retention(now),
    );
    const tasks: ApTask[] = [];
    let turn = 0;
    for (const card of this.cards(ids)) {
      if (tasks.length >= maxTasks) break;
      const rotated = skills.map((_, i) => skills[(turn + i) % skills.length]);
      const task = this.firstBuildable(card, rotated);
      if (task) {
        tasks.push(task);
        turn++;
      }
    }
    return tasks;
  }

  /** Rejoue les exercices manqués, propositions remélangées. */
  retrySession(missed: ApTask[]): ApTask[] {
    return missed.map((t) => ApTaskFactory.replayOf(t));
  }

  private varied(card: ApCard, skills: string[]): ApTask | undefined {
    if (skills.length === 0) return undefined;
    const shuffledSkills = [...skills].sort(() => Math.random() - 0.5);
    return this.firstBuildable(card, shuffledSkills);
  }

  private firstBuildable(card: ApCard, skills: string[]): ApTask | undefined {
    for (const skill of skills) {
      const task = this.factory.buildSkill(skill, card);
      if (task) return task;
    }
    return undefined;
  }

  /**
   * Choisit un mot pour [skill] : d'abord parmi les mots du moment, puis
   * dans le thème en cours, puis parmi les mots attestés les plus fréquents.
   */
  private pick(skill: string, preferred: ApCard[], used: Set<string>, theme: ApTheme | undefined): ApCard | undefined {
    const ok = (card: ApCard) => !used.has(`${skill}:${card.id}`) && ApTaskFactory.supports(skill, card);

    for (const card of preferred) if (ok(card)) return card;

    if (theme) {
      const inTheme = this.content.cardsOf(theme).filter((c) => c.st !== 'a_valider' && ok(c));
      if (inTheme.length > 0) return inTheme[Math.floor(Math.random() * Math.min(inTheme.length, 20))];
    }
    const frequent = [...this.content.cards.values()]
      .filter((c) => c.st !== 'a_valider' && ok(c))
      .sort((a, b) => b.f - a.f);
    if (frequent.length === 0) return undefined;
    return frequent[Math.floor(Math.random() * Math.min(frequent.length, 40))];
  }
}
