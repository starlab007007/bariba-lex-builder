import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image_base64 } = await req.json();

    if (!image_base64) {
      return new Response(
        JSON.stringify({ error: "image_base64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const response = await fetch(
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
              content: `Tu es un système de reconnaissance d'écriture manuscrite spécialisé dans l'alphabet Bariba/Baatonum.

L'alphabet Bariba comprend ces lettres et caractères spéciaux :
- Consonnes : b, d, g, k, m, n, ŋ, r, s, w, y
- Voyelles simples : a, e, i, o, u, ɔ, ɛ
- Voyelles avec tons : à, á, è, é, ì, í, ò, ó, ù, ú, ɔ̀, ɔ́, ɛ̀, ɛ́
- Voyelles nasalisées : ã, ĩ, ũ, ɔ̃, ɛ̃
- Consonnes avec tons : ǹ
- Majuscules spéciales : Ɔ, Ɛ, Ŋ

Analyse l'image d'écriture manuscrite et identifie les caractères ou mots écrits.

IMPORTANT : Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans explication.
Format exact :
{"candidates": ["candidat1", "candidat2", "candidat3", "candidat4", "candidat5"]}

Retourne les 5 meilleures interprétations possibles, du plus probable au moins probable.
Si tu vois un seul caractère, retourne des caractères similaires.
Si tu vois plusieurs caractères formant un mot ou syllabe, retourne des mots/syllabes similaires.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Identifie les caractères Bariba écrits à la main dans cette image :",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: image_base64.startsWith("data:")
                      ? image_base64
                      : `data:image/png;base64,${image_base64}`,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "AI recognition failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse the JSON response
    let candidates: string[] = [];
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      candidates = parsed.candidates || [];
    } catch {
      // Fallback: extract any recognizable characters from the response
      const matches = content.match(/[a-zA-Zɔɛŋãĩũàáèéìíòóùúɔ̀ɔ́ɔ̃ɛ̀ɛ́ɛ̃ǹƆƐŊ]+/gu);
      candidates = matches ? matches.slice(0, 5) : [];
    }

    return new Response(
      JSON.stringify({ candidates }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("recognize-handwriting error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
