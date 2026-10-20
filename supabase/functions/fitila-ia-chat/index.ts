import { aiFetch, AI_CHAT_URL, aiFailure } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GLOBAL_TIMEOUT_MS = 60_000;
const BYT5_TIMEOUT_MS = 30_000;

const SYSTEM_PROMPT = `Tu es Fitila, un assistant intelligent et bienveillant.
Réponds TOUJOURS en français, de manière claire et concise.
Maximum 3 phrases courtes (50 mots max).
Ne mets jamais de markdown, JSON, ou formatage spécial.
Si la question est en bariba, comprends-la et réponds en français simple.
N'écris jamais toi-même en baatɔnum (bariba) : la traduction est faite ensuite par un traducteur spécialisé.`;

/** The LLM sometimes appends invented Baatɔnum. Keep only French sentences; a separate translator handles Baatɔnum. */
export function keepFrenchSentences(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]*/g) ?? [text];
  // A French sentence may quote a Baatɔnum word ("On dit « A kua »"); drop it only when most of it is not French.
  const kept = sentences.filter((s) => {
    const words = s.match(/[\p{L}\p{M}']+/gu) ?? [];
    const foreign = words.filter((w) => /[ɔɛŋʋɲƆƐŊ]/u.test(w)).length;
    return words.length === 0 || foreign / words.length < 0.3;
  });
  return normalizeText(kept.join(" ")) || normalizeText(text);
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface FitilaRequest {
  skip_translation?: boolean;
  message?: string;
  history?: ChatMessage[];
  conversationHistory?: ChatMessage[];
  systemPrompt?: string;
  language?: string;
  targetLanguage?: string;
  temperature?: number;
  max_tokens?: number;
}

function normalizeText(input: string): string {
  return (input || "").normalize("NFC").replace(/\s+/g, " ").trim();
}

function sanitizeHistory(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((m: any) => m?.content && ["user", "assistant"].includes(m?.role))
    .map((m: any) => ({ role: m.role, content: normalizeText(String(m.content)) }))
    .filter((m) => m.content.length > 0);
}

async function callActiveAI(args: { messages: ChatMessage[]; temperature: number; maxTokens: number }): Promise<{ text: string; model: string; provider: string; error?: string; retryAfter?: number }> {
  const response = await aiFetch(AI_CHAT_URL, {
    body: JSON.stringify({ messages: args.messages, temperature: args.temperature, max_tokens: args.maxTokens }),
    signal: AbortSignal.timeout(20_000),
  });
  const provider = response.headers.get('X-Fitila-AI-Provider') || '';
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { text: '', model: '', provider, error: data.error?.code || 'llm_unavailable', retryAfter: Number(data.retry_after) || undefined };
  return { text: normalizeText(String(data?.choices?.[0]?.message?.content || '')), model: data.model || response.headers.get('X-Fitila-AI-Model') || '', provider };
}

async function translateViaByT5(args: {
  text: string;
  supabaseUrl: string;
  serviceKey: string;
}): Promise<{ translation: string | null; error?: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), BYT5_TIMEOUT_MS);

    const resp = await fetch(`${args.supabaseUrl}/functions/v1/byt5-bariba-translate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: args.serviceKey,
        Authorization: `Bearer ${args.serviceKey}`,
      },
      body: JSON.stringify({
        text: args.text,
        sourceLang: "french",
        targetLang: "bariba",
        mode: "quality",
        advanced: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      return { translation: null, error: `ByT5 HTTP ${resp.status}: ${body.substring(0, 120)}` };
    }

    const data = await resp.json();
    const translation = typeof data?.translation === "string" ? normalizeText(data.translation) : null;

    if (!translation) {
      return { translation: null, error: data?.error || "ByT5 returned empty translation" };
    }

    console.log('[fitila] ByT5 OK');
    return { translation };
  } catch (e) {
    return { translation: null, error: e instanceof Error ? e.message : "ByT5 failed" };
  }
}

export async function handleChat(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();
  const globalTimer = setTimeout(() => {}, GLOBAL_TIMEOUT_MS);

  try {
    const body: FitilaRequest = await req.json().catch(() => ({}));
    const message = normalizeText(typeof body.message === "string" ? body.message : "");

    if (!message) {
      clearTimeout(globalTimer);
      return new Response(
        JSON.stringify({ error: "Message vide", duration: Date.now() - startedAt }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }


    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");

    const temperature = Math.max(0, Math.min(Number(body.temperature) || 0.3, 1));
    const maxTokens = Math.min(Math.max(Number(body.max_tokens) || 120, 60), 200);

    const history = sanitizeHistory(body.history ?? body.conversationHistory);

    const chatMessages: ChatMessage[] = [
      { role: "system", content: body.systemPrompt?.trim() ? `${SYSTEM_PROMPT}\n\n${body.systemPrompt.trim()}` : SYSTEM_PROMPT },
      ...history,
      { role: "user", content: message },
    ];

    console.log('[fitila] Request received');

    // Use exactly the provider selected by an administrator.
    let llmResult = await callActiveAI({ messages: chatMessages, temperature, maxTokens }).catch((e) => ({ text: "", model: "", provider: "", error: e instanceof Error ? e.message : "llm_unavailable" } as Awaited<ReturnType<typeof callActiveAI>>));
    // One more attempt on a transient upstream failure or timeout (observed intermittently with Gemini).
    if (!llmResult.text && !["llm_not_configured", "llm_forbidden", "llm_rate_limited", "credits_exhausted"].includes(llmResult.error ?? "") && Date.now() - startedAt < 25_000) {
      console.warn(`[fitila] LLM retry after: ${llmResult.error}`);
      llmResult = await callActiveAI({ messages: chatMessages, temperature, maxTokens }).catch((e) => ({ text: "", model: "", provider: "", error: e instanceof Error ? e.message : "llm_unavailable" } as Awaited<ReturnType<typeof callActiveAI>>));
    }
    if (!llmResult.text && (llmResult.error === "llm_not_configured" || llmResult.error === "llm_forbidden")) {
      clearTimeout(globalTimer);
      return new Response(
        JSON.stringify({
          error: "llm_not_configured",
          message: "Le cerveau en ligne de FITILA n'est pas configuré (clé du modèle de langage absente ou sans droit).",
          duration: Date.now() - startedAt,
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (llmResult.error === "llm_rate_limited") {
      clearTimeout(globalTimer);
      const retryAfter = llmResult.retryAfter || 30;
      return new Response(JSON.stringify({
        error: "llm_rate_limited", message: aiFailure(429, retryAfter).message,
        retry_after: retryAfter, duration: Date.now() - startedAt,
      }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(retryAfter) } });
    }

    if (llmResult.error === "credits_exhausted") {
      clearTimeout(globalTimer);
      return new Response(
        JSON.stringify({
          error: "credits_exhausted",
          message: "Les crédits IA sont épuisés. Veuillez recharger votre compte.",
          duration: Date.now() - startedAt,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (llmResult.error || !llmResult.text) {
      throw new Error(llmResult.error || "LLM failed");
    }

    const responseFr = keepFrenchSentences(llmResult.text);

    // Step 2: Translate French → Bariba via ByT5
    let responseBa: string | null = null;
    let isFallback = true;

    if (supabaseUrl && serviceKey && body.skip_translation !== true) {
      const byt5Result = await translateViaByT5({
        text: responseFr,
        supabaseUrl,
        serviceKey,
      });

      if (byt5Result.translation) {
        responseBa = byt5Result.translation;
        isFallback = false;
      } else {
        console.warn(`[fitila] ByT5 translation failed: ${byt5Result.error}`);
      }
    } else if (body.skip_translation !== true) {
      console.warn("[fitila] Missing SUPABASE_URL/key, skipping ByT5 translation");
    }

    clearTimeout(globalTimer);
    const duration = Date.now() - startedAt;

    // Step 3: Return response matching frontend contract
    return new Response(
      JSON.stringify({
        response_ba: responseBa,
        response_fr: responseFr,
        fallback: isFallback,
        model: llmResult.model,
        provider: llmResult.provider,
        duration,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: unknown) {
    clearTimeout(globalTimer);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const isTimeout = /aborted|timeout/i.test(msg);
    const duration = Date.now() - startedAt;

    console.error("[fitila] Error:", e);

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
}

if (Deno.env.get("FITILA_AI_TEST") !== "1") Deno.serve(handleChat);
