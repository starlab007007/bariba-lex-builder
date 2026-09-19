import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ProductInput = {
  title?: string;
  title_fr?: string;
  title_ba?: string;
  description?: string;
  description_text?: string;
  price?: number | string | null;
  currency?: string | null;
  category?: string | null;
  location?: string | null;
  status?: string | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeString(value: unknown, max = 1200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeHashtags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((x) => safeString(x, 40).replace(/^#+/, "")).filter(Boolean))].slice(0, 8);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Authentification requise" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body?.action === "refine" ? "refine" : "generate";
    const tone = safeString(body?.tone, 40) || "vendeur";
    const language = safeString(body?.language, 20) || "fr";
    const currentText = safeString(body?.currentText, 2400);
    const product = (body?.product || {}) as ProductInput;

    const title = safeString(product.title_fr || product.title, 180);
    if (!title) return json({ error: "Le titre du produit est requis" }, 400);

    const description = safeString(product.description_text || product.description, 1200);
    const category = safeString(product.category, 80);
    const location = safeString(product.location, 120);
    const status = safeString(product.status, 40) || "available";
    const currency = safeString(product.currency, 12) || "XOF";
    const price = product.price === null || product.price === undefined || product.price === ""
      ? null
      : Number(product.price);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "Service IA non configuré" }, 503);

    const factualBlock = [
      `Titre: ${title}`,
      description ? `Description: ${description}` : "",
      category ? `Catégorie: ${category}` : "",
      Number.isFinite(price) ? `Prix: ${price} ${currency}` : "Prix: non renseigné",
      location ? `Localisation: ${location}` : "Localisation: non renseignée",
      `Statut: ${status}`,
    ].filter(Boolean).join("\n");

    const system = `Tu es Aburu IA, l'assistant commercial de FITILA.
Tu rédiges du contenu de vente court, crédible et naturel pour des produits réels au Bénin.
RÈGLES ABSOLUES:
- N'invente JAMAIS un prix, une localisation, une caractéristique, un stock, une remise ou une promotion.
- Les seules données commerciales factuelles autorisées sont celles du bloc PRODUIT.
- Si une information manque, ne la complète pas.
- Garde un ton humain, simple et premium.
- Ne promets pas de résultat ou de qualité non fournie.
- Réponds uniquement avec un objet JSON valide, sans markdown.
Schéma JSON exact:
{"headline":"...","caption":"...","cta":"...","hashtags":["..."],"script":"..."}
headline: 3 à 10 mots.
caption: maximum 90 mots.
cta: maximum 12 mots.
hashtags: 3 à 6 hashtags sans #.
script: maximum 55 mots, naturel à dire à voix haute.`;

    const user = action === "refine"
      ? `PRODUIT:\n${factualBlock}\n\nTEXTE À AMÉLIORER:\n${currentText || description || title}\n\nTon demandé: ${tone}. Langue de sortie principale: ${language}. Réécris sans modifier les faits.`
      : `PRODUIT:\n${factualBlock}\n\nCrée une publication Aburu Fim au ton "${tone}". Langue de sortie principale: ${language}.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.45,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("[aburu-fim-ai] gateway", response.status, detail.slice(0, 300));
      if (response.status === 429) return json({ error: "Service IA temporairement saturé", retryable: true }, 429);
      if (response.status === 402) return json({ error: "Service IA momentanément indisponible", retryable: true }, 503);
      return json({ error: "Impossible de générer le contenu pour le moment", retryable: true }, 502);
    }

    const payload = await response.json();
    const raw = payload?.choices?.[0]?.message?.content;
    let parsed: any;
    try {
      parsed = JSON.parse(typeof raw === "string" ? raw.replace(/^\`\`\`json\s*|\s*\`\`\`$/g, "").trim() : "{}");
    } catch {
      return json({ error: "Réponse IA invalide", retryable: true }, 502);
    }

    const result = {
      headline: safeString(parsed?.headline, 160) || title,
      caption: safeString(parsed?.caption, 1800),
      cta: safeString(parsed?.cta, 180),
      hashtags: normalizeHashtags(parsed?.hashtags),
      script: safeString(parsed?.script, 1200),
    };

    if (!result.caption) return json({ error: "L'IA n'a pas produit de texte exploitable", retryable: true }, 502);
    return json({ success: true, ...result });
  } catch (error) {
    console.error("[aburu-fim-ai]", error);
    return json({ error: "Erreur interne Aburu IA", retryable: true }, 500);
  }
});
