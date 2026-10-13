// Verified-translation helpers shared by the edge functions.
//
// 1. Exact translation memory: attested sentences bypass the model (100 % correct).
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
type MemoryShape = { pairs: Array<[string, string, string]>; lexBa: string; lexFr: string };
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
    const modulePath = "./translation-memory.ts";
    const m = await import(modulePath);
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
    return { pairs: data.pairs, lexBa: [...ba].join(" "), lexFr: [...fr].join(" ") };
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
      loaded = (await fromBundle()) ?? (await fromSite());
    })().finally(() => {
      loadingPromise = null;
    });
  }
  return loadingPromise;
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
  const base = targetLang === "ba" ? 35 + 55 * coverage : 50 + 35 * coverage;
  const value = Math.round(Math.max(5, Math.min(targetLang === "ba" ? 80 : 85, base - (looping ? 40 : 0) + (refined ? 2 : 0))));
  return { confidence: value, kind: "lexical-coverage" };
}
