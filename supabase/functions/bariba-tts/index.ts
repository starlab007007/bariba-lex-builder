import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TTSRequest {
  text: string;
  speakingRate?: number;
  noiseScale?: number;
  noiseScaleW?: number;
  skipRefine?: boolean; // ✅ désactiver refine-bariba si besoin
}

const SPACE_URL = "https://zimesongbian-baatonum-tts-api-v001.hf.space";
const GLOBAL_TIMEOUT_MS = 55_000;
const REFINE_TIMEOUT_MS = 5_000;

const INVALID_UI_PATTERNS = [
  "share via link",
  "loading",
  "submit",
  "clear",
  "button",
  "click",
  "select",
  "error",
  "undefined",
  "<html",
  "<!doctype",
];

function normalizeBaribaText(input: string): string {
  return (input || "").normalize("NFC").replace(/\s+/g, " ").trim();
}

function stripWrappingQuotes(input: string): string {
  return input.replace(/^["'“”]+|["'“”]+$/g, "");
}

function applyLocalBaribaCorrections(input: string): string {
  let out = normalizeBaribaText(stripWrappingQuotes(input));

  // Corrections lexicales / idiomatiques validées
  out = out.replace(/\bKua dɔ̃ɔ\b/giu, "A kpuna n do?");
  out = out.replace(/\bKua wɛrɛ\b/giu, "Bɛɛ ka yoka");
  out = out.replace(/\bA kɛra\s*\?/giu, "Anna wunɛn wasi?");
  out = out.replace(/\bNa kɛra sãa sãa\b/giu, "Alaafia");
  out = out.replace(/\bA nii koo\b/giu, "siara");
  out = out.replace(/\bNɛn yaa\b/giu, "bii mɛro");
  out = out.replace(/\bnim nɔnkuru\b/giu, "nim nɔru");
  out = out.replace(/Goo u g[ɑaã̃]+ kasuu,\s*u ga bɛri/giu, "Durɔ goo u kasuu, u ga bɛri");

  return normalizeBaribaText(out);
}

function clampNumber(n: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function safeJsonParse<T = unknown>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function isProbablyUiText(value: string): boolean {
  const s = normalizeBaribaText(value).toLowerCase();
  return INVALID_UI_PATTERNS.some((p) => s.includes(p));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Authentifie (optionnel) pour logs / future quotas, mais TTS reste public
 */
async function authenticateRequest(
  req: Request,
): Promise<{ userId: string | null; isAuthenticated: boolean }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { userId: null, isAuthenticated: false };

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      },
    );

    const {
      data: { user },
      error,
    } = await supabaseClient.auth.getUser();

    if (error || !user) return { userId: null, isAuthenticated: false };
    return { userId: user.id, isAuthenticated: true };
  } catch (e) {
    console.error("Auth error:", e);
    return { userId: null, isAuthenticated: false };
  }
}

async function fetchGradioConfig(
  hfToken: string,
  abortSignal?: AbortSignal,
): Promise<{ apiPrefix: string; version?: string }> {
  for (const path of ["/gradio_api/config", "/config"]) {
    try {
      const resp = await fetch(`${SPACE_URL}${path}`, {
        headers: { Authorization: `Bearer ${hfToken}` },
        signal: abortSignal,
      });

      if (!resp.ok) continue;
      const cfg = await resp.json();
      return {
        apiPrefix: cfg?.api_prefix || "/gradio_api",
        version: cfg?.version,
      };
    } catch {
      // continue
    }
  }
  return { apiPrefix: "/gradio_api" };
}

async function pollQueueData(
  spaceUrl: string,
  apiPrefix: string,
  sessionHash: string,
  hfToken: string,
  abortSignal?: AbortSignal,
  maxAttempts = 40,
): Promise<any | null> {
  const pollUrl = `${spaceUrl}${apiPrefix}/queue/data?session_hash=${sessionHash}`;
  console.log(`📡 Polling queue: ${pollUrl}`);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (abortSignal?.aborted) throw new Error("Request timeout");

    try {
      const response = await fetch(pollUrl, {
        headers: {
          Authorization: `Bearer ${hfToken}`,
          Accept: "text/event-stream",
        },
        signal: abortSignal,
      });

      if (response.ok) {
        const text = await response.text();
        console.log(`   Poll ${attempt + 1}: ${text.substring(0, 350)}`);

        const lines = text.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          const parsed = safeJsonParse<any>(line.substring(6).trim());
          if (!parsed) continue;

          if (parsed.msg === "process_errored") {
            throw new Error(parsed.error || "Gradio process error");
          }

          if (parsed.msg === "process_completed") {
            if (parsed.output?.error) throw new Error(parsed.output.error);
            if (parsed.output?.data) return parsed.output;
          }

          if (Array.isArray(parsed.data)) return parsed;
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      if (/timeout/i.test(msg)) throw e;
      console.log(`   Poll error: ${msg}`);
    }

    await sleep(500);
  }

  return null;
}

async function callGradioTTS(
  text: string,
  speakingRate: number,
  noiseScale: number,
  noiseScaleW: number,
  hfToken: string,
  apiPrefix: string,
  abortSignal?: AbortSignal,
): Promise<any> {
  const sessionHash = Math.random().toString(36).slice(2);
  const data = [text, speakingRate, noiseScale, noiseScaleW];

  // Méthode 1: queue/join (Gradio queue)
  console.log(`🔄 queue/join session=${sessionHash}`);
  try {
    const joinResponse = await fetch(`${SPACE_URL}${apiPrefix}/queue/join`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data,
        fn_index: 0,
        session_hash: sessionHash,
      }),
      signal: abortSignal,
    });

    console.log(`   Join status: ${joinResponse.status}`);

    if (joinResponse.ok) {
      const joinText = await joinResponse.text().catch(() => "");
      console.log(`   Join response: ${joinText.substring(0, 220)}`);

      const result = await pollQueueData(
        SPACE_URL,
        apiPrefix,
        sessionHash,
        hfToken,
        abortSignal,
      );
      if (result) return result;
    }
  } catch (e: unknown) {
    console.log(`   Queue error: ${e instanceof Error ? e.message : "Unknown error"}`);
  }

  // Méthode 2: direct /call/predict
  console.log("🔄 direct /call/predict");
  const directResp = await fetch(`${SPACE_URL}${apiPrefix}/call/predict`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hfToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data }),
    signal: abortSignal,
  });

  console.log(`   Direct status: ${directResp.status}`);

  if (!directResp.ok) {
    const errText = await directResp.text().catch(() => "");
    throw new Error(`Direct TTS call failed (${directResp.status}): ${errText.substring(0, 180)}`);
  }

  const directResult = await directResp.json();
  console.log(`   Direct result: ${JSON.stringify(directResult).substring(0, 220)}`);

  // Some Gradio versions return immediate data
  if (Array.isArray(directResult?.data) || Array.isArray(directResult)) {
    return directResult;
  }

  // Some return event_id
  if (directResult?.event_id) {
    const eventUrl = `${SPACE_URL}${apiPrefix}/call/predict/${directResult.event_id}`;
    console.log(`   Reading event: ${eventUrl}`);

    const eventResponse = await fetch(eventUrl, {
      headers: {
        Authorization: `Bearer ${hfToken}`,
        Accept: "text/event-stream",
      },
      signal: abortSignal,
    });

    if (!eventResponse.ok) {
      const errText = await eventResponse.text().catch(() => "");
      throw new Error(`Event stream failed (${eventResponse.status}): ${errText.substring(0, 180)}`);
    }

    const eventText = await eventResponse.text();
    console.log(`   Event text: ${eventText.substring(0, 350)}`);

    const lines = eventText.split("\n");
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const parsed = safeJsonParse<any>(line.substring(6).trim());
      if (!parsed) continue;

      if (parsed.msg === "process_errored") {
        throw new Error(parsed.error || "Gradio process error");
      }
      if (parsed.msg === "process_completed" && parsed.output?.data) return parsed.output;
      if (Array.isArray(parsed.data)) return parsed;
    }
  }

  throw new Error("All Gradio API methods failed");
}

async function extractAudioAsDataUrl(result: any, hfToken: string): Promise<string | null> {
  console.log(`🔍 Extracting audio from: ${JSON.stringify(result).substring(0, 350)}`);

  let audioData: any = null;

  if (Array.isArray(result)) {
    audioData = result[0];
  } else if (Array.isArray(result?.data)) {
    audioData = result.data[0];
  } else if (result?.audio) {
    audioData = result.audio;
  }

  if (!audioData) return null;

  // Cas 1: déjà data URL
  if (typeof audioData === "string" && audioData.startsWith("data:audio")) {
    return audioData;
  }

  // Cas 2: objet Gradio fichier {url|path|name}
  if (typeof audioData === "object" && (audioData.url || audioData.path || audioData.name)) {
    const filePath = audioData.path || audioData.name;
    let fileUrl = audioData.url as string | undefined;

    if (!fileUrl && filePath) {
      // gérer path absolu/relatif
      fileUrl = filePath.startsWith("http")
        ? filePath
        : `${SPACE_URL}/file=${filePath}`;
    }

    if (!fileUrl) return null;

    console.log(`   Fetching audio file: ${fileUrl}`);

    const audioResponse = await fetch(fileUrl, {
      headers: { Authorization: `Bearer ${hfToken}` },
    });

    if (!audioResponse.ok) {
      const errText = await audioResponse.text().catch(() => "");
      throw new Error(`Audio file fetch failed (${audioResponse.status}): ${errText.substring(0, 120)}`);
    }

    const contentType = audioResponse.headers.get("content-type") || "audio/wav";
    const buffer = await audioResponse.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);

    return `data:${contentType};base64,${btoa(binary)}`;
  }

  return null;
}

async function tryRefineTextForTTS(params: {
  req: Request;
  text: string;
  timeoutMs?: number;
}): Promise<{ refined?: string; changes?: string[]; confidence?: number; error?: string }> {
  const { req, text, timeoutMs = REFINE_TIMEOUT_MS } = params;

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
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/refine-bariba`, {
      method: "POST",
      headers: {
        Authorization: req.headers.get("Authorization") || `Bearer ${supabaseAnon}`,
        apikey: req.headers.get("apikey") || supabaseAnon,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        type: "transcription", // texte Bariba à lisser avant TTS
      }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      return { error: `Refine HTTP ${resp.status}: ${body.substring(0, 120)}` };
    }

    const data = await resp.json();
    const refined = typeof data?.refined === "string" ? normalizeBaribaText(data.refined) : "";
    if (!refined) return { error: "Refine returned empty text" };

    return {
      refined,
      changes: Array.isArray(data?.changes) ? data.changes.map(String) : [],
      confidence: typeof data?.confidence === "number" ? data.confidence : undefined,
    };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Refine request failed" };
  } finally {
    clearTimeout(timer);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();
  const abortController = new AbortController();
  const globalTimer = setTimeout(() => abortController.abort(), GLOBAL_TIMEOUT_MS);

  try {
    const { isAuthenticated, userId } = await authenticateRequest(req);

    if (isAuthenticated) {
      console.log(`🔐 Authenticated TTS request from user: ${userId}`);
    } else {
      console.log("📢 Public TTS request (unauthenticated)");
    }

    const {
      text,
      speakingRate = 1.0,
      noiseScale = 0.3,
      noiseScaleW = 0.6,
      skipRefine = false,
    }: TTSRequest = await req.json();

    // Health check
    if (!text || text === "test") {
      clearTimeout(globalTimer);
      return new Response(
        JSON.stringify({
          status: "ok",
          service: "bariba-tts",
          space: SPACE_URL,
          message: "Service disponible",
          isHealthCheck: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const HF_TOKEN = Deno.env.get("HUGGING_FACE_API_TOKEN");
    if (!HF_TOKEN) {
      clearTimeout(globalTimer);
      return new Response(
        JSON.stringify({ error: "HuggingFace token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let safeText = normalizeBaribaText(text);
    if (!safeText || isProbablyUiText(safeText)) {
      clearTimeout(globalTimer);
      return new Response(
        JSON.stringify({ error: "Texte invalide pour TTS" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Clamp des paramètres (évite crash modèle)
    const rate = clampNumber(Number(speakingRate), 0.6, 1.6, 1.0);
    const ns = clampNumber(Number(noiseScale), 0.05, 1.2, 0.3);
    const nsw = clampNumber(Number(noiseScaleW), 0.05, 1.5, 0.6);

    // Pré-corrections locales Bariba
    safeText = applyLocalBaribaCorrections(safeText);

    let refinementMeta: {
      applied: boolean;
      confidence?: number;
      changes?: string[];
      error?: string;
    } = { applied: false };

    // Raffinage (non bloquant) pour améliorer la naturalité avant TTS
    if (!skipRefine) {
      const refined = await tryRefineTextForTTS({ req, text: safeText });
      if (refined.refined) {
        const refinedText = applyLocalBaribaCorrections(refined.refined);
        if (refinedText && !isProbablyUiText(refinedText)) {
          safeText = refinedText;
          refinementMeta = {
            applied: true,
            confidence: refined.confidence,
            changes: refined.changes || [],
          };
        }
      } else if (refined.error) {
        refinementMeta = { applied: false, error: refined.error };
      }
    }

    console.log(`🔊 Bariba TTS: "${safeText.substring(0, 80)}..."`);

    const cfg = await fetchGradioConfig(HF_TOKEN, abortController.signal);
    console.log(`📋 Gradio version=${cfg.version || "?"}, prefix=${cfg.apiPrefix}`);

    const gradioResult = await callGradioTTS(
      safeText,
      rate,
      ns,
      nsw,
      HF_TOKEN,
      cfg.apiPrefix,
      abortController.signal,
    );

    const audio = await extractAudioAsDataUrl(gradioResult, HF_TOKEN);
    const duration = Date.now() - startedAt;

    clearTimeout(globalTimer);

    if (!audio || !audio.startsWith("data:audio")) {
      console.error(`❌ TTS failed after ${duration}ms (no audio payload)`);
      return new Response(
        JSON.stringify({
          error: "Bariba TTS service unavailable",
          details: "No audio returned by HuggingFace Space.",
          duration,
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const hasBaribaChars = /[ɔɛɑãɛ̃ĩɔ̃ũ̀́]/u.test(safeText);
    const confidence = Math.min(
      97,
      84 + (hasBaribaChars ? 4 : 0) + (refinementMeta.applied ? 4 : 0),
    );

    console.log(`✅ TTS Success in ${duration}ms`);

    return new Response(
      JSON.stringify({
        audio,
        duration,
        confidence,
        text: safeText.substring(0, 200),
        refinement: refinementMeta,
        modelInfo: {
          name: "Baatonum TTS",
          space: SPACE_URL,
          speakingRate: rate,
          noiseScale: ns,
          noiseScaleW: nsw,
          postRefine: !skipRefine,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    clearTimeout(globalTimer);
    const duration = Date.now() - startedAt;
    const msg = error instanceof Error ? error.message : "TTS failed";
    const isTimeout = /timeout/i.test(msg);
    const isSleeping = msg.includes("503") || msg.toLowerCase().includes("sleep");

    console.error(`Fatal TTS error after ${duration}ms:`, error);

    return new Response(
      JSON.stringify({
        error: isTimeout
          ? "Temps de réponse dépassé"
          : isSleeping
          ? "Service en veille"
          : msg,
        details: isSleeping
          ? "Le Space HuggingFace est probablement en veille. Réessayez dans 30 secondes."
          : undefined,
        duration,
      }),
      { status: isSleeping ? 503 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
