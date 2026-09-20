import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.normalize("NFC").trim() : "";
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / Math.sqrt(na * nb);
}

async function embeddings(apiKey: string, input: string[]): Promise<number[][]> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input,
    }),
  });
  if (!response.ok) {
    throw new Error(`Embedding HTTP ${response.status}`);
  }
  const data = await response.json();
  return (data?.data ?? []).map((item: any) => item.embedding as number[]);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const body = await req.json().catch(() => ({}));
    const question = clean(body?.question);
    const requestedScope = clean(body?.requested_scope);
    if (!question) {
      return new Response(JSON.stringify({ state: "void", answer: "" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const aiKey = Deno.env.get("LOVABLE_API_KEY") ?? "";
    if (!url || !anon || !aiKey) throw new Error("Configuration serveur absente");

    const client = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false },
    });
    const userResult = await client.auth.getUser();
    const user = userResult.data.user;
    if (!user) {
      return new Response(
        JSON.stringify({
          state: "refusal",
          protocol: "Authentification requise",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (
      requestedScope === "elders" &&
      user.user_metadata?.handunia_guardian !== true
    ) {
      return new Response(
        JSON.stringify({
          state: "refusal",
          protocol: "Portée Anciens — accès gardien requis",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Le filtrage d'accès a lieu AVANT toute vectorisation.
    // Le client utilisateur applique les RLS, aucune ligne non autorisée
    // n'entre dans l'ensemble candidat.
    let query = client
      .from("handunia_fragments")
      .select(
        "id,user_id,lieu_id,text,transcript_text,period_year,period_label,scope_level,created_at",
      )
      .is("withdrawn_at", null)
      .order("created_at", { ascending: false })
      .limit(80);
    if (requestedScope) query = query.eq("scope_level", requestedScope);
    const accessibleResult = await query;
    if (accessibleResult.error) throw accessibleResult.error;
    const accessible = accessibleResult.data ?? [];

    if (!accessible.length) {
      return new Response(
        JSON.stringify({
          state: "void",
          answer: "La communauté ne l’a pas encore raconté.",
          sources: [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const texts = accessible.map((row: any) =>
      clean(row.transcript_text) || clean(row.text)
    );
    const vectors = await embeddings(aiKey, [question, ...texts]);
    if (vectors.length !== texts.length + 1) {
      throw new Error("Embedding incomplet");
    }
    const qv = vectors[0];
    const ranked = accessible
      .map((row: any, index: number) => ({
        row,
        score: cosine(qv, vectors[index + 1]),
      }))
      .filter((item: any) => item.score > 0.18)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 4);

    if (!ranked.length) {
      return new Response(
        JSON.stringify({
          state: "void",
          answer: "La communauté ne l’a pas encore raconté.",
          sources: [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const userIds = [...new Set(ranked.map((item: any) => item.row.user_id))];
    const lieuIds = [...new Set(ranked.map((item: any) => item.row.lieu_id))];
    const [profilesResult, lieuxResult] = await Promise.all([
      client
        .from("tamtam_profiles")
        .select("user_id,display_name,username")
        .in("user_id", userIds),
      client.from("handunia_lieux").select("id,name").in("id", lieuIds),
    ]);
    const profiles = new Map(
      (profilesResult.data ?? []).map((row: any) => [row.user_id, row]),
    );
    const lieux = new Map(
      (lieuxResult.data ?? []).map((row: any) => [row.id, row]),
    );
    const sources = ranked.map((item: any, index: number) => {
      const row = item.row;
      const profile: any = profiles.get(row.user_id) ?? {};
      const name =
        clean(profile.display_name) || clean(profile.username) || "Témoin";
      const initials = name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part: string) => part[0]?.toUpperCase() ?? "")
        .join("");
      return {
        index: index + 1,
        id: row.id,
        witness: initials || "TV",
        year: row.period_year ?? row.period_label ?? "",
        place: (lieux.get(row.lieu_id) as any)?.name ?? "",
        text: clean(row.transcript_text) || clean(row.text),
      };
    });

    const context = sources
      .map(
        (source: any) =>
          `[${source.index}] ${source.text} — ${source.witness}, ${source.year}, ${source.place}`,
      )
      .join("\n");
    const llm = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          temperature: 0,
          max_tokens: 180,
          messages: [
            {
              role: "system",
              content:
                "Tu réponds seulement depuis les témoignages fournis. Chaque affirmation factuelle doit finir par [n] correspondant à son témoin. N'invente rien. Si les témoignages ne suffisent pas, réponds exactement: La communauté ne l’a pas encore raconté.",
            },
            {
              role: "user",
              content: `Question: ${question}\nTémoignages:\n${context}`,
            },
          ],
        }),
      },
    );
    if (!llm.ok) throw new Error(`LLM HTTP ${llm.status}`);
    const llmData = await llm.json();
    const answer = clean(llmData?.choices?.[0]?.message?.content);
    if (!answer || answer === "La communauté ne l’a pas encore raconté.") {
      return new Response(
        JSON.stringify({
          state: "void",
          answer: "La communauté ne l’a pas encore raconté.",
          sources: [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ state: "sourced", answer, sources }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[handunia-memory-query]", error);
    return new Response(
      JSON.stringify({
        state: "void",
        answer: "La communauté ne l’a pas encore raconté.",
        sources: [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
