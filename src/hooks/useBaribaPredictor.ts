import { useEffect, useMemo, useRef, useCallback } from 'react';
import { FONCIER_CORPUS } from '@/data/foncierBaribaCorpus';
import { PHRASES_RAPIDES } from '@/data/baribaPhrasesRapides';
import { COMBINING_GRAVE, COMBINING_ACUTE, COMBINING_TILDE, nfc } from '@/data/baribaAlphabet';
import { supabase } from '@/integrations/supabase/client';

export interface Prediction {
  word: string;
  score: number;
  type: 'word' | 'phrase' | 'tone';
  translation?: string;
}

const LS_KEY = 'bariba_learned_words';
const SYNC_DEBOUNCE_MS = 5000;
const MAX_LOCAL = 500;

interface LearnedMap { [word: string]: { count: number; lastUsed: number } }

// ─── Index global construit une seule fois ────────────────────────────
let WORD_FREQ: Map<string, number> | null = null;
let BIGRAMS: Map<string, Map<string, number>> | null = null;
let TRANSLATIONS: Map<string, string> | null = null;

function tokenize(text: string): string[] {
  return nfc(text)
    .toLowerCase()
    .replace(/[^a-zãĩũõẽɔɛŋàáèéìíòóùúǹñ\u0300\u0301\u0303\s']/giu, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2 && w.length <= 25);
}

function buildIndex() {
  if (WORD_FREQ) return;
  WORD_FREQ = new Map();
  BIGRAMS = new Map();
  TRANSLATIONS = new Map();

  const ingest = (ba: string, fr?: string) => {
    const tokens = tokenize(ba);
    for (let i = 0; i < tokens.length; i++) {
      const w = tokens[i];
      WORD_FREQ!.set(w, (WORD_FREQ!.get(w) || 0) + 1);
      if (i > 0) {
        const prev = tokens[i - 1];
        if (!BIGRAMS!.has(prev)) BIGRAMS!.set(prev, new Map());
        const m = BIGRAMS!.get(prev)!;
        m.set(w, (m.get(w) || 0) + 1);
      }
    }
    if (fr && tokens.length === 1 && !TRANSLATIONS!.has(tokens[0])) {
      TRANSLATIONS!.set(tokens[0], fr);
    }
  };

  // Corpus foncier (~207 articles, riche en bariba)
  for (const a of FONCIER_CORPUS) ingest(a.content);
  // Phrases rapides (mappent bariba → français)
  for (const p of PHRASES_RAPIDES) ingest(p.ba, p.fr);
}

function loadLearned(): LearnedMap {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') as LearnedMap; }
  catch { return {}; }
}
function saveLearned(m: LearnedMap) {
  // garde seulement les MAX_LOCAL plus utilisés
  const entries = Object.entries(m).sort((a, b) => b[1].count - a[1].count).slice(0, MAX_LOCAL);
  localStorage.setItem(LS_KEY, JSON.stringify(Object.fromEntries(entries)));
}

const TONE_VARIANTS: Record<string, string[]> = {
  a: ['à', 'á', 'ã'], e: ['è', 'é', 'ẽ', 'ɛ', 'ɛ̀', 'ɛ́', 'ɛ̃'],
  i: ['ì', 'í', 'ĩ'], o: ['ò', 'ó', 'õ', 'ɔ', 'ɔ̀', 'ɔ́', 'ɔ̃'],
  u: ['ù', 'ú', 'ũ'], n: ['ŋ', 'ǹ', 'ñ'],
  ɔ: ['ɔ̀', 'ɔ́', 'ɔ̃'], ɛ: ['ɛ̀', 'ɛ́', 'ɛ̃'],
};

export function useBaribaPredictor() {
  useEffect(() => { buildIndex(); }, []);
  const learnedRef = useRef<LearnedMap>(loadLearned());
  const dirtyRef = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushSync = useCallback(async () => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const entries = Object.entries(learnedRef.current).slice(0, 100);
      if (entries.length === 0) return;
      const rows = entries.map(([word, v]) => ({
        user_id: user.id,
        word,
        count: v.count,
        last_used: new Date(v.lastUsed).toISOString(),
      }));
      await supabase.from('keyboard_learned_words').upsert(rows, { onConflict: 'user_id,word' });
    } catch { /* silent — offline OK */ }
  }, []);

  const scheduleSync = useCallback(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => { flushSync(); }, SYNC_DEBOUNCE_MS);
  }, [flushSync]);

  const learnWord = useCallback((word: string) => {
    const w = nfc(word.trim().toLowerCase());
    if (!w || w.length < 2 || w.length > 30) return;
    const m = learnedRef.current;
    const cur = m[w] || { count: 0, lastUsed: 0 };
    m[w] = { count: cur.count + 1, lastUsed: Date.now() };
    saveLearned(m);
    dirtyRef.current = true;
    scheduleSync();
  }, [scheduleSync]);

  const getPredictions = useCallback((partial: string, context: string): Prediction[] => {
    buildIndex();
    const out: Prediction[] = [];
    const seen = new Set<string>();
    const p = nfc(partial.trim().toLowerCase());
    const ctxTokens = tokenize(context);
    const lastCtx = ctxTokens.length > 0 ? ctxTokens[ctxTokens.length - 1] : '';

    const push = (pred: Prediction) => {
      if (seen.has(pred.word)) return;
      seen.add(pred.word);
      out.push(pred);
    };

    // 1) Variantes tonales si partial est une voyelle simple
    if (p.length === 1 && TONE_VARIANTS[p]) {
      for (const v of TONE_VARIANTS[p].slice(0, 3)) {
        push({ word: v, score: 1, type: 'tone' });
      }
    }

    // 2) Historique personnel (le plus prioritaire)
    if (p) {
      const learned = Object.entries(learnedRef.current)
        .filter(([w]) => w.startsWith(p) && w !== p)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 3);
      for (const [w] of learned) push({ word: w, score: 0.95, type: 'word' });
    }

    // 3) Bigramme si pas de partial
    if (!p && lastCtx && BIGRAMS!.has(lastCtx)) {
      const next = Array.from(BIGRAMS!.get(lastCtx)!.entries())
        .sort((a, b) => b[1] - a[1]).slice(0, 3);
      for (const [w, c] of next) push({ word: w, score: 0.7 + Math.min(c / 100, 0.2), type: 'word' });
    }

    // 4) Corpus par fréquence
    if (p && WORD_FREQ) {
      const matches: Array<[string, number]> = [];
      for (const [w, c] of WORD_FREQ) {
        if (w.startsWith(p) && w !== p) matches.push([w, c]);
        if (matches.length > 50) break;
      }
      matches.sort((a, b) => b[1] - a[1]);
      for (const [w, c] of matches.slice(0, 5)) {
        push({ word: w, score: 0.5 + Math.min(c / 200, 0.3), type: 'word', translation: TRANSLATIONS!.get(w) });
      }
    }

    // 5) Phrases rapides au démarrage (vide)
    if (!p && !lastCtx && out.length < 3) {
      for (const ph of PHRASES_RAPIDES.slice(0, 3)) {
        push({ word: ph.ba, score: 0.6, type: 'phrase', translation: ph.fr });
      }
    }

    return out.slice(0, 6);
  }, []);

  const getFrequentPhrases = useCallback((): string[] =>
    PHRASES_RAPIDES.slice(0, 20).map(p => p.ba), []);

  // Flush sur unmount
  useEffect(() => () => { flushSync(); }, [flushSync]);

  return useMemo(() => ({ getPredictions, learnWord, getFrequentPhrases, flushSync }),
    [getPredictions, learnWord, getFrequentPhrases, flushSync]);
}