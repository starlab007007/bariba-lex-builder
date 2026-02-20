import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  normalizeBaribaText,
  analyzeBaribaPairRules,
  uniqStrings,
} from "../_shared/bariba-linguistic-rules.ts";

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
          const french = normalizeBaribaText(row.french_text || "");
          const bariba = normalizeBaribaText(row.bariba_text || "");

          const rule = analyzeBaribaPairRules(french, bariba);

          const issues = rule.issues.map((x) => x.issue);
          const suggestions = uniqStrings(rule.issues.map((x) => x.suggestion));
          const qualityScore = Number(rule.score.toFixed(4));

          const existingMetadata =
            row.metadata && typeof row.metadata === "object" ? row.metadata : {};

          const nowIso = new Date().toISOString();

          const metadata = {
            ...existingMetadata,
            quality_analysis: {
              ...(existingMetadata as any)?.quality_analysis,
              issues,
              suggestions,
              rule_score: qualityScore,
              ai_score: null,
              notes: rule.notes,
              analyzed_at: nowIso,
              analyzer_version: "bulk-bariba-rules-v3-shared",
            },
            bulk_validation: {
              ...(existingMetadata as any)?.bulk_validation,
              validated_at: nowIso,
              validator_version: "bulk-bariba-rules-v3-shared",
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

        console.log(
          `✅ Progress: processed=${totalProcessed}, updated=${totalUpdated}, errors=${totalErrors}`,
        );

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
