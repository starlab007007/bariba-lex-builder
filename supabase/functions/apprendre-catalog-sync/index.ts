import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATALOG_URL =
  "https://raw.githubusercontent.com/starlab007007/bariba-lex-builder/feat/apprendre-v2.4-build19-20260927/fitila_flutter/tool/audio_catalog/apprendre_audio_catalog.json";

type CatalogItem = {
  key: string;
  kind: string;
  ba: string;
  fr?: string | null;
  hash: string;
  page?: number | string | null;
  ref?: string | null;
  pack: string;
  priority?: number | string | null;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) return json({ error: "Connexion administrateur requise" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Session invalide" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: role } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) return json({ error: "Rôle administrateur requis" }, 403);

    const response = await fetch(CATALOG_URL, {
      headers: { "User-Agent": "FITILA-Apprendre-Catalog-Sync/1.0" },
    });
    if (!response.ok) throw new Error(`Catalogue source indisponible (HTTP ${response.status})`);

    const catalog = await response.json() as {
      content_version?: string;
      items?: CatalogItem[];
    };
    if (!catalog.content_version || !Array.isArray(catalog.items) || catalog.items.length === 0) {
      throw new Error("Catalogue source invalide ou vide");
    }

    const allowedKinds = new Set(["mot", "forme", "exemple", "lecon", "scene", "proverbe"]);
    const rows = catalog.items.map((item) => {
      if (!item.key || !item.hash || !item.ba || !allowedKinds.has(item.kind)) {
        throw new Error(`Entrée catalogue invalide: ${item.key || "sans clé"}`);
      }
      const page = item.page === null || item.page === undefined || item.page === ""
        ? null
        : Number(item.page);
      return {
        audio_key: item.key,
        kind: item.kind,
        text_ba: item.ba,
        text_fr: item.fr ?? null,
        text_hash: item.hash,
        source_page: Number.isFinite(page) ? page : null,
        ref: item.ref ?? null,
        pack: item.pack || "essential",
        priority: Math.min(9, Math.max(1, Number(item.priority) || 5)),
        content_version: catalog.content_version,
        in_content: true,
        updated_at: new Date().toISOString(),
      };
    });

    let upserted = 0;
    for (let i = 0; i < rows.length; i += 400) {
      const batch = rows.slice(i, i + 400);
      const { error } = await admin
        .from("apprendre_audio_items")
        .upsert(batch, { onConflict: "audio_key" });
      if (error) throw error;
      upserted += batch.length;
    }

    const { data: retiredRows, error: retiredError } = await admin
      .from("apprendre_audio_items")
      .update({ in_content: false, updated_at: new Date().toISOString() })
      .neq("content_version", catalog.content_version)
      .eq("in_content", true)
      .select("audio_key");
    if (retiredError) throw retiredError;

    await admin.from("apprendre_audio_audit").insert({
      actor_id: user.id,
      action: "catalog_sync",
      target: catalog.content_version,
      detail: {
        source: "github_build19",
        items: upserted,
        retired: retiredRows?.length ?? 0,
      },
    });

    return json({
      success: true,
      content_version: catalog.content_version,
      items: upserted,
      retired: retiredRows?.length ?? 0,
    });
  } catch (error) {
    console.error("apprendre-catalog-sync:", error);
    return json({ error: error instanceof Error ? error.message : "Erreur de synchronisation" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
