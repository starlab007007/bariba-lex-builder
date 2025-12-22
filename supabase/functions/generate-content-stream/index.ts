import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateContentRequest {
  type: 'script' | 'hashtags' | 'hook' | 'suggestions' | 'intro' | 'outro';
  topic?: string;
  templateKey?: string;
  templateId?: string;
  language?: 'fr' | 'ba';
}

const CONTENT_PROMPTS: Record<string, string> = {
  script: `Tu es un créateur de contenu expert pour TamTam, la plateforme audio-first pour le Bénin.
Génère un script court et percutant pour une vidéo/audio de 30-60 secondes.

Structure:
1. ACCROCHE (5 sec): Une phrase qui capte l'attention
2. CONTENU (20-40 sec): 3 points clés, simples et pratiques
3. CONCLUSION (5 sec): Appel à l'action clair

Style: Simple, oral, adapté à la culture Bariba. Utilise des exemples concrets.`,

  hashtags: `Tu es un expert des tendances TamTam et réseaux sociaux africains.
Génère 8-10 hashtags pertinents et viraux.

Mélange:
- 3 hashtags tendance globaux
- 3 hashtags locaux (Bénin, Bariba, Afrique)
- 2-3 hashtags spécifiques au sujet
- 1 hashtag unique/créatif

Format: #hashtag1 #hashtag2 ... (sur une seule ligne)`,

  hook: `Tu es un expert en accroches virales style TikTok/Reels.
Génère 5 versions d'accroches (hooks) ultra-percutantes:

1. 🤯 Affirmation choc
2. ❓ Question intrigante
3. 🎯 Promesse de valeur
4. 😱 Curiosité/mystère
5. 💡 Astuce secrète

Chaque accroche: MAX 8 mots, percutante, adaptée au public africain.`,

  intro: `Tu es un expert en intros virales pour les créateurs TamTam.
Génère une intro de 10-15 secondes qui:

1. Capte l'attention immédiatement
2. Présente le sujet de manière intrigante
3. Donne envie de regarder la suite

Format: Script parlé, naturel, dynamique. Adapté à la culture Bariba/Bénin.`,

  outro: `Tu es un expert en conclusions impactantes.
Génère une outro de 10 secondes avec:

1. Résumé en une phrase
2. Call-to-action clair (follow, like, partage, commentaire)
3. Teaser pour le prochain contenu

Format: Naturel, engageant, mémorable.`,

  suggestions: `Tu es un assistant créatif pour TamTam, plateforme audio-first au Bénin.
Suggère 5 idées de contenu originales et engageantes:

Pour chaque idée:
📌 Titre accrocheur
💡 Concept en 1 phrase
🎯 Pourquoi ça marcherait

Focus: Culture Bariba, vie quotidienne au Bénin, tendances locales.`
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, topic, templateKey, templateId, language = 'fr' }: GenerateContentRequest = await req.json();

    if (!type) {
      return new Response(
        JSON.stringify({ error: 'Type required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎨 Streaming Content: type=${type}, topic=${topic}, templateId=${templateId}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build prompt
    const systemPrompt = CONTENT_PROMPTS[templateId || type] || CONTENT_PROMPTS.suggestions;
    
    let userPrompt = '';
    if (topic) userPrompt += `Sujet: ${topic}\n`;
    if (templateKey) userPrompt += `Template: ${templateKey}\n`;
    if (language === 'ba') userPrompt += `Langue: Bariba (adapte le contenu à la culture Bariba)\n`;
    
    if (!userPrompt.trim()) {
      userPrompt = 'Génère du contenu créatif et viral pour TamTam.';
    }

    // Call Lovable AI with streaming
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 600,
        temperature: 0.85,
        stream: true
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    // Return the stream directly
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Generate content stream error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Generation failed'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
