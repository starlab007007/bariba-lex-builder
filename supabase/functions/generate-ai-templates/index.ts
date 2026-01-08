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
  action: 'sync_all' | 'generate_single' | 'generate_batch' | 'analyze' | 'enhance' | 'get_status' | 'generate_visuals_batch' | 'generate_single_visual';
  templates?: TemplateData[];
  templateKey?: string;
  templateId?: string;
  batchSize?: number;
}

interface ScenePrompt {
  scene: number;
  description: string;
  visualElements: string[];
  style: string;
  mood: string;
}

// ============================================
// 🎬 PROMPTS EXPERTS STYLE TIKTOK/KUAISHOU
// ============================================

const TIKTOK_STYLE_CONFIG = {
  grand_public: {
    mood: 'énergique, viral, accrocheur',
    lighting: 'lumineux, saturé, ring light effect',
    camera: 'vertical 9:16, plans serrés, mouvements dynamiques',
    effects: ['overlays texte bold', 'réactions emoji', 'transitions trendy'],
    colorGrade: 'haute saturation, contraste élevé, couleurs pop'
  },
  educatif_culture: {
    mood: 'chaleureux, nostalgique, authentique',
    lighting: 'golden hour, naturel, cinématique',
    camera: 'plans documentaires, profondeur de champ, stabilisé',
    effects: ['cadrage réfléchi', 'artefacts culturels', 'sagesse des anciens'],
    colorGrade: 'tons chauds, grain film subtil, ambiance terroir'
  },
  vocal_radio: {
    mood: 'dynamique, audio-visuel, communautaire',
    lighting: 'éclairage studio, coloré, professionnel',
    camera: 'plans rapprochés speaker, ondes sonores, équipement',
    effects: ['visualisation audio', 'micro en avant', 'réactions live'],
    colorGrade: 'violets et oranges, ambiance radio moderne'
  },
  kuaishou_style: {
    mood: 'magique, transformation, avant-après',
    lighting: 'éclairage dramatique, effets spéciaux',
    camera: 'split screen, transitions fluides, zoom impact',
    effects: ['sparkles', 'morphing', 'color shift', 'glow effects'],
    colorGrade: 'hyper saturé, néon, fantasy'
  }
};

function getExpertTikTokPrompts(template: any): ScenePrompt[] {
  const family = template.family || 'grand_public';
  const config = TIKTOK_STYLE_CONFIG[family as keyof typeof TIKTOK_STYLE_CONFIG] || TIKTOK_STYLE_CONFIG.grand_public;
  const label = template.label_fr || 'Template';
  const emoji = template.emoji || '🎬';
  const color = template.color || '#FF6B00';

  // Base prompts pour chaque famille avec style TikTok africain authentique
  const familyPrompts: Record<string, ScenePrompt[]> = {
    grand_public: [
      {
        scene: 1,
        description: `HOOK VIRAL - Gros plan visage africain expressif regardant la caméra avec surprise/excitation. Texte bold animé "${emoji}" en overlay. Background urbain africain flouté avec mouvement.`,
        visualElements: ['visage expressif africain', 'texte néon overlay', 'blur motion background', 'ring light reflet dans les yeux'],
        style: 'TikTok viral 2024',
        mood: config.mood
      },
      {
        scene: 2,
        description: `REVEAL - Plan moyen sujet principal avec transition whoosh. Créateur africain en action, vêtements colorés modernes. Énergie haute, pose dynamique.`,
        visualElements: ['créateur africain stylé', 'pose dynamique', 'vêtements wax moderne', 'accessoires tendance'],
        style: 'Transition impact',
        mood: 'confident, engaging'
      },
      {
        scene: 3,
        description: `ACTION PEAK - Séquence rapide multi-plans montrant l'action. Beat drop visual avec effets de rythme. Couleurs ${color} dominantes.`,
        visualElements: ['multi-cut rapide', 'effets beat sync', 'motion blur artistique', 'color pop'],
        style: 'Beat sync montage',
        mood: 'énergique, impactant'
      },
      {
        scene: 4,
        description: `MOMENT FORT - Freeze frame sur expression ou réaction clé. Texte reaction "🔥" style TikTok. Éclairage dramatique.`,
        visualElements: ['freeze frame', 'reaction overlay', 'éclairage dramatique', 'expression intense'],
        style: 'Reaction moment',
        mood: 'climax émotionnel'
      },
      {
        scene: 5,
        description: `CTA OUTRO - Créateur face caméra avec sourire invitant. Boutons "Suivre" et "Partager" animés. Fond dégradé ${color}.`,
        visualElements: ['sourire engageant', 'CTA animé', 'icônes sociales', 'gradient branded'],
        style: 'Call to action',
        mood: 'invitant, friendly'
      }
    ],
    educatif_culture: [
      {
        scene: 1,
        description: `ESTABLISHING SHOT - Vue aérienne village africain au lever du soleil. Toits de chaume dans lumière dorée. Brume matinale sur les champs. Style documentaire National Geographic.`,
        visualElements: ['vue drone village', 'golden hour', 'brume poétique', 'architecture traditionnelle'],
        style: 'Cinematic documentary',
        mood: 'majestueux, paisible'
      },
      {
        scene: 2,
        description: `PORTRAIT ANCIEN - Gros plan mains ridées d'un ancien travaillant l'artisanat. Profondeur de champ étroite. Lumière naturelle douce par fenêtre.`,
        visualElements: ['mains expertes', 'artisanat traditionnel', 'ride de sagesse', 'lumière Rembrandt'],
        style: 'Portrait intime',
        mood: 'respectueux, contemplatif'
      },
      {
        scene: 3,
        description: `TRANSMISSION - Ancien enseignant à un jeune, gestes lents et précis. Deux générations. Outils traditionnels. Ambiance atelier.`,
        visualElements: ['deux générations', 'geste de transmission', 'outils ancestraux', 'complicité'],
        style: 'Moment de partage',
        mood: 'émouvant, authentique'
      },
      {
        scene: 4,
        description: `DÉTAIL CULTURE - Macro sur motif traditionnel, tissu ou poterie. Patterns géométriques africains. Couleurs terre et ocre.`,
        visualElements: ['patterns africains', 'texture artisanale', 'couleurs terre', 'détail minutieux'],
        style: 'Beauty shot',
        mood: 'artistique, précieux'
      },
      {
        scene: 5,
        description: `CLÔTURE COMMUNAUTÉ - Large groupe villageois souriant, enfants et anciens mélangés. Coucher de soleil orange. Sentiment d'appartenance.`,
        visualElements: ['communauté unie', 'toutes générations', 'sunset africain', 'joie collective'],
        style: 'Tableau final',
        mood: 'inspirant, chaleureux'
      }
    ],
    vocal_radio: [
      {
        scene: 1,
        description: `STUDIO RADIO - Setup radio communautaire africaine moderne. Micro professionnel, table de mixage. Visualisation ondes sonores animées.`,
        visualElements: ['micro broadcast', 'console audio', 'ondes sonores visuelles', 'LED colorées'],
        style: 'Radio moderne',
        mood: 'professionnel, dynamique'
      },
      {
        scene: 2,
        description: `SPEAKER CHARISMATIQUE - Animateur africain avec casque, expression passionnée au micro. Geste expressif de la main. Éclairage violet/orange.`,
        visualElements: ['animateur passionné', 'casque pro', 'geste éloquent', 'éclairage bicolore'],
        style: 'Portrait speaker',
        mood: 'énergique, engageant'
      },
      {
        scene: 3,
        description: `MESSAGE CLÉ - Écran avec texte important en gros. Typographie bold africaine. Infographie simple et claire. Couleur ${color}.`,
        visualElements: ['texte XXL', 'typo impactante', 'icons explicatifs', 'couleur accent'],
        style: 'Information visuelle',
        mood: 'clair, direct'
      },
      {
        scene: 4,
        description: `AUDIENCE RÉACTION - Groupe d'auditeurs africains réagissant à l'annonce. Smartphones en main. Marché ou place publique.`,
        visualElements: ['auditeurs engagés', 'smartphones', 'espace public africain', 'réactions spontanées'],
        style: 'Réception communautaire',
        mood: 'connecté, impliqué'
      },
      {
        scene: 5,
        description: `CALL TO ACTION - Contact infos avec numéro WhatsApp, icônes réseaux. QR code animé. Slogan accrocheur en Français et langue locale.`,
        visualElements: ['infos contact', 'WhatsApp icon', 'QR code', 'slogan bilingue'],
        style: 'CTA Radio',
        mood: 'actionnable, accessible'
      }
    ],
    kuaishou_style: [
      {
        scene: 1,
        description: `TEASER EFFET - Split screen diagonal, côté gauche "AVANT" normal, côté droit aperçu magique flou. Sparkles animés sur la ligne de séparation.`,
        visualElements: ['split screen', 'avant-après teaser', 'sparkles dorés', 'ligne néon'],
        style: 'Effect preview',
        mood: 'intrigant, magique'
      },
      {
        scene: 2,
        description: `TRANSFORMATION START - Sujet africain au centre, effet commence du bas. Particules montantes. Expression de découverte.`,
        visualElements: ['sujet centré', 'particules montantes', 'glow progressif', 'expression surprise'],
        style: 'Début transformation',
        mood: 'anticipation, wonder'
      },
      {
        scene: 3,
        description: `PEAK EFFECT - Transformation complète, effet plein écran. Couleurs ${color} intenses. Sujet sublimé avec maquillage/style transformé.`,
        visualElements: ['effet maximum', 'couleurs intenses', 'transformation réussie', 'beauty glow'],
        style: 'Maximum impact',
        mood: 'wow, stunning'
      },
      {
        scene: 4,
        description: `VARIATION - Même sujet avec variation de l'effet (autre couleur, autre style). Transition smooth. Démontre versatilité.`,
        visualElements: ['color shift', 'variation effet', 'smooth morph', 'options multiples'],
        style: 'Versatility show',
        mood: 'playful, créatif'
      },
      {
        scene: 5,
        description: `RÉSULTAT FINAL - Before/After côte à côte final. Badge "AI MAGIC ✨". Bouton "Essayer" pulsant. Confettis subtils.`,
        visualElements: ['comparaison finale', 'badge effet', 'CTA pulsant', 'celebration subtle'],
        style: 'Result showcase',
        mood: 'satisfaisant, invitant'
      }
    ]
  };

  const baseScenes = familyPrompts[family] || familyPrompts.grand_public;

  // Personnaliser avec le nom et emoji du template
  return baseScenes.map(scene => ({
    ...scene,
    description: `${scene.description}\n\nTemplate: "${label}" ${emoji}\nCouleur principale: ${color}\nFormat: Vertical 9:16 TikTok\nContexte: Afrique contemporaine, créateurs locaux`,
    visualElements: [...scene.visualElements, `accent ${color}`, 'qualité smartphone haut de gamme', 'contexte africain moderne']
  }));
}

// ============================================
// EDGE FUNCTION PRINCIPALE
// ============================================

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
    const { action, templates, templateKey, templateId, batchSize = 3 } = await req.json() as GenerationRequest;

    console.log(`[generate-ai-templates] Action: ${action}`);

    switch (action) {
      case 'get_status': {
        const { data, error } = await supabase
          .from('ai_generated_templates')
          .select('template_key, generation_status, visual_generation_status, last_generated_at, preview_image_url')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const stats = {
          total: data?.length || 0,
          pending: data?.filter(t => t.generation_status === 'pending').length || 0,
          generating: data?.filter(t => t.generation_status === 'generating').length || 0,
          completed: data?.filter(t => t.generation_status === 'completed').length || 0,
          failed: data?.filter(t => t.generation_status === 'failed').length || 0,
          visualsCompleted: data?.filter(t => t.visual_generation_status === 'completed').length || 0,
          visualsPending: data?.filter(t => !t.visual_generation_status || t.visual_generation_status === 'pending').length || 0,
        };

        return new Response(JSON.stringify({ success: true, stats, templates: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'sync_all': {
        if (!templates || templates.length === 0) {
          throw new Error("No templates provided for sync");
        }

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

        const { data: template, error: fetchError } = await supabase
          .from('ai_generated_templates')
          .select('*')
          .eq('template_key', templateKey)
          .single();

        if (fetchError || !template) {
          throw new Error(`Template not found: ${templateKey}`);
        }

        await supabase
          .from('ai_generated_templates')
          .update({ generation_status: 'generating' })
          .eq('template_key', templateKey);

        try {
          const aiContent = await generateAIContent(LOVABLE_API_KEY, template);

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

      case 'generate_single_visual': {
        // Génère les visuels pour UN seul template (pour progression scene par scene)
        const id = templateId || templateKey;
        if (!id) {
          throw new Error("templateId or templateKey required");
        }

        const { data: template, error: fetchError } = await supabase
          .from('ai_generated_templates')
          .select('*')
          .or(`id.eq.${id},template_key.eq.${id}`)
          .single();

        if (fetchError || !template) {
          throw new Error(`Template not found: ${id}`);
        }

        await supabase
          .from('ai_generated_templates')
          .update({ visual_generation_status: 'generating' })
          .eq('id', template.id);

        try {
          console.log(`[generate_single_visual] Generating 5 TikTok-style scenes for ${template.template_key}`);

          const sceneImages = await generateTikTokSceneImages(LOVABLE_API_KEY, template, supabase);

          await supabase
            .from('ai_generated_templates')
            .update({
              storyboard_frames: { 
                type: 'tiktok_scene_sequence',
                scenes: sceneImages,
                generated_at: new Date().toISOString(),
                version: 2
              },
              preview_image_url: sceneImages[0]?.url || null,
              visual_generation_status: 'completed'
            })
            .eq('id', template.id);

          return new Response(JSON.stringify({ 
            success: true, 
            templateKey: template.template_key,
            scenesCount: sceneImages.length,
            scenes: sceneImages
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        } catch (err) {
          console.error(`Error generating visuals for ${template.template_key}:`, err);
          await supabase
            .from('ai_generated_templates')
            .update({ visual_generation_status: 'failed' })
            .eq('id', template.id);
          throw err;
        }
      }

      case 'generate_visuals_batch': {
        // Traite UN template à la fois pour éviter rate limits et permettre progression granulaire
        const { data: pendingTemplate, error: fetchError } = await supabase
          .from('ai_generated_templates')
          .select('*')
          .or('visual_generation_status.eq.pending,visual_generation_status.is.null')
          .order('created_at', { ascending: true })
          .limit(1)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

        if (!pendingTemplate) {
          return new Response(JSON.stringify({ 
            success: true, 
            message: 'All templates have visuals',
            processed: 0,
            complete: true
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        try {
          await supabase
            .from('ai_generated_templates')
            .update({ visual_generation_status: 'generating' })
            .eq('id', pendingTemplate.id);

          console.log(`[generate_visuals_batch] Generating TikTok scenes for ${pendingTemplate.template_key}`);

          const sceneImages = await generateTikTokSceneImages(LOVABLE_API_KEY, pendingTemplate, supabase);

          await supabase
            .from('ai_generated_templates')
            .update({
              storyboard_frames: { 
                type: 'tiktok_scene_sequence',
                scenes: sceneImages,
                generated_at: new Date().toISOString(),
                version: 2
              },
              preview_image_url: sceneImages[0]?.url || null,
              visual_generation_status: 'completed'
            })
            .eq('id', pendingTemplate.id);

          // Compter combien il en reste
          const { count: remaining } = await supabase
            .from('ai_generated_templates')
            .select('*', { count: 'exact', head: true })
            .or('visual_generation_status.eq.pending,visual_generation_status.is.null');

          return new Response(JSON.stringify({ 
            success: true, 
            processed: 1,
            succeeded: 1,
            failed: 0,
            remaining: remaining || 0,
            results: [{ 
              key: pendingTemplate.template_key, 
              success: true, 
              scenesCount: sceneImages.length,
              scenes: sceneImages  // Include scene URLs for live preview
            }]
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        } catch (err) {
          console.error(`Error generating visuals for ${pendingTemplate.template_key}:`, err);
          await supabase
            .from('ai_generated_templates')
            .update({ visual_generation_status: 'failed' })
            .eq('id', pendingTemplate.id);

          return new Response(JSON.stringify({ 
            success: false, 
            processed: 1,
            succeeded: 0,
            failed: 1,
            results: [{ 
              key: pendingTemplate.template_key, 
              success: false, 
              error: String(err) 
            }]
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
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

// ============================================
// 🎨 GÉNÉRATION D'IMAGES TIKTOK AVEC RETRY
// ============================================

async function generateTikTokSceneImages(apiKey: string, template: any, supabase: any) {
  const scenePrompts = getExpertTikTokPrompts(template);
  const sceneImages: { scene: number; url: string; prompt: string; style: string }[] = [];

  for (const scenePrompt of scenePrompts) {
    const imageUrl = await generateSingleSceneWithRetry(apiKey, template, scenePrompt, supabase);
    
    if (imageUrl) {
      sceneImages.push({
        scene: scenePrompt.scene,
        url: imageUrl,
        prompt: scenePrompt.description.substring(0, 200),
        style: scenePrompt.style
      });
      console.log(`[TikTok Scene] ${template.template_key} - Scene ${scenePrompt.scene}/5 ✓`);
    }

    // Délai entre chaque génération pour éviter rate limit
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  return sceneImages;
}

async function generateSingleSceneWithRetry(
  apiKey: string, 
  template: any, 
  scenePrompt: ScenePrompt, 
  supabase: any,
  maxRetries: number = 3
): Promise<string | null> {
  
  const fullPrompt = `🎬 TIKTOK SCENE GENERATOR - AFRICAN CREATOR CONTENT 🎬

Generate a high-quality, vertical 9:16 image for a TikTok-style video template.

📱 TEMPLATE INFO:
- Name: "${template.label_fr}" ${template.emoji}
- Category: ${template.family}
- Brand Color: ${template.color}

🎬 SCENE ${scenePrompt.scene}/5: ${scenePrompt.style}

📝 DESCRIPTION:
${scenePrompt.description}

🎨 VISUAL ELEMENTS TO INCLUDE:
${scenePrompt.visualElements.map(el => `• ${el}`).join('\n')}

🎭 MOOD: ${scenePrompt.mood}

📐 CRITICAL REQUIREMENTS:
- VERTICAL FORMAT (9:16 ratio like TikTok/Reels)
- Contemporary African setting with modern creators
- Vibrant, high-saturation colors typical of viral content
- Professional smartphone camera quality
- Dynamic composition suggesting video motion
- ${template.color} as accent color throughout
- Authentic African context (NOT stereotypical)
- 2024 TikTok aesthetic trends

🚫 AVOID:
- Horizontal or square compositions
- Stock photo look
- Western-centric imagery
- Low quality or blurry output
- Stereotypical or outdated African imagery

Output: ONE stunning vertical image ready for video template preview.`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[generateScene] Attempt ${attempt}/${maxRetries} for ${template.template_key} scene ${scenePrompt.scene}`);

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [{ role: "user", content: fullPrompt }],
          modalities: ["image", "text"]
        })
      });

      if (response.status === 429) {
        console.warn(`[generateScene] Rate limited, waiting before retry...`);
        await new Promise(resolve => setTimeout(resolve, 5000 * attempt));
        continue;
      }

      if (!response.ok) {
        console.error(`[generateScene] API error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const imageBase64 = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!imageBase64) {
        console.warn(`[generateScene] No image in response, retrying...`);
        continue;
      }

      // Upload to Supabase Storage
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      const filePath = `scenes/${template.template_key}_scene_${scenePrompt.scene}_v2.png`;
      
      const { error: uploadError } = await supabase.storage
        .from('template-assets')
        .upload(filePath, buffer, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) {
        console.error(`[generateScene] Upload error:`, uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('template-assets')
        .getPublicUrl(filePath);

      return urlData.publicUrl;

    } catch (err) {
      console.error(`[generateScene] Error attempt ${attempt}:`, err);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
  }

  // Fallback: retourner null si toutes les tentatives échouent
  console.warn(`[generateScene] All retries failed for ${template.template_key} scene ${scenePrompt.scene}`);
  return null;
}

// ============================================
// GÉNÉRATION CONTENU AI (texte)
// ============================================

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
