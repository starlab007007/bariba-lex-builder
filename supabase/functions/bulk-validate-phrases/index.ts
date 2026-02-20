import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PhraseRow = {
  id: string;
  french_text: string | null;
  bariba_text: string | null;
  metadata?: Record<string, unknown> | null;
};

type RuleIssue = {
  code: string;
  severity: "low" | "medium" | "high";
  issue: string;
  suggestion: string;
};

function normalizeText(input: string): string {
  return (input || "").normalize("NFC").replace(/\s+/g, " ").trim();
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function hasBaribaDiacritics(text: string): boolean {
  return /[ɔɛɑãɛ̃ĩɔ̃ũ̀́]/u.test(text);
}

function uniqStrings(arr: string[]): string[] {
  return [...new Set(arr.map((s) => s.trim()).filter(Boolean))];
}

function analyzeBaribaPairRules(frenchRaw: string, baribaRaw: string): {
  score: number;
  issues: RuleIssue[];
  notes: string[];
} {
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

  // Bruit dictionnaire / OCR
  if (/dictionnaire bariba - français|<PARSED TEXT FOR PAGE|acc\.|inacc\.|imp\./iu.test(bariba)) {
    issues.push({
      code: "OCR_OR_DICTIONARY_NOISE",
      severity: "high",
      issue: "La phrase semble contenir du bruit OCR ou une entrée dictionnaire brute.",
      suggestion: "Conserver uniquement la phrase cible, sans définitions ni marques grammaticales.",
    });
    score -= 0.35;
  }

  if (bariba.length < 2) {
    issues.push({
      code: "TOO_SHORT",
      severity: "high",
      issue: "Traduction trop courte pour être fiable.",
      suggestion: "Fournir une expression ou phrase complète.",
    });
    score -= 0.25;
  }

  // Erreurs critiques connues
  if (french.includes("bonjour") && /\bKua dɔ̃ɔ\b/iu.test(bariba)) {
    issues.push({
      code: "BAD_GREETING_MORNING",
      severity: "high",
      issue: `Salutation "Bonjour (matin)" incorrecte.`,
      suggestion: `Utiliser "A kpuna n do?"`,
    });
    score -= 0.35;
  }

  if (french.includes("bonsoir") && /\bKua wɛrɛ\b/iu.test(bariba)) {
    issues.push({
      code: "BAD_GREETING_EVENING",
      severity: "high",
      issue: `Salutation "Bonsoir" incorrecte.`,
      suggestion: `Utiliser "Bɛɛ ka yoka"`,
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
      suggestion: `Utiliser "Alaafia"`,
    });
    score -= 0.35;
  }

  if (french.includes("merci") && /\bA nii koo\b/iu.test(bariba)) {
    issues.push({
      code: "BAD_THANKS",
      severity: "high",
      issue: `Forme "merci" non validée.`,
      suggestion: `Préférer "siara", "a kua", "ami" ou "Na nun siara" selon le contexte.`,
    });
    score -= 0.3;
  }

  if (french.includes("mère") && /\bNɛn yaa\b/iu.test(bariba)) {
    issues.push({
      code: "MOTHER_CONFUSION",
      severity: "high",
      issue: `"yaa" n’est pas "mère" (renvoie à viande/animal).`,
      suggestion: `Utiliser "bii mɛro"`,
    });
    score -= 0.4;
  }

  if ((french.includes("soif") || french.includes("j’ai soif") || french.includes("j'ai soif")) && /\bn[ɔo]nkuru\b/iu.test(bariba)) {
    issues.push({
      code: "BAD_THIRST_TERM",
      severity: "high",
      issue: `Forme non validée pour "soif".`,
      suggestion: `Utiliser "nim nɔru"`,
    });
    score -= 0.35;
  }

  // wa vs mɛɛri
  const mentionsVoir = [
    "voir",
    "trouver",
    "obtenir",
    "as-tu vu",
    "avez-vous vu",
    "je vois",
    "il voit",
  ].some((w) => french.includes(w));

  if (mentionsVoir && /\bmɛɛri\b/iu.test(bariba) && !/\bwa\b/iu.test(bariba)) {
    issues.push({
      code: "WA_VS_MEERI",
      severity: "high",
      issue: `"mɛɛri" utilisé pour "voir/trouver/obtenir" (faux ami).`,
      suggestion: `Utiliser "wa" pour voir/trouver/obtenir ; garder "mɛɛri" pour regarder/étudier/apprendre.`,
    });
    score -= 0.35;
  }

  const mentionsRegarderEtudier = ["regarder", "étudier", "apprendre"].some((w) => french.includes(w));
  if (mentionsRegarderEtudier && /\bwa\b/iu.test(bariba) && !/\bmɛɛri\b/iu.test(bariba)) {
    issues.push({
      code: "MEERI_EXPECTED",
      severity: "medium",
      issue: `Le sens "regarder/étudier/apprendre" semble plutôt demander "mɛɛri".`,
      suggestion: `Vérifier si "mɛɛri" est plus approprié.`,
    });
    score -= 0.15;
  }

  if (french.includes("qui cherche trouve") && /Goo u g[ɑaã̃]+ kasuu,\s*u ga bɛri/iu.test(bariba)) {
    issues.push({
      code: "BAD_PROVERB",
      severity: "high",
      issue: "Proverbe mal formé.",
      suggestion: `Utiliser "Durɔ goo u kasuu, u ga bɛri"`,
    });
    score -= 0.35;
  }

  if (!hasBaribaDiacritics(bariba)) {
    notes.push("Pas de diacritiques détectés — vérifier la graphie (ɔ, ɛ, etc.).");
    score -= 0.05;
  }

  if (bariba.length > 260) {
    issues.push({
      code: "TOO_LONG_POSSIBLE_DUMP",
      severity: "medium",
      issue: "Traduction très longue — possible collage d’entrée dictionnaire.",
      suggestion: "Conserver uniquement la phrase cible.",
    });
    score -= 0.12;
  }

  if (/\b(A kpuna n do\?|Bɛɛ ka yoka|Anna wunɛn wasi\?|Alaafia|bii mɛro|nim nɔru)\b/iu.test(bariba)) {
    notes.push("Forme idiomatique validée détectée.");
    score += 0.05;
  }

  return { score: clamp01(score), issues, notes };
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const runInBackground = body?.background !== false; // par défaut true
    const batchSize = Math.min(Math.max(Number(body?.batchSize) || 500, 50), 2000);
    const maxBatches = Math.min(Math.max(Number(body?.maxBatches) || 999999, 1), 999999);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
      throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY");
    }

    // 1) Vérifier l'utilisateur (auth) et le rôle admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
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

    // 2) Client service-role pour traitement
    const supabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    console.log("🚀 Starting bulk validation...");
    console.log(`   batchSize=${batchSize}, maxBatches=${maxBatches}, background=${runInBackground}`);

    const processBulkValidation = async () => {
      let totalProcessed = 0;
      let totalUpdated = 0;
      let totalErrors = 0;
      let batchesDone = 0;
      let hasMore = true;

      while (hasMore && batchesDone < maxBatches) {
        // Récupère les phrases non validées (avec contenu)
        const { data: batch, error: fetchError } = await supabaseClient
          .from("training_phrases")
          .select("id, french_text, bariba_text, metadata")
          .eq("is_validated", false)
          .limit(batchSize);

        if (fetchError) {
          console.error("Fetch error:", fetchError);
          break;
        }

        const rows = (batch || []) as PhraseRow[];
        if (rows.length === 0) {
          hasMore = false;
          break;
        }

        batchesDone += 1;
        console.log(`📦 Batch ${batchesDone}: ${rows.length} phrases`);

        // Préparer updates
        const updates = rows.map((row) => {
          const french = normalizeText(row.french_text || "");
          const bariba = normalizeText(row.bariba_text || "");

          const rule = analyzeBaribaPairRules(french, bariba);

          const issues = rule.issues.map((x) => x.issue);
          const suggestions = uniqStrings(rule.issues.map((x) => x.suggestion));
          const qualityScore = Number(rule.score.toFixed(4));

          const existingMetadata =
            row.metadata && typeof row.metadata === "object" ? row.metadata : {};

          const metadata = {
            ...existingMetadata,
            quality_analysis: {
              ...(existingMetadata as any)?.quality_analysis,
              issues,
              suggestions,
              rule_score: qualityScore,
              ai_score: null,
              notes: rule.notes,
              analyzed_at: new Date().toISOString(),
              analyzer_version: "bulk-bariba-rules-v2",
            },
            bulk_validation: {
              validated_at: new Date().toISOString(),
              validator_version: "bulk-bariba-rules-v2",
            },
          };

          return {
            id: row.id,
            is_validated: true,
            quality_score: qualityScore,
            metadata,
          };
        });

        // Mise à jour ligne par ligne (plus sûr pour metadata JSON)
        for (const upd of updates) {
          const { error: updateError } = await supabaseClient
            .from("training_phrases")
            .update({
              is_validated: upd.is_validated,
              quality_score: upd.quality_score,
              metadata: upd.metadata,
            })
            .eq("id", upd.id);

          if (updateError) {
            totalErrors += 1;
            console.error(`Update error (${upd.id}):`, updateError);
          } else {
            totalUpdated += 1;
          }
          totalProcessed += 1;
        }

        console.log(`✅ Progress: processed=${totalProcessed}, updated=${totalUpdated}, errors=${totalErrors}`);

        // petite pause pour éviter surcharge DB
        await sleep(60);
      }

      console.log(
        `🎉 Bulk validation complete | batches=${batchesDone} | processed=${totalProcessed} | updated=${totalUpdated} | errors=${totalErrors}`,
      );

      return { batchesDone, totalProcessed, totalUpdated, totalErrors };
    };

    if (runInBackground) {
      // @ts-ignore EdgeRuntime disponible sur Supabase Edge
      EdgeRuntime.waitUntil(processBulkValidation());

      return new Response(
        JSON.stringify({
          success: true,
          started: true,
          mode: "background",
          message: "Validation par lots démarrée en arrière-plan.",
          config: { batchSize, maxBatches },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Mode synchrone (utile pour test / debug)
    const result = await processBulkValidation();

    return new Response(
      JSON.stringify({
        success: true,
        started: false,
        mode: "sync",
        ...result,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    console.error("Error in bulk-validate-phrases:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
