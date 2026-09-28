// Portage fidèle de fitila_flutter/lib/apprendre/apprendre_store.dart (branche
// feat/apprendre-v2.4-build19-20260927) — répétition espacée (8 boîtes de
// Leitner), XP, série, et persistance locale (localStorage sur web, comme
// SharedPreferences côté Flutter — même clé de stockage pour un format
// compatible, la progression reste par-appareil des deux côtés).
//
// Référence : apprendre_v24_spec.md §5.

import type { ApTheme } from './content';

export const INTERVALS_DAYS = [0, 1, 2, 4, 8, 16, 32, 64];
export const PASS_MARK = 60;

export interface SrsStateJson {
  b: number;
  d: number; // due, ms epoch
  r: number; // reps
  l: number; // lapses
  lr?: number; // lastReview, ms epoch
}

/** État d'un mot dans la révision espacée (boîtes de Leitner). */
export class SrsState {
  constructor(
    public readonly box: number,
    public readonly due: number, // ms epoch
    public readonly reps: number,
    public readonly lapses: number,
    public readonly lastReview: number | null,
  ) {}

  /** Un mot est « actif » quand il a été retrouvé au moins deux fois de suite. */
  get active(): boolean {
    return this.box >= 2;
  }

  /** Stabilité approximative de la mémoire (en jours). */
  get stability(): number {
    const box = Math.min(Math.max(this.box, 0), 7);
    return Math.max(0.5, INTERVALS_DAYS[box] * 1.4);
  }

  /** Probabilité estimée de se souvenir à [now] (courbe d'oubli exponentielle). */
  retention(now: number): number {
    if (this.lastReview == null) return 0;
    const days = (now - this.lastReview) / (60 * 1000) / (60 * 24);
    return Math.exp(-days / this.stability);
  }

  review(correct: boolean, now: number): SrsState {
    if (correct) {
      const nextBox = Math.min(this.box + 1, 7);
      return new SrsState(nextBox, now + INTERVALS_DAYS[nextBox] * 86400000, this.reps + 1, this.lapses, now);
    }
    return new SrsState(1, now + 10 * 60000, this.reps + 1, this.lapses + 1, now);
  }

  toJson(): SrsStateJson {
    return { b: this.box, d: this.due, r: this.reps, l: this.lapses, ...(this.lastReview != null ? { lr: this.lastReview } : {}) };
  }

  static fromJson(json: Partial<SrsStateJson>): SrsState {
    return new SrsState(json.b ?? 0, json.d ?? 0, json.r ?? 0, json.l ?? 0, json.lr ?? null);
  }

  static fresh(now: number): SrsState {
    return new SrsState(0, now, 0, 0, null);
  }
}

export interface ApprendreProgressJson {
  v: 1;
  profile: string | null;
  direction: string;
  foundations: Record<string, number>;
  srs: Record<string, SrsStateJson>;
  xp: number;
  streak: number;
  last: string | null;
  daily: Record<string, number>;
}

export function dayKey(dayMs: number): string {
  const d = new Date(dayMs);
  const two = (v: number) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
}

/** Progression locale du module Apprendre, conservée hors-ligne (localStorage). */
export class ApprendreProgress {
  profile: string | null;
  direction: string; // fr_to_ba · ba_to_fr
  readonly foundationScores: Record<string, number>;
  readonly srs: Record<string, SrsState>;
  xp: number;
  streak: number;
  lastActiveDay: string | null;
  readonly daily: Record<string, number>;

  constructor(init: {
    profile?: string | null; direction?: string; foundationScores?: Record<string, number>;
    srs?: Record<string, SrsState>; xp?: number; streak?: number; lastActiveDay?: string | null;
    daily?: Record<string, number>;
  } = {}) {
    this.profile = init.profile ?? null;
    this.direction = init.direction ?? 'fr_to_ba';
    this.foundationScores = init.foundationScores ?? {};
    this.srs = init.srs ?? {};
    this.xp = init.xp ?? 0;
    this.streak = init.streak ?? 0;
    this.lastActiveDay = init.lastActiveDay ?? null;
    this.daily = init.daily ?? {};
  }

  foundationDone(id: string): boolean {
    return (this.foundationScores[id] ?? 0) >= PASS_MARK;
  }
  get foundationsDone(): number {
    return Object.values(this.foundationScores).filter((s) => s >= PASS_MARK).length;
  }
  get activeWords(): number {
    return Object.values(this.srs).filter((s) => s.active).length;
  }
  get seenWords(): number {
    return Object.keys(this.srs).length;
  }

  dueCardIds(now: number): string[] {
    return Object.entries(this.srs)
      .filter(([, s]) => s.due <= now)
      .sort((a, b) => a[1].due - b[1].due)
      .map(([id]) => id);
  }

  /** Mots qui passeront sous le seuil de révision chacun des [days] prochains jours. */
  dueForecast(now: number, days = 7): number[] {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const result = new Array(days).fill(0);
    for (const state of Object.values(this.srs)) {
      const dueDay = new Date(state.due);
      dueDay.setHours(0, 0, 0, 0);
      const index = Math.round((dueDay.getTime() - start.getTime()) / 86400000);
      if (index < 0) result[0]++;
      else if (index < days) result[index]++;
    }
    return result;
  }

  learnedIn(theme: ApTheme): number {
    return theme.cards.filter((id) => this.srs[id]?.active).length;
  }
  seenIn(theme: ApTheme): number {
    return theme.cards.filter((id) => id in this.srs).length;
  }
  /** Nouveaux mots d'un thème, dans l'ordre d'apprentissage prévu. */
  newCardIds(theme: ApTheme, limit = 6): string[] {
    return theme.cards.filter((id) => !(id in this.srs)).slice(0, limit);
  }

  recordAnswer(cardId: string | undefined, correct: boolean, now: number): void {
    const key = dayKey(now);
    this.daily[key] = (this.daily[key] ?? 0) + 1;
    this.touchStreak(now);
    if (correct) this.xp += 8;
    if (cardId == null) return;
    const current = this.srs[cardId] ?? SrsState.fresh(now);
    this.srs[cardId] = current.review(correct, now);
  }

  recordFoundation(id: string, score: number, now: number): void {
    const best = this.foundationScores[id] ?? 0;
    if (score > best) this.foundationScores[id] = score;
    if (score >= PASS_MARK) this.xp += 30;
    this.touchStreak(now);
  }

  private touchStreak(now: number): void {
    const today = dayKey(now);
    if (this.lastActiveDay === today) return;
    const yesterday = dayKey(now - 86400000);
    this.streak = this.lastActiveDay === yesterday ? this.streak + 1 : 1;
    this.lastActiveDay = today;
  }

  toJson(): ApprendreProgressJson {
    return {
      v: 1,
      profile: this.profile,
      direction: this.direction,
      foundations: this.foundationScores,
      srs: Object.fromEntries(Object.entries(this.srs).map(([k, v]) => [k, v.toJson()])),
      xp: this.xp,
      streak: this.streak,
      last: this.lastActiveDay,
      daily: this.daily,
    };
  }

  static fromJson(json: Partial<ApprendreProgressJson>): ApprendreProgress {
    const srs: Record<string, SrsState> = {};
    if (json.srs) for (const [k, v] of Object.entries(json.srs)) srs[k] = SrsState.fromJson(v);
    return new ApprendreProgress({
      profile: json.profile ?? null,
      direction: json.direction ?? 'fr_to_ba',
      foundationScores: json.foundations ?? {},
      srs,
      xp: json.xp ?? 0,
      streak: json.streak ?? 0,
      lastActiveDay: json.last ?? null,
      daily: json.daily ?? {},
    });
  }
}

/** Lecture et écriture de ApprendreProgress dans localStorage. */
export class ApprendreStore {
  static readonly storageKey = 'fitila_apprendre_v2';

  readonly progress: ApprendreProgress;

  private constructor(progress: ApprendreProgress) {
    this.progress = progress;
  }

  static open(): ApprendreStore {
    let progress = new ApprendreProgress();
    try {
      const raw = window.localStorage.getItem(ApprendreStore.storageKey);
      if (raw) progress = ApprendreProgress.fromJson(JSON.parse(raw));
    } catch {
      progress = new ApprendreProgress();
    }
    return new ApprendreStore(progress);
  }

  save(): void {
    try {
      window.localStorage.setItem(ApprendreStore.storageKey, JSON.stringify(this.progress.toJson()));
    } catch {
      // stockage indisponible (mode privé, quota) — la progression reste en mémoire pour la session.
    }
  }
}
