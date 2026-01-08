import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TemplateData {
  id: string;
  emoji: string;
  label: string;
  labelBa?: string;
  description: string;
  family: string;
  collection?: string;
  color: string;
  inputs: any[];
  supportedDurations: string[];
  outputRatios: string[];
  features: any;
  voiceInstructions: any[];
  engine?: any;
}

interface GenerationRequest {
  action: 'sync_all' | 'generate_single' | 'generate_batch' | 'analyze' | 'enhance' | 'get_status' | 'generate_visuals_batch';
  templates?: TemplateData[];
  templateKey?: string;
  batchSize?: number;
}

interface ScenePrompt {
  scene: number;
  description: string;
  visualElements: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { action, templates, templateKey, batchSize = 5 } = await req.json() as GenerationRequest;

    console.log(`[generate-ai-templates] Action: ${action}`);

    switch (action) {
      case 'get_status': {
        const { data, error } = await supabase
          .from('ai_generated_templates')
          .select('template_key, generation_status, last_generated_at')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const stats = {
          total: data?.length || 0,
          pending: data?.filter(t => t.generation_status === 'pending').length || 0,
          generating: data?.filter(t => t.generation_status === 'generating').length || 0,
          completed: data?.filter(t => t.generation_status === 'completed').length || 0,
          failed: data?.filter(t => t.generation_status === 'failed').length || 0,
        };

        return new Response(JSON.stringify({ success: true, stats, templates: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'sync_all': {
        if (!templates || templates.length === 0) {
          throw new Error("No templates provided for sync");
        }

        // ✅ IMPORTANT: Sync should NEVER reset already generated templates back to 'pending'.
        // We preserve existing generation_status, and we also "auto-finalize" if AI fields are already present.
        const templateKeys = templates.map((t) => t.id);
        const { data: existingRows, error: existingError } = await supabase
          .from('ai_generated_templates')
          .select('template_key, generation_status, ai_enhanced_description, ai_storyboard, ai_analysis')
          .in('template_key', templateKeys);

        if (existingError) throw existingError;

        const existingMap = new Map<string, any>();
        (existingRows || []).forEach((r) => existingMap.set(r.template_key, r));

        const results = [];
        for (const tpl of templates) {
          const existing = existingMap.get(tpl.id);

          const hasEnoughAIContent =
            !!existing?.ai_enhanced_description &&
            !!existing?.ai_storyboard &&
            !!existing?.ai_analysis;

          const preservedStatus = hasEnoughAIContent
            ? 'completed'
            : (existing?.generation_status || 'pending');

          const templateRecord = {
            template_key: tpl.id,
            emoji: tpl.emoji,
            label_fr: tpl.label,
            label_ba: tpl.labelBa || null,
            description_fr: tpl.description,
            family: tpl.family,
            collection: tpl.collection || null,
            color: tpl.color,
            inputs: tpl.inputs,
            supported_durations: tpl.supportedDurations,
            output_ratios: tpl.outputRatios,
            features: tpl.features,
            voice_instructions: tpl.voiceInstructions,
            kse_engine: tpl.engine || null,
            generation_status: preservedStatus,
          };

          const { data, error } = await supabase
            .from('ai_generated_templates')
            .upsert(templateRecord, { onConflict: 'template_key' })
            .select()
            .single();

          if (error) {
            console.error(`Error syncing ${tpl.id}:`, error);
            results.push({ key: tpl.id, success: false, error: error.message });
          } else {
            results.push({ key: tpl.id, success: true, id: data.id });
          }
        }

        return new Response(JSON.stringify({
          success: true,
          synced: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          results
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'generate_single': {
        if (!templateKey) {
          throw new Error("templateKey required for generate_single");
        }

        // Get template from DB
        const { data: template, error: fetchError } = await supabase
          .from('ai_generated_templates')
          .select('*')
          .eq('template_key', templateKey)
          .single();

        if (fetchError || !template) {
          throw new Error(`Template not found: ${templateKey}`);
        }

        // Mark as generating
        await supabase
          .from('ai_generated_templates')
          .update({ generation_status: 'generating' })
          .eq('template_key', templateKey);

        try {
          // Generate AI content
          const aiContent = await generateAIContent(LOVABLE_API_KEY, template);

          // Update with AI content
          const { error: updateError } = await supabase
            .from('ai_generated_templates')
            .update({
              ai_voice_description_fr: aiContent.voiceDescriptionFr,
              ai_voice_description_ba: aiContent.voiceDescriptionBa,
              ai_enhanced_description: aiContent.enhancedDescription,
              ai_storyboard: aiContent.storyboard,
              ai_analysis: aiContent.analysis,
              generation_status: 'completed',
              last_generated_at: new Date().toISOString(),
            })
            .eq('template_key', templateKey);

          if (updateError) throw updateError;

          return new Response(JSON.stringify({ 
            success: true, 
            templateKey,
            aiContent 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        } catch (genError) {
          await supabase
            .from('ai_generated_templates')
            .update({ generation_status: 'failed' })
            .eq('template_key', templateKey);
          throw genError;
        }
      }

      case 'generate_batch': {
        // Get pending templates
        const { data: pendingTemplates, error: fetchError } = await supabase
          .from('ai_generated_templates')
          .select('*')
          .eq('generation_status', 'pending')
          .limit(batchSize);

        if (fetchError) throw fetchError;

        if (!pendingTemplates || pendingTemplates.length === 0) {
          return new Response(JSON.stringify({ 
            success: true, 
            message: 'No pending templates to generate',
            processed: 0 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const results = [];
        for (const template of pendingTemplates) {
          try {
            await supabase
              .from('ai_generated_templates')
              .update({ generation_status: 'generating' })
              .eq('id', template.id);

            const aiContent = await generateAIContent(LOVABLE_API_KEY, template);

            await supabase
              .from('ai_generated_templates')
              .update({
                ai_voice_description_fr: aiContent.voiceDescriptionFr,
                ai_voice_description_ba: aiContent.voiceDescriptionBa,
                ai_enhanced_description: aiContent.enhancedDescription,
                ai_storyboard: aiContent.storyboard,
                ai_analysis: aiContent.analysis,
                generation_status: 'completed',
                last_generated_at: new Date().toISOString(),
              })
              .eq('id', template.id);

            results.push({ key: template.template_key, success: true });
          } catch (err) {
            await supabase
              .from('ai_generated_templates')
              .update({ generation_status: 'failed' })
              .eq('id', template.id);
            results.push({ key: template.template_key, success: false, error: String(err) });
          }
        }

        return new Response(JSON.stringify({ 
          success: true, 
          processed: results.length,
          succeeded: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          results 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'analyze': {
        if (!templateKey) {
          throw new Error("templateKey required for analyze");
        }

        const { data: template, error } = await supabase
          .from('ai_generated_templates')
          .select('*')
          .eq('template_key', templateKey)
          .single();

        if (error || !template) {
          throw new Error(`Template not found: ${templateKey}`);
        }

        const analysis = await analyzeTemplate(LOVABLE_API_KEY, template);

        await supabase
          .from('ai_generated_templates')
          .update({ ai_analysis: analysis })
          .eq('template_key', templateKey);

        return new Response(JSON.stringify({ success: true, analysis }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'enhance': {
        if (!templateKey) {
          throw new Error("templateKey required for enhance");
        }

        const { data: template, error } = await supabase
          .from('ai_generated_templates')
          .select('*')
          .eq('template_key', templateKey)
          .single();

        if (error || !template) {
          throw new Error(`Template not found: ${templateKey}`);
        }

        const enhanced = await enhanceTemplate(LOVABLE_API_KEY, template);

        await supabase
          .from('ai_generated_templates')
          .update({
            ai_voice_description_fr: enhanced.voiceDescriptionFr,
            ai_voice_description_ba: enhanced.voiceDescriptionBa,
            ai_enhanced_description: enhanced.enhancedDescription,
          })
          .eq('template_key', templateKey);

        return new Response(JSON.stringify({ success: true, enhanced }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'generate_visuals_batch': {
        // Get pending templates without visual assets
        const { data: pendingTemplates, error: fetchError } = await supabase
          .from('ai_generated_templates')
          .select('*')
          .or('visual_generation_status.eq.pending,visual_generation_status.is.null')
          .limit(batchSize);

        if (fetchError) throw fetchError;

        if (!pendingTemplates || pendingTemplates.length === 0) {
          return new Response(JSON.stringify({ 
            success: true, 
            message: 'No pending templates to generate visuals',
            processed: 0 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const results = [];
        for (const template of pendingTemplates) {
          try {
            // Mark as generating
            await supabase
              .from('ai_generated_templates')
              .update({ visual_generation_status: 'generating' })
              .eq('id', template.id);

            console.log(`[generate_visuals_batch] Generating 5 scenes for ${template.template_key}`);

            // Generate 5 scene images
            const sceneImages = await generateTemplateSceneImages(LOVABLE_API_KEY, template, supabase);

            // Update with generated visuals
            await supabase
              .from('ai_generated_templates')
              .update({
                storyboard_frames: { 
                  type: 'scene_sequence',
                  scenes: sceneImages,
                  generated_at: new Date().toISOString()
                },
                preview_image_url: sceneImages[0]?.url || null,
                visual_generation_status: 'completed'
              })
              .eq('id', template.id);

            results.push({ 
              key: template.template_key, 
              success: true, 
              scenesCount: sceneImages.length 
            });
          } catch (err) {
            console.error(`Error generating visuals for ${template.template_key}:`, err);
            await supabase
              .from('ai_generated_templates')
              .update({ visual_generation_status: 'failed' })
              .eq('id', template.id);
            results.push({ key: template.template_key, success: false, error: String(err) });
          }
        }

        return new Response(JSON.stringify({ 
          success: true, 
          processed: results.length,
          succeeded: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          results 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('[generate-ai-templates] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Generate 5 scene images for a template using Lovable AI
async function generateTemplateSceneImages(apiKey: string, template: any, supabase: any) {
  const scenePrompts = getScenePromptsForTemplate(template);
  const sceneImages: { scene: number; url: string; prompt: string }[] = [];

  for (const scenePrompt of scenePrompts) {
    try {
      const imagePrompt = `Generate a vibrant, professional scene image for an African video template.

Template: "${template.label_fr}" (${template.emoji})
Scene ${scenePrompt.scene}/5: ${scenePrompt.description}
Family: ${template.family}
Color theme: ${template.color}

Visual elements to include:
${scenePrompt.visualElements.map(el => `- ${el}`).join('\n')}

Style requirements:
- Contemporary African aesthetic with bold patterns
- Vibrant colors with ${template.color} as accent
- Professional quality suitable for a video template preview
- 9:16 vertical mobile format
- Dynamic composition suggesting motion
- Clean, modern design with cultural authenticity

Output: A single high-quality scene frame for video template preview.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [{ role: "user", content: imagePrompt }],
          modalities: ["image", "text"]
        })
      });

      if (!response.ok) {
        console.error(`Scene ${scenePrompt.scene} generation failed: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const imageBase64 = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (imageBase64) {
        // Upload to Supabase Storage
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        const filePath = `scenes/${template.template_key}_scene_${scenePrompt.scene}.png`;
        await supabase.storage
          .from('template-assets')
          .upload(filePath, buffer, {
            contentType: 'image/png',
            upsert: true
          });

        const { data: urlData } = supabase.storage
          .from('template-assets')
          .getPublicUrl(filePath);

        sceneImages.push({
          scene: scenePrompt.scene,
          url: urlData.publicUrl,
          prompt: scenePrompt.description
        });

        console.log(`[generateTemplateSceneImages] Scene ${scenePrompt.scene}/5 generated for ${template.template_key}`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (err) {
      console.error(`Error generating scene ${scenePrompt.scene}:`, err);
    }
  }

  return sceneImages;
}

// Generate scene prompts based on template type
function getScenePromptsForTemplate(template: any): ScenePrompt[] {
  const baseScenes: ScenePrompt[] = [];
  const family = template.family || 'grand_public';
  const label = template.label_fr || 'Template';

  switch (family) {
    case 'educatif_culture':
      baseScenes.push(
        { scene: 1, description: 'Opening - Cultural setting establishing shot', visualElements: ['African landscape', 'Traditional architecture', 'Warm lighting'] },
        { scene: 2, description: 'Introduction - Person or subject presentation', visualElements: ['Local person', 'Traditional clothing', 'Natural environment'] },
        { scene: 3, description: 'Main content - Educational moment or cultural demonstration', visualElements: ['Hands working', 'Traditional craft', 'Teaching moment'] },
        { scene: 4, description: 'Detail shot - Close-up on important element', visualElements: ['Intricate details', 'Cultural patterns', 'Focused light'] },
        { scene: 5, description: 'Closing - Inspiring conclusion with message', visualElements: ['Smiling faces', 'Community gathering', 'Sunset ambiance'] }
      );
      break;

    case 'vocal_radio':
      baseScenes.push(
        { scene: 1, description: 'Radio studio or announcement setting', visualElements: ['Microphone', 'Sound waves', 'Broadcast equipment'] },
        { scene: 2, description: 'Speaker or announcer presentation', visualElements: ['Confident speaker', 'Professional setting', 'Dynamic pose'] },
        { scene: 3, description: 'Message delivery - Key information visual', visualElements: ['Text overlays', 'Info graphics', 'Bold typography'] },
        { scene: 4, description: 'Community reaction or engagement', visualElements: ['Diverse listeners', 'Mobile phones', 'Village gathering'] },
        { scene: 5, description: 'Call to action - Closing with contact info', visualElements: ['Phone numbers', 'Social icons', 'Community logo'] }
      );
      break;

    case 'kuaishou_style':
      baseScenes.push(
        { scene: 1, description: 'Eye-catching intro with special effect', visualElements: ['Bright colors', 'Special effects', 'Attention grabber'] },
        { scene: 2, description: 'Subject reveal with transition', visualElements: ['Smooth transition', 'Subject centered', 'Dynamic framing'] },
        { scene: 3, description: 'Peak effect moment - Maximum visual impact', visualElements: ['Full effect applied', 'Vibrant colors', 'Motion blur'] },
        { scene: 4, description: 'Variation or secondary effect', visualElements: ['Color shift', 'Pattern change', 'New angle'] },
        { scene: 5, description: 'Finale - Perfect finished result', visualElements: ['Polished look', 'Professional finish', 'Share-ready'] }
      );
      break;

    default: // grand_public
      baseScenes.push(
        { scene: 1, description: 'Dynamic intro with template branding', visualElements: ['Bold title', 'Energetic colors', 'Modern design'] },
        { scene: 2, description: 'Main subject introduction', visualElements: ['Person or product', 'Clean framing', 'Good lighting'] },
        { scene: 3, description: 'Action sequence - Movement and energy', visualElements: ['Motion effects', 'Beat sync suggestion', 'Dynamic poses'] },
        { scene: 4, description: 'Highlight moment - Key visual impact', visualElements: ['Peak action', 'Emotional expression', 'Color pop'] },
        { scene: 5, description: 'Outro with call to action', visualElements: ['Social buttons', 'Follow CTA', 'Brand consistency'] }
      );
  }

  // Customize based on template emoji/label
  return baseScenes.map(scene => ({
    ...scene,
    description: `${scene.description} for "${label}" ${template.emoji}`,
    visualElements: [...scene.visualElements, template.emoji, template.color]
  }));
}

async function generateAIContent(apiKey: string, template: any) {
  const [voiceDesc, analysis, storyboard] = await Promise.all([
    generateVoiceDescription(apiKey, template),
    analyzeTemplate(apiKey, template),
    generateStoryboard(apiKey, template),
  ]);

  return {
    voiceDescriptionFr: voiceDesc.fr,
    voiceDescriptionBa: voiceDesc.ba,
    enhancedDescription: voiceDesc.enhanced,
    analysis,
    storyboard,
  };
}

async function generateVoiceDescription(apiKey: string, template: any) {
  const prompt = `Tu es un expert en création de contenu accessible pour des utilisateurs africains, dont beaucoup ne savent pas lire.

Voici un template de création vidéo :
- Nom: ${template.label_fr}
- Description: ${template.description_fr}
- Emoji: ${template.emoji}
- Famille: ${template.family}
- Fonctionnalités: ${JSON.stringify(template.features)}

Génère 3 textes courts et simples :

1. **Description vocale française** (max 50 mots) : Explique ce template comme si tu parlais à quelqu'un qui ne sait pas lire. Utilise des mots simples, parle des résultats visibles.

2. **Description vocale Bariba** (max 50 mots) : Traduis la description en Bariba simple (langue du Bénin). Si tu ne connais pas certains mots, utilise des termes génériques.

3. **Description améliorée** (max 80 mots) : Une version enrichie pour l'interface, moderne mais accessible.

Réponds en JSON avec les clés: "fr", "ba", "enhanced"`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`Voice description generation failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  
  try {
    return JSON.parse(content);
  } catch {
    return {
      fr: `${template.emoji} ${template.label_fr} - Un template pour créer des vidéos facilement.`,
      ba: `${template.emoji} ${template.label_fr} - Wɛ sɔ dɔ video kɛrɛ.`,
      enhanced: template.description_fr,
    };
  }
}

async function analyzeTemplate(apiKey: string, template: any) {
  const prompt = `Analyse ce template de création vidéo et évalue-le :

Template: ${template.label_fr}
Description: ${template.description_fr}
Famille: ${template.family}
Fonctionnalités: ${JSON.stringify(template.features)}
Instructions vocales: ${JSON.stringify(template.voice_instructions)}

Évalue sur 100 points :
1. **clarté** : Les instructions sont-elles claires pour un débutant ?
2. **accessibilité** : Est-ce utilisable par quelqu'un qui ne sait pas lire ?
3. **pertinence_culturelle** : Est-ce adapté au contexte africain/béninois ?
4. **facilité_technique** : Est-ce techniquement simple à utiliser ?
5. **créativité** : Le résultat final sera-t-il créatif/intéressant ?

Ajoute aussi :
- **points_forts** : Liste de 3 points forts
- **suggestions** : Liste de 3 améliorations possibles
- **tags** : 5 mots-clés pour la recherche

Réponds en JSON.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`Analysis failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  
  try {
    return JSON.parse(content);
  } catch {
    return {
      clarté: 70,
      accessibilité: 70,
      pertinence_culturelle: 70,
      facilité_technique: 70,
      créativité: 70,
      points_forts: ["Facile à utiliser", "Visuel attrayant", "Résultat rapide"],
      suggestions: ["Ajouter plus d'instructions vocales", "Simplifier les étapes", "Ajouter des exemples"],
      tags: ["vidéo", "création", "facile", "africain", template.family],
    };
  }
}

async function generateStoryboard(apiKey: string, template: any) {
  const prompt = `Crée un storyboard simple pour ce template vidéo :

Template: ${template.label_fr}
Description: ${template.description_fr}
Durées supportées: ${template.supported_durations?.join(', ')}
Instructions: ${JSON.stringify(template.voice_instructions)}

Génère un storyboard de 3-5 étapes, chaque étape avec :
- **step** : Numéro de l'étape (1, 2, 3...)
- **duration_seconds** : Durée estimée
- **action** : Ce que l'utilisateur doit faire (en français simple)
- **visual** : Ce qui apparaît à l'écran
- **audio_cue** : Indication audio/vocale

Réponds en JSON avec une clé "steps" contenant le tableau d'étapes.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`Storyboard generation failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  
  try {
    return JSON.parse(content);
  } catch {
    return {
      steps: [
        { step: 1, duration_seconds: 3, action: "Prépare ta caméra", visual: "Écran d'accueil", audio_cue: "Bienvenue !" },
        { step: 2, duration_seconds: 10, action: "Enregistre ta vidéo", visual: "Caméra active", audio_cue: "C'est parti !" },
        { step: 3, duration_seconds: 2, action: "Valide et partage", visual: "Aperçu final", audio_cue: "Bravo !" },
      ],
    };
  }
}

async function enhanceTemplate(apiKey: string, template: any) {
  return generateVoiceDescription(apiKey, template);
}
