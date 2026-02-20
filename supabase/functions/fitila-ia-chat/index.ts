import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GLOBAL_TIMEOUT_MS = 60_000;
const LLM_TIMEOUT_MS = 20_000;
const BYT5_TIMEOUT_MS = 30_000;

const MODELS_TO_TRY = [
  "openai/gpt-5-nano",
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-flash",
  "openai/gpt-5-mini",
];

const SYSTEM_PROMPT = `Tu es Fitila, un assistant intelligent et bienveillant.
Réponds TOUJOURS en français, de manière claire et concise.
Maximum 3 phrases courtes (50 mots max).
Ne mets jamais de markdown, JSON, ou formatage spécial.
Si la question est en bariba, comprends-la et réponds en français simple.`;

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface FitilaRequest {
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

async function callLLMWithFallback(args: {
  apiKey: string;
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
}): Promise<{ text: string; model: string; error?: string }> {
  for (const model of MODELS_TO_TRY) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${args.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: args.messages,
          temperature: args.temperature,
          max_tokens: args.maxTokens,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!resp.ok) {
        const body = await resp.text().catch(() => "");
        console.warn(`[fitila] Model ${model} failed HTTP ${resp.status}: ${body.substring(0, 100)}`);
        continue;
      }

      const data = await resp.json();
      const text = normalizeText(String(data?.choices?.[0]?.message?.content || ""));
      if (!text) {
        console.warn(`[fitila] Model ${model} returned empty response`);
        continue;
      }

      console.log(`[fitila] LLM OK with ${model}: "${text.substring(0, 80)}..."`);
      return { text, model };
    } catch (e) {
      console.warn(`[fitila] Model ${model} error: ${e instanceof Error ? e.message : "unknown"}`);
      continue;
    }
  }

  return { text: "", model: "", error: "Tous les modèles ont échoué" };
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

    console.log(`[fitila] ByT5 OK: "${translation.substring(0, 80)}..."`);
    return { translation };
  } catch (e) {
    return { translation: null, error: e instanceof Error ? e.message : "ByT5 failed" };
  }
}

serve(async (req: Request) => {
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

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

    console.log(`[fitila] Incoming: "${message.substring(0, 120)}"`);

    // Step 1: LLM generates French response
    const llmResult = await callLLMWithFallback({
      apiKey: LOVABLE_API_KEY,
      messages: chatMessages,
      temperature,
      maxTokens,
    });

    if (llmResult.error || !llmResult.text) {
      throw new Error(llmResult.error || "LLM failed");
    }

    const responseFr = llmResult.text;

    // Step 2: Translate French → Bariba via ByT5
    let responseBa: string | null = null;
    let isFallback = true;

    if (supabaseUrl && serviceKey) {
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
    } else {
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
});
