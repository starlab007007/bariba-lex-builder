import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MiniDocRequest {
  duration?: number; // 15, 30, or 45 seconds
  villageName?: string;
}

// 5 specific scene prompts for Mini-Doc Village template
const MINI_DOC_SCENES = [
  {
    id: 'overview',
    name_fr: 'Vue d\'ensemble',
    name_ba: 'Dugu yɛrɛ',
    durationPercent: 17, // 0-17% of video
    prompt: `Photorealistic aerial view of a traditional West African village at golden hour.
Mud-brick houses with thatched roofs arranged organically, narrow winding paths between homes.
Baobab trees in the background, warm amber and golden sunset lighting.
Cinematic drone shot perspective, National Geographic documentary style.
9:16 vertical mobile format. Ultra high quality, professional documentary photography.
Warm sepia tones, dust particles visible in sunlight, authentic African village atmosphere.`
  },
  {
    id: 'artisanat',
    name_fr: 'Artisanat local',
    name_ba: 'Baara kɛcogo',
    durationPercent: 25, // 17-42% of video
    prompt: `Close-up of African artisan hands working on traditional pottery or weaving.
Elderly hands shaping red clay on a simple potter's wheel, or fingers threading natural fibers.
Warm afternoon sunlight filtering through a simple workshop window.
Dust particles in the golden light, rich earthy textures of clay and natural materials.
Documentary style, focus on skilled hands and craftsmanship.
9:16 vertical format. Professional photography, warm amber color grading.
Traditional tools visible, authentic West African artisan workshop setting.`
  },
  {
    id: 'habitant',
    name_fr: 'Portrait habitant',
    name_ba: 'Mɔgɔ ja',
    durationPercent: 25, // 42-67% of video
    prompt: `Portrait of a wise elderly African villager with a warm, gentle smile looking at camera.
Traditional colorful clothing (boubou or pagne), dignified and peaceful expression.
Soft natural lighting from the side, blurred village background with bokeh.
Wrinkles telling stories of a rich life, eyes reflecting wisdom and kindness.
Documentary interview style portrait, 9:16 vertical format.
Professional portrait photography, authentic, not staged.
Warm skin tones, natural lighting, respectful and dignified portrayal.`
  },
  {
    id: 'nature',
    name_fr: 'Nature et paysage',
    name_ba: 'Dugukolo ni sankolo',
    durationPercent: 17, // 67-84% of video
    prompt: `Majestic African savanna landscape at sunset with dramatic sky.
Rolling hills covered in golden grass, scattered acacia trees silhouetted against orange sky.
Dramatic cumulus clouds painted in orange, pink and purple hues.
Wide cinematic shot showing the vast beauty of West African countryside.
9:16 vertical format, epic landscape documentary photography.
Golden hour lighting, warm and peaceful atmosphere.
Could include a river or distant mountains, emphasizing natural beauty.`
  },
  {
    id: 'conclusion',
    name_fr: 'Conclusion',
    name_ba: 'Laban',
    durationPercent: 16, // 84-100% of video
    prompt: `Silhouette of a person standing at the edge of a West African village, looking at sunset horizon.
Village rooftops in the warm foreground, sun setting behind distant hills.
Peaceful, contemplative, emotional closing scene.
Golden and amber warm tones, dramatic sky gradients.
9:16 vertical format, cinematic documentary ending.
Inspirational, inviting mood - makes viewer want to visit.
Professional photography, silhouette clearly visible, perfect sunset timing.`
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { duration = 15, villageName = 'Village Africain' }: MiniDocRequest = await req.json();

    console.log(`[generate-mini-doc-video] Starting for duration: ${duration}s, village: ${villageName}`);

    // 1. Get Mini-Doc Village template
    const { data: template, error: templateError } = await supabase
      .from('ai_generated_templates')
      .select('*')
      .eq('template_key', 'mini_doc_village')
      .single();

    if (templateError || !template) {
      throw new Error('Template mini_doc_village not found');
    }

    // 2. Update status to generating
    await supabase
      .from('ai_generated_templates')
      .update({ visual_generation_status: 'generating' })
      .eq('id', template.id);

    // 3. Generate 5 AI images - one per scene
    const sceneFrames: Array<{
      sceneId: string;
      name_fr: string;
      name_ba: string;
      imageUrl: string;
      durationMs: number;
      durationPercent: number;
    }> = [];

    for (let i = 0; i < MINI_DOC_SCENES.length; i++) {
      const scene = MINI_DOC_SCENES[i];
      console.log(`[generate-mini-doc-video] Generating scene ${i + 1}/5: ${scene.name_fr}`);

      // Customize prompt with village name
      const customizedPrompt = scene.prompt.replace(/village/gi, villageName);

      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "google/gemini-3-pro-image-preview",
            messages: [{ role: "user", content: customizedPrompt }],
            modalities: ["image", "text"]
          })
        });

        if (!response.ok) {
          console.error(`Scene ${scene.id} generation failed: ${response.status}`);
          continue;
        }

        const data = await response.json();
        const imageBase64 = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (imageBase64) {
          // Upload to Supabase Storage
          const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
          
          const filePath = `mini-doc-village/${duration}s/scene_${i + 1}_${scene.id}.png`;
          
          await supabase.storage
            .from('template-assets')
            .upload(filePath, buffer, {
              contentType: 'image/png',
              upsert: true
            });

          const { data: urlData } = supabase.storage
            .from('template-assets')
            .getPublicUrl(filePath);

          const sceneDurationMs = (scene.durationPercent / 100) * duration * 1000;

          sceneFrames.push({
            sceneId: scene.id,
            name_fr: scene.name_fr,
            name_ba: scene.name_ba,
            imageUrl: urlData.publicUrl,
            durationMs: sceneDurationMs,
            durationPercent: scene.durationPercent
          });

          console.log(`[generate-mini-doc-video] ✅ Scene ${i + 1}/5 uploaded: ${scene.name_fr}`);
        }
      } catch (err) {
        console.error(`Error generating scene ${scene.id}:`, err);
      }

      // Delay to avoid rate limiting
      if (i < MINI_DOC_SCENES.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (sceneFrames.length === 0) {
      throw new Error('No scenes could be generated');
    }

    // 4. Create animation data structure for client-side video assembly
    const animationData = {
      type: 'mini_doc_village',
      version: '2.0',
      frames: sceneFrames.map(s => s.imageUrl),
      scenes: sceneFrames,
      durationMs: duration * 1000,
      fps: 30,
      loop: true,
      frameCount: sceneFrames.length,
      villageName,
      transitions: 'crossfade',
      transitionDurationMs: 500,
      generatedAt: new Date().toISOString()
    };

    // 5. Store storyboard with scene-specific durations
    const storyboardData = {
      type: 'scene_sequence',
      frames: sceneFrames.map(s => s.imageUrl),
      scenes: sceneFrames.map(s => ({
        id: s.sceneId,
        name_fr: s.name_fr,
        name_ba: s.name_ba,
        durationMs: s.durationMs,
        url: s.imageUrl
      })),
      durationMs: duration * 1000,
      transitions: 'crossfade',
      transitionDurationMs: 500
    };

    // 6. Update template with generated data
    await supabase
      .from('ai_generated_templates')
      .update({
        storyboard_frames: storyboardData,
        ai_storyboard: animationData,
        preview_image_url: sceneFrames[0]?.imageUrl,
        visual_generation_status: 'completed',
        demo_video_url: sceneFrames[0]?.imageUrl // First scene as thumbnail
      })
      .eq('id', template.id);

    console.log(`[generate-mini-doc-video] ✅ Completed! ${sceneFrames.length} scenes for ${duration}s video`);

    return new Response(JSON.stringify({
      success: true,
      message: `Mini-Doc Village ${duration}s video generated with ${sceneFrames.length} scenes`,
      scenes: sceneFrames.length,
      duration,
      previewUrl: sceneFrames[0]?.imageUrl,
      animationData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[generate-mini-doc-video] Error:', error);
    
    // Mark as failed
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await supabase
        .from('ai_generated_templates')
        .update({ visual_generation_status: 'failed' })
        .eq('template_key', 'mini_doc_village');
    } catch {}

    return new Response(JSON.stringify({ 
      error: String(error),
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
