import dictionaryUrl from '@/assets/bariba_dictionary.json?url';

/**
 * Moteur de texte Bàátɔ̀nú de l'Espace : pliage typographique, prédiction, vérification orthographique.
 * Même dictionnaire et mêmes règles que le clavier Flutter/Android/iOS (`bariba_dictionary.json`).
 */

/** Caractères propres au Bàátɔ̀nú (palette de l'éditeur). */
export const BARIBA_LETTERS = ['ɔ', 'ɛ', 'ŋ', 'ã', 'ĩ', 'ũ', 'õ', 'ẽ', 'ɛ̃', 'ɔ̃'] as const;
/** Tons et marques combinantes : grave, aigu, tilde, macron. */
export const BARIBA_TONES = [
  { mark: '̀', label: 'Ton bas (grave)' },
  { mark: '́', label: 'Ton haut (aigu)' },
  { mark: '̃', label: 'Nasalisation (tilde)' },
  { mark: '̄', label: 'Ton moyen (macron)' },
] as const;

const EXTRA_FOLD: Record<string, string> = { ɛ: 'e', ɔ: 'o', ŋ: 'n', æ: 'a', œ: 'o', η: 'n' };

/** « Bàátɔ̀nú » -> « baatonu » (miroir SQL `espace_fold`). */
export function foldText(input: string): string {
  const base = (input ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  let out = '';
  for (const ch of base) out += EXTRA_FOLD[ch] ?? ch;
  return out.normalize('NFC');
}

export function htmlToText(html: string): string {
  if (!html) return '';
  const el = document.createElement('div');
  el.innerHTML = html.replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '$&\n').replace(/<br\s*\/?>/gi, '\n');
  return (el.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim();
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Texte brut -> paragraphes HTML (utilisé après OCR / import TXT). */
export function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/** Assainit le HTML (import DOCX, lien partagé) : seules les balises de mise en forme sont conservées. */
const ALLOWED = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'H1', 'H2', 'H3', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'DIV', 'SPAN', 'HR']);
export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const walk = (node: Element) => {
    for (const child of Array.from(node.children)) {
      if (!ALLOWED.has(child.tagName)) {
        child.replaceWith(document.createTextNode(child.textContent ?? ''));
        continue;
      }
      for (const attr of Array.from(child.attributes)) {
        const okStyle = attr.name === 'style' && /^text-align:\s*(left|right|center|justify);?\s*$/i.test(attr.value);
        if (!okStyle) child.removeAttribute(attr.name);
      }
      walk(child);
    }
  };
  walk(doc.body);
  return doc.body.innerHTML;
}

export type LexEntry = { ba: string; fr: string; freq: number };
type RawDict = { entries: LexEntry[]; bigrams: Record<string, string[]>; phrases?: { ba: string; fr: string }[] };

export type TranslationDirection = 'ba-fr' | 'fr-ba';
export type Translation = { text: string; kind: 'phrase' | 'word' | 'words'; direction: TranslationDirection };

/** « venir, arriver (voir …) » -> « venir » : la tête de définition sert de clé de traduction. */
const GRAMMAR_TAG = /^(inv|int|n:?|num|poss|nég|interrog|base:?|sub|dém|et dém|coord|post pos|adj|adv|v|prép|conj|pron|›)\.?$/i;
export function glossHead(gloss: string): string {
  const head = (gloss.split(/[;,(]/)[0] ?? gloss).trim();
  // Certaines entrées ne portent qu'une étiquette grammaticale (« inv », « int »…) : pas de vraie traduction.
  return GRAMMAR_TAG.test(head) ? '' : head;
}

export class BaribaLexicon {
  private entries: LexEntry[] = [];
  private byKey = new Map<string, LexEntry>();
  private words = new Set<string>();
  private bigrams = new Map<string, string[]>();
  private byInitial = new Map<string, LexEntry[]>();
  private byFrench = new Map<string, LexEntry[]>();
  private phraseBa = new Map<string, string>();
  private phraseFr = new Map<string, string>();

  constructor(raw: RawDict) {
    this.entries = raw.entries.filter((e) => e.ba).sort((a, b) => (b.freq ?? 0) - (a.freq ?? 0));
    for (const e of this.entries) {
      const k = foldText(e.ba);
      if (!this.byKey.has(k)) this.byKey.set(k, e);
      this.words.add(e.ba.normalize('NFC').toLowerCase());
      const ini = k.charAt(0);
      if (!this.byInitial.has(ini)) this.byInitial.set(ini, []);
      this.byInitial.get(ini)!.push(e);
    }
    for (const [k, v] of Object.entries(raw.bigrams ?? {})) this.bigrams.set(foldText(k), v);
    for (const e of this.entries) {
      const head = foldText(glossHead(e.fr));
      if (!head) continue;
      const list = this.byFrench.get(head) ?? [];
      if (list.length < 6) list.push(e);
      this.byFrench.set(head, list);
    }
    for (const p of raw.phrases ?? []) {
      this.phraseBa.set(foldText(p.ba), p.fr);
      this.phraseFr.set(foldText(p.fr), p.ba);
    }
  }

  /** Toutes les entrées Bariba dont la forme repliée correspond (homonymes : ba, bà, bá…). */
  lookup(word: string): LexEntry[] {
    const key = foldText(word);
    return this.entries.filter((e) => foldText(e.ba) === key).slice(0, 6);
  }

  /** Mots Bariba possibles pour un mot français (classés par fréquence). */
  lookupFrench(word: string): LexEntry[] {
    return this.byFrench.get(foldText(word)) ?? [];
  }

  /** Devine le sens de traduction : plus de mots reconnus en Bariba qu'en français -> ba-fr. */
  detectDirection(text: string): TranslationDirection {
    let ba = 0;
    let fr = 0;
    for (const { word } of tokenize(text)) {
      const k = foldText(word);
      if (this.byKey.has(k) && k.length > 1) ba++;
      if (this.byFrench.has(k)) fr++;
    }
    return ba > fr ? 'ba-fr' : fr > ba ? 'fr-ba' : this.isKnown(text.split(/\s+/)[0] ?? '') ? 'ba-fr' : 'fr-ba';
  }

  /** Traduction hors ligne : phrase exacte, mot, sinon mot à mot si au moins la moitié est connue. */
  translate(text: string, direction: TranslationDirection): Translation | null {
    const trimmed = text.trim();
    if (!trimmed) return null;
    const key = foldText(trimmed);
    const toFr = direction === 'ba-fr';
    const phrase = toFr ? this.phraseBa.get(key) : this.phraseFr.get(key);
    if (phrase) return { text: phrase, kind: 'phrase', direction };
    const one = toFr ? glossHead(this.byKey.get(key)?.fr ?? '') : this.byFrench.get(key)?.[0]?.ba;
    if (one) return { text: one, kind: 'word', direction };
    let known = 0;
    let total = 0;
    const out = trimmed.replace(WORD_RE, (w) => {
      total++;
      const k = foldText(w);
      const hit = toFr ? glossHead(this.byKey.get(k)?.fr ?? '') : this.byFrench.get(k)?.[0]?.ba;
      if (!hit) return w;
      known++;
      return hit;
    });
    return known > 0 && known * 2 >= total ? { text: out, kind: 'words', direction } : null;
  }

  get size() {
    return this.entries.length;
  }

  /** Complétions d'un préfixe ; préfixe vide -> suites probables du mot précédent. */
  predict(prefix: string, previous = '', limit = 4): LexEntry[] {
    const key = foldText(prefix);
    const out: LexEntry[] = [];
    const seen = new Set<string>();
    const add = (e: LexEntry) => {
      const k = foldText(e.ba);
      if (out.length < limit && !seen.has(k)) {
        seen.add(k);
        out.push(e);
      }
    };
    for (const w of this.bigrams.get(foldText(previous)) ?? []) {
      const fw = foldText(w);
      if (!key || fw.startsWith(key)) add(this.byKey.get(fw) ?? { ba: w, fr: '', freq: 0 });
    }
    if (!key) return out.length ? out : this.entries.slice(0, limit);
    for (const e of this.byInitial.get(key.charAt(0)) ?? []) {
      if (out.length >= limit) break;
      const fe = foldText(e.ba);
      if (fe.startsWith(key) && fe !== key) add(e);
    }
    const exact = this.byKey.get(key);
    if (exact) add(exact);
    return out;
  }

  /**
   * Vrai si le mot est connu. Le dictionnaire note peu les tons : un mot tonalisé (grave, aigu, macron) est accepté
   * quand sa forme sans tons existe ; la nasalisation (tilde) et les caractères ɛ ɔ ŋ restent distinctifs.
   */
  isKnown(word: string): boolean {
    const w = word.normalize('NFC').toLowerCase();
    if (this.words.has(w)) return true;
    const untoned = w.normalize('NFD').replace(/[\u0300\u0301\u0304]/g, '').normalize('NFC');
    return untoned !== w && this.words.has(untoned);
  }

  /** Suggestions : même forme repliée d'abord (tons manquants), puis distance d'édition ≤ 1. */
  suggest(word: string, limit = 4): string[] {
    const key = foldText(word);
    const out: string[] = [];
    const exact = this.byKey.get(key);
    if (exact && exact.ba.normalize('NFC') !== word.normalize('NFC')) out.push(exact.ba);
    if (key.length >= 3) {
      for (const e of this.byInitial.get(key.charAt(0)) ?? []) {
        if (out.length >= limit) break;
        const fe = foldText(e.ba);
        if (Math.abs(fe.length - key.length) <= 1 && withinOneEdit(fe, key) && !out.includes(e.ba)) out.push(e.ba);
      }
    }
    return out;
  }
}

function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

let lexiconPromise: Promise<BaribaLexicon | null> | null = null;
/** Charge (une fois) le dictionnaire partagé avec les claviers natifs (fichier empaqueté par Vite, donc toujours déployé). */
export function loadLexicon(): Promise<BaribaLexicon | null> {
  lexiconPromise ??= fetch(dictionaryUrl)
    .then((r) => (r.ok ? (r.json() as Promise<RawDict>) : Promise.reject(new Error(String(r.status)))))
    .then((raw) => new BaribaLexicon(raw))
    .catch(() => {
      lexiconPromise = null;
      return null;
    });
  return lexiconPromise;
}

const WORD_RE = /[\p{L}\p{M}'’]+/gu;

export function tokenize(text: string): { word: string; index: number }[] {
  const out: { word: string; index: number }[] = [];
  for (const m of text.matchAll(WORD_RE)) out.push({ word: m[0], index: m.index ?? 0 });
  return out;
}

/** Mots inconnus du dictionnaire (hors nombres), regroupés avec leurs suggestions. */
export function findMisspelled(text: string, lex: BaribaLexicon): { word: string; count: number; suggestions: string[] }[] {
  const counts = new Map<string, number>();
  for (const { word } of tokenize(text)) {
    if (word.length < 3 || /\d/.test(word)) continue;
    const w = word.normalize('NFC');
    if (lex.isKnown(w)) continue;
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([word, count]) => ({ word, count, suggestions: lex.suggest(word) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 60);
}

/**
 * Correction post-OCR : un mot inconnu dont la forme repliée correspond à un mot connu
 * (« nee » lu pour « nɛɛ ») est rétabli avec ses tons et caractères spéciaux.
 */
export function correctWithLexicon(text: string, lex: BaribaLexicon): { text: string; corrections: number } {
  let corrections = 0;
  const fixed = text.replace(WORD_RE, (w) => {
    const n = w.normalize('NFC');
    if (n.length < 3 || lex.isKnown(n)) return w;
    const [best] = lex.suggest(n, 1);
    if (best && foldText(best) === foldText(n)) {
      corrections++;
      const upper = n[0] !== n[0].toLowerCase();
      return upper ? best.charAt(0).toUpperCase() + best.slice(1) : best;
    }
    return w;
  });
  return { text: fixed, corrections };
}

/** Clé de recherche : « Bàátɔ̀nú » et « baatonu » donnent la même clé. */
export function searchKey(q: string): string {
  return foldText(q).replace(/\s+/g, ' ').trim();
}
