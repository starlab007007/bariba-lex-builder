import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VisualGenerationRequest {
  action: 'generate_preview' | 'generate_icon' | 'generate_storyboard' | 'generate_video' | 'generate_all' | 'batch_generate';
  templateId?: string;
  templateKey?: string;
  batchSize?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { action, templateId, templateKey, batchSize = 3 }: VisualGenerationRequest = await req.json();

    console.log(`[generate-template-visuals] Action: ${action}, templateId: ${templateId}`);

    // Get template data
    const getTemplate = async (id?: string, key?: string) => {
      let query = supabase.from('ai_generated_templates').select('*');
      if (id) query = query.eq('id', id);
      else if (key) query = query.eq('template_key', key);
      const { data, error } = await query.single();
      if (error) throw error;
      return data;
    };

    switch (action) {
      case 'generate_preview': {
        const template = await getTemplate(templateId, templateKey);
        const previewUrl = await generatePreviewImage(lovableApiKey, template, supabase);
        
        await supabase
          .from('ai_generated_templates')
          .update({ 
            preview_image_url: previewUrl,
            visual_generation_status: 'generating'
          })
          .eq('id', template.id);

        return new Response(JSON.stringify({ success: true, previewUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'generate_icon': {
        const template = await getTemplate(templateId, templateKey);
        const iconUrl = await generateIconImage(lovableApiKey, template, supabase);
        
        await supabase
          .from('ai_generated_templates')
          .update({ icon_url: iconUrl })
          .eq('id', template.id);

        return new Response(JSON.stringify({ success: true, iconUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'generate_storyboard': {
        const template = await getTemplate(templateId, templateKey);
        const storyboardFrames = await generateStoryboardFrames(lovableApiKey, template, supabase);
        
        await supabase
          .from('ai_generated_templates')
          .update({ storyboard_frames: storyboardFrames })
          .eq('id', template.id);

        return new Response(JSON.stringify({ success: true, storyboardFrames }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'generate_video': {
        const template = await getTemplate(templateId, templateKey);
        
        await supabase
          .from('ai_generated_templates')
          .update({ visual_generation_status: 'generating' })
          .eq('id', template.id);

        try {
          const videoUrl = await generateDemoVideo(lovableApiKey, template, supabase);
          
          await supabase
            .from('ai_generated_templates')
            .update({ 
              demo_video_url: videoUrl,
              visual_generation_status: 'completed'
            })
            .eq('id', template.id);

          return new Response(JSON.stringify({ success: true, videoUrl }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error) {
          await supabase
            .from('ai_generated_templates')
            .update({ visual_generation_status: 'failed' })
            .eq('id', template.id);
          throw error;
        }
      }

      case 'generate_all': {
        const template = await getTemplate(templateId, templateKey);
        
        // Update status to generating
        await supabase
          .from('ai_generated_templates')
          .update({ visual_generation_status: 'generating' })
          .eq('id', template.id);

        try {
          // Generate preview image first
          const previewUrl = await generatePreviewImage(lovableApiKey, template, supabase);
          
          // Then generate animated video from the preview
          const videoUrl = await generateDemoVideo(lovableApiKey, template, supabase, previewUrl);

          // Update with all generated content
          await supabase
            .from('ai_generated_templates')
            .update({
              preview_image_url: previewUrl,
              demo_video_url: videoUrl,
              visual_generation_status: 'completed'
            })
            .eq('id', template.id);

          return new Response(JSON.stringify({ 
            success: true, 
            previewUrl,
            videoUrl
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error) {
          console.error('Error generating visuals:', error);
          await supabase
            .from('ai_generated_templates')
            .update({ visual_generation_status: 'failed' })
            .eq('id', template.id);
          throw error;
        }
      }

      case 'batch_generate': {
        // Get templates without visuals
        const { data: pendingTemplates, error } = await supabase
          .from('ai_generated_templates')
          .select('*')
          .or('visual_generation_status.eq.pending,visual_generation_status.is.null')
          .limit(batchSize);

        if (error) throw error;

        const results = [];
        for (const template of pendingTemplates || []) {
          try {
            await supabase
              .from('ai_generated_templates')
              .update({ visual_generation_status: 'generating' })
              .eq('id', template.id);

            // Generate preview image first
            const previewUrl = await generatePreviewImage(lovableApiKey, template, supabase);
            
            // Generate animated video from preview
            const videoUrl = await generateDemoVideo(lovableApiKey, template, supabase, previewUrl);

            await supabase
              .from('ai_generated_templates')
              .update({
                preview_image_url: previewUrl,
                demo_video_url: videoUrl,
                visual_generation_status: 'completed'
              })
              .eq('id', template.id);

            results.push({ templateKey: template.template_key, success: true, previewUrl, videoUrl });
          } catch (err) {
            console.error(`Error processing ${template.template_key}:`, err);
            await supabase
              .from('ai_generated_templates')
              .update({ visual_generation_status: 'failed' })
              .eq('id', template.id);
            results.push({ templateKey: template.template_key, success: false, error: String(err) });
          }
        }

        return new Response(JSON.stringify({ success: true, results }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('[generate-template-visuals] Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function generatePreviewImage(apiKey: string, template: any, supabase: any): Promise<string> {
  console.log(`[generatePreviewImage] Generating for ${template.template_key}`);
  
  const prompt = `Generate a vibrant, modern African-style preview image for a video creation template called "${template.label_fr}".

Theme: ${template.family} - ${template.description_fr}
Color scheme: ${template.color}

Requirements:
- Show a stylized smartphone mockup displaying the template effect
- Use bold, contemporary African design patterns and motifs
- Vibrant colors with ${template.color} as the dominant palette
- Include visual elements suggesting: ${template.emoji}
- Modern, clean composition suitable for a template library
- 9:16 aspect ratio (vertical mobile format)
- Professional quality, app store ready

Style: Contemporary African art meets mobile app design, geometric patterns, bold typography hints, dynamic composition.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "google/gemini-3-pro-image-preview",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"]
    })
  });

  if (!response.ok) {
    throw new Error(`Image generation failed: ${response.status}`);
  }

  const data = await response.json();
  const imageBase64 = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  
  if (!imageBase64) {
    throw new Error('No image returned from API');
  }

  // Upload to Supabase Storage
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
  
  const filePath = `previews/${template.template_key}_preview.png`;
  const { error: uploadError } = await supabase.storage
    .from('template-assets')
    .upload(filePath, buffer, {
      contentType: 'image/png',
      upsert: true
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    throw uploadError;
  }

  const { data: urlData } = supabase.storage
    .from('template-assets')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

async function generateIconImage(apiKey: string, template: any, supabase: any): Promise<string> {
  console.log(`[generateIconImage] Generating for ${template.template_key}`);
  
  const prompt = `Generate a modern app icon for a video template called "${template.label_fr}".

Design requirements:
- Emoji inspiration: ${template.emoji}
- Color: ${template.color}
- Style: Flat design, modern, minimal
- Square format (1:1)
- Bold, recognizable silhouette
- Contemporary African influence with geometric patterns
- Suitable as a category icon in a mobile app

Output: Single clean icon, no text, vibrant colors.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "google/gemini-3-pro-image-preview",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"]
    })
  });

  if (!response.ok) {
    throw new Error(`Icon generation failed: ${response.status}`);
  }

  const data = await response.json();
  const imageBase64 = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  
  if (!imageBase64) {
    throw new Error('No icon returned from API');
  }

  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
  
  const filePath = `icons/${template.template_key}_icon.png`;
  const { error: uploadError } = await supabase.storage
    .from('template-assets')
    .upload(filePath, buffer, {
      contentType: 'image/png',
      upsert: true
    });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('template-assets')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

async function generateAnimatedFrames(apiKey: string, template: any, supabase: any): Promise<string[]> {
  console.log(`[generateAnimatedFrames] Generating animation frames for ${template.template_key}`);
  
  const frameUrls: string[] = [];
  const frameCount = 4; // Generate 4 frames for animation
  
  for (let i = 0; i < frameCount; i++) {
    const phase = ['debut', 'progression', 'climax', 'finale'][i];
    const prompt = `Generate frame ${i + 1}/${frameCount} for animated preview of "${template.label_fr}" template.

Phase: ${phase}
Theme: ${template.family} - ${template.description_fr}
Emoji: ${template.emoji}

Requirements:
- Mobile phone mockup showing the template in action
- Phase ${phase}: ${i === 0 ? 'Opening scene, template starting' : i === 1 ? 'Effect building up' : i === 2 ? 'Maximum effect impact' : 'Final polished result'}
- Vibrant ${template.color} colors, contemporary African aesthetic
- 9:16 vertical format
- Should flow smoothly with other frames
- Professional app preview quality

Style: Modern social media template preview, dynamic and engaging.`;

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"]
        })
      });

      if (!response.ok) {
        console.error(`Frame ${i} generation failed: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const imageBase64 = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      
      if (imageBase64) {
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        const filePath = `animations/${template.template_key}_frame_${i}.png`;
        await supabase.storage
          .from('template-assets')
          .upload(filePath, buffer, {
            contentType: 'image/png',
            upsert: true
          });

        const { data: urlData } = supabase.storage
          .from('template-assets')
          .getPublicUrl(filePath);

        frameUrls.push(urlData.publicUrl);
        console.log(`[generateAnimatedFrames] Frame ${i + 1} generated`);
      }
    } catch (err) {
      console.error(`Error generating frame ${i}:`, err);
    }
  }

  return frameUrls;
}

// Store animation frames as JSON for client-side animation
async function generateDemoVideo(apiKey: string, template: any, supabase: any, previewImageUrl?: string): Promise<string> {
  console.log(`[generateDemoVideo] Creating animated sequence for ${template.template_key}`);
  
  // Generate multiple frames for animation
  const frameUrls = await generateAnimatedFrames(apiKey, template, supabase);
  
  if (frameUrls.length === 0) {
    throw new Error('No animation frames generated');
  }

  // Store as JSON that the client can animate
  const animationData = {
    type: 'frame_sequence',
    frames: frameUrls,
    duration: 5000, // 5 seconds total
    fps: frameUrls.length / 5 // frames per second
  };

  const jsonBuffer = new TextEncoder().encode(JSON.stringify(animationData));
  const filePath = `animations/${template.template_key}_animation.json`;
  
  await supabase.storage
    .from('template-assets')
    .upload(filePath, jsonBuffer, {
      contentType: 'application/json',
      upsert: true
    });

  const { data: urlData } = supabase.storage
    .from('template-assets')
    .getPublicUrl(filePath);

  console.log(`[generateDemoVideo] Animation sequence created: ${urlData.publicUrl}`);
  
  // Return the first frame as demo_video_url placeholder, store animation in storyboard
  await supabase
    .from('ai_generated_templates')
    .update({ 
      storyboard_frames: animationData,
      ai_storyboard: { animation_frames: frameUrls }
    })
    .eq('id', template.id);

  // Return first frame URL as preview (the client will use storyboard_frames for animation)
  return frameUrls[0] || previewImageUrl || '';
}
