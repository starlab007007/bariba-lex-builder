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
    const { command, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("[raconte-moi] Processing command:", command, "Language:", language);

    const systemPrompt = language === 'ba' 
      ? `Tu es "Raconte-Moi", un assistant vocal IA pour la plateforme TAM-TAM, conçu pour les utilisateurs qui parlent Bariba (Bàátɔ̀nú).
Tu dois comprendre les commandes vocales en Bariba et répondre en Bariba.
Tu aides les utilisateurs à naviguer dans l'application, créer des publications, envoyer des messages, et utiliser toutes les fonctionnalités.

COMMANDES DE NAVIGATION supportées:
- "kú dà" ou "accueil" → navigate:home
- "àwọn ènìyàn" ou "social" → navigate:social  
- "ọjà" ou "marché" → navigate:market
- "ìrànlọ́wọ́" ou "sos" ou "urgence" → navigate:sos
- "mi" ou "profil" → navigate:profile
- "ìránṣẹ́" ou "services" → navigate:services

ACTIONS supportées:
- "kọ" ou "publier" → action:create_post
- "wọlé" ou "enregistrer" → action:record
- "kà" ou "lire" → action:read
- "ṣe àfihàn" ou "traduire" → action:translate

Réponds TOUJOURS dans ce format JSON:
{
  "type": "navigate" | "action" | "response",
  "value": "la valeur de navigation/action ou la réponse textuelle",
  "response_ba": "Réponse en Bariba",
  "response_fr": "Réponse en Français"
}`
      : `Tu es "Raconte-Moi", un assistant vocal IA pour la plateforme TAM-TAM.
Tu aides les utilisateurs à naviguer et utiliser l'application par commandes vocales.

COMMANDES DE NAVIGATION:
- "accueil" ou "maison" → navigate:home
- "social" ou "fil d'actualité" → navigate:social
- "marché" ou "boutique" → navigate:market
- "urgence" ou "sos" ou "aide" → navigate:sos
- "profil" ou "mon compte" → navigate:profile
- "services" ou "IA" → navigate:services

ACTIONS:
- "publier" ou "créer" → action:create_post
- "enregistrer" → action:record
- "lire" → action:read
- "traduire" → action:translate

Réponds TOUJOURS dans ce format JSON:
{
  "type": "navigate" | "action" | "response",
  "value": "la valeur",
  "response_ba": "Réponse en Bariba",
  "response_fr": "Réponse en Français"
}`;

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
          { role: "user", content: command }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Trop de requêtes, réessayez plus tard.",
          type: "response",
          response_fr: "Je suis un peu fatigué, réessayez dans un moment.",
          response_ba: "Mo rẹ̀ díẹ̀, gbìyànjú lẹ́ẹ̀kan sí i."
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Crédits épuisés",
          type: "response",
          response_fr: "Service temporairement indisponible.",
          response_ba: "Iṣẹ́ kò sí fún ìgbà díẹ̀."
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("[raconte-moi] AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log("[raconte-moi] AI response:", content);

    // Try to parse JSON response
    try {
      const parsed = JSON.parse(content);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      // If not valid JSON, return as plain response
      return new Response(JSON.stringify({
        type: "response",
        value: content,
        response_fr: content,
        response_ba: content
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    console.error("[raconte-moi] Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      type: "response",
      response_fr: "Désolé, je n'ai pas compris. Réessayez.",
      response_ba: "Má bìnú, mi ò gbọ́. Gbìyànjú lẹ́ẹ̀kan sí i."
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
