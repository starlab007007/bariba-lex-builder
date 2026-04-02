import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  normalizeBaribaText,
  isInvalidUiLikeText,
  applyLocalBaribaCorrections,
} from "../_shared/bariba-linguistic-rules.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GLOBAL_TIMEOUT_MS = 45_000;
const REFINE_TIMEOUT_MS = 6_000;
const HF_HEALTH_TIMEOUT_MS = 2_500;
const HF_CONFIG_TIMEOUT_MS = 2_500;
const HF_JOIN_TIMEOUT_MS = 5_000;
const HF_QUEUE_POLL_TIMEOUT_MS = 3_500;
const HF_WAKE_POLL_INTERVAL_MS = 2_000;
const HF_WAKE_MAX_POLLS = 3;
const HF_QUEUE_MAX_ATTEMPTS = 6;
const TTS_SPACE_FALLBACK_URL = "https://zimesongbian-baatonum-tts-api-v001.hf.space";
const HEALTH_PATHS = ["/config", "/gradio_api/config", "/"] as const;

type SpaceStatus = "ready" | "sleeping" | "missing";

interface TTSRequest {
  text: string;
  speakingRate?: number;   // compat front (non utilisé par HF VITS, mais gardé)
  noiseScale?: number;     // si ton Space supporte
  noiseScaleW?: number;    // si ton Space supporte
  lengthScale?: number;    // alias plus standard
  skipRefine?: boolean;
  voice?: string;
}

function normalizeText(input: string): string {
  return normalizeBaribaText(input);
}

function isTooShortForTts(text: string): boolean {
  return Array.from(text.trim()).length < 2;
}

function isProbablyUiText(text: string): boolean {
  return isInvalidUiLikeText(text);
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

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function buildHfHeaders(hfToken?: string): HeadersInit {
  const headers: Record<string, string> = {};
  if (hfToken) headers["Authorization"] = `Bearer ${hfToken}`;
  return headers;
}

function getTtsSpaceCandidates(): string[] {
  return Array.from(
    new Set(
      [Deno.env.get("HF_SPACE_URL"), TTS_SPACE_FALLBACK_URL]
        .filter((value): value is string => !!value && value.trim().length > 0)
        .map((value) => value.replace(/\/$/, "")),
    ),
  );
}

/**
 * Appelle refine-bariba avant synthèse vocale (optionnel)
 */
async function callRefineBariba(text: string): Promise<{
  refined?: string;
  confidence?: number;
  changes?: string[];
  error?: string;
}> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceKey) {
      return { error: "SUPABASE_URL / key missing for refine-bariba" };
    }

    const resp = await fetchWithTimeout(
      `${supabaseUrl}/functions/v1/refine-bariba`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          text,
          type: "transcription", // ici on nettoie / normalise du Bariba pour TTS
        }),
      },
      REFINE_TIMEOUT_MS,
    );

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      return { error: `Refine HTTP ${resp.status}: ${body.substring(0, 120)}` };
    }

    const data = await resp.json().catch(() => ({}));
    const refined = typeof data?.refined === "string" ? normalizeText(data.refined) : "";

    if (!refined) return { error: "Refine returned empty text" };

    return {
      refined,
      confidence: typeof data?.confidence === "number" ? data.confidence : undefined,
      changes: Array.isArray(data?.changes) ? data.changes.map(String) : [],
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Refine failed" };
  }
}

/**
 * Détecte le préfixe API d’un Space Gradio (/gradio_api ou /run/predict fallback)
 */
async function detectGradioApiPrefix(spaceUrl: string, hfToken?: string): Promise<{ apiPrefix: string; useDirectPredict: boolean }> {
  const headers = buildHfHeaders(hfToken);

  // Check /config (root config, works on Gradio 6+ even when /gradio_api/config returns 404)
  try {
    const r = await fetchWithTimeout(`${spaceUrl}/config`, { headers }, HF_CONFIG_TIMEOUT_MS);
    if (r.ok) {
      const ct = r.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const cfg = await r.json().catch(() => ({}));
        const prefix = cfg?.api_prefix || "/gradio_api";
        console.log(`[bariba-tts] Detected api_prefix from /config: ${prefix}, Gradio v${cfg?.version || '?'}`);
        return { apiPrefix: prefix, useDirectPredict: false };
      }
    }
  } catch {}

  // Check /gradio_api/config (Gradio 4+)
  try {
    const r = await fetchWithTimeout(`${spaceUrl}/gradio_api/config`, { headers }, HF_CONFIG_TIMEOUT_MS);
    if (r.ok) return { apiPrefix: "/gradio_api", useDirectPredict: false };
  } catch {}

  // Check /api/predict (Gradio 3.x direct endpoint)
  try {
    const r = await fetchWithTimeout(
      `${spaceUrl}/api/predict`,
      { headers, method: "POST", body: JSON.stringify({ data: [] }) },
      HF_CONFIG_TIMEOUT_MS,
    );
    if (r.status !== 404) return { apiPrefix: "", useDirectPredict: true };
  } catch {}

  // fallback to queue-based
  return { apiPrefix: "/gradio_api", useDirectPredict: false };
}

/**
 * Parse les chunks SSE de /queue/join pour récupérer event_id
 */
async function readEventIdFromQueueJoin(resp: Response): Promise<string | null> {
  const reader = resp.body?.getReader();
  if (!reader) return null;

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Split sur double newline SSE
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      const lines = part.split("\n").map((l) => l.trim());
      const dataLine = lines.find((l) => l.startsWith("data:"));
      if (!dataLine) continue;

      const payload = dataLine.replace(/^data:\s*/, "");
      if (!payload || payload === "[DONE]") continue;

      try {
        const json = JSON.parse(payload);
        if (json?.event_id) return String(json.event_id);
        if (json?.data?.event_id) return String(json.data.event_id);
      } catch {
        // pas JSON, ignorer
      }
    }
  }

  return null;
}

/**
 * Poll du endpoint /queue/data?session_hash=...
 */
async function pollQueueData(
  spaceUrl: string,
  apiPrefix: string,
  sessionHash: string,
  hfToken: string,
  maxAttempts = HF_QUEUE_MAX_ATTEMPTS,
): Promise<{ result: any | null; sleeping: boolean }> {
  const headers: HeadersInit = {};
  if (hfToken) headers["Authorization"] = `Bearer ${hfToken}`;

  for (let i = 0; i < maxAttempts; i++) {
    const url = `${spaceUrl}${apiPrefix}/queue/data?session_hash=${encodeURIComponent(sessionHash)}`;
    let resp: Response;

    try {
      resp = await fetchWithTimeout(url, { headers }, HF_QUEUE_POLL_TIMEOUT_MS);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "queue/data failed";
      if (/abort|timeout/i.test(msg)) {
        return { result: null, sleeping: true };
      }
      await sleep(800);
      continue;
    }

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      const isHtmlPage = errText.trimStart().startsWith("<!DOCTYPE html") || errText.trimStart().startsWith("<html");
      const isSleeping = isHtmlPage || [429, 502, 503, 504].includes(resp.status) || /sleep|loading|temporarily unavailable/i.test(errText);
      if (isSleeping) {
        return { result: null, sleeping: true };
      }
      await sleep(800);
      continue;
    }

    const text = await resp.text();

    // /queue/data renvoie souvent du SSE
    const chunks = text.split("\n\n");
    for (const chunk of chunks) {
      const line = chunk
        .split("\n")
        .map((x) => x.trim())
        .find((x) => x.startsWith("data:"));

      if (!line) continue;
      const payload = line.replace(/^data:\s*/, "");
      if (!payload) continue;

      try {
        const json = JSON.parse(payload);

        // cas Gradio final
        if (json?.msg === "process_completed") return { result: json, sleeping: false };
        if (json?.output) return { result: json, sleeping: false };
        if (json?.success && json?.data) return { result: json, sleeping: false };

        // erreurs de queue
        if (json?.msg === "process_starts" || json?.msg === "estimation") {
          // continue polling
        }
      } catch {
        // ignore
      }
    }

    await sleep(1000);
  }

  return { result: null, sleeping: false };
}

/**
 * Tente extraction URL audio depuis plusieurs formats de réponse Gradio
 */
function extractAudioUrlFromGradioResult(result: any, spaceUrl: string): string | null {
  const candidates: any[] = [];

  if (result?.output?.data) candidates.push(...result.output.data);
  if (Array.isArray(result?.data)) candidates.push(...result.data);
  if (result?.data) candidates.push(result.data);
  if (result?.output) candidates.push(result.output);

  const stack = [...candidates];

  while (stack.length) {
    const node = stack.shift();
    if (!node) continue;

    if (typeof node === "string") {
      if (/^https?:\/\//i.test(node) && /\.(wav|mp3|ogg|flac)(\?|$)/i.test(node)) return node;
      if (node.startsWith("/")) return `${spaceUrl}${node}`;
      continue;
    }

    if (Array.isArray(node)) {
      stack.push(...node);
      continue;
    }

    if (typeof node === "object") {
      // formats fréquents
      const maybe =
        node.url ||
        node.path ||
        node.name ||
        node.audio ||
        node.value?.url ||
        node.value?.path ||
        node.file?.url ||
        node.file?.path;

      if (typeof maybe === "string") {
        if (/^https?:\/\//i.test(maybe)) return maybe;
        if (maybe.startsWith("/")) return `${spaceUrl}${maybe}`;
      }

      for (const v of Object.values(node)) stack.push(v);
    }
  }

  return null;
}

/**
 * Réveille le Space HF en pingant /gradio_api/config puis attend
 */
async function checkSpaceStatus(spaceUrl: string, hfToken: string): Promise<SpaceStatus> {
  const headers = buildHfHeaders(hfToken);
  let sawNon404 = false;

  for (const path of HEALTH_PATHS) {
    try {
      const resp = await fetchWithTimeout(`${spaceUrl}${path}`, { headers }, HF_HEALTH_TIMEOUT_MS);
      const ct = resp.headers.get("content-type") || "";
      console.log(`[bariba-tts] Health check ${path}: status=${resp.status}, ct=${ct.substring(0, 30)}`);

      if (resp.status === 404) {
        await resp.text().catch(() => "");
        continue;
      }

      sawNon404 = true;

      if (!resp.ok) {
        await resp.text().catch(() => "");
        if ([429, 502, 503, 504].includes(resp.status)) {
          return "sleeping";
        }
        continue;
      }

      if (ct.includes("application/json")) {
        await resp.text().catch(() => "");
        return "ready";
      }

      if (ct.includes("text/html")) {
        const body = await resp.text().catch(() => "");
        const lowerBody = body.toLowerCase();
        const isLoadingPage = lowerBody.includes("hugging face") && !lowerBody.includes("gradio");
        return isLoadingPage ? "sleeping" : "ready";
      }

      await resp.text().catch(() => "");
      return "ready";
    } catch (e) {
      console.log(`[bariba-tts] Health check ${path} error: ${e instanceof Error ? e.message : "unknown"}`);
    }
  }

  return sawNon404 ? "sleeping" : "missing";
}

async function resolveTtsSpaceUrl(hfToken: string): Promise<{ spaceUrl: string; status: SpaceStatus }> {
  const candidates = getTtsSpaceCandidates();
  let selectedUrl = candidates[candidates.length - 1] || TTS_SPACE_FALLBACK_URL;
  let selectedStatus: SpaceStatus = "missing";

  for (const candidate of candidates) {
    const status = await checkSpaceStatus(candidate, hfToken);
    console.log(`[bariba-tts] Probe ${candidate}: ${status}`);

    if (status === "ready") {
      return { spaceUrl: candidate, status };
    }

    if (status !== "missing") {
      selectedUrl = candidate;
      selectedStatus = status;
    }
  }

  return { spaceUrl: selectedUrl, status: selectedStatus };
}

async function wakeUpSpace(spaceUrl: string, hfToken: string): Promise<boolean> {
  console.log(`[bariba-tts] 🔄 Attempting to wake up HF Space: ${spaceUrl}`);

  const initialStatus = await checkSpaceStatus(spaceUrl, hfToken);
  if (initialStatus === "ready") {
    console.log("[bariba-tts] ✅ Space already awake on first check");
    return true;
  }

  if (initialStatus === "missing") {
    console.log("[bariba-tts] ❌ Space health endpoints returned 404 on all paths");
    return false;
  }

  for (let i = 1; i <= HF_WAKE_MAX_POLLS; i++) {
    await sleep(HF_WAKE_POLL_INTERVAL_MS);
    const status = await checkSpaceStatus(spaceUrl, hfToken);
    if (status === "ready") {
      console.log(`[bariba-tts] ✅ Space awoke after ${i * HF_WAKE_POLL_INTERVAL_MS}ms`);
      return true;
    }
    if (status === "missing") {
      console.log("[bariba-tts] ❌ Space became unreachable during wake-up checks");
      return false;
    }
    console.log(`[bariba-tts] ⏳ Poll ${i}/${HF_WAKE_MAX_POLLS} - still waking...`);
  }

  console.log("[bariba-tts] ❌ Space still not awake after short polling window");
  return false;
}

/**
 * Appel principal au Space HF (queue Gradio) — avec auto-wake retry
 */
async function synthesizeWithHuggingFaceSpace(params: {
  text: string;
  noiseScale?: number;
  noiseScaleW?: number;
  lengthScale?: number;
}): Promise<{ audio_url?: string; raw?: any; error?: string; sleeping?: boolean }> {
  const HF_TOKEN =
    Deno.env.get("HUGGING_FACE_API_TOKEN") ||
    Deno.env.get("HF_TOKEN") ||
    Deno.env.get("HUGGINGFACEHUB_API_TOKEN") ||
    "";
  const resolvedSpace = await resolveTtsSpaceUrl(HF_TOKEN);
  const HF_SPACE_URL = resolvedSpace.spaceUrl;
  console.log(`[bariba-tts] Using HF Space URL: ${HF_SPACE_URL} (${resolvedSpace.status})`);

  const spaceReady = resolvedSpace.status === "ready";

  // If not ready, wake it up first
  if (!spaceReady) {
    console.log("[bariba-tts] Space not ready, waking up first...");
    const awoke = await wakeUpSpace(HF_SPACE_URL, HF_TOKEN);
    if (!awoke) {
      return { error: "Service en veille", sleeping: true };
    }
  }

  // Now attempt synthesis (up to 2 tries)
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await _doSynthesize(HF_SPACE_URL, HF_TOKEN, params);

    if (!result.sleeping || attempt === 1) {
      return result;
    }

    console.log(`[bariba-tts] Synthesis failed (sleeping), retry ${attempt + 1}...`);
    await sleep(3_000);
  }

  return { error: "Échec après tentatives de réveil", sleeping: true };
}

async function _doSynthesize(
  HF_SPACE_URL: string,
  HF_TOKEN: string,
  params: { text: string; noiseScale?: number; noiseScaleW?: number; lengthScale?: number },
): Promise<{ audio_url?: string; raw?: any; error?: string; sleeping?: boolean }> {

  const { apiPrefix, useDirectPredict } = await detectGradioApiPrefix(HF_SPACE_URL, HF_TOKEN);

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (HF_TOKEN) headers["Authorization"] = `Bearer ${HF_TOKEN}`;

  const dataPayload = [
    params.text,
    params.noiseScale ?? 0.667,
    params.noiseScaleW ?? 0.8,
    params.lengthScale ?? 1.0,
  ];

  // === Direct /api/predict for Gradio 3.x spaces ===
  if (useDirectPredict) {
    console.log("[bariba-tts] Using direct /api/predict endpoint");
    try {
      const resp = await fetchWithTimeout(
        `${HF_SPACE_URL}/api/predict`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ data: dataPayload, fn_index: 0 }),
        },
        HF_JOIN_TIMEOUT_MS,
      );

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        const isHtmlPage = errText.trimStart().startsWith("<!DOCTYPE html");
        return {
          error: isHtmlPage ? "Space en veille (HTML)" : `api/predict ${resp.status}: ${errText.substring(0, 200)}`,
          sleeping: isHtmlPage || resp.status === 503,
        };
      }

      const result = await resp.json().catch(() => null);
      if (!result) return { error: "Invalid JSON from /api/predict" };

      const audioUrl = extractAudioUrlFromGradioResult(result, HF_SPACE_URL);
      if (!audioUrl) return { error: "Audio introuvable dans la réponse directe", raw: result };

      return { audio_url: audioUrl, raw: result };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "predict failed";
      return { error: msg, sleeping: /abort|timeout/i.test(msg) };
    }
  }

  // === Queue-based for Gradio 4+ ===
  const sessionHash = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const body = {
    data: dataPayload,
    event_data: null,
    fn_index: 0,
    session_hash: sessionHash,
    trigger_id: 0,
  };

  let joinResp: Response;
  try {
      joinResp = await fetchWithTimeout(
      `${HF_SPACE_URL}${apiPrefix}/queue/join`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      },
        HF_JOIN_TIMEOUT_MS,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "HF join failed";
    return {
      error: msg,
        sleeping: /503|sleep|temporarily unavailable|abort|timeout/i.test(msg),
    };
  }

  if (!joinResp.ok) {
    const errText = await joinResp.text().catch(() => "");
    const isHtmlPage = errText.trimStart().startsWith("<!DOCTYPE html") || errText.trimStart().startsWith("<html");
    return {
      error: isHtmlPage
        ? "Le Space HuggingFace est en veille ou indisponible (page HTML reçue au lieu de JSON)"
        : `HF queue/join ${joinResp.status}: ${errText.substring(0, 200)}`,
      sleeping: isHtmlPage || joinResp.status === 503 || /sleep|loading|awake/i.test(errText),
    };
  }

  let eventId: string | null = null;
  const ctype = joinResp.headers.get("content-type") || "";

  if (ctype.includes("application/json")) {
    const js = await joinResp.json().catch(() => ({}));
    eventId = js?.event_id || js?.data?.event_id || null;
  } else {
    eventId = await readEventIdFromQueueJoin(joinResp);
  }

  const { result, sleeping } = await pollQueueData(HF_SPACE_URL, apiPrefix, sessionHash, HF_TOKEN);

  if (!result) {
    return {
      error: sleeping ? "Service en veille" : "Aucune réponse finale du Space (timeout queue/data)",
      sleeping,
    };
  }

  const audioUrl = extractAudioUrlFromGradioResult(result, HF_SPACE_URL);
  if (!audioUrl) {
    return { error: "Audio introuvable dans la réponse du Space", raw: result };
  }

  return { audio_url: audioUrl, raw: result };
}

/**
 * Optionnel: log dans Supabase (si table existe)
 */
async function logTtsRequestSafe(params: {
  original_text: string;
  final_text: string;
  audio_url?: string;
  refinement_applied: boolean;
  refinement_meta?: Record<string, unknown>;
  duration_ms: number;
  success: boolean;
  error?: string;
}) {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;

    const db = createClient(url, key);
    await db.from("tts_logs").insert({
      original_text: params.original_text,
      final_text: params.final_text,
      audio_url: params.audio_url || null,
      refinement_applied: params.refinement_applied,
      refinement_meta: params.refinement_meta || null,
      duration_ms: params.duration_ms,
      success: params.success,
      error: params.error || null,
      created_at: new Date().toISOString(),
    });
  } catch {
    // ne bloque jamais la réponse TTS
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();
  const globalTimer = setTimeout(() => {}, GLOBAL_TIMEOUT_MS);

  try {
    const body: TTSRequest = await req.json().catch(() => ({} as TTSRequest));
    const rawText = typeof body.text === "string" ? body.text : "";
    const skipRefine = body.skipRefine === true;

    if (!rawText || !normalizeText(rawText)) {
      clearTimeout(globalTimer);
      return new Response(
        JSON.stringify({ error: "Texte vide" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let safeText = normalizeText(rawText);
    safeText = applyLocalBaribaCorrections(safeText);

    if (isTooShortForTts(safeText)) {
      clearTimeout(globalTimer);
      return new Response(
        JSON.stringify({ error: "Texte trop court pour la synthèse vocale" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (isProbablyUiText(safeText)) {
      clearTimeout(globalTimer);
      return new Response(
        JSON.stringify({ error: "Texte invalide (bruit UI / placeholder)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let refinementMeta: Record<string, unknown> = { applied: false };

    // 1) Raffinage (optionnel)
    if (!skipRefine) {
      const refined = await callRefineBariba(safeText);
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

    // 2) TTS HuggingFace Space
    const tts = await synthesizeWithHuggingFaceSpace({
      text: safeText,
      noiseScale: typeof body.noiseScale === "number" ? body.noiseScale : undefined,
      noiseScaleW: typeof body.noiseScaleW === "number" ? body.noiseScaleW : undefined,
      lengthScale:
        typeof body.lengthScale === "number"
          ? body.lengthScale
          : typeof body.speakingRate === "number" && body.speakingRate > 0
          ? Number((1 / body.speakingRate).toFixed(3)) // approx mapping speakingRate -> lengthScale
          : undefined,
    });

    if (!tts.audio_url) {
      const duration = Date.now() - startedAt;
      const rawModelError = typeof tts.raw?.output?.error === "string" ? tts.raw.output.error : "";
      const isInputTooShort =
        isTooShortForTts(safeText) ||
        /dimension out of range|input.*too short|text too short/i.test(`${tts.error || ""} ${rawModelError}`);
      await logTtsRequestSafe({
        original_text: rawText,
        final_text: safeText,
        refinement_applied: refinementMeta.applied === true,
        refinement_meta: refinementMeta,
        duration_ms: duration,
        success: false,
        error: tts.error,
      });

      const isSleeping = !!tts.sleeping;
      clearTimeout(globalTimer);

      return new Response(
        JSON.stringify({
          success: false,
          error: isSleeping
            ? "Service en veille"
            : isInputTooShort
            ? "Texte trop court pour la synthèse vocale"
            : (tts.error || "Échec TTS"),
          sleeping: isSleeping,
          details: isSleeping ? "Le Space HuggingFace est probablement en veille. Réessaie dans 30 secondes." : undefined,
          text_used: safeText,
          refine: refinementMeta,
          duration,
          debug: tts.raw ? { raw: tts.raw } : undefined,
        }),
        {
          status: isSleeping ? 200 : isInputTooShort ? 400 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const duration = Date.now() - startedAt;
    await logTtsRequestSafe({
      original_text: rawText,
      final_text: safeText,
      audio_url: tts.audio_url,
      refinement_applied: refinementMeta.applied === true,
      refinement_meta: refinementMeta,
      duration_ms: duration,
      success: true,
    });

    clearTimeout(globalTimer);

    return new Response(
      JSON.stringify({
        success: true,
        audio_url: tts.audio_url,
        text_used: safeText,
        refine: refinementMeta,
        duration,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    clearTimeout(globalTimer);

    const msg = error instanceof Error ? error.message : "Unknown error";
    const isTimeout = /aborted|timeout/i.test(msg);
    const duration = Date.now() - startedAt;

    console.error("[bariba-tts] Error:", error);

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
