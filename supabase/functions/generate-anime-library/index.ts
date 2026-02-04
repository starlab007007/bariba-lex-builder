/**
 * Generate Anime Library Edge Function
 * 
 * Batch generation of pre-generated anime images for the library.
 * Actions:
 * - generate_batch: Generate images for a combination of style+emotion+scene
 * - list_library: List available images with filters
 * - get_stats: Get library coverage statistics
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// Valid values for each classification
const VALID_STYLES = ['manga', 'chibi', 'fantasy', 'african'] as const;
const VALID_EMOTIONS = ['joy', 'sadness', 'wonder', 'fear', 'excitement', 'peace', 'tension'] as const;
const VALID_SCENE_TYPES = ['village', 'forest', 'river', 'mountain', 'market', 'home', 'night', 'journey', 'gathering', 'spirit'] as const;
const VALID_CHARACTERS = ['child_boy', 'child_girl', 'elder', 'animal', 'spirit', 'group'] as const;
const VALID_ACTIONS = ['standing', 'walking', 'talking', 'dancing', 'working', 'sleeping', 'running', 'discovering'] as const;
const VALID_TIMES = ['dawn', 'morning', 'noon', 'afternoon', 'dusk', 'night'] as const;

// Style keywords for anime generation
const STYLE_KEYWORDS: Record<string, string> = {
  manga: 'manga style, detailed lineart, anime eyes, dynamic pose, high contrast, black and white with screentones, japanese manga aesthetic',
  chibi: 'chibi style, cute, big head small body, kawaii, simple background, pastel colors, adorable characters, big expressive eyes',
  fantasy: 'fantasy anime style, magical, ethereal lighting, detailed scenery, epic fantasy, vibrant colors, mystical atmosphere',
  african: 'african-inspired anime, warm earth tones, traditional african patterns, tribal motifs, anime style characters with african features, rich textures, sunset colors'
};

// Emotion to visual cues mapping
const EMOTION_VISUALS: Record<string, string> = {
  joy: 'bright colors, warm lighting, cheerful atmosphere, sparkles, golden sunlight',
  sadness: 'cool blue tones, soft rain, muted colors, melancholic atmosphere, grey sky',
  wonder: 'magical particles, starry effects, ethereal glow, dreamy atmosphere, soft light',
  fear: 'dark shadows, ominous lighting, dramatic contrast, eerie atmosphere',
  excitement: 'dynamic angles, action lines, vibrant energy, motion blur, bright highlights',
  peace: 'soft pastoral colors, gentle sunlight, serene atmosphere, calm nature',
  tension: 'dramatic shadows, red accents, intense expressions, stormy sky'
};

// Scene type descriptions
const SCENE_DESCRIPTIONS: Record<string, string> = {
  village: 'traditional African village with round huts, baobab trees, communal area',
  forest: 'dense mystical forest with tall trees, filtered sunlight, lush vegetation',
  river: 'flowing river with clear water, riverside vegetation, peaceful water scene',
  mountain: 'majestic mountain landscape, rocky terrain, expansive view',
  market: 'bustling local market with colorful stalls, vibrant activity',
  home: 'warm interior of traditional home, firelight, family space',
  night: 'nighttime scene with stars, moon, campfire glow',
  journey: 'winding path through landscape, traveler perspective, horizon view',
  gathering: 'community celebration, group of people, festive atmosphere',
  spirit: 'mystical encounter, glowing entity, magical realm'
};

// Character descriptions
const CHARACTER_DESCRIPTIONS: Record<string, string> = {
  child_boy: 'young African boy aged 8-12, curious expression, traditional clothing',
  child_girl: 'young African girl aged 8-12, bright eyes, colorful dress',
  elder: 'wise African elder with grey hair, dignified posture, traditional robes',
  animal: 'African wildlife animal, expressive eyes, natural pose',
  spirit: 'ethereal spirit being, glowing, translucent, magical presence',
  group: 'group of villagers, diverse ages, communal scene'
};

// Action descriptions
const ACTION_DESCRIPTIONS: Record<string, string> = {
  standing: 'standing calmly, observing surroundings',
  walking: 'walking gracefully, in motion',
  talking: 'engaged in conversation, expressive gestures',
  dancing: 'dancing joyfully, dynamic movement',
  working: 'performing daily tasks, focused',
  sleeping: 'resting peacefully, serene expression',
  running: 'running energetically, movement blur',
  discovering: 'discovering something amazing, wonder in eyes'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { command, ...params } = body;
    
    // Support both 'action' (legacy) and 'command' for the API action
    const apiAction = command || body.action;
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('[generate-anime-library] Received:', { apiAction, params: Object.keys(params) });

    switch (apiAction) {
      case 'generate_batch':
        // Remove 'action' from params since it's used for the API action
        const { action: _, ...genParams } = params;
        return await handleGenerateBatch({ ...genParams, action: body.image_action || body.action }, supabase, LOVABLE_API_KEY);
      
      case 'list_library':
        return await handleListLibrary(params, supabase);
      
      case 'get_stats':
        return await handleGetStats(supabase);
      
      default:
        return new Response(
          JSON.stringify({ success: false, error: `Invalid action '${apiAction}'. Use: generate_batch, list_library, get_stats` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
  } catch (error) {
    console.error('[generate-anime-library] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

/**
 * Generate a batch of images for specified combinations
 */
async function handleGenerateBatch(
  params: {
    style: string;
    emotion: string;
    scene_type: string;
    character_type?: string;
    action?: string;
    time_of_day?: string;
    count?: number;
  },
  supabase: ReturnType<typeof createClient>,
  apiKey?: string
) {
  const { style, emotion, scene_type, character_type, action, time_of_day, count = 1 } = params;

  // Validate required fields
  if (!VALID_STYLES.includes(style as any)) {
    return jsonResponse({ success: false, error: `Invalid style. Valid: ${VALID_STYLES.join(', ')}` }, 400);
  }
  if (!VALID_EMOTIONS.includes(emotion as any)) {
    return jsonResponse({ success: false, error: `Invalid emotion. Valid: ${VALID_EMOTIONS.join(', ')}` }, 400);
  }
  if (!VALID_SCENE_TYPES.includes(scene_type as any)) {
    return jsonResponse({ success: false, error: `Invalid scene_type. Valid: ${VALID_SCENE_TYPES.join(', ')}` }, 400);
  }

  if (!apiKey) {
    return jsonResponse({ success: false, error: 'API key not configured' }, 500);
  }

  const generated: any[] = [];
  const errors: any[] = [];

  for (let i = 0; i < Math.min(count, 5); i++) {
    try {
      const result = await generateAndStoreImage({
        style,
        emotion,
        scene_type,
        character_type: character_type || 'child_boy',
        action: action || 'standing',
        time_of_day: time_of_day || 'afternoon',
        apiKey,
        supabase
      });
      generated.push(result);
    } catch (err) {
      errors.push({ index: i, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  return jsonResponse({
    success: true,
    generated: generated.length,
    images: generated,
    errors: errors.length > 0 ? errors : undefined
  });
}

/**
 * Generate a single image and store it
 */
async function generateAndStoreImage(params: {
  style: string;
  emotion: string;
  scene_type: string;
  character_type: string;
  action: string;
  time_of_day: string;
  apiKey: string;
  supabase: ReturnType<typeof createClient>;
}) {
  const { style, emotion, scene_type, character_type, action, time_of_day, apiKey, supabase } = params;

  // Build the prompt
  const styleKeywords = STYLE_KEYWORDS[style] || STYLE_KEYWORDS.fantasy;
  const emotionVisuals = EMOTION_VISUALS[emotion] || EMOTION_VISUALS.wonder;
  const sceneDesc = SCENE_DESCRIPTIONS[scene_type] || '';
  const charDesc = CHARACTER_DESCRIPTIONS[character_type] || '';
  const actionDesc = ACTION_DESCRIPTIONS[action] || '';

  const prompt = `Create an anime illustration in ${style} style.

SCENE: ${sceneDesc}
CHARACTER: ${charDesc}, ${actionDesc}
TIME: ${time_of_day}

STYLE REQUIREMENTS:
- ${styleKeywords}
- ${emotionVisuals}
- 9:16 vertical portrait format (mobile optimized)
- High quality anime art
- Expressive characters with detailed eyes
- Atmospheric background matching the mood
- Professional anime production quality

Create a single, complete illustration capturing this scene.`;

  const description_en = `${character_type} ${action} in ${scene_type} scene, ${emotion} mood, ${time_of_day}, ${style} style`;
  const description_fr = `${character_type === 'child_boy' ? 'Jeune garçon' : character_type === 'child_girl' ? 'Jeune fille' : character_type} dans une scène de ${scene_type}, ambiance ${emotion}`;

  // Generate image
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-pro-image-preview',
      messages: [{ role: 'user', content: prompt }],
      modalities: ['image', 'text']
    })
  });

  if (!response.ok) {
    throw new Error(`Image generation failed: ${response.status}`);
  }

  const data = await response.json();
  const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

  if (!imageUrl || !imageUrl.startsWith('data:image')) {
    throw new Error('No image generated');
  }

  // Extract base64 and convert to blob
  const base64 = imageUrl.split(',')[1];
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  // Generate unique filename
  const timestamp = Date.now();
  const filename = `${scene_type}_${character_type}_${action}_${timestamp}.png`;
  const storagePath = `${style}/${emotion}/${filename}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('anime-library')
    .upload(storagePath, bytes, {
      contentType: 'image/png',
      upsert: false
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('anime-library')
    .getPublicUrl(storagePath);

  const publicUrl = urlData.publicUrl;

  // Insert into database
  const { data: insertData, error: insertError } = await supabase
    .from('anime_scene_library')
    .insert({
      style,
      emotion,
      scene_type,
      character_type,
      action,
      time_of_day,
      description_en,
      description_fr,
      image_url: publicUrl,
      storage_path: storagePath,
      tags: [style, emotion, scene_type, character_type, action]
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Database insert failed: ${insertError.message}`);
  }

  return insertData;
}

/**
 * List library images with filters
 */
async function handleListLibrary(
  params: {
    style?: string;
    emotion?: string;
    scene_type?: string;
    character_type?: string;
    limit?: number;
    offset?: number;
  },
  supabase: ReturnType<typeof createClient>
) {
  const { style, emotion, scene_type, character_type, limit = 50, offset = 0 } = params;

  let query = supabase
    .from('anime_scene_library')
    .select('*', { count: 'exact' });

  if (style) query = query.eq('style', style);
  if (emotion) query = query.eq('emotion', emotion);
  if (scene_type) query = query.eq('scene_type', scene_type);
  if (character_type) query = query.eq('character_type', character_type);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }

  return jsonResponse({
    success: true,
    images: data,
    total: count,
    limit,
    offset
  });
}

/**
 * Get library coverage statistics
 */
async function handleGetStats(supabase: ReturnType<typeof createClient>) {
  // Count total images
  const { count: totalCount } = await supabase
    .from('anime_scene_library')
    .select('*', { count: 'exact', head: true });

  // Count by style
  const styleStats: Record<string, number> = {};
  for (const style of VALID_STYLES) {
    const { count } = await supabase
      .from('anime_scene_library')
      .select('*', { count: 'exact', head: true })
      .eq('style', style);
    styleStats[style] = count || 0;
  }

  // Count by emotion
  const emotionStats: Record<string, number> = {};
  for (const emotion of VALID_EMOTIONS) {
    const { count } = await supabase
      .from('anime_scene_library')
      .select('*', { count: 'exact', head: true })
      .eq('emotion', emotion);
    emotionStats[emotion] = count || 0;
  }

  // Count by scene type
  const sceneStats: Record<string, number> = {};
  for (const scene of VALID_SCENE_TYPES) {
    const { count } = await supabase
      .from('anime_scene_library')
      .select('*', { count: 'exact', head: true })
      .eq('scene_type', scene);
    sceneStats[scene] = count || 0;
  }

  // Calculate coverage
  const totalPossibleCombinations = VALID_STYLES.length * VALID_EMOTIONS.length * VALID_SCENE_TYPES.length;
  const coveragePercent = totalCount ? Math.round((totalCount / totalPossibleCombinations) * 100) : 0;

  return jsonResponse({
    success: true,
    stats: {
      total_images: totalCount || 0,
      total_possible_combinations: totalPossibleCombinations,
      coverage_percent: coveragePercent,
      by_style: styleStats,
      by_emotion: emotionStats,
      by_scene_type: sceneStats
    }
  });
}

function jsonResponse(data: any, status = 200) {
  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status }
  );
}
