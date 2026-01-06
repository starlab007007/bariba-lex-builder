import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, templateId, templateLabel, templateFamily, inputText, hasVideo, hasPhotos, hasAudio, features } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let result: any = {};

    switch (action) {
      case 'generate_narrative': {
        // Generate narrative structure for the template
        const systemPrompt = `Tu es un assistant créatif spécialisé dans la création de contenu vidéo pour l'Afrique de l'Ouest, particulièrement le Bénin. 
Tu génères des narrations courtes, engageantes et adaptées à un public qui préfère l'oral au texte.
Le contenu doit être culturellement approprié et valoriser les traditions locales.`;

        const userPrompt = `Génère une narration courte pour un template "${templateLabel}" (catégorie: ${templateFamily}).
${inputText ? `Sujet proposé: ${inputText}` : 'Sujet libre selon le template'}
${hasVideo ? 'Le contenu inclut une vidéo.' : ''}
${hasPhotos ? `Le contenu inclut ${hasPhotos} photo(s).` : ''}
${hasAudio ? 'Le contenu inclut un enregistrement audio.' : ''}

Génère une narration de 2-3 phrases maximum, en français simple et accessible.
Format: intro accrocheuse + message principal + conclusion mémorable.`;

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
            max_tokens: 200,
            temperature: 0.8
          }),
        });

        if (!response.ok) {
          console.error('AI Gateway error:', response.status, await response.text());
          throw new Error(`AI Gateway error: ${response.status}`);
        }

        const data = await response.json();
        result.narrative = data.choices?.[0]?.message?.content || '';
        break;
      }

      case 'generate_captions': {
        // Generate smart captions with emojis
        const systemPrompt = `Tu es un assistant spécialisé dans la génération de sous-titres enrichis avec des emojis contextuels.
Tu génères des segments de sous-titres courts avec des emojis appropriés pour illustrer le contenu.`;

        const userPrompt = `Génère des sous-titres pour le contenu suivant:
Template: ${templateId}
Texte/transcription: ${inputText || 'Contenu général'}

Génère 3-5 segments de sous-titres en JSON avec ce format:
[{"startTime": 0, "endTime": 3, "text": "texte...", "emoji": "🌾"}]

Utilise des emojis pertinents: 🌾 agriculture, 💰 argent, ☀️ météo, 🏥 santé, 📚 éducation, etc.`;

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
            max_tokens: 500
          }),
        });

        if (!response.ok) {
          console.error('AI Gateway error:', response.status, await response.text());
          throw new Error(`AI Gateway error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '[]';
        
        // Try to parse JSON from response
        try {
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            result.captions = JSON.parse(jsonMatch[0]);
          } else {
            result.captions = [];
          }
        } catch {
          result.captions = [];
        }
        break;
      }

      case 'enhance_content': {
        // General content enhancement suggestions
        const systemPrompt = `Tu es un consultant en création de contenu viral pour les réseaux sociaux africains.
Tu donnes des conseils courts et pratiques.`;

        const userPrompt = `Pour un contenu de type "${templateLabel}":
- Donne 2 hashtags pertinents
- Suggère 1 amélioration rapide
- Propose 1 accroche vocale

Réponds en français simple, format très court.`;

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
            max_tokens: 150
          }),
        });

        if (!response.ok) {
          console.error('AI Gateway error:', response.status, await response.text());
          throw new Error(`AI Gateway error: ${response.status}`);
        }

        const data = await response.json();
        result.suggestions = data.choices?.[0]?.message?.content || '';
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('process-template error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
