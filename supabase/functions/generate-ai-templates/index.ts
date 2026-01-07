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
  action: 'sync_all' | 'generate_single' | 'generate_batch' | 'analyze' | 'enhance' | 'get_status';
  templates?: TemplateData[];
  templateKey?: string;
  batchSize?: number;
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

        const results = [];
        for (const tpl of templates) {
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
            generation_status: 'pending',
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
