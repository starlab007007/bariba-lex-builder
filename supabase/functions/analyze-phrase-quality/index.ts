import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

type RuleIssue = {
  code: string;
  severity: "low" | "medium" | "high";
  issue: string;
  suggestion: string;
};

type RuleAnalysis = {
  score: number; // 0..1
  issues: RuleIssue[];
  notes: string[];
};

type AiAnalysis = {
  index: number;
  quality_score: number;
  issues: string[];
  suggestions: string[];
};

function normalizeText(input: string): string {
  return (input || "").normalize("NFC").replace(/\s+/g, " ").trim();
}

function hasBaribaDiacritics(text: string): boolean {
  return /[ɔɛɑãɛ̃ĩɔ̃ũ̀́]/u.test(text);
}

function containsAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(text));
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function uniqStrings(arr: string[]): string[] {
  return [...new Set(arr.map((s) => s.trim()).filter(Boolean))];
}

function safeJsonExtract(text: string): unknown | null {
  if (!text) return null;

  const cleaned = text
    .replace(/```json/gi, "```")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // continue
  }

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
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

function analyzeBaribaPairRules(frenchRaw: string, baribaRaw: string): RuleAnalysis {
  const french = normalizeText(frenchRaw).toLowerCase();
  const bariba = normalizeText(baribaRaw);

  const issues: RuleIssue[] = [];
  const notes: string[] = [];
  let score = 0.9;

  if (!bariba) {
    return {
      score: 0,
      issues: [
        {
          code: "EMPTY_BARIBA",
          severity: "high",
          issue: "Traduction bariba vide.",
          suggestion: "Ajouter une traduction bariba complète.",
        },
      ],
      notes: [],
    };
  }

  // Bruit OCR / dictionnaire brut / artefacts
  if (
    containsAny(bariba, [
      /dictionnaire bariba - français/iu,
      /<PARSED TEXT FOR PAGE/iu,
      /\bacc\./iu,
      /\binacc\./iu,
      /\bimp\./iu,
    ])
  ) {
    issues.push({
      code: "OCR_OR_DICTIONARY_NOISE",
      severity: "high",
      issue: "La phrase semble contenir du bruit OCR ou une entrée dictionnaire brute.",
      suggestion: "Conserver uniquement la phrase cible, sans définitions ni marques grammaticales.",
    });
    score -= 0.35;
  }

  // Longueur / structure
  if (bariba.length < 2) {
    issues.push({
      code: "TOO_SHORT",
      severity: "high",
      issue: "Traduction trop courte pour être fiable.",
      suggestion: "Fournir une phrase ou expression complète.",
    });
    score -= 0.3;
  }

  if (/[{}[\]]/.test(bariba)) {
    issues.push({
      code: "PLACEHOLDER_OR_JSON",
      severity: "medium",
      issue: "La traduction semble contenir des marqueurs techniques ou JSON.",
      suggestion: "Nettoyer les placeholders et garder uniquement le texte Bariba.",
    });
    score -= 0.15;
  }

  // Erreurs critiques connues
  if (french.includes("bonjour") && /\bKua dɔ̃ɔ\b/iu.test(bariba)) {
    issues.push({
      code: "BAD_GREETING_MORNING",
      severity: "high",
      issue: `Salutation matin erronée ("Kua dɔ̃ɔ").`,
      suggestion: `Utiliser "A kpuna n do?" pour "Bonjour (matin)".`,
    });
    score -= 0.35;
  }

  if (french.includes("bonsoir") && /\bKua wɛrɛ\b/iu.test(bariba)) {
    issues.push({
      code: "BAD_GREETING_EVENING",
      severity: "high",
      issue: `Salutation du soir erronée ("Kua wɛrɛ").`,
      suggestion: `Utiliser "Bɛɛ ka yoka" pour "Bonsoir".`,
    });
    score -= 0.35;
  }

  if ((french.includes("comment") && french.includes("vas")) && /\bA kɛra\??\b/iu.test(bariba)) {
    issues.push({
      code: "BAD_HOW_ARE_YOU",
      severity: "high",
      issue: `"A kɛra?" est incorrect pour "Comment vas-tu ?"`,
      suggestion: `Utiliser "Anna wunɛn wasi?"`,
    });
    score -= 0.35;
  }

  if ((french.includes("je vais bien") || french.includes("ça va")) && /\bNa kɛra sãa sãa\b/iu.test(bariba)) {
    issues.push({
      code: "BAD_IM_FINE",
      severity: "high",
      issue: `"Na kɛra sãa sãa" est incorrect pour la réponse de salutation.`,
      suggestion: `Utiliser "Alaafia".`,
    });
    score -= 0.35;
  }

  if (french.includes("merci") && /\bA nii koo\b/iu.test(bariba)) {
    issues.push({
      code: "BAD_THANKS",
      severity: "high",
      issue: `"A nii koo" n’est pas la forme de référence confirmée pour "merci".`,
      suggestion: `Préférer "siara", "a kua", "ami" ou "Na nun siara" selon le contexte.`,
    });
    score -= 0.3;
  }

  if (french.includes("mère") && /\bNɛn yaa\b/iu.test(bariba)) {
    issues.push({
      code: "MOTHER_CONFUSION",
      severity: "high",
      issue: `"yaa" renvoie à viande/animal, pas "mère".`,
      suggestion: `Utiliser "bii mɛro" pour "mère".`,
    });
    score -= 0.4;
  }

  if (
    (french.includes("soif") || french.includes("j'ai soif") || french.includes("j’ai soif")) &&
    /\bn[ɔo]nkuru\b/iu.test(bariba)
  ) {
    issues.push({
      code: "BAD_THIRST_TERM",
      severity: "high",
      issue: `Forme non validée pour "soif" ("nɔnkuru").`,
      suggestion: `Utiliser "nim nɔru".`,
    });
    score -= 0.35;
  }

  // wa vs mɛɛri
  const mentionsVoir = [
    "voir",
    "trouver",
    "obtenir",
    "j'ai vu",
    "j’ai vu",
    "tu vois",
    "il voit",
    "as-tu vu",
    "avez-vous vu",
    "je trouve",
  ].some((w) => french.includes(w));

  if (mentionsVoir && /\bmɛɛri\b/iu.test(bariba) && !/\bwa\b/iu.test(bariba)) {
    issues.push({
      code: "WA_VS_MEERI",
      severity: "high",
      issue: `"mɛɛri" utilisé pour "voir/trouver/obtenir" (faux ami fréquent).`,
      suggestion: `Utiliser "wa" pour voir/trouver/obtenir ; réserver "mɛɛri" à regarder/étudier/apprendre.`,
    });
    score -= 0.35;
  }

  const mentionsRegarderEtudier = ["regarder", "étudier", "apprendre"].some((w) => french.includes(w));
  if (mentionsRegarderEtudier && /\bwa\b/iu.test(bariba) && !/\bmɛɛri\b/iu.test(bariba)) {
    issues.push({
      code: "MEERI_EXPECTED",
      severity: "medium",
      issue: `Le sens "regarder/étudier/apprendre" attend plutôt "mɛɛri".`,
      suggestion: `Vérifier si "mɛɛri" est plus approprié selon le contexte.`,
    });
    score -= 0.15;
  }

  // Proverbe
  if (french.includes("qui cherche trouve") && /Goo u g[ɑaã̃]+ kasuu,\s*u ga bɛri/iu.test(bariba)) {
    issues.push({
      code: "BAD_PROVERB",
      severity: "high",
      issue: "Proverbe mal formé.",
      suggestion: `Utiliser "Durɔ goo u kasuu, u ga bɛri".`,
    });
    score -= 0.35;
  }

  if (!hasBaribaDiacritics(bariba)) {
    notes.push("Pas de diacritiques détectés — possible mais vérifier la graphie (ɔ, ɛ, etc.).");
    score -= 0.05;
  }

  if (bariba.length > 260) {
    issues.push({
      code: "POSSIBLE_DICTIONARY_DUMP",
      severity: "medium",
      issue: "Traduction très longue — possible collage d’entrée dictionnaire brute.",
      suggestion: "Conserver uniquement la phrase cible, sans définitions ni formes grammaticales.",
    });
    score -= 0.12;
  }

  if (/\b(A kpuna n do\?|Bɛɛ ka yoka|Anna wunɛn wasi\?|Alaafia|bii mɛro|nim nɔru)\b/iu.test(bariba)) {
    notes.push("Forme idiomatique validée détectée.");
    score += 0.05;
  }

  return {
    score: clamp01(score),
    issues,
    notes,
  };
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

        if (phrases.length === 0) {
          continue;
        }

        const analysisResults: typeof allResults = [];

        // Batches pour IA (analyse locale toujours appliquée)
        for (let i = 0; i < phrases.length; i += aiBatchSize) {
          const batch = phrases.slice(i, i + aiBatchSize).map((p) => ({
            ...p,
            french_text: normalizeText(p.french_text || ""),
            bariba_text: normalizeText(p.bariba_text || ""),
          }));

          const localAnalyses = batch.map((p) => analyzeBaribaPairRules(p.french_text || "", p.bariba_text || ""));

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
              analyzer_version: "bariba-v3-hybrid-rules-ai",
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
