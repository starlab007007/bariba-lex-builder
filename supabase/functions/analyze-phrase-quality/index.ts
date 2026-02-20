import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  normalizeBaribaText,
  analyzeBaribaPairRules,
  clamp01,
  uniqStrings,
  safeJsonExtract,
} from "../_shared/bariba-linguistic-rules.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_TIMEOUT_MS = 20_000;

type PhraseRow = {
  id: string;
  french_text: string | null;
  bariba_text: string | null;
  is_validated?: boolean | null;
  quality_score?: number | null;
  metadata?: Record<string, unknown> | null;
};

type AiAnalysis = {
  index: number;
  quality_score: number;
  issues: string[];
  suggestions: string[];
};

// Alias pour garder le style du fichier existant
const normalizeText = normalizeBaribaText;

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

function buildAnalysisPrompt(batch: PhraseRow[]): string {
  return `Tu es un expert linguiste spécialisé en Bààtɔ̀nú (Bariba), avec priorité au dictionnaire Baatonum-Français (2017).

Analyse la qualité de ces paires de traduction français-bariba et pour chacune donne :
1) Un score de qualité entre 0 et 1
2) Les problèmes détectés (grammaire, cohérence, sens, idiomaticité)
3) Des suggestions d'amélioration concrètes

CRITÈRES LINGUISTIQUES IMPORTANTS :
- "wa" = voir / trouver / obtenir
- "mɛɛri" = regarder / étudier / apprendre
- "mère" = "bii mɛro" (PAS "yaa")
- "yaa" = viande / animal
- "Bonjour (matin)" = "A kpuna n do?" (PAS "Kua dɔ̃ɔ")
- "Bonsoir" = "Bɛɛ ka yoka" (PAS "Kua wɛrɛ")
- "Comment vas-tu ?" = "Anna wunɛn wasi?" (PAS "A kɛra?")
- "Je vais bien / Merci" = "Alaafia" (PAS "Na kɛra sãa sãa")
- "J'ai soif" = "nim nɔru" (PAS "nim nɔnkuru")
- Détecter le bruit OCR / dictionnaire (acc., inacc., imp., entêtes PDF)

Important :
- Si la phrase bariba semble être une entrée dictionnaire brute, baisse fortement le score.
- Réponse STRICTEMENT en JSON (sans markdown, sans commentaire).

Phrases à analyser :
${batch
  .map(
    (p, idx) =>
      `${idx + 1}. FR: "${normalizeText(p.french_text || "")}" | BR: "${normalizeText(p.bariba_text || "")}"`,
  )
  .join("\n")}

Format de réponse attendu :
{
  "analyses": [
    {
      "index": 1,
      "quality_score": 0.85,
      "issues": ["..."],
      "suggestions": ["..."]
    }
  ]
}`;
}

function mergeScores(ruleScore: number, aiScore: number | null): number {
  if (aiScore === null || Number.isNaN(aiScore)) return clamp01(ruleScore);
  // règles > IA (plus stable)
  return clamp01(ruleScore * 0.65 + aiScore * 0.35);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const runInBackground = body?.background === true;
    const pageSize = Math.min(Math.max(Number(body?.pageSize) || 200, 50), 1000);
    const aiBatchSize = Math.min(Math.max(Number(body?.aiBatchSize) || 10, 5), 20);
    const maxPages = Math.min(Math.max(Number(body?.maxPages) || 50, 1), 1000);
    const onlyUnanalyzed = body?.onlyUnanalyzed !== false; // défaut true
    const onlyUnvalidated = body?.onlyUnvalidated === true; // optionnel
    const includeResults = body?.includeResults === true;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY");
    }

    // 1) Vérifier l'utilisateur + admin (client anon)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Client service-role pour lecture/écriture
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const processAnalysis = async () => {
      let allResults: Array<{
        id: string;
        quality_score: number;
        issues: string[];
        suggestions: string[];
        rule_score: number;
        ai_score: number | null;
        notes: string[];
      }> = [];

      let page = 0;
      let totalFetched = 0;
      let totalUpdated = 0;
      let aiFailures = 0;
      let hasMore = true;

      while (hasMore && page < maxPages) {
        let query = db
          .from("training_phrases")
          .select("id, french_text, bariba_text, is_validated, quality_score, metadata")
          .range(page * pageSize, page * pageSize + pageSize - 1);

        if (onlyUnvalidated) query = query.eq("is_validated", false);

        const { data: phraseRows, error: phrasesError } = await query;
        if (phrasesError) throw phrasesError;

        const rows = (phraseRows || []) as PhraseRow[];
        if (rows.length === 0) {
          hasMore = false;
          break;
        }

        page += 1;
        totalFetched += rows.length;
        console.log(`📄 analyze-phrase-quality page=${page} rows=${rows.length}`);

        // Filtre local "onlyUnanalyzed"
        const phrases = rows.filter((p) => {
          if (!onlyUnanalyzed) return true;
          const qa = (p.metadata as any)?.quality_analysis;
          return !qa?.analyzed_at;
        });

        if (phrases.length === 0) continue;

        const analysisResults: typeof allResults = [];

        // Batches pour IA (analyse locale toujours appliquée)
        for (let i = 0; i < phrases.length; i += aiBatchSize) {
          const batch = phrases.slice(i, i + aiBatchSize).map((p) => ({
            ...p,
            french_text: normalizeText(p.french_text || ""),
            bariba_text: normalizeText(p.bariba_text || ""),
          }));

          const localAnalyses = batch.map((p) =>
            analyzeBaribaPairRules(p.french_text || "", p.bariba_text || "")
          );

          let parsedAiAnalyses: AiAnalysis[] = [];

          if (LOVABLE_API_KEY) {
            const prompt = buildAnalysisPrompt(batch);

            try {
              const response = await fetchWithTimeout(
                "https://ai.gateway.lovable.dev/v1/chat/completions",
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${LOVABLE_API_KEY}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    model: "google/gemini-2.5-flash",
                    messages: [
                      {
                        role: "system",
                        content:
                          "Tu es un expert en linguistique et qualité de traductions Bariba (Baatonum). Réponds strictement en JSON valide.",
                      },
                      { role: "user", content: prompt },
                    ],
                    temperature: 0.1,
                    max_tokens: 1800,
                  }),
                },
                AI_TIMEOUT_MS,
              );

              if (!response.ok) {
                aiFailures += 1;
                console.warn("AI API error:", response.status);
              } else {
                const aiData = await response.json();
                const analysisText = aiData?.choices?.[0]?.message?.content ?? "";
                const parsed = safeJsonExtract(analysisText) as { analyses?: AiAnalysis[] } | null;

                if (parsed?.analyses && Array.isArray(parsed.analyses)) {
                  parsedAiAnalyses = parsed.analyses.map((a) => ({
                    index: Number(a.index),
                    quality_score: clamp01(Number(a.quality_score)),
                    issues: Array.isArray(a.issues) ? a.issues.map(String) : [],
                    suggestions: Array.isArray(a.suggestions) ? a.suggestions.map(String) : [],
                  }));
                } else {
                  aiFailures += 1;
                  console.warn("AI response not parseable as analyses JSON");
                }
              }
            } catch (err) {
              aiFailures += 1;
              console.warn("AI call failed:", err);
            }
          }

          for (let j = 0; j < batch.length; j++) {
            const phrase = batch[j];
            const rule = localAnalyses[j];
            const ai = parsedAiAnalyses.find((a) => a.index === j + 1);

            const ruleIssuesText = rule.issues.map((x) => x.issue);
            const ruleSuggestionsText = rule.issues.map((x) => x.suggestion);

            analysisResults.push({
              id: phrase.id,
              quality_score: Number(mergeScores(rule.score, ai?.quality_score ?? null).toFixed(4)),
              issues: uniqStrings([...(ai?.issues ?? []), ...ruleIssuesText]),
              suggestions: uniqStrings([...(ai?.suggestions ?? []), ...ruleSuggestionsText]),
              rule_score: Number(rule.score.toFixed(4)),
              ai_score: ai?.quality_score ?? null,
              notes: rule.notes,
            });
          }

          await sleep(80);
        }

        // Écriture DB
        for (const result of analysisResults) {
          const existing = phrases.find((p) => p.id === result.id);
          const existingMetadata =
            existing?.metadata && typeof existing.metadata === "object" ? existing.metadata : {};

          const metadata = {
            ...existingMetadata,
            quality_analysis: {
              ...(existingMetadata as any)?.quality_analysis,
              issues: result.issues,
              suggestions: result.suggestions,
              rule_score: result.rule_score,
              ai_score: result.ai_score,
              notes: result.notes,
              analyzed_at: new Date().toISOString(),
              analyzer_version: "bariba-v3-hybrid-rules-ai-shared",
            },
            quality_analysis_run: {
              ...(existingMetadata as any)?.quality_analysis_run,
              last_run_at: new Date().toISOString(),
            },
          };

          const { error: updateError } = await db
            .from("training_phrases")
            .update({
              quality_score: result.quality_score,
              metadata,
            })
            .eq("id", result.id);

          if (updateError) {
            console.error(`Failed to update phrase ${result.id}:`, updateError);
          } else {
            totalUpdated += 1;
          }
        }

        allResults = allResults.concat(analysisResults);
      }

      const summary = {
        fetched_rows: totalFetched,
        analyzed: allResults.length,
        updated: totalUpdated,
        ai_failures: aiFailures,
        avg_quality_score:
          allResults.length > 0
            ? Number(
                (
                  allResults.reduce((sum, r) => sum + r.quality_score, 0) / allResults.length
                ).toFixed(4),
              )
            : 0,
        low_quality_count: allResults.filter((r) => r.quality_score < 0.6).length,
        medium_quality_count: allResults.filter((r) => r.quality_score >= 0.6 && r.quality_score < 0.8).length,
        high_quality_count: allResults.filter((r) => r.quality_score >= 0.8).length,
      };

      return { summary, results: allResults };
    };

    if (runInBackground) {
      // @ts-ignore Supabase Edge runtime helper
      EdgeRuntime.waitUntil(processAnalysis());

      return new Response(
        JSON.stringify({
          success: true,
          started: true,
          mode: "background",
          message: "Analyse qualité démarrée en arrière-plan.",
          config: { pageSize, aiBatchSize, maxPages, onlyUnanalyzed, onlyUnvalidated },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const out = await processAnalysis();

    return new Response(
      JSON.stringify({
        success: true,
        mode: "sync",
        ...out.summary,
        ...(includeResults ? { results: out.results } : {}),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("Error in analyze-phrase-quality:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
