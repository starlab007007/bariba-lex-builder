import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ImageAnalysis {
  subjects: Array<{
    name: string;
    boundingBox: { x: number; y: number; width: number; height: number };
    importance: number;
  }>;
  depthLayers: Array<{
    layer: 'foreground' | 'midground' | 'background';
    description: string;
    parallaxSpeed: number;
  }>;
  focusPoints: Array<{ x: number; y: number; weight: number }>;
  motionSuggestion: {
    direction: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'pan-up' | 'pan-down';
    intensity: number;
    startPoint: { x: number; y: number };
    endPoint: { x: number; y: number };
  };
  mood: string;
  colorPalette: string[];
}

interface EmotionAnalysis {
  segments: Array<{
    startTime: number;
    endTime: number;
    emotion: 'joy' | 'sadness' | 'wonder' | 'fear' | 'anger' | 'peace' | 'excitement';
    intensity: number;
    keywords: string[];
  }>;
  overallMood: string;
  suggestedVFX: string[];
}

function parseImageAnalysis(content: string): ImageAnalysis {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonStr);
    }
  } catch (e) {
    console.log('Failed to parse JSON, using default analysis');
  }

  // Default fallback analysis
  return {
    subjects: [{ name: 'main subject', boundingBox: { x: 0.3, y: 0.3, width: 0.4, height: 0.4 }, importance: 1 }],
    depthLayers: [
      { layer: 'background', description: 'Background elements', parallaxSpeed: 0.3 },
      { layer: 'midground', description: 'Main subject area', parallaxSpeed: 0.6 },
      { layer: 'foreground', description: 'Foreground details', parallaxSpeed: 1.0 }
    ],
    focusPoints: [{ x: 0.5, y: 0.4, weight: 1 }],
    motionSuggestion: {
      direction: 'zoom-in',
      intensity: 0.2,
      startPoint: { x: 0.5, y: 0.5 },
      endPoint: { x: 0.5, y: 0.4 }
    },
    mood: 'neutral',
    colorPalette: ['#8B4513', '#FFD700', '#228B22', '#87CEEB']
  };
}

function parseEmotionAnalysis(content: string, duration: number): EmotionAnalysis {
  try {
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonStr);
    }
  } catch (e) {
    console.log('Failed to parse emotion JSON, using default');
  }

  // Default segmentation based on duration
  const segmentDuration = duration / 3;
  return {
    segments: [
      { startTime: 0, endTime: segmentDuration, emotion: 'wonder', intensity: 0.7, keywords: ['début', 'introduction'] },
      { startTime: segmentDuration, endTime: segmentDuration * 2, emotion: 'excitement', intensity: 0.85, keywords: ['climax', 'action'] },
      { startTime: segmentDuration * 2, endTime: duration, emotion: 'peace', intensity: 0.6, keywords: ['fin', 'conclusion'] }
    ],
    overallMood: 'storytelling',
    suggestedVFX: ['lens-flare', 'light-leak', 'particles']
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imageBase64, story, style, duration = 15, analysisType = 'full' } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const results: { imageAnalysis?: ImageAnalysis; emotionAnalysis?: EmotionAnalysis } = {};

    // Image Analysis with Gemini Vision
    if (imageBase64 && (analysisType === 'full' || analysisType === 'image')) {
      console.log('[generate-image-animation] Analyzing image with Gemini Vision...');
      
      const imagePrompt = `You are an expert cinematographer and animator. Analyze this image for creating a Ken Burns style animation.

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "subjects": [
    {"name": "description", "boundingBox": {"x": 0.0-1.0, "y": 0.0-1.0, "width": 0.0-1.0, "height": 0.0-1.0}, "importance": 0.0-1.0}
  ],
  "depthLayers": [
    {"layer": "foreground|midground|background", "description": "what's in this layer", "parallaxSpeed": 0.0-1.0}
  ],
  "focusPoints": [
    {"x": 0.0-1.0, "y": 0.0-1.0, "weight": 0.0-1.0}
  ],
  "motionSuggestion": {
    "direction": "zoom-in|zoom-out|pan-left|pan-right|pan-up|pan-down",
    "intensity": 0.0-1.0,
    "startPoint": {"x": 0.0-1.0, "y": 0.0-1.0},
    "endPoint": {"x": 0.0-1.0, "y": 0.0-1.0}
  },
  "mood": "emotional mood of the image",
  "colorPalette": ["#hex1", "#hex2", "#hex3", "#hex4"]
}

Style hint: ${style || 'traditional african storytelling'}
Story context: ${story || 'A traditional African tale'}`;

      const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: imagePrompt },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
              ]
            }
          ]
        })
      });

      if (!imageResponse.ok) {
        const errorText = await imageResponse.text();
        console.error('[generate-image-animation] Image analysis error:', errorText);
        throw new Error(`Image analysis failed: ${imageResponse.status}`);
      }

      const imageData = await imageResponse.json();
      const imageContent = imageData.choices?.[0]?.message?.content || '';
      results.imageAnalysis = parseImageAnalysis(imageContent);
      console.log('[generate-image-animation] Image analysis complete');
    }

    // Emotion Analysis for story text
    if (story && (analysisType === 'full' || analysisType === 'emotion')) {
      console.log('[generate-image-animation] Analyzing story emotions...');

      const emotionPrompt = `You are an expert in narrative emotion analysis. Analyze this story text and segment it into emotional beats for video animation.

Story: "${story}"
Duration: ${duration} seconds

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "segments": [
    {
      "startTime": 0,
      "endTime": number,
      "emotion": "joy|sadness|wonder|fear|anger|peace|excitement",
      "intensity": 0.0-1.0,
      "keywords": ["key", "words", "from", "segment"]
    }
  ],
  "overallMood": "general mood description",
  "suggestedVFX": ["vfx-type-1", "vfx-type-2"]
}

Make segments that cover the full duration proportionally to the story content.`;

      const emotionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: emotionPrompt }]
        })
      });

      if (!emotionResponse.ok) {
        const errorText = await emotionResponse.text();
        console.error('[generate-image-animation] Emotion analysis error:', errorText);
        throw new Error(`Emotion analysis failed: ${emotionResponse.status}`);
      }

      const emotionData = await emotionResponse.json();
      const emotionContent = emotionData.choices?.[0]?.message?.content || '';
      results.emotionAnalysis = parseEmotionAnalysis(emotionContent, duration);
      console.log('[generate-image-animation] Emotion analysis complete');
    }

    return new Response(JSON.stringify({
      success: true,
      ...results,
      metadata: {
        style,
        duration,
        analyzedAt: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[generate-image-animation] Error:', error);
    
    const status = error instanceof Error && error.message.includes('429') ? 429 :
                   error instanceof Error && error.message.includes('402') ? 402 : 500;
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      fallback: true
    }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
