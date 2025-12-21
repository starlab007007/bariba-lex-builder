import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, context, language } = await req.json();
    
    console.log('[agri-advisor] Received request:', { question, context, language });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Tu es un conseiller agricole expert pour les agriculteurs du Bénin et d'Afrique de l'Ouest.
Tu parles simplement, avec des mots que les agriculteurs ruraux comprennent facilement.
Tu donnes des conseils pratiques et adaptés au contexte local (climat tropical, saison des pluies mai-octobre, cultures: maïs, riz, manioc, arachide, coton).

Contexte de la question: ${context || 'agriculture générale'}

Règles importantes:
- Réponses courtes et pratiques (max 3-4 phrases)
- Pas de jargon technique compliqué
- Adapté aux petits producteurs avec peu de moyens
- Conseils applicables immédiatement
- Si tu ne sais pas, dis-le honnêtement

Pour les questions sur:
- MÉTÉO/PLUIE: Conseille sur le meilleur moment pour semer, labourer, appliquer l'engrais
- CULTURES: Diagnostic maladies, dosages engrais, techniques de semis
- BÉTAIL: Alimentation, santé, production laitière
- EAU: Conservation, irrigation de fortune, gestion sécheresse
- PRIX: Tendances du marché, meilleur moment pour vendre

Réponds en français de manière simple et claire.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de demandes, réessayez dans quelques instants" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporairement indisponible" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("[agri-advisor] AI gateway error:", response.status, errorText);
      throw new Error("Erreur du service IA");
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "Je n'ai pas pu comprendre votre question. Pouvez-vous reformuler?";

    console.log('[agri-advisor] AI response:', aiResponse);

    return new Response(
      JSON.stringify({
        response: aiResponse,
        response_fr: aiResponse,
        response_ba: "", // Translation will be done client-side
        context,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[agri-advisor] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erreur inconnue",
        response: "Désolé, je n'ai pas pu traiter votre demande. Réessayez plus tard.",
        response_fr: "Désolé, je n'ai pas pu traiter votre demande. Réessayez plus tard.",
        response_ba: ""
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
