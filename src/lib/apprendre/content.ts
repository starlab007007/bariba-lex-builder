// Portage fidèle du contenu du module Apprendre (fitila_flutter/lib/apprendre/apprendre_models.dart
// + apprendre_tasks.dart pour baseForm/sentenceWords), à partir du même JSON que Flutter
// (apprendre_v2.json), désormais lu depuis la table Supabase `apprendre_module_content`
// (voir supabase/migrations/20260928090000_apprendre_module_content.sql) plutôt que d'un
// fichier embarqué — Flutter garde sa copie embarquée comme secours hors-ligne.
//
// Référence : /tmp/.../apprendre_v24_spec.md §1, §3 (branche feat/apprendre-v2.4-build19-20260927).

export interface ApSource {
  id: string;
  label: string;
  entries?: number;
}

export interface ApProfile {
  id: string; // oral · fr · ba · both
  title: string;
  line: string;
  icon: string;
}

export interface ApExample {
  ba: string;
  fr: string;
  src: string;
  status?: 'atteste' | 'a_valider';
  ref?: string;
  note?: string;
}

export function exampleVerified(example: Pick<ApExample, 'status'>): boolean {
  return (example.status ?? 'atteste') === 'atteste';
}

export type ApFoundationSection =
  | { type: 'explain'; title: string; body: string }
  | { type: 'tip'; body: string }
  | { type: 'examples'; title: string; items: ApExample[] }
  | { type: 'culture'; title: string; items: ApExample[] }
  | { type: 'pairs'; title: string; items: { a: ApExample; b: ApExample }[] }
  | { type: 'table'; title?: string; columns?: string[]; rows: string[][]; row_status?: string[] }
  | { type: 'order'; title: string; body: string; ba: string[]; roles: string[]; fr: string; src: string };

export type ApFoundationQuiz =
  | { type: 'mcq'; prompt: string; answer: string; options: string[]; explain: string; src: string }
  | { type: 'order'; prompt: string; answer: string[]; explain: string; src: string };

export interface ApFoundation {
  id: string;
  order: number;
  icon: string;
  minutes: number;
  title_fr: string;
  title_ba: string | null;
  summary: string;
  sections: ApFoundationSection[];
  quiz: ApFoundationQuiz[];
}

export interface ApTheme {
  id: string;
  name_fr: string;
  icon: string;
  color: string;
  count: number;
  cards: string[]; // ids "BA-XXXXX" — plafonné à 240, voir spec §1.5
}

export interface ApCardConjugation {
  inacc?: string;
  acc?: string;
  neg?: string;
  imp?: string;
}

export interface ApCard {
  id: string;
  ba: string;
  fr: string;
  pos: 'Nom' | 'Verbe' | 'Adjectif' | 'Adverbe' | 'Interjection' | string;
  p: number;
  f: number; // fréquence d'usage
  th: string[];
  tr?: string;
  st?: 'a_valider';
  cls?: string;
  pl?: string;
  foc?: string;
  conj?: ApCardConjugation;
  ex_ba?: string;
  ex_fr?: string;
  cloze?: boolean;
}

export function cardVerified(card: Pick<ApCard, 'st'>): boolean {
  return (card.st ?? 'atteste') === 'atteste';
}
export function cardIsVerb(card: Pick<ApCard, 'pos'>): boolean {
  return card.pos.startsWith('Verbe') || card.pos === 'Locution verbale';
}
export function cardHasExample(card: Pick<ApCard, 'ex_ba' | 'ex_fr'>): boolean {
  return !!card.ex_ba && !!card.ex_fr;
}
export function cardSource(card: Pick<ApCard, 'p'>): string {
  return `Dictionnaire, p. ${card.p}`;
}
export function cardConjugation(card: Pick<ApCard, 'conj'>): ApCardConjugation {
  return card.conj ?? {};
}

export interface ApProverb {
  ba: string;
  fr: string;
  src: string;
}

export interface ApprendreContentJson {
  version: string;
  title_ba: string;
  title_fr: string;
  sources: ApSource[];
  profiles: ApProfile[];
  foundations: ApFoundation[];
  themes: ApTheme[];
  cards: ApCard[];
  scenes?: unknown[]; // mini-scènes vestige, non utilisées (voir spec §1.7)
  proverbs: ApProverb[];
}

/** Vue indexée du contenu, équivalent de `ApprendreContent` côté Dart. */
export class ApprendreContent {
  readonly raw: ApprendreContentJson;
  readonly cards: Map<string, ApCard>;
  readonly themes: ApTheme[];
  readonly foundations: ApFoundation[];
  private readonly themesById: Map<string, ApTheme>;
  private readonly cardsByTheme: Map<string, ApCard[]>;

  constructor(raw: ApprendreContentJson) {
    this.raw = raw;
    this.cards = new Map(raw.cards.map((c) => [c.id, c]));
    this.themes = raw.themes;
    this.foundations = [...raw.foundations].sort((a, b) => a.order - b.order);
    this.themesById = new Map(raw.themes.map((t) => [t.id, t]));
    this.cardsByTheme = new Map(
      raw.themes.map((t) => [t.id, t.cards.map((id) => this.cards.get(id)).filter((c): c is ApCard => !!c)]),
    );
  }

  themeById(id: string): ApTheme | undefined {
    return this.themesById.get(id);
  }

  cardsOf(theme: ApTheme): ApCard[] {
    return this.cardsByTheme.get(theme.id) ?? [];
  }
}

// ---------------------------------------------------------------------
// baseForm / sentenceWords — spec §3, "Points d'implémentation critiques"
// ---------------------------------------------------------------------

const PRECOMPOSED: Record<string, string> = {
  à: 'a', á: 'a', â: 'a', ǎ: 'a', ā: 'a',
  è: 'e', é: 'e', ê: 'e', ě: 'e', ē: 'e',
  ì: 'i', í: 'i', î: 'i', ǐ: 'i', ī: 'i',
  ò: 'o', ó: 'o', ô: 'o', ǒ: 'o', ō: 'o',
  ù: 'u', ú: 'u', û: 'u', ǔ: 'u', ū: 'u',
  ǹ: 'n', ń: 'n', ḿ: 'm',
};

// Accents de ton combinants (grave, aigu, circonflexe, macron, caron).
const COMBINING_TONE_MARKS = new Set([0x0300, 0x0301, 0x0302, 0x0304, 0x030c]);
const PUNCTUATION = new Set('.,;:!?«»"“”()'.split(''));

/**
 * Forme de comparaison : minuscules, sans ponctuation ni accents de ton.
 * ɔ, ɛ et le tilde de nasalisation sont volontairement conservés.
 */
export function baseForm(text: string): string {
  let out = '';
  for (const ch of text.toLowerCase()) {
    const code = ch.codePointAt(0) ?? 0;
    if (COMBINING_TONE_MARKS.has(code)) continue;
    if (PUNCTUATION.has(ch)) continue;
    out += PRECOMPOSED[ch] ?? ch;
  }
  return out.replace(/\s+/g, ' ').trim();
}

/** Découpe une phrase bariba en mots (ponctuation retirée). */
export function sentenceWords(sentence: string): string[] {
  return sentence
    .split(/\s+/)
    .map((word) => word.replace(/[.,;:!?«»"“”]/g, ''))
    .filter((word) => word.length > 0);
}

// ---------------------------------------------------------------------
// Scènes de vie — spec §2, §7
// ---------------------------------------------------------------------

export interface ScCategory {
  id: string;
  title: string;
  summary: string;
  icon: string;
}

export interface ScLineJson {
  who: 'a' | 'b' | 'narrator';
  ba?: string;
  fr: string;
  src?: string;
  ref?: string;
  status?: 'atteste' | 'a_valider';
  fr_source?: string;
}

export interface ScLine {
  who: 'a' | 'b' | 'narrator';
  ba: string;
  fr: string;
  src: string;
  ref: string;
  status: 'atteste' | 'a_valider';
}

export function scLineFromJson(json: ScLineJson): ScLine {
  return {
    who: json.who,
    ba: json.ba ?? '',
    fr: json.fr ?? '',
    src: json.src ?? '',
    ref: json.ref ?? '',
    status: json.status ?? 'atteste',
  };
}
export function scLineIsNarration(line: ScLine): boolean {
  return line.who === 'narrator' || line.ba === '';
}
/** Note l'inversion par rapport à `exampleVerified` (§7.2 de la spec). */
export function scLineVerified(line: ScLine): boolean {
  return line.status !== 'a_valider';
}
export function scLineSource(line: ScLine): string {
  return line.src === '' ? '' : `Dictionnaire, ${line.src}`;
}

export interface ScVocab {
  ba: string;
  fr: string;
  ref: string;
}

export interface ScSceneJson {
  id: string;
  category: string;
  title: string;
  place: string;
  icon: string;
  level: number;
  intro: string;
  roles: Record<string, string>;
  learner: 'a' | 'b';
  lines: ScLineJson[];
  culture: string;
  vocab: ScVocab[];
}

export class ScScene {
  readonly id: string;
  readonly category: string;
  readonly title: string;
  readonly place: string;
  readonly icon: string;
  readonly level: number;
  readonly intro: string;
  readonly roles: Record<string, string>;
  readonly learner: 'a' | 'b';
  readonly lines: ScLine[];
  readonly culture: string;
  readonly vocab: ScVocab[];

  constructor(json: ScSceneJson) {
    this.id = json.id;
    this.category = json.category;
    this.title = json.title;
    this.place = json.place;
    this.icon = json.icon;
    this.level = json.level ?? 1;
    this.intro = json.intro;
    this.roles = json.roles ?? {};
    this.learner = json.learner ?? 'a';
    this.lines = (json.lines ?? []).map(scLineFromJson);
    this.culture = json.culture;
    this.vocab = json.vocab ?? [];
  }

  get spoken(): ScLine[] {
    return this.lines.filter((l) => !scLineIsNarration(l));
  }

  roleLabel(who: string): string {
    return this.roles[who] ?? who;
  }

  /** Prénom seul ("Bio" pour "Bio, le client"). */
  roleName(who: string): string {
    const label = this.roleLabel(who);
    const comma = label.indexOf(',');
    return comma < 0 ? label : label.slice(0, comma).trim();
  }

  otherRole(who: string): 'a' | 'b' {
    return who === 'a' ? 'b' : 'a';
  }
}

export interface ScenesContentJson {
  version: string;
  title_fr: string;
  title_ba: string | null;
  source: string;
  stats: { categories: number; scenes: number; lines: number };
  categories: ScCategory[];
  scenes: ScSceneJson[];
}

export class ScenesContent {
  readonly categories: ScCategory[];
  readonly scenes: ScScene[];

  constructor(raw: ScenesContentJson) {
    this.categories = raw.categories;
    this.scenes = raw.scenes.map((s) => new ScScene(s));
  }

  get lineCount(): number {
    return this.scenes.reduce((sum, s) => sum + s.spoken.length, 0);
  }

  scenesOf(categoryId: string): ScScene[] {
    return this.scenes.filter((s) => s.category === categoryId);
  }

  categoryById(id: string): ScCategory | undefined {
    return this.categories.find((c) => c.id === id);
  }

  /** Scène suivante dans l'ordre du module (ou undefined à la fin). */
  after(scene: ScScene): ScScene | undefined {
    const index = this.scenes.findIndex((s) => s.id === scene.id);
    if (index < 0 || index + 1 >= this.scenes.length) return undefined;
    return this.scenes[index + 1];
  }
}
