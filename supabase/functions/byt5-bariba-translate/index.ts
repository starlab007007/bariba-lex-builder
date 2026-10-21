import {
  baSurfaceLexicon,
  ensureMemory,
  estimateConfidence,
  foldBa,
  foldFr,
  lexiconLookup,
  memoryLookup,
  splitSentences,
} from "../_shared/translation-verifier.ts";
import { refineDeterministic, type RefineLexicon } from "../_shared/deterministic-refine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TranslationRequest {
  text?: string;
  sourceLang?: "french" | "bariba";
  targetLang?: "french" | "bariba";
  mode?: "quality" | "fast";
  advanced?: boolean;
  healthCheck?: boolean;
  exploreApi?: boolean;
  /** Accepted for compatibility: refinement is now always deterministic (rules), never a language model. */
  skipRefine?: boolean;
  /** Reply sentences written by DUNYA's own brain (never user text): their model output may be cached. */
  cache?: boolean;
}

const SPACE_URL = (
  Deno.env.get("BYT5_SPACE_URL") ||
  "https://zimesongbian-modele-byt5-bariba-expert-api-v03-improve.hf.space"
).replace(/\/$/, "");
const GLOBAL_TIMEOUT_MS = 55_000;

const INVALID_UI_PATTERNS = [
  "Share via Link",
  "share via",
  "Partager",
  "Loading",
  "Submit",
  "Clear",
  "Button",
  "Click",
  "Select",
  "Choose",
  "Error",
  "undefined",
];

function normalizeText(input: string): string {
  return (input || "")
    .normalize("NFC")
    // The model sometimes emits IPA look-alikes (ɑ U+0251, ɡ U+0261) that are not Baatɔnum spelling.
    .replace(/\u0251/g, "a").replace(/\u0261/g, "g")
    .replace(/\s+/g, " ")
    .trim();
}


// ---- Deterministic refinement (rules, no language model): applied to EVERY model output. -----
let refineLexiconCache: RefineLexicon | null = null;
function refineLexicon(): RefineLexicon {
  if (!refineLexiconCache || refineLexiconCache.surface.size === 0) refineLexiconCache = { surface: baSurfaceLexicon(), fold: foldBa };
  return refineLexiconCache;
}
function rulesRefine(source: string, translation: string, direction: "fr-ba" | "ba-fr") {
  return refineDeterministic(source, translation, direction === "fr-ba", direction === "fr-ba" ? refineLexicon() : undefined);
}

// ---- Cache of model outputs for DUNYA's own reply sentences (service-role callers only). ------
// Stores the RAW model output (never user text); rules are re-applied on every read.
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
function cacheAllowed(req: Request, wanted: boolean | undefined): boolean {
  return wanted === true && !!SERVICE_KEY && req.headers.get("Authorization") === `Bearer ${SERVICE_KEY}`;
}
async function cacheKey(direction: string, text: string): Promise<string> {
  const folded = direction === "fr-ba" ? foldFr(text) : foldBa(text);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${direction}|${folded}`));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function cacheGet(key: string): Promise<string | null> {
  const base = Deno.env.get("SUPABASE_URL");
  if (!base || !SERVICE_KEY) return null;
  try {
    const r = await fetch(`${base}/rest/v1/translation_cache?key=eq.${key}&select=translation&limit=1`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      signal: AbortSignal.timeout(1500),
    });
    if (!r.ok) return null;
    const rows = await r.json();
    return Array.isArray(rows) && typeof rows[0]?.translation === "string" ? rows[0].translation : null;
  } catch {
    return null;
  }
}
function cachePut(key: string, direction: string, source: string, translation: string): void {
  const base = Deno.env.get("SUPABASE_URL");
  if (!base || !SERVICE_KEY || /(\b\S+(?:\s+\S+){0,2})(?:\s+\1){2,}/u.test(translation)) return;
  const task = fetch(`${base}/rest/v1/translation_cache`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({ key, direction, source: source.slice(0, 400), translation: translation.slice(0, 800) }),
    signal: AbortSignal.timeout(3000),
  }).catch(() => undefined);
  const rt = globalThis as typeof globalThis & { EdgeRuntime?: { waitUntil: (t: Promise<unknown>) => void } };
  rt.EdgeRuntime?.waitUntil(task);
}

function isValidTranslation(result: unknown): result is string {
  if (typeof result !== "string") return false;
  const cleaned = normalizeText(result);
  if (!cleaned || cleaned.length === 0) return false;
  return !INVALID_UI_PATTERNS.some((p) =>
    cleaned.toLowerCase().includes(p.toLowerCase())
  );
}

async function corpusFallback(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<{ translation: string; method: string; confidence: number; [k: string]: unknown } | null> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) return null;
  try {
    const resp = await fetch(`${url}/rest/v1/rpc/fitila_corpus_translate`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_text: text, p_source: sourceLang, p_target: targetLang }),
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) {
      console.warn(`corpus fallback HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
      return null;
    }
    const data = await resp.json();
    if (data && typeof data.translation === "string" && data.translation.trim()) return data;
    return null;
  } catch (e) {
    console.warn(`corpus fallback error: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

function fallbackResponse(
  fb: NonNullable<Awaited<ReturnType<typeof corpusFallback>>>,
  reason: string,
  duration: number,
): Response {
  return new Response(
    JSON.stringify({
      ...fb,
      translation: fb.translation,
      confidence: fb.confidence,
      method: `fitila-corpus:${fb.method}`,
      fallback: true,
      engineError: reason,
      notice: "Moteur IA indisponible : traduction issue du corpus et du dictionnaire FITILA.",
      duration,
      modelInfo: { name: "FITILA Corpus", version: "fitila_corpus_translate", mode: "fallback" },
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

function unavailableResponse(reason: string, duration: number): Response {
  return new Response(
    JSON.stringify({
      error: "Traduction indisponible",
      details:
        "Le moteur de traduction IA est momentanément indisponible et aucune correspondance fiable n'a été trouvée dans le corpus FITILA.",
      engineError: reason,
      duration,
    }),
    { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

function safeJsonParse<T = unknown>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function buildDirection(
  sourceLang: "french" | "bariba",
  targetLang: "french" | "bariba",
): "fr-ba" | "ba-fr" {
  if (sourceLang === "french" && targetLang === "bariba") return "fr-ba";
  if (sourceLang === "bariba" && targetLang === "french") return "ba-fr";
  return sourceLang === "french" ? "fr-ba" : "ba-fr";
}

function buildGradioMode(mode: "quality" | "fast"): "Rapide" | "Qualite maximale" {
  return mode === "fast" ? "Rapide" : "Qualite maximale";
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function pollGradioQueue(
  pollUrl: string,
  hfToken: string,
  abortSignal?: AbortSignal,
): Promise<{ success: boolean; data?: any; error?: string }> {
  for (let attempt = 0; attempt < 40; attempt++) {
    if (abortSignal?.aborted) {
      return { success: false, error: "Request timeout" };
    }
    try {
      const pollResponse = await fetch(pollUrl, {
        headers: {
          Authorization: `Bearer ${hfToken}`,
          Accept: "text/event-stream",
        },
        signal: abortSignal,
      });
      if (!pollResponse.ok) {
        await sleep(500);
        continue;
      }
      const responseText = await pollResponse.text();
      const lines = responseText.split("\n");
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.substring(6).trim();
        const parsed = safeJsonParse<any>(payload);
        if (!parsed) continue;
        if (parsed.msg === "process_completed") {
          if (parsed.success === false) {
            return {
              success: false,
              error: parsed.output?.error || "Translation failed",
            };
          }
          const resultData = parsed.output?.data || parsed.data;
          if (Array.isArray(resultData)) {
            const translation = resultData[0];
            if (isValidTranslation(translation)) {
              return { success: true, data: { data: resultData } };
            }
          }
        }
        if (Array.isArray(parsed.data)) {
          const translation = parsed.data[0];
          if (isValidTranslation(translation)) {
            return { success: true, data: parsed };
          }
        }
      }
      await sleep(500);
    } catch (e) {
      if (abortSignal?.aborted) {
        return { success: false, error: "Request timeout" };
      }
    }
  }
  return {
    success: false,
    error: "Translation failed - no valid response from HuggingFace Space",
  };
}

async function callGradioTranslate(
  spaceUrl: string,
  apiPrefix: string,
  text: string,
  direction: "fr-ba" | "ba-fr",
  mode: "Rapide" | "Qualite maximale",
  advanced: boolean,
  hfToken: string,
  abortSignal?: AbortSignal,
  autocorrect: boolean = true,
): Promise<{ success: boolean; data?: any; error?: string; fatal?: boolean }> {
  const normalizedText = normalizeText(text);
  const data = [normalizedText, direction, mode, advanced, autocorrect];
  const sessionHash = Math.random().toString(36).slice(2);
  try {
    const joinResponse = await fetch(`${spaceUrl}${apiPrefix}/queue/join`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data,
        fn_index: 2,
        api_name: "/translate_pipeline",
        session_hash: sessionHash,
      }),
      signal: abortSignal,
    });
    if (!joinResponse.ok) {
      const errorText = await joinResponse.text().catch(() => "");
      console.log(`   Join error: ${errorText.substring(0, 300)}`);
      const fatal = [401, 403, 404].includes(joinResponse.status);
      return { success: false, error: `Queue join failed (HTTP ${joinResponse.status})`, fatal };
    }
    await joinResponse.text().catch(() => "");
    const pollUrl = `${spaceUrl}${apiPrefix}/queue/data?session_hash=${sessionHash}`;
    return await pollGradioQueue(pollUrl, hfToken, abortSignal);
  } catch (e: unknown) {
    if (abortSignal?.aborted) return { success: false, error: "Request timeout" };
    console.log(`   Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    return { success: false, error: "Translation request failed" };
  }
}

function json(body: unknown, status = 200): Response {
  const payload = body && typeof body === "object" ? { ...body, confidenceIsProbability: false, linguisticQualityCertified: false } : body;
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

export async function handleByT5(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const startTime = Date.now();
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, GLOBAL_TIMEOUT_MS);

  try {
    const {
      healthCheck = false,
      exploreApi = false,
      text,
      sourceLang,
      targetLang,
      mode = "quality",
      advanced = true,
      cache: cacheWanted = false,
    }: TranslationRequest = await req.json();
    const useCache = cacheAllowed(req, cacheWanted);

    await ensureMemory();
    const HF_TOKEN = Deno.env.get("HUGGING_FACE_API_TOKEN");

    if (exploreApi) {
      clearTimeout(timeoutId);
      if (!HF_TOKEN) return json({ error: "HuggingFace token not configured" }, 500);
      const exploration: any = { spaceUrl: SPACE_URL, weightsRevision: null, weightsRevisionVerified: false, endpoints: [] };
      for (const url of [`${SPACE_URL}/gradio_api/config`, `${SPACE_URL}/config`, `${SPACE_URL}/gradio_api/info`, `${SPACE_URL}/info`]) {
        try {
          const resp = await fetch(url, { headers: { Authorization: `Bearer ${HF_TOKEN}` } });
          if (!resp.ok) continue;
          const data = await resp.json();
          exploration[url.split("/").pop() || "config"] = data;
          if (Array.isArray(data.dependencies)) {
            exploration.endpoints = data.dependencies.map((d: any, i: number) => ({
              fn_index: i,
              api_name: d.api_name,
              inputs: d.inputs?.length || 0,
              outputs: d.outputs?.length || 0,
            }));
          }
        } catch {
          // continue
        }
      }
      return json(exploration);
    }

    if (healthCheck) {
      clearTimeout(timeoutId);
      if (!HF_TOKEN) return json({ healthy: true, byt5: false, fallback: "fitila-corpus", spaceUrl: SPACE_URL, weightsRevision: null, weightsRevisionVerified: false });
      const hcStart = Date.now();
      const hcController = new AbortController();
      const hcTimeoutId = setTimeout(() => hcController.abort(), 4000);
      try {
        let healthy = false;
        for (const configPath of ["/gradio_api/config", "/config"]) {
          try {
            const configResponse = await fetch(`${SPACE_URL}${configPath}`, {
              headers: { Authorization: `Bearer ${HF_TOKEN}` },
              signal: hcController.signal,
            });
            if (configResponse.ok) {
              healthy = true;
              break;
            }
          } catch {
            // continue
          }
        }
        return json({ healthy: true, byt5: healthy, fallback: healthy ? undefined : "fitila-corpus", duration: Date.now() - hcStart, spaceUrl: SPACE_URL, weightsRevision: null, weightsRevisionVerified: false });
      } catch (e: unknown) {
        return json({ healthy: false, error: "ByT5 health check failed", details: e instanceof Error ? e.message : "Unknown error", duration: Date.now() - hcStart, spaceUrl: SPACE_URL, weightsRevision: null, weightsRevisionVerified: false }, 503);
      } finally {
        clearTimeout(hcTimeoutId);
      }
    }

    if (!text || !sourceLang || !targetLang) {
      clearTimeout(timeoutId);
      return json({ error: "Missing required fields: text, sourceLang, targetLang" }, 400);
    }

    const normalizedInput = normalizeText(text);
    const direction = buildDirection(sourceLang, targetLang);
    const gradioMode = buildGradioMode(mode);
    const apiPrefix = "/gradio_api";

    // 1) Attested sentences (dictionary, Apprendre, scenes) never need the model.
    const attested = memoryLookup(normalizedInput, direction);
    if (attested) {
      clearTimeout(timeoutId);
      return json({
        translation: attested.translation,
        suggestions: null,
        confidence: attested.grade === "A" ? 100 : 95,
        confidenceKind: "attested-memory",
        duration: Date.now() - startTime,
        method: "translation-memory",
        refinement: { applied: false },
        modelInfo: { name: "FITILA translation memory", version: "memory-v1", grade: attested.grade },
        provenance: { dataset: "fitila-translation-memory", origin: "generated-bundle", source_id: null, reviewer_id: null, reviewed_at: null, validation_evidence: "not-exported", memory_pack_manifest: "/functions/v1/fitila-memory-pack/manifest" },
      });
    }

    // 1b) One isolated word: the attested dictionary beats the model, which is
    //     unreliable on single words ("merci" came back as the verb "siara").
    const lexicon = lexiconLookup(normalizedInput, direction);
    if (lexicon) {
      clearTimeout(timeoutId);
      return json({
        translation: lexicon.translation,
        suggestions: null,
        confidence: 90,
        confidenceKind: "attested-lexicon",
        duration: Date.now() - startTime,
        method: "translation-lexicon",
        refinement: { applied: false },
        modelInfo: { name: "FITILA dictionary", version: "lexicon-v1", grade: "D" },
      });
    }

    // 2) Several sentences: attested ones come from the memory, the others are
    //    translated one by one (ByT5 is far more reliable on short sentences).
    const segments = splitSentences(normalizedInput);
    if (segments.length > 1) {
      const hits = segments.map((seg) => memoryLookup(seg, direction));
      const out: string[] = [];
      const confidences: number[] = [];
      let modelUsed = false;
      let failed = false;
      let cacheHits = 0;
      const ruleChanges: string[] = [];
      for (let i = 0; i < segments.length; i++) {
        const hit = hits[i];
        if (hit) {
          out.push(hit.translation);
          confidences.push(hit.grade === "A" ? 100 : 95);
          continue;
        }
        if (!HF_TOKEN || abortController.signal.aborted) {
          failed = true;
          break;
        }
        const key = useCache ? await cacheKey(direction, segments[i]) : "";
        const cached = useCache ? await cacheGet(key) : null;
        let t: string | null = cached;
        if (!t) {
          const r = await callGradioTranslate(SPACE_URL, apiPrefix, segments[i], direction, gradioMode, advanced, HF_TOKEN, abortController.signal, true);
          t = r.success ? (Array.isArray(r.data?.data) ? r.data.data[0] : Array.isArray(r.data) ? r.data[0] : null) : null;
          if (isValidTranslation(t) && useCache) cachePut(key, direction, segments[i], normalizeText(t));
        } else cacheHits++;
        if (!isValidTranslation(t)) {
          failed = true;
          break;
        }
        modelUsed = true;
        const polished = rulesRefine(segments[i], normalizeText(t), direction);
        if (polished.changes.length) ruleChanges.push(...polished.changes.map((c) => `${c.rule}: ${c.from} → ${c.to}`));
        const clean = polished.text;
        out.push(clean);
        confidences.push(estimateConfidence(clean, direction === "fr-ba" ? "ba" : "fr", polished.changes.length > 0).confidence);
      }
      if (!failed) {
        clearTimeout(timeoutId);
        const attestedCount = hits.filter(Boolean).length;
        return json({
          translation: out.join(" "),
          suggestions: null,
          confidence: Math.min(...confidences),
          confidenceKind: modelUsed ? "per-sentence" : "attested-memory",
          duration: Date.now() - startTime,
          method: modelUsed ? (attestedCount ? "translation-memory+byt5" : "byt5-per-sentence") : "translation-memory",
          segments: segments.length,
          attestedSegments: attestedCount,
          cacheHits,
          refinement: modelUsed ? { applied: ruleChanges.length > 0, status: ruleChanges.length ? "applied" : "unchanged", stage: "rules", changes: ruleChanges } : { applied: false },
          modelInfo: {
            name: modelUsed ? "ByT5 Expert (Improved)" : "FITILA translation memory",
            version: modelUsed ? "zimesongbian/modele_byt5_bariba_expert_api_v03_improve" : "memory-v1",
          },
        });
      }
    }

    if (!HF_TOKEN) {
      clearTimeout(timeoutId);
      const fb = await corpusFallback(normalizedInput, sourceLang, targetLang);
      const reason = "HuggingFace token not configured";
      return fb ? fallbackResponse(fb, reason, Date.now() - startTime) : unavailableResponse(reason, Date.now() - startTime);
    }

    const RETRY_DELAYS = [0, 3000, 8000];
    let result: { success: boolean; data?: any; error?: string; fatal?: boolean } = { success: false, error: "No attempt made" };
    const singleKey = useCache ? await cacheKey(direction, normalizedInput) : "";
    const singleCached = useCache ? await cacheGet(singleKey) : null;
    if (singleCached) result = { success: true, data: { data: [singleCached, null] } };
    else for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
      if (attempt > 0) await sleep(RETRY_DELAYS[attempt]);
      result = await callGradioTranslate(SPACE_URL, apiPrefix, normalizedInput, direction, gradioMode, advanced, HF_TOKEN, abortController.signal, true);
      if (result.success) break;
      console.warn(`ByT5 attempt ${attempt + 1} failed: ${result.error}`);
      if (result.fatal || abortController.signal.aborted) break;
    }

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    if (!result.success) {
      const reason = result.error || "HuggingFace Space API not responding";
      const fb = await corpusFallback(normalizedInput, sourceLang, targetLang);
      return fb ? fallbackResponse(fb, reason, Date.now() - startTime) : unavailableResponse(reason, Date.now() - startTime);
    }

    let translation: string | null = null;
    let suggestions: unknown = null;
    if (Array.isArray(result.data?.data)) {
      translation = result.data.data[0];
      suggestions = result.data.data[1] ?? null;
    } else if (Array.isArray(result.data)) {
      translation = result.data[0];
      suggestions = result.data[1] ?? null;
    }

    if (!isValidTranslation(translation)) {
      const reason = "ByT5 returned invalid response";
      const fb = await corpusFallback(normalizedInput, sourceLang, targetLang);
      return fb ? fallbackResponse(fb, reason, Date.now() - startTime) : unavailableResponse(reason, Date.now() - startTime);
    }

    if (useCache && !singleCached) cachePut(singleKey, direction, normalizedInput, normalizeText(translation));
    const rawModel = normalizeText(translation);
    const rules = rulesRefine(normalizedInput, rawModel, direction);
    let finalTranslation = rules.text;
    let refineMeta: { applied: boolean; status: string; stage?: string; confidence?: number; changes?: string[]; error?: string; reason?: string } = { applied: rules.changes.length > 0, status: rules.changes.length ? "applied" : "unchanged", stage: "rules", changes: rules.changes.map((c) => `${c.rule}: ${c.from} → ${c.to}`) };

    const { confidence, kind: confidenceKind } = estimateConfidence(finalTranslation, direction === "fr-ba" ? "ba" : "fr", refineMeta.applied);

    return json({
      translation: finalTranslation,
      suggestions,
      confidence,
      confidenceKind,
      duration,
      method: "byt5-expert",
      refinement: refineMeta,
      modelInfo: {
        name: "ByT5 Expert (Improved)",
        weightsRevision: null,
        weightsRevisionVerified: false,
        spaceUrl: SPACE_URL,
        version: "zimesongbian/modele_byt5_bariba_expert_api_v03_improve",
        mode: gradioMode,
        advanced,
        postRefine: "rules",
        cached: !!singleCached,
      },
    });
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    console.error(`Fatal error after ${duration}ms:`, error);
    return json({ error: error instanceof Error ? error.message : "Translation failed", duration }, 500);
  }
}

if (Deno.env.get("FITILA_AI_TEST") !== "1") Deno.serve(handleByT5);
