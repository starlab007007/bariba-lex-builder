import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  normalizeBaribaText,
  isInvalidUiLikeText,
  applyLocalBaribaCorrections,
} from "../_shared/bariba-linguistic-rules.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SPACE_URL = "https://zimesongbian-baatonum-asr-stt-api-v001-improve.hf.space";

const MAX_AUDIO_BASE64_LEN = 500_000;
const HF_UPLOAD_TIMEOUT_MS = 30_000;
const HF_CALL_TIMEOUT_MS = 30_000;
const HF_SSE_TIMEOUT_MS = 60_000;
const REFINE_TIMEOUT_MS = 5_000;

interface STTRequest {
  audio: string;
  robustMode?: boolean;
  speakerType?: "Auto" | "Enfant" | "Femme" | "Homme" | "PersonneAgee";
}

function isValidTranscription(text: unknown): text is string {
  if (typeof text !== "string") return false;
  const cleaned = normalizeBaribaText(text);
  if (!cleaned || cleaned.length < 1) return false;
  return !isInvalidUiLikeText(cleaned);
}

/**
 * Détecte le type MIME et l'extension depuis le préfixe base64 ou utilise des valeurs par défaut.
 */
function detectAudioFormat(audioBase64: string): { mime: string; ext: string; pureBase64: string } {
  if (audioBase64.startsWith("data:")) {
    const match = audioBase64.match(/^data:(audio\/[^;]+);base64,(.+)$/s);
    if (match) {
      const mime = match[1];
      const pureBase64 = match[2];
      const ext = mime.split("/")[1]?.split(";")[0] || "webm";
      return { mime, ext, pureBase64 };
    }
  }
  // Pas de préfixe data: → audio brut en base64
  return { mime: "audio/webm", ext: "webm", pureBase64: audioBase64 };
}

/**
 * Convertit une chaîne base64 en Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const cleaned = base64.replace(/\s+/g, "");
  const binaryString = atob(cleaned);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * ÉTAPE 1 : Upload du fichier audio vers le Space HuggingFace via multipart
 * Retourne le path temporaire retourné par Gradio
 */
async function uploadAudioFile(
  audioBytes: Uint8Array,
  mime: string,
  ext: string,
  hfToken: string,
): Promise<string> {
  console.log(`📤 Uploading audio file to HuggingFace Space (${audioBytes.length} bytes, ${mime})`);

  const formData = new FormData();
  const blob = new Blob([audioBytes], { type: mime });
  formData.append("files", blob, `audio.${ext}`);

  const uploadResponse = await fetch(`${SPACE_URL}/gradio_api/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hfToken}`,
    },
    body: formData,
    signal: AbortSignal.timeout(HF_UPLOAD_TIMEOUT_MS),
  });

  console.log(`   Upload status: ${uploadResponse.status}`);

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error(`   Upload failed: ${errorText.substring(0, 300)}`);
    throw new Error(`Upload failed (${uploadResponse.status}): ${errorText.substring(0, 200)}`);
  }

  const uploadResult = await uploadResponse.json();
  console.log(`   Upload result: ${JSON.stringify(uploadResult).substring(0, 300)}`);

  let filePath: string | null = null;

  if (Array.isArray(uploadResult) && uploadResult.length > 0) {
    const first = uploadResult[0];
    filePath = typeof first === "string" ? first : (first?.path || first?.name || null);
  } else if (uploadResult?.path) {
    filePath = uploadResult.path;
  } else if (typeof uploadResult === "string") {
    filePath = uploadResult;
  }

  if (!filePath) {
    throw new Error(`Upload response missing file path: ${JSON.stringify(uploadResult).substring(0, 200)}`);
  }

  console.log(`   ✅ File uploaded to path: ${filePath}`);
  return filePath;
}

/**
 * ÉTAPE 2 : Appel de l'endpoint /gradio_api/call/transcribe avec le filepath
 * Retourne l'event_id pour la récupération SSE
 */
async function callTranscribeEndpoint(
  filePath: string,
  robustMode: boolean,
  speakerType: string,
  hfToken: string,
): Promise<string> {
  console.log(`🎯 Calling transcribe endpoint with path: ${filePath}`);

  const fileData = {
    path: filePath,
    meta: { _type: "gradio.FileData" },
  };

  const requestBody = {
    data: [fileData, robustMode, speakerType],
  };

  console.log(`   Request body: ${JSON.stringify(requestBody).substring(0, 300)}`);

  const response = await fetch(`${SPACE_URL}/gradio_api/call/transcribe`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hfToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(HF_CALL_TIMEOUT_MS),
  });

  console.log(`   Transcribe call status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`   Transcribe call failed: ${errorText.substring(0, 300)}`);

    if (response.status === 503) {
      throw new Error("SPACE_SLEEPING: Le Space HuggingFace est en veille. Réessayez dans 30 secondes.");
    }
    throw new Error(`Transcribe call failed (${response.status}): ${errorText.substring(0, 200)}`);
  }

  const result = await response.json();
  console.log(`   Transcribe result: ${JSON.stringify(result).substring(0, 200)}`);

  const eventId = result?.event_id;
  if (!eventId) {
    throw new Error(`No event_id in transcribe response: ${JSON.stringify(result).substring(0, 200)}`);
  }

  console.log(`   ✅ Got event_id: ${eventId}`);
  return eventId;
}

/**
 * ÉTAPE 3 : Lecture du stream SSE jusqu'à process_completed
 * Retourne le texte transcrit
 */
async function readSSEResult(eventId: string, hfToken: string): Promise<string> {
  console.log(`📡 Reading SSE result for event: ${eventId}`);

  const sseUrl = `${SPACE_URL}/gradio_api/call/transcribe/${eventId}`;

  const response = await fetch(sseUrl, {
    headers: {
      Authorization: `Bearer ${hfToken}`,
      Accept: "text/event-stream",
      "Cache-Control": "no-cache",
    },
    signal: AbortSignal.timeout(HF_SSE_TIMEOUT_MS),
  });

  console.log(`   SSE status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SSE request failed (${response.status}): ${errorText.substring(0, 200)}`);
  }

  const sseRaw = await response.text();
  const sseText = sseRaw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  console.log(`   SSE raw length: ${sseRaw.length} chars`);
  console.log(`   SSE raw (first 800 chars): ${sseRaw.substring(0, 800)}`);

  const lines = sseText.split("\n");
  let currentEvent: string | null = null;
  let lastData: string | null = null;

  const extractTranscription = (parsed: any): string | null => {
    if (!parsed) return null;

    // format array direct
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (typeof item === "string" && isValidTranscription(item)) return item;
        if (item?.transcription && isValidTranscription(item.transcription)) return item.transcription;
        if (item?.raw_model_output && isValidTranscription(item.raw_model_output)) return item.raw_model_output;
        if (item?.label && isValidTranscription(item.label)) return item.label;
        if (item?.value && isValidTranscription(item.value)) return item.value;
      }
    }

    // format gradio output
    const data = parsed?.output?.data;
    if (Array.isArray(data)) {
      for (const item of data) {
        if (typeof item === "string" && isValidTranscription(item)) return item;
        if (item?.transcription && isValidTranscription(item.transcription)) return item.transcription;
        if (item?.label && isValidTranscription(item.label)) return item.label;
        if (item?.value && isValidTranscription(item.value)) return item.value;
      }
    }

    if (parsed?.output?.transcription && isValidTranscription(parsed.output.transcription)) return parsed.output.transcription;
    if (parsed?.output?.text && isValidTranscription(parsed.output.text)) return parsed.output.text;
    if (parsed?.transcription && isValidTranscription(parsed.transcription)) return parsed.transcription;
    if (parsed?.text && isValidTranscription(parsed.text)) return parsed.text;

    return null;
  };

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("event: ")) {
      currentEvent = trimmedLine.substring(7).trim();
      continue;
    }

    if (trimmedLine.startsWith("data: ")) {
      lastData = trimmedLine.substring(6).trim();

      // Inline parse (certaines implémentations n'envoient pas de ligne vide finale)
      try {
        const parsed = JSON.parse(lastData);

        if (parsed.msg === "process_errored") {
          throw new Error(`Process error: ${parsed.error || "Unknown model error"}`);
        }

        if (parsed.msg === "process_completed") {
          console.log("   ✅ process_completed detected inline");
          if (parsed.output?.error) throw new Error(`Model error: ${parsed.output.error}`);

          const t = extractTranscription(parsed);
          if (t) {
            console.log(`   Transcription (inline): "${t.substring(0, 100)}"`);
            return t;
          }
        }
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.startsWith("Model error") || err.message.startsWith("Process error"))
        ) {
          throw err;
        }
      }

      continue;
    }

    if (trimmedLine === "" && lastData) {
      try {
        const parsed = JSON.parse(lastData);

        if (parsed.msg === "process_errored") {
          throw new Error(`Process error: ${parsed.error || "Unknown model error"}`);
        }

        if (currentEvent === "complete" || currentEvent === "process_completed" || parsed.msg === "process_completed") {
          console.log(`   ✅ SSE block complete (${currentEvent || parsed.msg || "unknown"})`);
          if (parsed.output?.error) throw new Error(`Model error: ${parsed.output.error}`);

          const t = extractTranscription(parsed);
          if (t) {
            console.log(`   Transcription (block): "${t.substring(0, 100)}"`);
            return t;
          }
        }
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.startsWith("Model error") || err.message.startsWith("Process error"))
        ) {
          throw err;
        }
      } finally {
        currentEvent = null;
        lastData = null;
      }
    }
  }

  // Dernier recours
  if (lastData) {
    try {
      const parsed = JSON.parse(lastData);
      const fallback = extractTranscription(parsed);
      if (fallback) return fallback;
    } catch {
      // ignore
    }
  }

  console.error(`   ❌ SSE stream fully parsed but no transcription found. Full SSE:\n${sseText}`);
  throw new Error("SSE stream ended without transcription result");
}

/**
 * Pipeline complet : base64 → Upload → Call → SSE → transcription
 */
async function transcribeBariba(
  audioBase64: string,
  robustMode: boolean,
  speakerType: string,
  hfToken: string,
): Promise<string> {
  const { mime, ext, pureBase64 } = detectAudioFormat(audioBase64);
  console.log(`🎵 Audio format: ${mime} (.${ext}), base64 length: ${pureBase64.length}`);

  if (!pureBase64 || pureBase64.length < 16) {
    throw new Error("Audio base64 invalide ou trop court");
  }

  const audioBytes = base64ToUint8Array(pureBase64);
  console.log(`   Bytes: ${audioBytes.length}`);

  if (audioBytes.length < 256) {
    throw new Error("Audio trop court ou invalide");
  }

  const filePath = await uploadAudioFile(audioBytes, mime, ext, hfToken);
  const eventId = await callTranscribeEndpoint(filePath, robustMode, speakerType, hfToken);
  const transcription = await readSSEResult(eventId, hfToken);

  return transcription;
}

async function refineWithSupabase(params: {
  req: Request;
  transcription: string;
}): Promise<{ refined?: string; changes?: string[]; confidence?: number; error?: string }> {
  const { req, transcription } = params;

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || req.headers.get("x-supabase-url") || "";
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || req.headers.get("apikey") || "";

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { error: "Refine unavailable (missing Supabase URL/key)" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REFINE_TIMEOUT_MS);

  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/refine-bariba`, {
      method: "POST",
      headers: {
        Authorization: req.headers.get("Authorization") || `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: req.headers.get("apikey") || SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: transcription,
        type: "transcription",
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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as STTRequest;
    const { audio, robustMode = true, speakerType = "Auto" } = body;

    // Health check sans authentification
    if (!audio || audio === "test" || audio.length < 20) {
      console.log("🏥 Health check");
      return new Response(
        JSON.stringify({
          status: "ok",
          service: "bariba-stt",
          message: "Service disponible",
          isHealthCheck: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (audio.length > MAX_AUDIO_BASE64_LEN) {
      return new Response(
        JSON.stringify({
          error: "Audio too large",
          details: "L'enregistrement est trop long. Limitez à ~30 secondes maximum.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const HF_TOKEN = Deno.env.get("HUGGING_FACE_API_TOKEN");
    if (!HF_TOKEN) {
      return new Response(
        JSON.stringify({
          error: "Configuration serveur manquante",
          details: "HuggingFace token non configuré",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`🎤 Bariba STT: audio=${audio.length} chars, robust=${robustMode}, speaker=${speakerType}`);
    const startTime = Date.now();

    try {
      // Retry exponentiel : 2 tentatives avec délai 5s/15s
      // Gestion spéciale SPACE_SLEEPING : attente 30s
      const RETRY_DELAYS = [0, 5000];
      let rawTranscription: string | null = null;
      let lastError: string = "";

      for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
        if (attempt > 0) {
          const delay = lastError.includes("SPACE_SLEEPING") ? 30000 : RETRY_DELAYS[attempt];
          console.log(`🔄 STT retry ${attempt}/${RETRY_DELAYS.length - 1} after ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
        }

        try {
          rawTranscription = await transcribeBariba(audio, robustMode, speakerType, HF_TOKEN);
          if (rawTranscription) break;
        } catch (retryErr: unknown) {
          lastError = retryErr instanceof Error ? retryErr.message : "Unknown error";
          console.warn(`⚠️ STT attempt ${attempt + 1} failed: ${lastError}`);
          if (attempt === RETRY_DELAYS.length - 1) throw retryErr;
        }
      }

      const duration = Date.now() - startTime;

      if (!rawTranscription || !isValidTranscription(rawTranscription)) {
        return new Response(
          JSON.stringify({
            error: "Aucune transcription valide",
            details: "Le modèle n'a pas retourné un texte exploitable.",
            duration,
            suggestion: "Parlez plus clairement pendant 3 à 5 secondes.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      let finalTranscription = applyLocalBaribaCorrections(rawTranscription);
      let refined = false;
      let refineMeta: { confidence?: number; changes?: string[]; error?: string } = {};

      // ─── RAFFINAGE via refine-bariba (non-bloquant) ───
      const refineResult = await refineWithSupabase({
        req,
        transcription: finalTranscription,
      });

      if (refineResult.refined && isValidTranscription(refineResult.refined)) {
        finalTranscription = applyLocalBaribaCorrections(refineResult.refined);
        refined = true;
        refineMeta = {
          confidence: refineResult.confidence,
          changes: refineResult.changes || [],
        };
        console.log(
          `🔧 STT Refined: "${finalTranscription.substring(0, 80)}" (${refineResult.changes?.length || 0} changes)`,
        );
      } else if (refineResult.error) {
        refineMeta = { error: refineResult.error };
        console.warn(`⚠️ STT Refine skipped: ${refineResult.error}`);
      }

      const hasBaribaChars = /[ɔɛɑãɛ̃ĩɔ̃ũ̀́]/u.test(finalTranscription);
      const confidence = Math.min(
        97,
        84 + (hasBaribaChars ? 4 : 0) + (refined ? 4 : 0),
      );

      console.log(`✅ STT Success in ${Date.now() - startTime}ms: "${finalTranscription.substring(0, 80)}"`);

      return new Response(
        JSON.stringify({
          transcription: finalTranscription,
          confidence,
          duration: Date.now() - startTime,
          language: "bariba",
          refined,
          refinement: refineMeta,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (err: unknown) {
      const duration = Date.now() - startTime;
      const errMsg = err instanceof Error ? err.message : "Erreur inconnue";
      console.error(`❌ STT Error after ${duration}ms: ${errMsg}`);

      const isSleeping = errMsg.includes("SPACE_SLEEPING") || errMsg.includes("503");
      const isModelError = errMsg.includes("Model error") || errMsg.includes("model error");
      const isTimeout = errMsg.toLowerCase().includes("timeout");

      return new Response(
        JSON.stringify({
          error: isSleeping
            ? "Service en veille"
            : isTimeout
            ? "Temps de réponse dépassé"
            : isModelError
            ? "Erreur du modèle"
            : "Service STT Bariba indisponible",
          details: isSleeping
            ? "Le service HuggingFace se réveille. Réessayez dans 30 secondes."
            : errMsg,
          duration,
          isWakingUp: isSleeping,
          suggestion: isSleeping
            ? "Attendez 30 secondes puis réessayez."
            : "Réenregistrez avec un son plus clair (3–5 secondes).",
        }),
        { status: isSleeping ? 503 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (error: unknown) {
    console.error("Fatal error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erreur STT",
        suggestion: "Réessayez.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
