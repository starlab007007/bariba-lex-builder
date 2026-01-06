import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TemplateAssetRequest {
  action: 'generate_preview_image' | 'generate_voice_description' | 'suggest_template' | 'generate_sample_storyboard' | 'generate_batch_previews';
  templateId?: string;
  templateLabel?: string;
  templateDescription?: string;
  templateEmoji?: string;
  templateColor?: string;
  templates?: Array<{
    id: string;
    label_fr: string;
    description_fr: string;
    emoji: string;
    color: string;
  }>;
  userContext?: {
    hour?: number;
    dayOfWeek?: number;
    userIntent?: string;
    language?: 'fr' | 'ba';
    recentTemplates?: string[];
    location?: string;
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
    const { action, templateId, templateLabel, templateDescription, templateEmoji, templateColor, templates, userContext } = body;

    console.log(`[generate-template-assets] Action: ${action}, Template: ${templateId || 'batch'}`);

    switch (action) {
      // ============================================================
      // 1. Generate Preview Image for Template (Lovable AI Image)
      // ============================================================
      case 'generate_preview_image': {
        if (!templateLabel || !templateDescription) {
          throw new Error('templateLabel and templateDescription are required');
        }

        const imagePrompt = `Create a vibrant, professional thumbnail image for a "${templateLabel}" video template.
Style: Modern West African aesthetic, colorful, energetic, premium mobile app design.
Theme: ${templateDescription}
Visual elements: 
- Large ${templateEmoji || '🎬'} emoji as central visual element (stylized, 3D effect)
- Dynamic gradient background inspired by ${templateColor || 'orange and gold'} African sunset tones
- Clean, minimal design optimized for 9:16 vertical mobile screens
- High contrast, eye-catching visual hierarchy
- Subtle geometric patterns inspired by West African textiles
- Warm, inviting color palette that feels professional yet culturally authentic
- No text or words, only visual elements
Ultra high resolution, sharp details, professional quality.`;

        console.log('[generate-template-assets] Generating preview image with Lovable AI...');

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-3-pro-image-preview',
            messages: [{ role: 'user', content: imagePrompt }],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[generate-template-assets] Image generation failed:', response.status, errorText);
          
          if (response.status === 429) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: 'Rate limit exceeded, please try again later' 
            }), {
              status: 429,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          if (response.status === 402) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: 'Payment required, please add funds' 
            }), {
              status: 402,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          throw new Error(`Image generation failed: ${response.status}`);
        }

        const data = await response.json();
        console.log('[generate-template-assets] Image response received');
        
        // Extract image from response (Gemini image format)
        const content = data.choices?.[0]?.message?.content;
        const imageData = data.choices?.[0]?.message?.images?.[0];
        
        return new Response(JSON.stringify({
          success: true,
          templateId,
          previewImageUrl: imageData?.image_url?.url || imageData?.url || null,
          previewImageBase64: imageData?.b64_json || null,
          description: content || templateDescription,
          generatedAt: new Date().toISOString(),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ============================================================
      // 2. Generate Voice Description (text for TTS) - Enhanced
      // ============================================================
      case 'generate_voice_description': {
        if (!templateLabel || !templateDescription) {
          throw new Error('templateLabel and templateDescription are required');
        }

        const language = userContext?.language || 'fr';
        
        // Enhanced prompt for illiterate-friendly descriptions
        const voicePrompt = language === 'ba' 
          ? `Génère une courte description vocale (2-3 phrases) en Bariba simple pour le template "${templateLabel}".
Description: ${templateDescription}
Emoji du template: ${templateEmoji}

Règles:
- Commence par le nom du template de façon chaleureuse
- Explique ce que fait le template en termes très simples
- Utilise des mots du quotidien, évite le jargon technique
- Termine par un encouragement à essayer
- Ton: Chaleureux, comme un ami qui conseille

Format: Texte prêt à être lu à voix haute.`
          : `Génère une courte description vocale (2-3 phrases) en français très simple pour le template "${templateLabel}".
Description: ${templateDescription}
Emoji: ${templateEmoji}

Règles:
- Commence par nommer le template de façon accueillante (ex: "Voici le template ${templateEmoji}")
- Explique ce qu'il permet de faire en 1 phrase très simple
- Utilise des mots du quotidien (pas de jargon: "vidéo automatique" plutôt que "montage synchronisé")
- Termine par une invitation à essayer ("Appuie pour l'utiliser !")
- Ton: Chaleureux, encourageant, comme un ami

Important: Le texte sera lu à voix haute à des personnes qui ne savent pas lire. Sois naturel et direct.`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { 
                role: 'system', 
                content: 'Tu es un assistant vocal pour TAM-TAM, une application destinée aux utilisateurs illettrés en Afrique de l\'Ouest. Génère des textes courts, simples, chaleureux et naturels. Pas de mots compliqués. Comme si tu parlais à un ami.' 
              },
              { role: 'user', content: voicePrompt }
            ],
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded' }), {
              status: 429,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          throw new Error(`Voice description generation failed: ${response.status}`);
        }

        const data = await response.json();
        const voiceText = data.choices?.[0]?.message?.content || '';

        return new Response(JSON.stringify({
          success: true,
          templateId,
          voiceDescription: voiceText.trim(),
          language,
          emoji: templateEmoji,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ============================================================
      // 3. Suggest Template Based on User Context (Enhanced AI)
      // ============================================================
      case 'suggest_template': {
        const { hour = 12, dayOfWeek = 1, userIntent = '', language = 'fr', recentTemplates = [], location = '' } = userContext || {};
        
        // Time-based context hints
        const timeContext = hour < 6 ? 'nuit profonde' :
                           hour < 10 ? 'matin, moment calme' :
                           hour < 14 ? 'midi, moment actif' :
                           hour < 18 ? 'après-midi' :
                           hour < 21 ? 'soirée, moment famille' :
                           'nuit, moment conte';
        
        const dayContext = ['Dimanche repos', 'Lundi travail', 'Mardi', 'Mercredi marché', 'Jeudi', 'Vendredi prière', 'Samedi marché'][dayOfWeek];
        
        const contextPrompt = `Tu es un assistant intelligent pour TAM-TAM, app de création vidéo en Afrique de l'Ouest.

CONTEXTE UTILISATEUR:
- Heure actuelle: ${hour}h (${timeContext})
- Jour: ${dayContext}
- Intention vocalisée: "${userIntent || 'aucune'}"
- Templates récemment utilisés: ${recentTemplates.length > 0 ? recentTemplates.join(', ') : 'aucun'}
- Lieu approximatif: ${location || 'non précisé'}

TEMPLATES DISPONIBLES (24 au total):

📱 GRAND PUBLIC:
- beat_sync_ultra (🎵) - Montage automatique sur musique avec beat drop
- style_transfer_local (🎬) - Look cinéma africain stylisé
- one_take_pro (📹) - Stabilisation vidéo professionnelle
- magic_transform (✨) - Effet avant/après magique
- smart_captions (💬) - Sous-titres automatiques bilingues
- duet_challenge (👯) - Vidéo côte-à-côte pour défis
- slow_mo_drama (🎭) - Ralenti dramatique
- quiz_interactif (❓) - Quiz avec réponses vocales

📚 ÉDUCATIF & CULTURE:
- mini_doc_village (🏘️) - Mini documentaire local
- metiers_terroir (👨‍🌾) - Valorisation des métiers traditionnels
- conte_du_soir (🌙) - Conte animé pour enfants (soir)
- parole_ancien (👴) - Témoignage patrimoine immatériel
- carte_postale_beaute (🌄) - Paysages magnifiques
- recette_tradition (🍲) - Tutoriel cuisine locale
- langue_minute (🗣️) - Mini leçon de langue
- saison_culture (🌾) - Calendrier agricole

📻 VOCAL & RADIO:
- radio_village (📻) - Message audio → vidéo animée
- annonce_communautaire (📢) - Annonces locales urgentes
- traduction_voix (🌍) - Traduction automatique FR↔Bariba
- debat_village (🎤) - Discussion à plusieurs voix
- temoignage_vecu (💭) - Témoignage personnel
- conseil_sante (💊) - Conseil santé vocalisé
- prix_marche (🛒) - Annonce prix du marché
- alerte_meteo (🌦️) - Alerte météo agricole

INSTRUCTIONS:
1. Analyse le contexte (heure, intention, habitudes)
2. Recommande les 3 templates les PLUS pertinents
3. Pour chaque suggestion, donne une raison COURTE et SIMPLE (compréhensible par quelqu'un qui ne lit pas)
4. Priorise la pertinence contextuelle (soir → conte, marché → prix, etc.)

Réponds UNIQUEMENT en JSON valide:
{
  "suggestions": [
    { "id": "template_id", "emoji": "🎵", "reason_fr": "raison simple", "reason_ba": "raison en bariba si possible", "confidence": 0.95 },
    ...
  ],
  "context_interpretation": "ce que j'ai compris de la demande"
}`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'Tu es un assistant de recommandation intelligent. Réponds uniquement en JSON valide sans markdown.' },
              { role: 'user', content: contextPrompt }
            ],
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded' }), {
              status: 429,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          throw new Error(`Template suggestion failed: ${response.status}`);
        }

        const data = await response.json();
        let suggestionsText = data.choices?.[0]?.message?.content || '{}';
        
        // Clean potential markdown code blocks
        suggestionsText = suggestionsText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        let suggestions;
        try {
          suggestions = JSON.parse(suggestionsText);
        } catch (e) {
          console.error('[generate-template-assets] Failed to parse suggestions:', suggestionsText);
          suggestions = { 
            suggestions: [
              { id: 'beat_sync_ultra', emoji: '🎵', reason_fr: 'Parfait pour créer une vidéo fun', confidence: 0.7 }
            ],
            context_interpretation: 'Suggestion par défaut'
          };
        }

        return new Response(JSON.stringify({
          success: true,
          context: { hour, dayOfWeek, userIntent, timeContext },
          ...suggestions,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ============================================================
      // 4. Generate Sample Storyboard (Enhanced with vocal instructions)
      // ============================================================
      case 'generate_sample_storyboard': {
        if (!templateLabel || !templateDescription) {
          throw new Error('templateLabel and templateDescription required');
        }

        const storyboardPrompt = `Génère un storyboard vocal simple (3-4 scènes) pour le template "${templateLabel}" (${templateEmoji}).
Description: ${templateDescription}

IMPORTANT: Ce storyboard sera LU À VOIX HAUTE à des utilisateurs qui ne savent pas lire.

Pour chaque scène, donne:
- scene: numéro (1, 2, 3...)
- duration_seconds: durée en secondes (5-15s par scène)
- instruction_vocale_fr: instruction ORALE simple et directe (ex: "Maintenant, montre ton visage et souris !")
- instruction_vocale_ba: même instruction en Bariba si possible
- visual_hint: ce que l'utilisateur doit montrer
- emoji: emoji représentatif

Réponds en JSON: 
{
  "title": "titre du storyboard",
  "total_duration_seconds": X,
  "scenes": [
    {
      "scene": 1,
      "duration_seconds": 5,
      "instruction_vocale_fr": "...",
      "instruction_vocale_ba": "...",
      "visual_hint": "...",
      "emoji": "📱"
    }
  ]
}`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'Tu es un directeur créatif spécialisé en contenu mobile court-format pour l\'Afrique de l\'Ouest. Tu crées des instructions VOCALES simples, chaleureuses et directes. Réponds en JSON valide.' },
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
          storyboard = { 
            title: templateLabel,
            total_duration_seconds: 15,
            scenes: [
              { scene: 1, duration_seconds: 5, instruction_vocale_fr: "Prépare-toi à filmer !", emoji: "🎬" },
              { scene: 2, duration_seconds: 5, instruction_vocale_fr: "Montre ce que tu veux partager", emoji: "📱" },
              { scene: 3, duration_seconds: 5, instruction_vocale_fr: "Termine avec un message !", emoji: "✨" }
            ]
          };
        }

        return new Response(JSON.stringify({
          success: true,
          templateId,
          ...storyboard,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ============================================================
      // 5. Batch Generate Previews for Multiple Templates
      // ============================================================
      case 'generate_batch_previews': {
        if (!templates || templates.length === 0) {
          throw new Error('templates array is required');
        }

        // Generate voice descriptions for batch (more efficient)
        const batchPrompt = `Génère des descriptions vocales courtes (1-2 phrases) pour ces ${templates.length} templates vidéo.

Templates:
${templates.map((t, i) => `${i + 1}. ${t.emoji} ${t.label_fr}: ${t.description_fr}`).join('\n')}

Pour chaque template, génère une description ORALE simple et accueillante pour des utilisateurs qui ne savent pas lire.

Réponds en JSON:
{
  "descriptions": [
    { "id": "template_id", "voice_fr": "description en français", "voice_ba": "description en bariba" }
  ]
}`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'Tu génères des descriptions vocales courtes et chaleureuses. Réponds en JSON valide.' },
              { role: 'user', content: batchPrompt }
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`Batch generation failed: ${response.status}`);
        }

        const data = await response.json();
        let batchText = data.choices?.[0]?.message?.content || '{}';
        batchText = batchText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        let batchResult;
        try {
          batchResult = JSON.parse(batchText);
        } catch {
          batchResult = { descriptions: [] };
        }

        return new Response(JSON.stringify({
          success: true,
          count: templates.length,
          ...batchResult,
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
