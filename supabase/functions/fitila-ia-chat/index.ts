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

const GLOBAL_TIMEOUT_MS = 60_000;
const STEP_TIMEOUT_MS = 25_000;
const REFINE_TIMEOUT_MS = 6_000;

type ChatRole = "system" | "user" | "assistant";

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface FitilaRequest {
  message?: string;
  history?: ChatMessage[];
  conversationHistory?: ChatMessage[]; // alias toléré
  systemPrompt?: string;
  language?: "fr" | "bariba" | "auto";
  targetLanguage?: "fr" | "bariba" | "auto";
  skipRefine?: boolean;
  temperature?: number;
  max_tokens?: number;
}

function normalizeText(input: string): string {
  return normalizeBaribaText(input);
}

function withTimeout<T>(promise: Promise<T>, ms: number, label = "timeout"): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  return new Promise<T>((resolve, reject) => {
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timer));

    // Si la promesse n'utilise pas ce signal, on garde quand même une barrière temporelle
    setTimeout(() => {
      reject(new Error(label));
    }, ms + 10);
  });
}

async function fetchJsonWithTimeout(
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

function looksLikeBariba(text: string): boolean {
  const t = normalizeText(text).toLowerCase();

  if (!t) return false;

  // indices forts
  if (/[ɔɛɑãɛ̃ĩɔ̃ũ]/u.test(t)) return true;

  const baribaTokens = [
    "alaafia",
    "siara",
    "bii",
    "mɛro",
    "nim",
    "nɔru",
    "kpuna",
    "wasi",
    "durɔ",
    "kasuu",
    "wa",
    "mɛɛri",
    "gura",
  ];

  const hits = baribaTokens.filter((w) => t.includes(w)).length;
  return hits >= 1;
}

function buildBaseSystemPrompt(language: "fr" | "bariba" | "auto", custom?: string): string {
  const defaultPrompt = `
Tu es Fitila IA, un assistant utile, clair et naturel.
Priorités :
1) Répondre de façon pratique, concise et exacte
2) Quand la demande touche au Bariba/Baatonum, utiliser des formulations naturelles et cohérentes
3) Éviter les placeholders, JSON, markdown inutile
4) Si l'utilisateur écrit en français, répondre en français sauf demande contraire
5) Si l'utilisateur écrit en Bariba, répondre en Bariba naturel (ou bilingue si nécessaire)

Règles linguistiques Bariba critiques :
- "wa" = voir / trouver / obtenir
- "mɛɛri" = regarder / étudier / apprendre
- "mère" = "bii mɛro"
- "Bonjour (matin)" = "A kpuna n do?"
- "Bonsoir" = "Bɛɛ ka yoka"
- "Comment vas-tu ?" = "Anna wunɛn wasi?"
- "Je vais bien / Merci" = "Alaafia"
- "J'ai soif" = "nim nɔru"
`.trim();

  const langHint =
    language === "bariba"
      ? "\nRéponds prioritairement en Bariba (Baatonum)."
      : language === "fr"
      ? "\nRéponds prioritairement en français."
      : "\nDétecte automatiquement la langue la plus appropriée selon l'utilisateur.";

  return custom?.trim()
    ? `${defaultPrompt}\n\nInstruction supplémentaire:\n${custom.trim()}${langHint}`
    : `${defaultPrompt}${langHint}`;
}

function sanitizeHistory(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((m) => {
      const role = (m as any)?.role;
      const content = normalizeText(String((m as any)?.content || ""));
      if (!content) return null;
      if (role !== "system" && role !== "user" && role !== "assistant") return null;
      return { role, content } as ChatMessage;
    })
    .filter(Boolean) as ChatMessage[];
}

async function callLovableChat(args: {
  apiKey: string;
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
}): Promise<{ text: string; model?: string; error?: string }> {
  const resp = await fetchJsonWithTimeout(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: args.messages,
        temperature: args.temperature,
        max_tokens: args.maxTokens,
      }),
    },
    STEP_TIMEOUT_MS,
  );

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    return { text: "", error: `Chat HTTP ${resp.status}: ${body.substring(0, 200)}` };
  }

  const data = await resp.json().catch(() => ({}));
  const text = normalizeText(String(data?.choices?.[0]?.message?.content || ""));
  const model = String(data?.model || "google/gemini-2.5-flash");

  if (!text) return { text: "", model, error: "Réponse vide du modèle" };

  return { text, model };
}

async function tryRefineBaribaText(args: {
  text: string;
  originalInput: string;
}): Promise<{ refined?: string; changes?: string[]; confidence?: number; error?: string }> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceKey) {
      return { error: "SUPABASE_URL / key missing for refine call" };
    }

    const resp = await fetchJsonWithTimeout(
      `${supabaseUrl}/functions/v1/refine-bariba`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          text: args.text,
          type: "translation",
          direction: "fr-ba",
          originalInput: args.originalInput,
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
      changes: Array.isArray(data?.changes) ? data.changes.map(String) : [],
      confidence: typeof data?.confidence === "number" ? data.confidence : undefined,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Refine failed" };
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();
  const globalController = new AbortController();
  const globalTimer = setTimeout(() => globalController.abort(), GLOBAL_TIMEOUT_MS);

  try {
    const body: FitilaRequest = await req.json().catch(() => ({}));

    const rawMessage = typeof body.message === "string" ? body.message : "";
    const message = normalizeText(rawMessage);
    const skipRefine = body.skipRefine === true;

    const requestedLang = (body.targetLanguage || body.language || "auto") as "fr" | "bariba" | "auto";
    const temperature = Math.max(0, Math.min(Number(body.temperature) || 0.3, 1));
    const maxTokens = Math.min(Math.max(Number(body.max_tokens) || 800, 120), 2000);

    if (!message) {
      clearTimeout(globalTimer);
      return new Response(
        JSON.stringify({ error: "Message vide", duration: Date.now() - startedAt }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY missing");
    }

    const history = sanitizeHistory(body.history ?? body.conversationHistory);
    const systemPrompt = buildBaseSystemPrompt(requestedLang, body.systemPrompt);

    const chatMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...history.filter((m) => m.role !== "system"),
      { role: "user", content: message },
    ];

    console.log(`[fitila-ia] Incoming message (${requestedLang}) => ${message.substring(0, 120)}`);

    const chatResult = await callLovableChat({
      apiKey: LOVABLE_API_KEY,
      messages: chatMessages,
      temperature,
      maxTokens,
    });

    if (chatResult.error || !chatResult.text) {
      throw new Error(chatResult.error || "Chat failed");
    }

    let reply = normalizeText(chatResult.text);
    let refineMeta: {
      attempted: boolean;
      applied: boolean;
      error?: string;
      changes?: string[];
      confidence?: number;
    } = {
      attempted: false,
      applied: false,
    };

    // Nettoyage local minimal toujours
    reply = applyLocalBaribaCorrections(reply);

    // Rejet bruit UI
    if (isInvalidUiLikeText(reply)) {
      reply = "Je n’ai pas pu générer une réponse propre. Réessaie avec une question plus précise.";
    }

    // Raffinage Bariba si pertinent (et si non désactivé)
    const shouldRefine =
      !skipRefine &&
      (
        requestedLang === "bariba" ||
        looksLikeBariba(message) ||
        looksLikeBariba(reply) ||
        /bariba|baatonum|bààtɔ̀nú/i.test(message)
      );

    if (shouldRefine && reply && !isInvalidUiLikeText(reply)) {
      refineMeta.attempted = true;

      const refineRes = await tryRefineBaribaText({
        text: reply,
        originalInput: message,
      });

      if (refineRes.refined && !isInvalidUiLikeText(refineRes.refined)) {
        const localRefined = applyLocalBaribaCorrections(refineRes.refined);
        if (localRefined) {
          reply = localRefined;
          refineMeta.applied = true;
          refineMeta.changes = refineRes.changes;
          refineMeta.confidence = refineRes.confidence;
        }
      } else if (refineRes.error) {
        refineMeta.error = refineRes.error;
      }
    }

    clearTimeout(globalTimer);

    const duration = Date.now() - startedAt;

    return new Response(
      JSON.stringify({
        reply,
        text: reply, // alias compat front
        language: requestedLang === "auto" ? (looksLikeBariba(reply) ? "bariba" : "fr") : requestedLang,
        model: chatResult.model || "google/gemini-2.5-flash",
        refine: refineMeta,
        duration,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e: unknown) {
    clearTimeout(globalTimer);

    const msg = e instanceof Error ? e.message : "Unknown error";
    const isTimeout = /aborted|timeout/i.test(msg);
    const duration = Date.now() - startedAt;

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
