import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import corpus from "../_shared/foncier_bariba_corpus.json" with { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LLM_TIMEOUT_MS = 25_000;
const BYT5_TIMEOUT_MS = 25_000;
const TOP_K = 8;
const MIN_RELEVANCE_SCORE = 1; // au moins 1 mot-clé matché

const PRIMARY_MODEL = "google/gemini-2.5-flash";
const FALLBACK_MODEL = "google/gemini-2.5-flash-lite";

const NO_INFO_FR = "Désolé, je ne trouve pas cette information dans le document foncier Bariba fourni.";
const NO_INFO_BA = "Min kun yɛ̃ gari yi tem bausu sariaba tire sɔɔ.";

const SYSTEM_PROMPT = `Tu es 'Fitila Tem IA', un assistant virtuel expertisé. Ta SEULE ET UNIQUE source de connaissances est le document fourni en contexte (Code foncier en langue Bariba — Loi 2013-01 du Bénin). Tu ne dois utiliser AUCUNE de tes connaissances générales pré-entraînées.

RÈGLES STRICTES :
1. Lorsqu'un utilisateur pose une question, cherche la réponse EXCLUSIVEMENT dans le texte du document fourni en contexte.
2. Formule ta réponse en français, claire et concise (max 4 phrases), en utilisant UNIQUEMENT les informations extraites de ce document.
3. Cite systématiquement les numéros d'articles (Saria) sur lesquels tu t'appuies.
4. Si la question porte sur un sujet qui n'est PAS explicitement mentionné dans le document, tu DOIS répondre EXACTEMENT : "${NO_INFO_FR}"
5. Ne tente JAMAIS d'inventer, de déduire ou d'utiliser des connaissances externes.
6. Pas de markdown, pas de JSON, juste du texte clair.`;

interface Article {
  id: number;
  number: string;
  content: string;
  bonu: string;
  baeru: string | null;
  gariWiru: string;
  page: number;
}

const ARTICLES: Article[] = corpus as Article[];

// Stop-words FR + BA courants à ignorer
const STOPWORDS = new Set<string>([
  "le","la","les","un","une","des","de","du","et","ou","à","au","aux","en","dans","sur","par","pour","avec","sans","ce","cette","ces","mon","ma","mes","ton","ta","tes","son","sa","ses","notre","votre","leur","leurs","est","sont","être","avoir","qui","que","quoi","dont","où","quand","comment","pourquoi","si","ne","pas","plus","moins","très","tout","tous","toute","toutes","mais","car","donc","or","ni","puis","ainsi","aussi","alors","aussi","comme","fait","faire","peut","doit","sera","était",
  "ye","ka","ta","tu","na","nu","sɔɔ","mi","mu","mɛ","ba","bù","yi","yè","yɛ","sere","wãa","goo","gee","koo","kpa","saa","sãa",
]);

function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    // garder lettres + apostrophe + caractères bariba
    .replace(/[^\p{L}\p{M}\s']/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(s: string): string[] {
  return normalize(s)
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w));
}

// Pré-tokenize le corpus une seule fois (au cold-start)
const ARTICLE_TOKENS: { id: number; tokens: Set<string>; tokenList: string[] }[] = ARTICLES.map((a) => {
  const text = `${a.number} ${a.content} ${a.bonu} ${a.gariWiru}`;
  const list = tokenize(text);
  return { id: a.id, tokens: new Set(list), tokenList: list };
});

function scoreArticles(query: string): { article: Article; score: number }[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  // IDF approximatif : tokens présents dans peu d'articles ont plus de poids
  const docCount = ARTICLE_TOKENS.length;
  const scored = ARTICLE_TOKENS.map((doc, idx) => {
    let score = 0;
    for (const qt of queryTokens) {
      if (doc.tokens.has(qt)) {
        // fréquence du terme dans le doc
        const tf = doc.tokenList.filter((t) => t === qt).length;
        // nombre de docs qui contiennent le terme (calc à la volée — corpus petit)
        let df = 0;
        for (const d of ARTICLE_TOKENS) if (d.tokens.has(qt)) df++;
        const idf = Math.log(1 + docCount / (df || 1));
        score += tf * idf;
      }
    }
    return { article: ARTICLES[idx], score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, TOP_K);
}

async function callLLM(messages: { role: string; content: string }[], model: string, apiKey: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: 400,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) {
      if (resp.status === 402) throw new Error("credits_exhausted");
      if (resp.status === 429) throw new Error("rate_limited");
      throw new Error(`LLM HTTP ${resp.status}`);
    }
    const data = await resp.json();
    return String(data?.choices?.[0]?.message?.content || "").trim();
  } finally {
    clearTimeout(timer);
  }
}

async function translateFrToBa(text: string, supabaseUrl: string, serviceKey: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), BYT5_TIMEOUT_MS);
    const resp = await fetch(`${supabaseUrl}/functions/v1/byt5-bariba-translate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ text, sourceLang: "french", targetLang: "bariba", mode: "quality", advanced: true }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    const data = await resp.json();
    return typeof data?.translation === "string" ? data.translation.trim() : null;
  } catch {
    return null;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();

  try {
    const body = await req.json().catch(() => ({}));
    const message = String(body?.message || "").trim();

    if (!message) {
      return new Response(JSON.stringify({ error: "Message vide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");

    console.log(`[fitila-tem-ia] Q: "${message.slice(0, 100)}"`);

    // 1) Retrieval
    const ranked = scoreArticles(message);
    const relevant = ranked.filter((r) => r.score >= MIN_RELEVANCE_SCORE);

    let responseFr: string;
    let sources: { id: number; number: string; page: number; content: string }[] = [];

    if (relevant.length === 0) {
      responseFr = NO_INFO_FR;
      console.log("[fitila-tem-ia] No relevant articles found");
    } else {
      // 2) Build context
      const contextBlocks = relevant.map(({ article }) => {
        return `[${article.number} | ${article.gariWiru} > ${article.bonu} | p.${article.page}]\n${article.content}`;
      });
      const contextText = contextBlocks.join("\n\n---\n\n");

      sources = relevant.map(({ article }) => ({
        id: article.id,
        number: article.number,
        page: article.page,
        content: article.content,
      }));

      const userPrompt = `[CONTEXTE — Articles du Code Foncier Bariba]\n${contextText}\n\n[QUESTION]\n${message}\n\n[RÉPONSE — uniquement basée sur le contexte ci-dessus, en français, citant les Saria pertinentes]`;

      // 3) LLM with fallback
      try {
        responseFr = await callLLM(
          [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          PRIMARY_MODEL,
          LOVABLE_API_KEY,
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (msg === "credits_exhausted") {
          return new Response(
            JSON.stringify({ error: "credits_exhausted", message: "Crédits IA épuisés." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        console.warn(`[fitila-tem-ia] Primary failed (${msg}), trying fallback`);
        responseFr = await callLLM(
          [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          FALLBACK_MODEL,
          LOVABLE_API_KEY,
        );
      }

      if (!responseFr) responseFr = NO_INFO_FR;

      // Si le LLM a répondu "no info", on vide les sources
      if (responseFr.includes(NO_INFO_FR)) {
        sources = [];
      }
    }

    // 4) Traduction FR → BA (best-effort)
    let responseBa: string | null = null;
    let isFallback = true;
    if (supabaseUrl && serviceKey && responseFr !== NO_INFO_FR) {
      const ba = await translateFrToBa(responseFr, supabaseUrl, serviceKey);
      if (ba) {
        responseBa = ba;
        isFallback = false;
      }
    } else if (responseFr === NO_INFO_FR) {
      responseBa = NO_INFO_BA;
      isFallback = false;
    }

    return new Response(
      JSON.stringify({
        response_ba: responseBa,
        response_fr: responseFr,
        fallback: isFallback,
        model: PRIMARY_MODEL,
        sources,
        duration: Date.now() - startedAt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[fitila-tem-ia] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg, duration: Date.now() - startedAt }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
