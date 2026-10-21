// Deterministic, offline-capable refinement of a machine translation (no language model).
//
// The same rules are implemented in Dart (fitila_flutter/lib/dunya/voice/dunya_refine.dart) and are
// checked against the shared vectors in refine-vectors.json, so the server, the phone and the app
// give the same result. It only fixes surface errors (spelling noise, spacing, loops, terminal
// punctuation); it never changes the meaning and never touches attested translations.

export type RefineChange = { rule: string; from: string; to: string };
export type RefineResult = { text: string; changes: RefineChange[] };
export type RefineLexicon = {
  /** folded attested word -> surface form (with tones) */
  surface: Map<string, string>;
  fold: (word: string) => string;
};

const LETTER = /[\p{L}\p{M}']/u;
const TERMINAL = /[.?!…]$/u;

function editDistanceAtMost1(a: string, b: string): boolean {
  if (a === b) return false;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (la === lb) { i++; j++; } else if (la > lb) i++; else j++;
  }
  return edits + (la - i) + (lb - j) <= 1;
}

function matchCase(original: string, replacement: string): string {
  const first = Array.from(original)[0];
  if (first && first !== first.toLowerCase() && first === first.toUpperCase()) {
    const chars = Array.from(replacement);
    return (chars[0] ?? '').toUpperCase() + chars.slice(1).join('');
  }
  return replacement;
}

export function refineDeterministic(
  source: string,
  candidate: string,
  toBariba: boolean,
  lexicon?: RefineLexicon,
): RefineResult {
  const changes: RefineChange[] = [];
  const note = (rule: string, from: string, to: string) => { if (from !== to) changes.push({ rule, from, to }); };
  const src = (source ?? '').normalize('NFC').trim();
  let text = (candidate ?? '').normalize('NFC');

  // 1. Characters: Greek epsilon / typographic apostrophes / zero-width marks.
  let next = text.replace(/ε/g, 'ɛ').replace(/[’‘]/g, "'").replace(/[​-‍﻿]/g, '');
  note('chars', text, next); text = next;

  // 2. Spacing around punctuation.
  next = text.replace(/\s+/g, ' ').replace(/\s+([,.;:!?…])/g, '$1').replace(/([,;:!?])(?=\p{L})/gu, '$1 ').trim();
  note('spacing', text, next); text = next;

  // 3. Machine loops: an n-gram (1..3 words) repeated three times or more in a row is kept once.
  let words = text.split(' ').filter(Boolean);
  const key = (w: string) => w.toLowerCase().replace(/[.,;:!?…]+$/u, '');
  for (let n = 1; n <= 3; n++) {
    let i = 0;
    while (i + 3 * n <= words.length) {
      const a = words.slice(i, i + n).map(key).join(' ');
      let reps = 1;
      while (i + (reps + 1) * n <= words.length && words.slice(i + reps * n, i + (reps + 1) * n).map(key).join(' ') === a) reps++;
      if (reps >= 3) words.splice(i + n, (reps - 1) * n); else i++;
    }
  }
  next = words.join(' ');
  note('loop', text, next); text = next;

  // 4. Spelling repair against the attested lexicon (Baatɔnum output only).
  if (toBariba && lexicon) {
    const sourceWords = new Set(src.split(/\s+/).map((w) => lexicon.fold(w)).filter(Boolean));
    const byLength = new Map<string, string[]>();
    for (const folded of lexicon.surface.keys()) {
      const k = `${folded[0]}|${folded.length}`;
      (byLength.get(k) ?? byLength.set(k, []).get(k)!).push(folded);
    }
    words = text.split(' ');
    words = words.map((token, index) => {
      const m = /^([^\p{L}\p{M}']*)([\p{L}\p{M}'][\p{L}\p{M}']*)([^\p{L}\p{M}']*)$/u.exec(token);
      if (!m) return token;
      const core = m[2];
      const folded = lexicon.fold(core);
      if (folded.length < 4 || lexicon.surface.has(folded) || sourceWords.has(folded)) return token;
      const startsUpper = core !== core.toLowerCase();
      if (startsUpper && index > 0) return token; // probable proper name
      const found = new Set<string>();
      for (const len of [folded.length - 1, folded.length, folded.length + 1]) {
        for (const c of byLength.get(`${folded[0]}|${len}`) ?? []) if (c.length >= 4 && editDistanceAtMost1(folded, c)) found.add(c);
      }
      if (found.size !== 1) return token;
      const replacement = matchCase(core, lexicon.surface.get([...found][0])!);
      note('lexicon', core, replacement);
      return m[1] + replacement + m[3];
    });
    text = words.join(' ');
  }

  // 5. Capital letter and final punctuation follow the source.
  const sourceFirst = Array.from(src)[0];
  const textChars = Array.from(text);
  if (sourceFirst && textChars[0] && sourceFirst !== sourceFirst.toLowerCase() && textChars[0] === textChars[0].toLowerCase() && LETTER.test(textChars[0])) {
    next = textChars[0].toUpperCase() + textChars.slice(1).join('');
    note('capital', text, next); text = next;
  }
  const sourceEnd = /[.?!…]$/u.exec(src)?.[0];
  if (sourceEnd && text) {
    if (!TERMINAL.test(text)) next = text + sourceEnd;
    else if ((sourceEnd === '?' || sourceEnd === '!') && text.endsWith('.')) next = text.slice(0, -1) + sourceEnd;
    else next = text;
    note('final-punctuation', text, next); text = next;
  }
  return { text, changes };
}
