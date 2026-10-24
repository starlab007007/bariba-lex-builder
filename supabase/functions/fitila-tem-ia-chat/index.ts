import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { aiFetch, AI_CHAT_URL, aiFailure } from "../_shared/ai-provider.ts";

// Mode EN LIGNE de Fitila Tem IA (assistant conversationnel du Code foncier
// bariba). Le mode HORS LIGNE (toujours actif, même sans réseau) reste la
// recherche locale 100% embarquée :
//   - src/lib/foncierRAG.ts (web) / fitila_flutter/lib/core/foncier_rag.dart
//   - src/data/foncier_bariba_corpus.json — même corpus, 207 articles
// Cette fonction est appelée UNIQUEMENT quand une connexion est disponible,
// pour obtenir une réponse qui comprend, raisonne et reformule naturellement
// — tout en restant strictement bornée aux articles retrouvés localement
// (retrieval-augmented generation : jamais de connaissance générale, jamais
// d'invention). Si l'appel échoue (pas de réseau, erreur serveur), le client
// retombe automatiquement sur le moteur local hors ligne.
//
// Le corpus (207 articles) est chargé à l'exécution depuis la table Postgres
// `public.foncier_bariba_corpus` plutôt qu'importé statiquement depuis un
// fichier JSON : un fichier d'environ 89 Ko ne peut pas être intégré de façon
// fiable dans un seul déploiement de fonction edge (le contenu se tronque
// silencieusement), alors que la table se remplit en plusieurs petites
// requêtes, indépendamment du déploiement du code. Même contenu que le
// fichier hors ligne (src/data/foncier_bariba_corpus.json), chargé une seule
// fois par instance et mis en cache en mémoire (corpus statique, 207 lignes).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GLOBAL_TIMEOUT_MS = 60_000;
const BYT5_TIMEOUT_MS = 25_000;
const TOP_K = 8;
const MIN_RELEVANCE_SCORE = 1; // au moins 1 mot-clé matché

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function normalizeText(input: string): string {
  return (input || "").normalize("NFC").replace(/\s+/g, " ").trim();
}

/** Garde le contexte des tours précédents pour que l'IA comprenne les
 * questions de suivi ("et pour un champ agricole ?") sans tout répéter. */
function sanitizeHistory(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((m: any) => m?.content && ["user", "assistant"].includes(m?.role))
    .map((m: any) => ({ role: m.role, content: normalizeText(String(m.content)) }))
    .filter((m) => m.content.length > 0)
    .slice(-8);
}

const NO_INFO_FR = "Désolé, je ne trouve pas cette information dans le Code foncier bariba. Pouvez-vous reformuler ou préciser votre préoccupation ?";
const NO_INFO_BA = "Min kun yɛ̃ gari yi tem bausu sariaba tire sɔɔ. A ko reformule ko na kon preoccupation yiru ɔ̃ɔ sa?";

const SYSTEM_PROMPT = `Tu es « Tem IA », l'assistant conversationnel du Code foncier bariba (Loi 2013-01 du Bénin). Ta SEULE ET UNIQUE source de connaissances est le contexte fourni (des extraits du Code foncier retrouvés localement). Tu ne dois utiliser AUCUNE connaissance générale pré-entraînée sur le droit foncier.

RÈGLES STRICTES :
1. Comprends d'abord la préoccupation réelle de la personne avant de répondre. Si sa question est ambiguë ou peut recouvrir plusieurs situations différentes, pose UNE question de clarification brève plutôt que de deviner.
2. Cherche la réponse EXCLUSIVEMENT dans le contexte fourni, en raisonnant sur son contenu pour reformuler une explication claire et naturelle — ne te contente pas de recopier l'extrait brut.
3. Cite systématiquement le ou les numéros d'articles (Saria) sur lesquels tu t'appuies (ex : « Selon l'article Saria 14se, ... »).
4. Réponds en français, de façon chaleureuse et naturelle, en 2 à 5 phrases courtes.
5. Termine ta réponse par une question du type « Avez-vous une autre préoccupation concernant votre terrain ou vos papiers fonciers ? », pour continuer à assister la personne jusqu'à satisfaction complète — SAUF quand tu réponds par le message d'absence d'information ci-dessous.
6. Si le contexte fourni ne permet PAS de répondre à la question, réponds EXACTEMENT : "${NO_INFO_FR}"
7. Ne tente JAMAIS d'inventer, de déduire au-delà du texte fourni, ou d'utiliser des connaissances externes.
8. Pas de markdown, pas de JSON, juste du texte clair.`;

// Salutation seule, sans question de fond : on répond par un accueil chaleureux
// sans faire tourner la recherche ni le modèle — rapide, gratuit, sans risque.
const GREETING_ONLY = /^(bonjour|bonsoir|salut|coucou|hello|slt|cc|bonne\s+(soir[ée]e?|journ[ée]e?|nuit)|merci(\s+beaucoup)?|au\s+revoir|bye)[\s!.,?]*$/i;
const GREETING_WELCOME_FR = "Bonjour, je suis Tem IA, l'assistant du Code foncier bariba. Je peux vous aider pour toute question sur le titre foncier, le bornage, l'enregistrement, les litiges ou la succession foncière. Quelle est votre préoccupation ?";

interface Article {
  id: number;
  number: string;
  content: string;
  bonu: string;
  baeru: string | null;
  gariWiru: string;
  page: number;
}

let ARTICLES: Article[] = [];

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

// Pré-tokenisé une fois le corpus chargé depuis la base (voir ensureCorpusLoaded).
let ARTICLE_TOKENS: { id: number; tokens: Set<string>; tokenList: string[] }[] = [];

let corpusLoadPromise: Promise<void> | null = null;

/**
 * Charge le corpus des 207 articles depuis la table `public.foncier_bariba_corpus`
 * et le met en cache en mémoire pour la durée de vie de l'instance (cold start).
 * Le corpus est petit (207 lignes) et statique, donc un chargement unique par
 * instance suffit — pas besoin de le refaire à chaque requête.
 */
async function ensureCorpusLoaded(): Promise<void> {
  if (ARTICLES.length > 0) return;
  if (!corpusLoadPromise) {
    corpusLoadPromise = (async () => {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
      if (!supabaseUrl || !serviceKey) {
        throw new Error("Configuration Supabase manquante pour charger le corpus du Code foncier.");
      }
      const supabase = createClient(supabaseUrl, serviceKey);
      const { data, error } = await supabase
        .from("foncier_bariba_corpus")
        .select("id, number, content, bonu, baeru, gari_wiru, page")
        .order("id", { ascending: true });
      if (error) throw new Error(`Chargement du corpus impossible : ${error.message}`);

      const articles: Article[] = (data ?? []).map((row: any) => ({
        id: row.id,
        number: row.number,
        content: row.content,
        bonu: row.bonu,
        baeru: row.baeru,
        gariWiru: row.gari_wiru,
        page: row.page,
      }));

      ARTICLES = articles;
      ARTICLE_TOKENS = articles.map((a) => {
        const text = `${a.number} ${a.content} ${a.bonu} ${a.gariWiru}`;
        const list = tokenize(text);
        return { id: a.id, tokens: new Set(list), tokenList: list };
      });
    })();
  }
  return corpusLoadPromise;
}

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

/** Même convention que fitila-ia-chat : aiFetch choisit lui-même le
 * fournisseur/modèle actif (réglages admin) et l'authentification — on ne
 * fixe ni modèle ni clé ici. */
async function callActiveAI(messages: { role: string; content: string }[]): Promise<{ text: string; model: string; provider: string; error?: string; retryAfter?: number }> {
  const response = await aiFetch(AI_CHAT_URL, {
    body: JSON.stringify({ messages, temperature: 0.2, max_tokens: 400 }),
    signal: AbortSignal.timeout(20_000),
  });
  const provider = response.headers.get("X-Fitila-AI-Provider") || "";
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { text: "", model: "", provider, error: data.error?.code || "llm_unavailable", retryAfter: Number(data.retry_after) || undefined };
  }
  return {
    text: String(data?.choices?.[0]?.message?.content || "").trim(),
    model: data.model || response.headers.get("X-Fitila-AI-Model") || "",
    provider,
  };
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

export async function handleChat(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  const globalTimer = setTimeout(() => {}, GLOBAL_TIMEOUT_MS);

  try {
    const body = await req.json().catch(() => ({}));
    const message = normalizeText(typeof body?.message === "string" ? body.message : "");
    const history = sanitizeHistory(body?.history ?? body?.conversationHistory);

    if (!message) {
      clearTimeout(globalTimer);
      return new Response(JSON.stringify({ error: "Message vide", duration: Date.now() - startedAt }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");

    console.log(`[fitila-tem-ia] Q: "${message.slice(0, 100)}"`);

    // 0) Salutation pure : accueil chaleureux immédiat, sans recherche ni LLM
    // (uniquement en tout début de conversation — un "merci" après plusieurs
    // échanges ne doit pas réinitialiser l'accueil).
    if (history.length === 0 && GREETING_ONLY.test(message)) {
      let ba: string | null = null;
      if (supabaseUrl && serviceKey) ba = await translateFrToBa(GREETING_WELCOME_FR, supabaseUrl, serviceKey);
      clearTimeout(globalTimer);
      return new Response(
        JSON.stringify({
          response_ba: ba,
          response_fr: GREETING_WELCOME_FR,
          fallback: !ba,
          sources: [],
          duration: Date.now() - startedAt,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1) Retrieval (même moteur, même corpus que le mode hors ligne)
    await ensureCorpusLoaded();
    const ranked = scoreArticles(message);
    const relevant = ranked.filter((r) => r.score >= MIN_RELEVANCE_SCORE);

    let responseFr: string;
    let sources: { id: number; number: string; page: number; content: string }[] = [];
    let modelUsed = "";
    let providerUsed = "";

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

      const userPrompt = `[CONTEXTE — Articles du Code foncier bariba retrouvés localement]\n${contextText}\n\n[QUESTION DE LA PERSONNE]\n${message}\n\n[RÉPONSE — uniquement basée sur le contexte ci-dessus, en français, citant les Saria pertinentes, en terminant par une question de suivi]`;

      const messages: ChatMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...history,
        { role: "user", content: userPrompt },
      ];

      let llmResult = await callActiveAI(messages).catch((e) => ({ text: "", model: "", provider: "", error: e instanceof Error ? e.message : "llm_unavailable" }));
      if (!llmResult.text && !["llm_not_configured", "llm_forbidden", "llm_rate_limited", "credits_exhausted"].includes(llmResult.error ?? "") && Date.now() - startedAt < 25_000) {
        console.warn(`[fitila-tem-ia] LLM retry after: ${llmResult.error}`);
        llmResult = await callActiveAI(messages).catch((e) => ({ text: "", model: "", provider: "", error: e instanceof Error ? e.message : "llm_unavailable" }));
      }

      if (llmResult.error === "credits_exhausted") {
        clearTimeout(globalTimer);
        return new Response(
          JSON.stringify({ error: "credits_exhausted", message: "Les crédits IA sont épuisés. Veuillez recharger votre compte.", duration: Date.now() - startedAt }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (llmResult.error === "llm_rate_limited") {
        clearTimeout(globalTimer);
        const retryAfter = llmResult.retryAfter || 30;
        return new Response(
          JSON.stringify({ error: "llm_rate_limited", message: aiFailure(429, retryAfter).message, retry_after: retryAfter, duration: Date.now() - startedAt }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(retryAfter) } },
        );
      }
      if (llmResult.error === "llm_not_configured" || llmResult.error === "llm_forbidden") {
        clearTimeout(globalTimer);
        return new Response(
          JSON.stringify({
            error: "llm_not_configured",
            message: "Le cerveau en ligne de Tem IA n'est pas configuré (clé du modèle de langage absente ou sans droit).",
            duration: Date.now() - startedAt,
          }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      modelUsed = llmResult.model;
      providerUsed = llmResult.provider;
      responseFr = normalizeText(llmResult.text) || NO_INFO_FR;

      // Si le modèle a quand même répondu "pas d'info", on vide les sources.
      if (responseFr.includes(NO_INFO_FR)) {
        sources = [];
      }
    }

    // 3) Traduction FR → BA (best-effort)
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

    clearTimeout(globalTimer);
    return new Response(
      JSON.stringify({
        response_ba: responseBa,
        response_fr: responseFr,
        fallback: isFallback,
        model: modelUsed,
        provider: providerUsed,
        sources,
        duration: Date.now() - startedAt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    clearTimeout(globalTimer);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const isTimeout = /aborted|timeout/i.test(msg);
    console.error("[fitila-tem-ia] Error:", e);
    return new Response(
      JSON.stringify({ error: isTimeout ? "Temps de réponse dépassé" : msg, duration: Date.now() - startedAt }),
      { status: isTimeout ? 504 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
}

if (Deno.env.get("FITILA_AI_TEST") !== "1") Deno.serve(handleChat);
