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

async function generateDemoVideo(apiKey: string, template: any, supabase: any, previewImageUrl?: string): Promise<string> {
  console.log(`[generateDemoVideo] Generating animated video for ${template.template_key}`);
  
  const videoPrompt = `A dynamic, eye-catching video preview for a mobile video template called "${template.label_fr}".

Theme: ${template.family} - ${template.description_fr}
Emoji essence: ${template.emoji}

Visual requirements:
- Smooth, looping animation suitable for a template preview
- Show the template effect in action on a mobile phone screen mockup
- Contemporary African visual style with vibrant ${template.color} colors
- Professional motion graphics quality
- 9:16 vertical mobile format
- Dynamic camera movements and transitions
- Engaging visual effects that showcase the template capabilities

Style: Modern app preview video, social media quality, eye-catching and professional.`;

  const requestBody: any = {
    prompt: videoPrompt,
    aspect_ratio: "9:16",
    duration: 5,
    resolution: "480p"
  };

  // If we have a preview image, use it as starting frame for better consistency
  if (previewImageUrl) {
    requestBody.starting_frame = previewImageUrl;
  }

  console.log(`[generateDemoVideo] Calling video generation API...`);
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/videos/generate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Video generation failed: ${response.status} - ${errorText}`);
    throw new Error(`Video generation failed: ${response.status}`);
  }

  const data = await response.json();
  console.log(`[generateDemoVideo] Video API response:`, JSON.stringify(data).slice(0, 500));
  
  // The video API returns a URL directly or base64
  let videoUrl = data.video_url || data.url;
  
  if (!videoUrl && data.video) {
    // If base64 video, upload to storage
    const base64Data = data.video.replace(/^data:video\/\w+;base64,/, '');
    const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    const filePath = `videos/${template.template_key}_demo.mp4`;
    const { error: uploadError } = await supabase.storage
      .from('template-assets')
      .upload(filePath, buffer, {
        contentType: 'video/mp4',
        upsert: true
      });

    if (uploadError) {
      console.error('Video upload error:', uploadError);
      throw uploadError;
    }

    const { data: urlData } = supabase.storage
      .from('template-assets')
      .getPublicUrl(filePath);

    videoUrl = urlData.publicUrl;
  }
  
  if (!videoUrl) {
    // Fallback: download video from temporary URL and re-upload to our storage
    if (data.url) {
      const videoResponse = await fetch(data.url);
      const videoBuffer = new Uint8Array(await videoResponse.arrayBuffer());
      
      const filePath = `videos/${template.template_key}_demo.mp4`;
      const { error: uploadError } = await supabase.storage
        .from('template-assets')
        .upload(filePath, videoBuffer, {
          contentType: 'video/mp4',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('template-assets')
        .getPublicUrl(filePath);

      videoUrl = urlData.publicUrl;
    }
  }

  if (!videoUrl) {
    throw new Error('No video URL returned from API');
  }

  console.log(`[generateDemoVideo] Video generated: ${videoUrl}`);
  return videoUrl;
}
