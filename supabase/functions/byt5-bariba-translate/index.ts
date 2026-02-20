import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  skipRefine?: boolean; // ✅ permet de désactiver le post-raffinage si besoin
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
    .replace(/\s+/g, " ")
    .trim();
}

function isValidTranslation(result: unknown): result is string {
  if (typeof result !== "string") return false;
  const cleaned = normalizeText(result);
  if (!cleaned || cleaned.length === 0) return false;
  return !INVALID_UI_PATTERNS.some((p) =>
    cleaned.toLowerCase().includes(p.toLowerCase())
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

  // fallback si front envoie des combinaisons incohérentes
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
  console.log(`📡 Polling queue: ${pollUrl}`);

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
      console.log(`   Poll ${attempt + 1}: ${responseText.substring(0, 400)}`);

      // SSE format: lines "data: {...}"
      const lines = responseText.split("\n");
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;

        const payload = line.substring(6).trim();
        const parsed = safeJsonParse<any>(payload);
        if (!parsed) continue;

        // Cas 1: process_completed
        if (parsed.msg === "process_completed") {
          if (parsed.success === false) {
            console.log(`   Process failed: ${JSON.stringify(parsed.output)}`);
            return {
              success: false,
              error: parsed.output?.error || "Translation failed",
            };
          }

          const resultData = parsed.output?.data || parsed.data;
          if (Array.isArray(resultData)) {
            const translation = resultData[0];
            if (isValidTranslation(translation)) {
              console.log(`✅ Valid translation (process_completed): "${translation}"`);
              return { success: true, data: { data: resultData } };
            }
          }
        }

        // Cas 2: data directe
        if (Array.isArray(parsed.data)) {
          const translation = parsed.data[0];
          if (isValidTranslation(translation)) {
            console.log(`✅ Valid translation (direct data): "${translation}"`);
            return { success: true, data: parsed };
          }
        }
      }

      await sleep(500);
    } catch (e) {
      if (abortSignal?.aborted) {
        return { success: false, error: "Request timeout" };
      }
      // continue polling (transient network issue)
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
): Promise<{ success: boolean; data?: any; error?: string }> {
  const normalizedText = normalizeText(text);

  const data = [normalizedText, direction, mode, advanced, autocorrect];
  console.log(`📤 Sending to Gradio fn_index=2: ${JSON.stringify(data)}`);

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

    console.log(`   Join status: ${joinResponse.status}`);

    if (!joinResponse.ok) {
      const errorText = await joinResponse.text().catch(() => "");
      console.log(`   Join error: ${errorText.substring(0, 300)}`);
      return { success: false, error: "Queue join failed" };
    }

    const joinText = await joinResponse.text().catch(() => "");
    console.log(`   Join response: ${joinText.substring(0, 300)}`);

    const pollUrl = `${spaceUrl}${apiPrefix}/queue/data?session_hash=${sessionHash}`;
    return await pollGradioQueue(pollUrl, hfToken, abortSignal);
  } catch (e: unknown) {
    if (abortSignal?.aborted) return { success: false, error: "Request timeout" };
    console.log(`   Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    return { success: false, error: "Translation request failed" };
  }
}

async function tryRefineTranslation(params: {
  req: Request;
  originalText: string;
  translation: string;
  direction: "fr-ba" | "ba-fr";
  timeoutMs?: number;
}): Promise<{ refined?: string; changes?: string[]; confidence?: number; error?: string }> {
  const { req, originalText, translation, direction, timeoutMs = 6000 } = params;

  // On appelle la fonction locale Supabase "refine-bariba" si disponible (même projet)
  // - fr-ba : type=translate (traduction Bariba)
  // - ba-fr : type=translation (raffinage d’un texte de traduction vers FR naturel)
  const supabaseUrl =
    Deno.env.get("SUPABASE_URL") ||
    req.headers.get("x-supabase-url") ||
    "";

  const supabaseAnon =
    Deno.env.get("SUPABASE_ANON_KEY") ||
    req.headers.get("apikey") ||
    "";

  if (!supabaseUrl || !supabaseAnon) {
    return { error: "Refine unavailable (missing Supabase URL/key)" };
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const refineUrl = `${supabaseUrl}/functions/v1/refine-bariba`;

    const payload = {
      text: translation,
      type: direction === "fr-ba" ? "translate" : "translation",
      direction,
      originalInput: originalText,
    };

    const resp = await fetch(refineUrl, {
      method: "POST",
      headers: {
        Authorization: req.headers.get("Authorization") || `Bearer ${supabaseAnon}`,
        apikey: req.headers.get("apikey") || supabaseAnon,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      return { error: `Refine HTTP ${resp.status}: ${body.substring(0, 120)}` };
    }

    const data = await resp.json();
    const refined = typeof data?.refined === "string" ? normalizeText(data.refined) : "";

    if (!refined) {
      return { error: "Refine returned empty text" };
    }

    return {
      refined,
      changes: Array.isArray(data?.changes) ? data.changes.map(String) : [],
      confidence: typeof data?.confidence === "number" ? data.confidence : undefined,
    };
  } catch (e: unknown) {
    return {
      error: e instanceof Error ? e.message : "Refine request failed",
    };
  } finally {
    clearTimeout(t);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const abortController = new AbortController();

  const timeoutId = setTimeout(() => {
    abortController.abort();
    console.log(`⏰ Global timeout reached (${GLOBAL_TIMEOUT_MS}ms)`);
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
      skipRefine = false,
    }: TranslationRequest = await req.json();

    const HF_TOKEN = Deno.env.get("HUGGING_FACE_API_TOKEN");

    // API exploration mode
    if (exploreApi) {
      clearTimeout(timeoutId);

      if (!HF_TOKEN) {
        return new Response(
          JSON.stringify({ error: "HuggingFace token not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const exploration: any = { spaceUrl: SPACE_URL, endpoints: [] };

      const configUrls = [
        `${SPACE_URL}/gradio_api/config`,
        `${SPACE_URL}/config`,
        `${SPACE_URL}/gradio_api/info`,
        `${SPACE_URL}/info`,
      ];

      for (const url of configUrls) {
        try {
          const resp = await fetch(url, {
            headers: { Authorization: `Bearer ${HF_TOKEN}` },
          });

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

      return new Response(JSON.stringify(exploration), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Health check
    if (healthCheck) {
      clearTimeout(timeoutId);

      if (!HF_TOKEN) {
        return new Response(
          JSON.stringify({ error: "HuggingFace token not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

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

        return new Response(
          JSON.stringify({
            healthy,
            duration: Date.now() - hcStart,
            spaceUrl: SPACE_URL,
          }),
          {
            status: healthy ? 200 : 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      } catch (e: unknown) {
        return new Response(
          JSON.stringify({
            healthy: false,
            error: "ByT5 health check failed",
            details: e instanceof Error ? e.message : "Unknown error",
            duration: Date.now() - hcStart,
            spaceUrl: SPACE_URL,
          }),
          {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      } finally {
        clearTimeout(hcTimeoutId);
      }
    }

    if (!text || !sourceLang || !targetLang) {
      clearTimeout(timeoutId);
      return new Response(
        JSON.stringify({ error: "Missing required fields: text, sourceLang, targetLang" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!HF_TOKEN) {
      clearTimeout(timeoutId);
      return new Response(
        JSON.stringify({ error: "HuggingFace token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const normalizedInput = normalizeText(text);
    const direction = buildDirection(sourceLang, targetLang);
    const gradioMode = buildGradioMode(mode);

    console.log(`🤖 ByT5 Expert: ${direction} - "${normalizedInput.substring(0, 100)}..."`);
    console.log(`📍 Space URL: ${SPACE_URL}`);
    console.log(`   Mode: ${gradioMode}, Advanced: ${advanced}, skipRefine: ${skipRefine}`);

    const apiPrefix = "/gradio_api";

    const result = await callGradioTranslate(
      SPACE_URL,
      apiPrefix,
      normalizedInput,
      direction,
      gradioMode,
      advanced,
      HF_TOKEN,
      abortController.signal,
      true,
    );

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    if (!result.success) {
      console.error(`❌ ByT5 failed after ${duration}ms: ${result.error}`);
      return new Response(
        JSON.stringify({
          error: "ByT5 translation service unavailable",
          details: result.error || "HuggingFace Space API not responding",
          duration,
          spaceUrl: SPACE_URL,
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Extract translation from Gradio result
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
      console.error(`❌ ByT5 invalid response after ${duration}ms: "${String(translation)}"`);
      return new Response(
        JSON.stringify({
          error: "ByT5 returned invalid response",
          details: `Received: "${String(translation || "").substring(0, 80)}"`,
          duration,
          spaceUrl: SPACE_URL,
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let finalTranslation = normalizeText(translation);
    let refineMeta: {
      applied: boolean;
      confidence?: number;
      changes?: string[];
      error?: string;
    } = { applied: false };

    // ✅ Post-raffinage (bénéficie des corrections linguistiques "wa/mɛɛri", salutations, etc.)
    if (!skipRefine) {
      const refine = await tryRefineTranslation({
        req,
        originalText: normalizedInput,
        translation: finalTranslation,
        direction,
        timeoutMs: 6000,
      });

      if (refine.refined && refine.refined.length > 0) {
        if (refine.refined !== finalTranslation) {
          console.log(`✨ refine-bariba adjusted output`);
        }
        finalTranslation = refine.refined;
        refineMeta = {
          applied: true,
          confidence: refine.confidence,
          changes: refine.changes || [],
        };
      } else if (refine.error) {
        refineMeta = { applied: false, error: refine.error };
      }
    }

    const hasSpecialChars = /[ɔɛɑɡãẽĩõũàèìòùâêîôûäëïöü]/u.test(finalTranslation);
    const hasValidLength = finalTranslation.length >= normalizedInput.length * 0.3;

    // Base confidence ByT5 + bonus diacritiques + bonus longueur + bonus refine
    const baseConfidence = 85;
    const confidence = Math.min(
      97,
      baseConfidence +
        (hasSpecialChars ? 4 : 0) +
        (hasValidLength ? 4 : 0) +
        (refineMeta.applied ? 3 : 0),
    );

    console.log(`✅ ByT5 Success in ${duration}ms: "${finalTranslation.substring(0, 150)}"`);
    if (suggestions) console.log(`   Suggestions: "${String(suggestions).substring(0, 100)}"`);

    return new Response(
      JSON.stringify({
        translation: finalTranslation,
        suggestions,
        confidence,
        duration,
        method: "byt5-expert",
        refinement: refineMeta,
        modelInfo: {
          name: "ByT5 Expert (Improved)",
          version: "zimesongbian/modele_byt5_bariba_expert_api_v03_improve",
          mode: gradioMode,
          advanced,
          postRefine: !skipRefine,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    console.error(`Fatal error after ${duration}ms:`, error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Translation failed",
        duration,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
