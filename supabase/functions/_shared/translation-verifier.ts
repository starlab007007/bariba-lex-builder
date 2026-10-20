// Verified-translation helpers shared by the edge functions.
//
// 1. Exact translation memory: attested sentences bypass the model (reference matches, not a quality certificate).
// 2. Lexical coverage: share of output words known to the FITILA lexicon.
// 3. Bounded refinement: an LLM edit is accepted only if it stays close to the
//    model output and does not introduce unknown Baatɔnum words.
//
// Mirrors scripts/dunya_translate/dunya_text.py (fold_ba / fold_fr).

// The memory is loaded lazily by ensureMemory(): from ./translation-memory.ts when that
// generated file is bundled with the function, otherwise from the public site
// (MEMORY_URL, default https://fitila.bj/data/translation-memory.json) with a
// timeout. If neither works the helpers degrade gracefully (no memory hit,
// coverage 0) instead of breaking the translation.
type MemoryShape = {
  pairs: Array<[string, string, string]>;
  lexBa: string;
  lexFr: string;
  // Dictionary entries (single words); only available from the public site file.
  fr2ba?: Record<string, string>;
  ba2fr?: Record<string, string>;
};
let loaded: MemoryShape | null = null;
let loadingPromise: Promise<void> | null = null;
let lastAttempt = 0;
let indexed = false;

const TONE_MARKS = /[̀́̂̄̌]/g; // the nasal tilde U+0303 is kept
const EDGE = /^[\s.,;:!?()\[\]«»"“”‘’'…\-–—_/\\*]+|[\s.,;:!?()\[\]«»"“”‘’'…\-–—_/\\*]+$/g;

export function foldBa(text: string): string {
  return (text || "")
    .normalize("NFC")
    .replace(/ɑ/g, "a")
    .normalize("NFD")
    .replace(TONE_MARKS, "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/[^\p{L}\p{N}\u0303' ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function foldFr(text: string): string {
  return (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(text: string): string[] {
  return (text || "").split(/\s+/).map((w) => w.replace(EDGE, "")).filter(Boolean);
}

let frToBa: Map<string, [string, string]> | null = null;
let baToFr: Map<string, [string, string]> | null = null;
let lexBa: Set<string> | null = null;
let lexFr: Set<string> | null = null;

async function fromBundle(): Promise<MemoryShape | null> {
  try {
    // A literal import lets the Edge bundler include the reference data.
    const m = await import("./translation-memory.ts");
    return { pairs: m.TM_PAIRS, lexBa: m.LEXICON_BA, lexFr: m.LEXICON_FR };
  } catch {
    return null;
  }
}

async function fromSite(): Promise<MemoryShape | null> {
  const url = Deno.env.get("TRANSLATION_MEMORY_URL") || "https://fitila.bj/data/translation-memory.json";
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!Array.isArray(data?.pairs)) return null;
    const ba = new Set<string>();
    const fr = new Set<string>();
    for (const [f, b] of data.pairs as Array<[string, string]>) {
      for (const w of foldFr(f).split(" ")) if (w) fr.add(w);
      for (const w of foldBa(b).split(" ")) if (w) ba.add(w);
    }
    for (const k of Object.keys(data.fr2ba ?? {})) for (const w of foldFr(k).split(" ")) if (w) fr.add(w);
    for (const v of Object.values(data.fr2ba ?? {})) for (const w of foldBa(String(v)).split(" ")) if (w) ba.add(w);
    for (const k of Object.keys(data.ba2fr ?? {})) for (const w of foldBa(k).split(" ")) if (w) ba.add(w);
    for (const v of Object.values(data.ba2fr ?? {})) for (const w of foldFr(String(v)).split(" ")) if (w) fr.add(w);
    return {
      pairs: data.pairs,
      lexBa: [...ba].join(" "),
      lexFr: [...fr].join(" "),
      fr2ba: data.fr2ba && typeof data.fr2ba === "object" ? data.fr2ba : undefined,
      ba2fr: data.ba2fr && typeof data.ba2fr === "object" ? data.ba2fr : undefined,
    };
  } catch {
    return null;
  }
}

/** Call once per request before using the helpers. Never throws. */
export function ensureMemory(): Promise<void> {
  if (loaded) return Promise.resolve();
  if (!loadingPromise) {
    // after a failed attempt, retry at most once a minute
    if (Date.now() - lastAttempt < 60_000 && lastAttempt) return Promise.resolve();
    lastAttempt = Date.now();
    loadingPromise = (async () => {
      const bundled = await fromBundle();
      if (bundled) {
        // The generated bundle has sentences only: borrow the single-word
        // dictionaries from the site file when they are reachable.
        if (!bundled.fr2ba || !bundled.ba2fr) {
          const site = await fromSite();
          if (site) {
            bundled.fr2ba = site.fr2ba;
            bundled.ba2fr = site.ba2fr;
          }
        }
        loaded = bundled;
      } else {
        loaded = await fromSite();
      }
    })().finally(() => {
      loadingPromise = null;
    });
  }
  return loadingPromise;
}

/** Inject the single-word dictionaries (tests, or a host that already holds them) and rebuild the indexes. */
export function setDictionaries(fr2ba: Record<string, string>, ba2fr: Record<string, string>): void {
  if (!loaded) loaded = { pairs: [], lexBa: "", lexFr: "" };
  loaded.fr2ba = fr2ba;
  loaded.ba2fr = ba2fr;
  indexed = false;
}

function ensureIndexes(): void {
  if (indexed) return;
  const mem = loaded;
  frToBa = new Map();
  baToFr = new Map();
  lexBa = new Set();
  lexFr = new Set();
  if (!mem) return; // empty indexes; rebuilt once the memory has loaded
  indexed = true;
  for (const [fr, ba, grade] of mem.pairs) {
    const kf = foldFr(fr);
    const kb = foldBa(ba);
    if (!frToBa.has(kf)) frToBa.set(kf, [ba, grade]);
    if (!baToFr.has(kb)) baToFr.set(kb, [fr, grade]);
  }
  lexBa = new Set(mem.lexBa.split(" "));
  lexFr = new Set(mem.lexFr.split(" "));
  wordFrToBa = buildWordIndex(mem.fr2ba, foldFr);
  wordBaToFr = buildWordIndex(mem.ba2fr, foldBa);
}

let wordFrToBa: Map<string, string> | null = null;
let wordBaToFr: Map<string, string> | null = null;

/** First meaning of a dictionary gloss ("viande, chair" -> "viande"). */
function glossHead(value: string): string {
  return String(value ?? "").split(/[;,]/)[0].trim();
}

/**
 * Dictionary index of headwords (one to three words, e.g. "a kua"). Keys with
 * digits are ignored, and a key whose folded form maps to different meanings
 * is dropped as ambiguous: better to let the model answer than to pick a
 * meaning at random.
 */
const MAX_HEADWORD_WORDS = 3;
function buildWordIndex(dict: Record<string, string> | undefined, fold: (s: string) => string): Map<string, string> {
  const index = new Map<string, string>();
  const ambiguous = new Set<string>();
  for (const [key, raw] of Object.entries(dict ?? {})) {
    const k = fold(key);
    const value = glossHead(raw);
    if (!k || k.split(" ").length > MAX_HEADWORD_WORDS || /\d/.test(k) || !value) continue;
    const previous = index.get(k);
    if (previous !== undefined && previous.toLowerCase() !== value.toLowerCase()) ambiguous.add(k);
    else index.set(k, value);
  }
  for (const k of ambiguous) index.delete(k);
  return index;
}

/**
 * Dictionary translation of an isolated headword (the WHOLE input must be a
 * dictionary entry). That is exactly where the neural model is weakest
 * ("merci" -> "siara", a verb) and the attested dictionary is strongest.
 * Sentences are never handled here.
 */
export function lexiconLookup(
  text: string,
  direction: "fr-ba" | "ba-fr",
): { translation: string } | null {
  ensureIndexes();
  const index = direction === "fr-ba" ? wordFrToBa : wordBaToFr;
  const key = direction === "fr-ba" ? foldFr(text) : foldBa(text);
  if (!index || !key || key.split(" ").length > MAX_HEADWORD_WORDS) return null;
  const hit = index.get(key);
  return hit ? { translation: hit } : null;
}

export function memoryLookup(
  text: string,
  direction: "fr-ba" | "ba-fr",
): { translation: string; grade: string } | null {
  ensureIndexes();
  const hit = direction === "fr-ba" ? frToBa!.get(foldFr(text)) : baToFr!.get(foldBa(text));
  return hit ? { translation: hit[0], grade: hit[1] } : null;
}

/** Share of words (not numbers) found in the lexicon, 0..1. */
export function lexicalCoverage(text: string, lang: "ba" | "fr"): number {
  ensureIndexes();
  const lex = lang === "ba" ? lexBa! : lexFr!;
  const fold = lang === "ba" ? foldBa : foldFr;
  const ws = words(text).filter((w) => !/^\d+$/.test(w));
  if (ws.length === 0) return 0;
  return ws.filter((w) => lex.has(fold(w))).length / ws.length;
}

function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

/** Split a text into sentences, keeping their final punctuation. */
export function splitSentences(text: string): string[] {
  return (text || "")
    .split(/(?<=[.!?…])\s+/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function similarity(a: string, b: string): number {
  const x = a.normalize("NFC").toLowerCase();
  const y = b.normalize("NFC").toLowerCase();
  const longest = Math.max(x.length, y.length);
  return longest === 0 ? 1 : 1 - editDistance(x, y) / longest;
}

/**
 * Accept an LLM refinement only when it is a light edit of the model output and
 * does not add words unknown to the lexicon (a model that does not speak
 * Baatɔnum must not rewrite it).
 */
export function acceptRefinement(
  original: string,
  refined: string,
  targetLang: "ba" | "fr",
): { accepted: boolean; reason: string } {
  if (!refined.trim()) return { accepted: false, reason: "empty" };
  const sim = similarity(original, refined);
  if (sim < (targetLang === "ba" ? 0.6 : 0.5)) return { accepted: false, reason: `too different (${sim.toFixed(2)})` };
  if (targetLang === "ba") {
    const before = lexicalCoverage(original, "ba");
    const after = lexicalCoverage(refined, "ba");
    if (after < before - 0.05) return { accepted: false, reason: `unknown words (${before.toFixed(2)}→${after.toFixed(2)})` };
  }
  return { accepted: true, reason: "ok" };
}

/** Honest, reference-free confidence in percent (replaces the former fixed 85–97). */
export function estimateConfidence(
  translation: string,
  targetLang: "ba" | "fr",
  refined: boolean,
): { confidence: number; kind: string } {
  const coverage = lexicalCoverage(translation, targetLang);
  const looping = /(\b\S+(?:\s+\S+){0,2})(?:\s+\1){2,}/u.test(translation);
  const base = targetLang === "ba" ? 20 + 45 * coverage : 30 + 40 * coverage;
  // Measured in production (13/10/2026): on sentences outside the corpus, ByT5 v03 keeps
  // a high lexical coverage while often changing the meaning (chrF++ ~20). Known words do
  // not prove a correct sentence, so a model output is capped well below attested ones.
  const value = Math.round(Math.max(5, Math.min(targetLang === "ba" ? 60 : 65, base - (looping ? 40 : 0) + (refined ? 2 : 0))));
  return { confidence: value, kind: "model-unverified" };
}

