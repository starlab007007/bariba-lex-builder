/**
 * Generate Anime Story Edge Function
 * 
 * This function:
 * 1. Analyzes the story text to segment it into 3-6 scenes
 * 2. Generates anime-style illustrations for each scene using Gemini Image
 * 3. Returns scenes with images for the animation engine
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Style keywords for anime generation
const STYLE_KEYWORDS: Record<string, string> = {
  manga: 'manga style, detailed lineart, anime eyes, dynamic pose, high contrast, black and white with screentones, japanese manga aesthetic',
  chibi: 'chibi style, cute, big head small body, kawaii, simple background, pastel colors, adorable characters, big expressive eyes',
  fantasy: 'fantasy anime style, magical, ethereal lighting, detailed scenery, epic fantasy, vibrant colors, mystical atmosphere, detailed background',
  african: 'african-inspired anime, warm earth tones, traditional african patterns, tribal motifs, anime style characters with african features, rich textures, sunset colors'
};

// Emotion to visual cues mapping
const EMOTION_VISUALS: Record<string, string> = {
  joy: 'bright colors, warm lighting, cheerful atmosphere, sparkles',
  sadness: 'cool blue tones, soft rain, muted colors, melancholic atmosphere',
  wonder: 'magical particles, starry effects, ethereal glow, dreamy atmosphere',
  fear: 'dark shadows, ominous lighting, dramatic contrast',
  excitement: 'dynamic angles, action lines, vibrant energy, motion blur',
  peace: 'soft pastoral colors, gentle sunlight, serene atmosphere',
  tension: 'dramatic shadows, red accents, intense expressions'
};

interface StoryScene {
  sceneNumber: number;
  text: string;
  emotion: string;
  visualDescription: string;
  durationSeconds: number;
}

interface GeneratedScene extends StoryScene {
  imageBase64: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { story, style = 'fantasy', duration = 30 } = await req.json();

    if (!story || story.trim().length < 10) {
      return new Response(
        JSON.stringify({ success: false, error: 'Story text is required (minimum 10 characters)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    console.log('[generate-anime-story] Request:', {
      storyLength: story?.length || 0,
      style,
      duration,
      hasApiKey: !!LOVABLE_API_KEY,
    });

    // PHASE 1: Analyze story and segment into scenes (with strong fallback)
    const scenes = LOVABLE_API_KEY
      ? await segmentStory(story, duration, LOVABLE_API_KEY)
      : createDefaultScenes(story, duration, Math.min(6, Math.max(3, Math.ceil(duration / 10))));

    const safeScenes = scenes.length
      ? scenes
      : createDefaultScenes(story, duration, Math.min(6, Math.max(3, Math.ceil(duration / 10))));

    console.log(`[generate-anime-story] Segmented into ${safeScenes.length} scenes`);

    // PHASE 2: Generate anime image for each scene
    const generatedScenes: GeneratedScene[] = [];
    
    for (let i = 0; i < safeScenes.length; i++) {
      const scene = safeScenes[i];
      console.log(`[generate-anime-story] Generating image for scene ${i + 1}/${safeScenes.length}`);
      
      try {
        const imageBase64 = LOVABLE_API_KEY
          ? await generateSceneImage(scene, style, i, safeScenes.length, LOVABLE_API_KEY)
          : '';
        generatedScenes.push({
          ...scene,
          imageBase64
        });
      } catch (imgError) {
        console.error(`[generate-anime-story] Failed to generate image for scene ${i + 1}:`, imgError);
        // Use placeholder for failed generations
        generatedScenes.push({
          ...scene,
          imageBase64: '' // Empty means use fallback
        });
      }
    }

    console.log('[generate-anime-story] Generation complete');

    return new Response(
      JSON.stringify({
        success: true,
        scenes: generatedScenes,
        totalDuration: duration,
        style
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-anime-story] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Generation failed' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

/**
 * Segment the story into visual scenes using Gemini
 */
async function segmentStory(story: string, totalDuration: number, apiKey: string): Promise<StoryScene[]> {
  const targetScenes = Math.min(6, Math.max(3, Math.ceil(totalDuration / 10)));
  
  const prompt = `Tu es un expert en storyboard pour contes animés. Analyse ce conte et découpe-le en ${targetScenes} scènes visuelles distinctes.

CONTE:
"${story}"

Pour chaque scène, fournis:
1. Le texte exact à narrer (extrait du conte)
2. L'émotion dominante (joy, sadness, wonder, fear, excitement, peace, tension)
3. Une description visuelle détaillée pour illustrer la scène en style anime (personnages, décor, action, ambiance)
4. La durée suggérée en secondes (entre 5 et 15 secondes)

La somme des durées doit être proche de ${totalDuration} secondes.

IMPORTANT: Les descriptions visuelles doivent être en anglais pour la génération d'images.

Réponds UNIQUEMENT avec un JSON valide dans ce format exact:
{
  "scenes": [
    {
      "sceneNumber": 1,
      "text": "Le texte français à narrer...",
      "emotion": "wonder",
      "visualDescription": "A young African boy with curious eyes standing at the edge of a mystical forest at sunset...",
      "durationSeconds": 8
    }
  ]
}`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[segmentStory] API error:', errorText);
      return createDefaultScenes(story, totalDuration, targetScenes);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.warn('[segmentStory] Empty model content, using fallback scenes');
      return createDefaultScenes(story, totalDuration, targetScenes);
    }

    try {
      const parsed = JSON.parse(content);
      const scenes = Array.isArray(parsed?.scenes) ? parsed.scenes : [];

      // Guardrail: some model responses may return an empty list.
      if (!scenes.length) {
        console.warn('[segmentStory] Model returned 0 scenes, using fallback scenes');
        return createDefaultScenes(story, totalDuration, targetScenes);
      }

      return scenes;
    } catch (parseError) {
      console.error('[segmentStory] Parse error:', parseError);
      return createDefaultScenes(story, totalDuration, targetScenes);
    }
  } catch (e) {
    console.error('[segmentStory] Fatal error, using fallback scenes:', e);
    return createDefaultScenes(story, totalDuration, targetScenes);
  }
}

/**
 * Generate an anime-style image for a scene
 */
async function generateSceneImage(
  scene: StoryScene, 
  style: string, 
  sceneIndex: number, 
  totalScenes: number,
  apiKey: string
): Promise<string> {
  const styleKeywords = STYLE_KEYWORDS[style] || STYLE_KEYWORDS.fantasy;
  const emotionVisuals = EMOTION_VISUALS[scene.emotion] || EMOTION_VISUALS.wonder;
  
  const prompt = `Create an anime illustration in ${style} style.

SCENE: ${scene.visualDescription}

STYLE REQUIREMENTS:
- ${styleKeywords}
- ${emotionVisuals}
- 9:16 vertical portrait format (mobile optimized)
- High quality anime art
- Expressive characters with detailed eyes
- Atmospheric background matching the mood
- Professional anime production quality

CONSISTENCY NOTE: This is scene ${sceneIndex + 1} of ${totalScenes} in a story. Maintain visual consistency with characters and setting.

Create a single, complete illustration capturing this exact moment.`;

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
    const errorText = await response.text();
    console.error('[generateSceneImage] API error:', errorText);
    throw new Error('Image generation failed');
  }

  const data = await response.json();
  
  // Extract base64 image from response
  const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  
  if (!imageUrl) {
    console.warn('[generateSceneImage] No image in response');
    throw new Error('No image generated');
  }

  // Extract base64 from data URL
  if (imageUrl.startsWith('data:image')) {
    const base64 = imageUrl.split(',')[1];
    return base64;
  }

  return imageUrl;
}

/**
 * Create default scenes if AI segmentation fails
 */
function createDefaultScenes(story: string, duration: number, count: number): StoryScene[] {
  const words = story.split(/\s+/);
  const wordsPerScene = Math.ceil(words.length / count);
  const durationPerScene = Math.floor(duration / count);
  
  const scenes: StoryScene[] = [];
  
  for (let i = 0; i < count; i++) {
    const start = i * wordsPerScene;
    const end = Math.min((i + 1) * wordsPerScene, words.length);
    const text = words.slice(start, end).join(' ');
    
    scenes.push({
      sceneNumber: i + 1,
      text,
      emotion: i === 0 ? 'wonder' : i === count - 1 ? 'peace' : 'excitement',
      visualDescription: `Scene ${i + 1} of the story: ${text.slice(0, 100)}...`,
      durationSeconds: durationPerScene
    });
  }
  
  return scenes;
}
