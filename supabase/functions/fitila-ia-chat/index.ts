import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GLOBAL_TIMEOUT_MS = 60_000;
const STEP_TIMEOUT_MS = 25_000;
const REFINE_TIMEOUT_MS = 6_000;

interface FitilaRequest {
  message?: string;
  skipRefine?: boolean;
}

function normalizeText(input: string): string {
  return (input || "").normalize("NFC").replace(/\s+/g, " ").trim();
}

function isValidText(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const s = normalizeText(value);
  if (!s) return false;
  const lower = s.toLowerCase();
  return ![
    "share via link",
    "loading",
    "submit",
    "clear",
    "undefined",
    "null",
    "<html",
    "<!doctype",
  ].some((p) => lower.includes(p));
}

function applyLocalBaribaCorrections(input: string): string {
  let out = normalizeText(input);

  // Corrections sûres du rapport linguistique
  out = out.replace(/\bKua dɔ̃ɔ\b/giu, "A kpuna n do?");
  out = out.replace(/\bKua wɛrɛ\b/giu, "Bɛɛ ka yoka");
  out = out.replace(/\bA kɛra\s*\?/giu, "Anna wunɛn wasi?");
  out = out.replace(/\bNa kɛra sãa sãa\b/giu, "Alaafia");
  out = out.replace(/\bA nii koo\b/giu, "siara");
  out = out.replace(/\bNɛn yaa\b/giu, "bii mɛro");
  out = out.replace(/\bNim nɔnkuru\b/giu, "nim nɔru");
  out = out.replace(/Goo u g[ɑaã̃]+ kasuu,\s*u ga bɛri/giu, "Durɔ goo u kasuu, u ga bɛri");

  return normalizeText(out);
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function callJson<T = any>(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<T> {
  const res = await fetchWithTimeout(url, init, timeoutMs);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${body.substring(0, 200)}`);
  }
  return (await res.json()) as T;
}

async function tryRefineBariba(params: {
  req: Request;
  text: string;
  type: "translation" | "transcription" | "translate";
  direction?: "ba-fr" | "fr-ba";
  originalInput?: string;
  timeoutMs?: number;
}): Promise<{ refined?: string; changes?: string[]; confidence?: number; error?: string }> {
  const {
    req,
    text,
    type,
    direction,
    originalInput,
    timeoutMs = REFINE_TIMEOUT_MS,
  } = params;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || req.headers.get("x-supabase-url") || "";
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") || req.headers.get("apikey") || "";

  if (!supabaseUrl || !supabaseAnon) {
    return { error: "Refine unavailable (missing Supabase URL/key)" };
  }

  try {
    const resp = await fetchWithTimeout(
      `${supabaseUrl}/functions/v1/refine-bariba`,
      {
        method: "POST",
        headers: {
          Authorization: req.headers.get("Authorization") || `Bearer ${supabaseAnon}`,
          apikey: req.headers.get("apikey") || supabaseAnon,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          type,
          direction,
          originalInput,
        }),
      },
      timeoutMs,
    );

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      return { error: `Refine HTTP ${resp.status}: ${body.substring(0, 120)}` };
    }

    const data = await resp.json();
    const refined = typeof data?.refined === "string" ? normalizeText(data.refined) : "";
    if (!refined) return { error: "Refine returned empty text" };

    return {
      refined,
      changes: Array.isArray(data?.changes) ? data.changes.map(String) : [],
      confidence: typeof data?.confidence === "number" ? data.confidence : undefined,
    };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Refine request failed" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();
  const globalController = new AbortController();
  const globalTimer = setTimeout(() => globalController.abort(), GLOBAL_TIMEOUT_MS);

  try {
    const { message, skipRefine = false }: FitilaRequest = await req.json();

    if (!message || typeof message !== "string" || !normalizeText(message)) {
      clearTimeout(globalTimer);
      return new Response(JSON.stringify({ error: "Message requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || req.headers.get("x-supabase-url");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || req.headers.get("apikey");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("SUPABASE_URL or SUPABASE_ANON_KEY not configured");
    }
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    let inputBariba = applyLocalBaribaCorrections(message);
    console.log("[fitila-ia] Pipeline start:", inputBariba.substring(0, 80));

    let inputRefinement: any = { applied: false };

    // (Optionnel) lisser le texte d’entrée Bariba avant traduction ba->fr
    if (!skipRefine) {
      const refinedInput = await tryRefineBariba({
        req,
        text: inputBariba,
        type: "transcription",
        timeoutMs: 5000,
      });

      if (refinedInput.refined && isValidText(refinedInput.refined)) {
        inputBariba = applyLocalBaribaCorrections(refinedInput.refined);
        inputRefinement = {
          applied: true,
          confidence: refinedInput.confidence,
          changes: refinedInput.changes || [],
        };
      } else if (refinedInput.error) {
        inputRefinement = { applied: false, error: refinedInput.error };
      }
    }

    // ─────────────────────────────────────────────
    // Step 1: Traduction Bariba -> Français
    // ─────────────────────────────────────────────
    console.log("[fitila-ia] Step 1: Translating Bariba -> French...");
    const translateToFrRes = await fetchWithTimeout(
      `${SUPABASE_URL}/functions/v1/byt5-bariba-translate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: req.headers.get("Authorization") || `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: req.headers.get("apikey") || SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          text: inputBariba,
          sourceLang: "bariba",
          targetLang: "french",
          mode: "quality",
          advanced: true,
        }),
      },
      STEP_TIMEOUT_MS,
    );

    if (!translateToFrRes.ok) {
      const errText = await translateToFrRes.text().catch(() => "");
      console.error("[fitila-ia] Step 1 failed:", errText);
      throw new Error(`Translation ba->fr failed (${translateToFrRes.status})`);
    }

    const translateToFrData = await translateToFrRes.json();
    let questionFr = normalizeText(
      translateToFrData?.translation ||
      translateToFrData?.translatedText ||
      translateToFrData?.text ||
      "",
    );

    if (!isValidText(questionFr)) {
      questionFr = normalizeText(inputBariba); // dernier fallback
    }

    console.log("[fitila-ia] Step 1 done, French:", questionFr.substring(0, 100));

    // ─────────────────────────────────────────────
    // Step 2: Appel IA (Lovable Gateway) avec fallback modèles
    // ─────────────────────────────────────────────
    console.log("[fitila-ia] Step 2: Calling AI...");
    const modelsToTry = [
      "openai/gpt-5-nano",
      "google/gemini-2.5-flash-lite",
      "google/gemini-2.5-flash",
      "openai/gpt-5-mini",
    ];

    let responseFr = "";
    let aiSuccess = false;
    let selectedModel: string | null = null;
    const aiErrors: string[] = [];

    for (const model of modelsToTry) {
      try {
        console.log(`[fitila-ia] Trying model: ${model}`);

        const aiRes = await fetchWithTimeout(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: "system",
                  content:
                    "Tu es Fitila, assistant IA chaleureux, pratique et fiable. Réponds en français simple, naturel, MAXIMUM 3 phrases courtes, 1 idée principale + 1 conseil concret. Pas de liste. Pas de jargon. Si la question est ambiguë, donne une réponse utile et prudente sans inventer.",
                },
                { role: "user", content: questionFr },
              ],
              max_tokens: 140,
              temperature: 0.5,
            }),
          },
          STEP_TIMEOUT_MS,
        );

        if (aiRes.status === 429) {
          clearTimeout(globalTimer);
          return new Response(
            JSON.stringify({ error: "Trop de requêtes, réessayez dans un moment." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        if (aiRes.status === 402) {
          clearTimeout(globalTimer);
          return new Response(
            JSON.stringify({ error: "Crédits insuffisants." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        if (!aiRes.ok) {
          const errText = await aiRes.text().catch(() => "");
          aiErrors.push(`${model}: HTTP ${aiRes.status}`);
          console.warn(`[fitila-ia] Model ${model} failed: ${errText.substring(0, 120)}`);
          continue;
        }

        const aiData = await aiRes.json();
        const content = aiData?.choices?.[0]?.message?.content;

        if (isValidText(content)) {
          responseFr = normalizeText(content);
          selectedModel = model;
          aiSuccess = true;
          console.log(`[fitila-ia] Step 2 done with ${model}: ${responseFr.substring(0, 100)}`);
          break;
        }

        aiErrors.push(`${model}: empty/invalid content`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        aiErrors.push(`${model}: ${msg}`);
        console.warn(`[fitila-ia] Model ${model} error: ${msg}`);
      }
    }

    if (!aiSuccess || !responseFr) {
      throw new Error(`Tous les modèles IA sont temporairement indisponibles (${aiErrors.slice(0, 2).join(" | ")})`);
    }

    // ─────────────────────────────────────────────
    // Step 3: Traduction Français -> Bariba
    // ─────────────────────────────────────────────
    console.log("[fitila-ia] Step 3: Translating French -> Bariba...");
    const translateToBaRes = await fetchWithTimeout(
      `${SUPABASE_URL}/functions/v1/byt5-bariba-translate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: req.headers.get("Authorization") || `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: req.headers.get("apikey") || SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          text: responseFr,
          sourceLang: "french",
          targetLang: "bariba",
          mode: "quality",
          advanced: true,
        }),
      },
      STEP_TIMEOUT_MS,
    );

    let responseBa: string | null = null;
    let outputRefinement: any = { applied: false };
    let fallback = false;

    if (!translateToBaRes.ok) {
      const errText = await translateToBaRes.text().catch(() => "");
      console.error("[fitila-ia] Step 3 failed:", errText);
      fallback = true;
    } else {
      const translateToBaData = await translateToBaRes.json();
      const translated = translateToBaData?.translation || translateToBaData?.translatedText || "";

      if (isValidText(translated)) {
        responseBa = applyLocalBaribaCorrections(translated);

        // Post-raffinage final Bariba (non bloquant)
        if (!skipRefine) {
          const refinedOutput = await tryRefineBariba({
            req,
            text: responseBa,
            type: "translate",
            direction: "fr-ba",
            originalInput: responseFr,
            timeoutMs: 5000,
          });

          if (refinedOutput.refined && isValidText(refinedOutput.refined)) {
            responseBa = applyLocalBaribaCorrections(refinedOutput.refined);
            outputRefinement = {
              applied: true,
              confidence: refinedOutput.confidence,
              changes: refinedOutput.changes || [],
            };
          } else if (refinedOutput.error) {
            outputRefinement = { applied: false, error: refinedOutput.error };
          }
        }
      } else {
        fallback = true;
      }
    }

    clearTimeout(globalTimer);
    const duration = Date.now() - startedAt;

    console.log(
      `[fitila-ia] Done in ${duration}ms | model=${selectedModel || "?"} | fallback=${fallback}`,
    );

    return new Response(
      JSON.stringify({
        response_ba: responseBa,
        response_fr: responseFr,
        question_fr: questionFr,
        question_ba_normalized: inputBariba,
        fallback,
        meta: {
          duration,
          model: selectedModel,
        },
        refinement: {
          input: inputRefinement,
          output: outputRefinement,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e: unknown) {
    clearTimeout(globalTimer);
    const duration = Date.now() - startedAt;
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    const isTimeout = /timeout|aborted/i.test(msg);

    console.error("[fitila-ia] Error:", e);

    return new Response(
      JSON.stringify({
        error: isTimeout ? "Temps de réponse dépassé" : msg,
        duration,
      }),
      {
        status: isTimeout ? 504 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
