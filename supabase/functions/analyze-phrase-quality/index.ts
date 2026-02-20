import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PhraseRow = {
  id: string;
  french_text: string;
  bariba_text: string;
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
  return (input || "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

function containsAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(text));
}

function hasBaribaDiacritics(text: string): boolean {
  return /[ɔɛɑãɛ̃ĩɔ̃ũ̀́]/u.test(text);
}

function safeJsonExtract(text: string): unknown | null {
  if (!text) return null;

  // Remove markdown fences if present
  const cleaned = text
    .replace(/```json/gi, "```")
    .replace(/```/g, "")
    .trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch {
    // continue
  }

  // Fallback: extract first JSON object
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function uniqStrings(arr: string[]): string[] {
  return [...new Set(arr.map((s) => s.trim()).filter(Boolean))];
}

function analyzeBaribaPairRules(frenchRaw: string, baribaRaw: string): RuleAnalysis {
  const french = normalizeText(frenchRaw).toLowerCase();
  const bariba = normalizeText(baribaRaw);

  const issues: RuleIssue[] = [];
  const notes: string[] = [];
  let score = 0.9; // start optimistic and penalize

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

  // Heuristique de bruit OCR / artefacts
  if (containsAny(bariba, [/dictionnaire bariba - français/iu, /<PARSED TEXT FOR PAGE/iu])) {
    issues.push({
      code: "OCR_ARTIFACT",
      severity: "high",
      issue: "La phrase contient du bruit d’extraction (artefact OCR / PDF).",
      suggestion: "Supprimer les fragments de page et conserver uniquement la phrase utile.",
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

  // Corrections critiques validées (règles bloquantes)
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
      suggestion: `Utiliser "Anna wunɛn wasi?" (ou variante confirmée).`,
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
      code: "MOTHER_CONFUSED_WITH_MEAT",
      severity: "high",
      issue: `"yaa" renvoie à viande/animal, pas "mère".`,
      suggestion: `Utiliser "bii mɛro" pour "mère".`,
    });
    score -= 0.4;
  }

  if ((french.includes("soif") || french.includes("j'ai soif") || french.includes("j’ai soif")) && /\bn[ɔo]nkuru\b/iu.test(bariba)) {
    issues.push({
      code: "BAD_THIRST_TERM",
      severity: "high",
      issue: `Forme non validée pour "soif" ("nɔnkuru").`,
      suggestion: `Utiliser "nim nɔru".`,
    });
    score -= 0.35;
  }

  // wa vs mɛɛri (très important)
  const mentionsVoir = [
    "voir",
    "trouver",
    "obtenir",
    "j'ai vu",
    "tu vois",
    "il voit",
    "as-tu vu",
    "avez-vous vu",
    "je trouve",
  ].some((w) => french.includes(w));

  if (mentionsVoir && /\bmɛɛri\b/iu.test(bariba)) {
    // On pénalise seulement s'il n'y a pas "wa" et si c'est bien une traduction simple
    if (!/\bwa\b/iu.test(bariba)) {
      issues.push({
        code: "WA_VS_MEERI",
        severity: "high",
        issue: `"mɛɛri" utilisé pour "voir/trouver/obtenir" (faux ami fréquent).`,
        suggestion: `Utiliser "wa" pour voir/trouver/obtenir ; réserver "mɛɛri" à regarder/étudier/apprendre.`,
      });
      score -= 0.35;
    }
  }

  const mentionsRegarderEtudier = ["regarder", "étudier", "apprendre"].some((w) => french.includes(w));
  if (mentionsRegarderEtudier && /\bwa\b/iu.test(bariba) && !/\bmɛɛri\b/iu.test(bariba)) {
    issues.push({
      code: "MEERI_EXPECTED",
      severity: "medium",
      issue: `Le sens "regarder/étudier/apprendre" attend plutôt "mɛɛri".`,
      suggestion: `Vérifier si "mɛɛri" est plus approprié que "wa" selon le contexte.`,
    });
    score -= 0.15;
  }

  // Proverbe connu
  if (french.includes("qui cherche trouve") && /Goo u g[ɑaã̃]+ kasuu,\s*u ga bɛri/iu.test(bariba)) {
    issues.push({
      code: "BAD_PROVERB_STRUCTURE",
      severity: "high",
      issue: `Proverbe mal formé (emploi incorrect de "goo").`,
      suggestion: `Utiliser "Durɔ goo u kasuu, u ga bɛri".`,
    });
    score -= 0.35;
  }

  // Vérification légère de naturalité Bariba
  if (!hasBaribaDiacritics(bariba)) {
    notes.push("Pas de diacritiques détectés — possible mais vérifier la graphie (ɔ, ɛ, etc.).");
    score -= 0.05;
  }

  // Phrases très longues = risque d'exemple dictionnaire brut collé
  if (bariba.length > 260) {
    issues.push({
      code: "POSSIBLE_DICTIONARY_DUMP",
      severity: "medium",
      issue: "Traduction très longue — possible collage d’entrée dictionnaire brute.",
      suggestion: "Conserver uniquement la phrase cible, sans définitions ni formes grammaticales.",
    });
    score -= 0.12;
  }

  // Bonus de confiance si des formes de référence sont détectées
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

CRITÈRES LINGUISTIQUES IMPORTANTS (à vérifier) :
- "wa" = voir / trouver / obtenir
- "mɛɛri" = regarder / étudier / apprendre
- "mère" = "bii mɛro" (PAS "yaa")
- "yaa" = viande / animal
- "Bonjour (matin)" = "A kpuna n do?" (PAS "Kua dɔ̃ɔ")
- "Bonsoir" = "Bɛɛ ka yoka" (PAS "Kua wɛrɛ")
- "Comment vas-tu ?" = "Anna wunɛn wasi?" (PAS "A kɛra?")
- "Je vais bien / Merci" = "Alaafia" (PAS "Na kɛra sãa sãa")
- "J'ai soif" = "nim nɔru" (PAS "nim nɔnkuru")
- Détecter si la traduction contient du bruit de dictionnaire / OCR (ex: "dictionnaire bariba - français", définitions collées)

Important :
- Si la phrase bariba semble être une entrée dictionnaire brute (définitions, inacc./acc./imp., bruit PDF), baisse fortement le score.
- Réponse STRICTEMENT en JSON (sans markdown, sans commentaire).

Phrases à analyser :
${batch.map((p, idx) => `${idx + 1}. FR: "${normalizeText(p.french_text)}" | BR: "${normalizeText(p.bariba_text)}"`).join("\n")}

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
  // Score hybride : règles (60%) + IA (40%)
  return clamp01(ruleScore * 0.6 + aiScore * 0.4);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") ?? "" },
        },
      },
    );

    // Verify admin access
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch training phrases (increase limit a bit; can be rerun)
    const { data: phrases, error: phrasesError } = await supabaseClient
      .from("training_phrases")
      .select("id, french_text, bariba_text, metadata")
      .limit(200);

    if (phrasesError) throw phrasesError;

    if (!phrases || phrases.length === 0) {
      return new Response(
        JSON.stringify({ error: "No phrases to analyze" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`Analyzing ${phrases.length} training phrases`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const analysisResults: Array<{
      id: string;
      quality_score: number;
      issues: string[];
      suggestions: string[];
      rule_score: number;
      ai_score: number | null;
      notes: string[];
    }> = [];

    const batchSize = 10;

    for (let i = 0; i < phrases.length; i += batchSize) {
      const batch = (phrases.slice(i, i + batchSize) as PhraseRow[]).map((p) => ({
        ...p,
        french_text: normalizeText(p.french_text),
        bariba_text: normalizeText(p.bariba_text),
      }));

      // 1) Analyse déterministe locale (règles)
      const localAnalyses = batch.map((p) => analyzeBaribaPairRules(p.french_text, p.bariba_text));

      // 2) Analyse IA (complément)
      const prompt = buildAnalysisPrompt(batch);

      let parsedAiAnalyses: AiAnalysis[] = [];

      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
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
        });

        if (!response.ok) {
          console.error("AI API error:", response.status);
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
            console.warn("AI response did not contain parseable analyses JSON");
          }
        }
      } catch (aiErr) {
        console.error("AI call failed:", aiErr);
      }

      // 3) Fusion IA + règles
      for (let j = 0; j < batch.length; j++) {
        const phrase = batch[j];
        const rule = localAnalyses[j];
        const ai = parsedAiAnalyses.find((a) => a.index === j + 1);

        const ruleIssuesText = rule.issues.map((x) => x.issue);
        const ruleSuggestionsText = rule.issues.map((x) => x.suggestion);

        const mergedIssues = uniqStrings([...(ai?.issues ?? []), ...ruleIssuesText]);
        const mergedSuggestions = uniqStrings([...(ai?.suggestions ?? []), ...ruleSuggestionsText]);

        const finalScore = mergeScores(rule.score, ai?.quality_score ?? null);

        analysisResults.push({
          id: phrase.id,
          quality_score: finalScore,
          issues: mergedIssues,
          suggestions: mergedSuggestions,
          rule_score: rule.score,
          ai_score: ai?.quality_score ?? null,
          notes: rule.notes,
        });
      }
    }

    // Update phrases with quality scores + detailed metadata
    for (const result of analysisResults) {
      const existing = phrases.find((p: PhraseRow) => p.id === result.id);
      const existingMetadata =
        existing && existing.metadata && typeof existing.metadata === "object"
          ? existing.metadata
          : {};

      const metadata = {
        ...existingMetadata,
        quality_analysis: {
          issues: result.issues,
          suggestions: result.suggestions,
          rule_score: result.rule_score,
          ai_score: result.ai_score,
          notes: result.notes,
          analyzed_at: new Date().toISOString(),
          analyzer_version: "bariba-v2-hybrid-rules-ai",
        },
      };

      const { error: updateError } = await supabaseClient
        .from("training_phrases")
        .update({
          quality_score: result.quality_score,
          metadata,
        })
        .eq("id", result.id);

      if (updateError) {
        console.error(`Failed to update phrase ${result.id}:`, updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        analyzed: analysisResults.length,
        summary: {
          avg_quality_score:
            analysisResults.length > 0
              ? Number(
                  (
                    analysisResults.reduce((sum, r) => sum + r.quality_score, 0) / analysisResults.length
                  ).toFixed(4),
                )
              : 0,
          low_quality_count: analysisResults.filter((r) => r.quality_score < 0.6).length,
          medium_quality_count: analysisResults.filter((r) => r.quality_score >= 0.6 && r.quality_score < 0.8).length,
          high_quality_count: analysisResults.filter((r) => r.quality_score >= 0.8).length,
        },
        results: analysisResults,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
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
