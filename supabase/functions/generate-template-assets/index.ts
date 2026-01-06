import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TemplateAssetRequest {
  action: 'generate_preview_image' | 'generate_voice_description' | 'suggest_template' | 'generate_sample_storyboard';
  templateId?: string;
  templateLabel?: string;
  templateDescription?: string;
  templateEmoji?: string;
  templateColor?: string;
  userContext?: {
    hour?: number;
    dayOfWeek?: number;
    userIntent?: string;
    language?: 'fr' | 'ba';
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const body: TemplateAssetRequest = await req.json();
    const { action, templateId, templateLabel, templateDescription, templateEmoji, templateColor, userContext } = body;

    console.log(`[generate-template-assets] Action: ${action}, Template: ${templateId}`);

    switch (action) {
      // ============================================================
      // 1. Generate Preview Image for Template
      // ============================================================
      case 'generate_preview_image': {
        if (!templateLabel || !templateDescription) {
          throw new Error('templateLabel and templateDescription are required');
        }

        const imagePrompt = `Create a vibrant, professional thumbnail image for a "${templateLabel}" video template.
Style: Modern West African aesthetic, colorful, energetic.
Theme: ${templateDescription}
Visual elements: 
- Large ${templateEmoji || '🎬'} emoji as central element
- Dynamic gradient background inspired by ${templateColor || 'orange and gold'}
- Clean, minimal design suitable for mobile screens
- High contrast, eye-catching
- 9:16 vertical format optimized for social media
- No text, only visual elements
Ultra high resolution.`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image-preview',
            messages: [{ role: 'user', content: imagePrompt }],
            modalities: ['image', 'text'],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[generate-template-assets] Image generation failed:', errorText);
          throw new Error(`Image generation failed: ${response.status}`);
        }

        const data = await response.json();
        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        return new Response(JSON.stringify({
          success: true,
          templateId,
          previewImageUrl: imageUrl,
          generatedAt: new Date().toISOString(),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ============================================================
      // 2. Generate Voice Description (text for TTS)
      // ============================================================
      case 'generate_voice_description': {
        if (!templateLabel || !templateDescription) {
          throw new Error('templateLabel and templateDescription are required');
        }

        const language = userContext?.language || 'fr';
        const voicePrompt = language === 'ba' 
          ? `Génère une courte description vocale (2 phrases max) en Bariba pour le template "${templateLabel}".
             Description: ${templateDescription}
             Ton: Chaleureux, encourageant, simple.
             Format: Texte prêt à être lu à voix haute.`
          : `Génère une courte description vocale (2 phrases max) en français simple pour le template "${templateLabel}".
             Description: ${templateDescription}
             Ton: Chaleureux, encourageant, accessible aux non-lecteurs.
             Format: Texte prêt à être lu à voix haute.`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'Tu es un assistant vocal pour une application destinée aux utilisateurs illettrés en Afrique de l\'Ouest. Génère des textes courts, simples et chaleureux.' },
              { role: 'user', content: voicePrompt }
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`Voice description generation failed: ${response.status}`);
        }

        const data = await response.json();
        const voiceText = data.choices?.[0]?.message?.content || '';

        return new Response(JSON.stringify({
          success: true,
          templateId,
          voiceDescription: voiceText.trim(),
          language,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ============================================================
      // 3. Suggest Template Based on User Context
      // ============================================================
      case 'suggest_template': {
        const { hour = 12, dayOfWeek = 1, userIntent = '', language = 'fr' } = userContext || {};
        
        const contextPrompt = `Tu es un assistant pour une application de création de contenu en Afrique de l'Ouest.

Contexte utilisateur:
- Heure: ${hour}h
- Jour: ${['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][dayOfWeek]}
- Intention (si vocalisée): "${userIntent}"

Templates disponibles:
1. beat_sync_ultra (🎵) - Montage sur musique
2. style_transfer_local (🎬) - Look cinéma
3. one_take_pro (📹) - Stabilisation
4. magic_transform (✨) - Avant/Après
5. smart_captions (💬) - Sous-titres auto
6. mini_doc_village (🏘️) - Mini documentaire
7. metiers_terroir (👨‍🌾) - Valorisation métiers
8. conte_du_soir (🌙) - Conte pour enfants
9. parole_ancien (👴) - Patrimoine immatériel
10. carte_postale_beaute (🌄) - Paysages
11. radio_village (📻) - Audio → vidéo
12. annonce_communautaire (📢) - Annonces locales
13. traduction_voix (🌍) - Traduction automatique

Recommande les 3 templates les plus pertinents avec une courte explication (1 phrase).
Réponds en JSON: { "suggestions": [{ "id": "...", "reason": "..." }, ...] }`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'Tu réponds uniquement en JSON valide.' },
              { role: 'user', content: contextPrompt }
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`Template suggestion failed: ${response.status}`);
        }

        const data = await response.json();
        let suggestionsText = data.choices?.[0]?.message?.content || '{}';
        
        // Clean potential markdown code blocks
        suggestionsText = suggestionsText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        let suggestions;
        try {
          suggestions = JSON.parse(suggestionsText);
        } catch {
          suggestions = { suggestions: [] };
        }

        return new Response(JSON.stringify({
          success: true,
          context: { hour, dayOfWeek, userIntent },
          ...suggestions,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ============================================================
      // 4. Generate Sample Storyboard (sequence of scenes)
      // ============================================================
      case 'generate_sample_storyboard': {
        if (!templateLabel || !templateDescription) {
          throw new Error('templateLabel and templateDescription required');
        }

        const storyboardPrompt = `Génère un storyboard simple (3-4 scènes) pour le template "${templateLabel}".
Description: ${templateDescription}

Pour chaque scène, donne:
- scene: numéro (1, 2, 3...)
- duration: durée en secondes
- description_fr: ce qui se passe à l'écran
- camera_instruction: conseil de cadrage simple
- emoji: emoji représentatif

Réponds en JSON: { "scenes": [...] }`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'Tu es un directeur créatif spécialisé en contenu mobile court-format pour l\'Afrique de l\'Ouest. Réponds en JSON.' },
              { role: 'user', content: storyboardPrompt }
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`Storyboard generation failed: ${response.status}`);
        }

        const data = await response.json();
        let storyboardText = data.choices?.[0]?.message?.content || '{}';
        storyboardText = storyboardText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        let storyboard;
        try {
          storyboard = JSON.parse(storyboardText);
        } catch {
          storyboard = { scenes: [] };
        }

        return new Response(JSON.stringify({
          success: true,
          templateId,
          ...storyboard,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('[generate-template-assets] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
