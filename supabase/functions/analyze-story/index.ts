import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface StorySegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  emotion: 'neutral' | 'joy' | 'sadness' | 'excitement' | 'tension' | 'wisdom';
  intensity: number;
  cameraMove: 'static' | 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'orbit';
  visualEffect?: string;
  assetHints?: {
    flareRange: [number, number];
    leakIndex: number;
    particleIntensity: number;
  };
}

interface StoryStructure {
  title: string;
  theme: string;
  segments: StorySegment[];
  keyMoments: { time: number; type: string; description: string; transitionAsset?: string }[];
  totalDuration: number;
}

// Mapping émotion → range de lens flares (sur 455 disponibles)
const EMOTION_FLARE_RANGES: Record<string, [number, number]> = {
  joy: [50, 99],
  wisdom: [1, 49],
  tension: [150, 199],
  sadness: [250, 299],
  excitement: [100, 149],
  neutral: [300, 349]
};

// Mapping moment clé → transition
const MOMENT_TRANSITIONS: Record<string, string> = {
  intro: 'transitions:transition-001.mp4',
  rising: 'transitions:transition-005.mp4',
  climax: 'transitions:transition-010.mp4',
  falling: 'transitions:transition-008.mp4',
  resolution: 'transitions:transition-003.mp4',
  emphasis: 'transitions:transition-006.mp4'
};

const STORY_ANALYSIS_PROMPT = `Tu es un expert en analyse narrative africaine et en montage vidéo intelligent. Analyse ce transcript d'histoire et retourne une structure JSON pour un rendu vidéo synchronisé avec des effets visuels.

CONTEXTE TECHNIQUE:
- 455 lens flares disponibles (numérotés 001-455)
- 22 light leaks disponibles (numérotés 001-022)
- 37 particles disponibles

MAPPING ÉMOTION → ASSETS:
- joy (joie): flares 50-99 (dorés, lumineux)
- wisdom (sagesse): flares 1-49 (subtils, ambrés)
- tension: flares 150-199 (rouges, intenses)
- sadness (tristesse): flares 250-299 (bleus, froids)
- excitement (excitation): flares 100-149 (multicolores)
- neutral: flares 300-349 (blancs, doux)

Pour chaque segment de l'histoire, identifie:
- L'émotion dominante (neutral, joy, sadness, excitement, tension, wisdom)
- L'intensité de 0 à 1 (pour ajuster l'opacité et la sélection de light leaks)
- Le mouvement de caméra approprié (static, zoom-in, zoom-out, pan-left, pan-right, orbit)
- Un effet visuel optionnel (particles, glow, shake, fade)

IMPORTANT: Les timings doivent correspondre EXACTEMENT à la durée audio fournie.

Retourne UNIQUEMENT un JSON valide avec cette structure:
{
  "title": "Titre de l'histoire",
  "theme": "Thème principal",
  "segments": [
    {
      "id": "seg-1",
      "startTime": 0,
      "endTime": 5,
      "text": "Texte du segment",
      "emotion": "wisdom",
      "intensity": 0.6,
      "cameraMove": "zoom-in",
      "visualEffect": "particles",
      "assetHints": {
        "flareRange": [1, 49],
        "leakIndex": 6,
        "particleIntensity": 0.6
      }
    }
  ],
  "keyMoments": [
    { "time": 10, "type": "climax", "description": "Moment clé", "transitionAsset": "transitions:transition-010.mp4" }
  ],
  "totalDuration": 30
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, duration = 30 } = await req.json();
    
    if (!transcript || transcript.trim().length === 0) {
      // Return default structure if no transcript
      const defaultStructure = createDefaultStructure(duration);
      return new Response(JSON.stringify(defaultStructure), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.warn('[analyze-story] LOVABLE_API_KEY not configured, using default structure');
      const defaultStructure = createDefaultStructure(duration, transcript);
      return new Response(JSON.stringify(defaultStructure), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[analyze-story] Analyzing transcript (${transcript.length} chars) for ${duration}s video`);
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: STORY_ANALYSIS_PROMPT },
          { role: 'user', content: `Durée totale exacte: ${duration} secondes\n\nTranscript de l'histoire:\n${transcript}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('[analyze-story] Rate limited, using default structure');
        return new Response(JSON.stringify(createDefaultStructure(duration, transcript)), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        console.warn('[analyze-story] Payment required, using default structure');
        return new Response(JSON.stringify(createDefaultStructure(duration, transcript)), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[analyze-story] Could not parse AI response, using default');
      return new Response(JSON.stringify(createDefaultStructure(duration, transcript)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const storyStructure: StoryStructure = JSON.parse(jsonMatch[0]);
    
    // Ensure duration matches exactly
    storyStructure.totalDuration = duration;
    
    // Enrich segments with asset hints if missing
    storyStructure.segments = storyStructure.segments.map((seg, i) => {
      const emotion = seg.emotion || 'neutral';
      const intensity = seg.intensity ?? 0.5;
      
      return {
        ...seg,
        id: seg.id || `seg-${i + 1}`,
        assetHints: seg.assetHints || {
          flareRange: EMOTION_FLARE_RANGES[emotion] || EMOTION_FLARE_RANGES.neutral,
          leakIndex: Math.floor(intensity * 21) + 1,
          particleIntensity: intensity
        }
      };
    });
    
    // Enrich key moments with transition assets
    storyStructure.keyMoments = (storyStructure.keyMoments || []).map(moment => ({
      ...moment,
      transitionAsset: moment.transitionAsset || MOMENT_TRANSITIONS[moment.type] || MOMENT_TRANSITIONS.emphasis
    }));
    
    console.log(`[analyze-story] Successfully analyzed: ${storyStructure.segments.length} segments`);

    return new Response(JSON.stringify(storyStructure), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[analyze-story] Error:', error);
    
    // Always return a valid structure even on error
    const fallback = createDefaultStructure(30);
    return new Response(JSON.stringify(fallback), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function createDefaultStructure(duration: number, transcript?: string): StoryStructure {
  const segmentDuration = 5;
  const segmentCount = Math.max(1, Math.ceil(duration / segmentDuration));
  const segments: StorySegment[] = [];
  
  const emotionProgression: StorySegment['emotion'][] = ['neutral', 'joy', 'wisdom', 'excitement', 'tension', 'wisdom', 'joy'];
  const cameraMoves: StorySegment['cameraMove'][] = ['static', 'zoom-in', 'orbit', 'pan-left', 'zoom-out', 'orbit', 'static'];
  
  for (let i = 0; i < segmentCount; i++) {
    const progress = i / segmentCount;
    const emotion = emotionProgression[i % emotionProgression.length];
    const intensity = 0.4 + (progress * 0.4);
    
    segments.push({
      id: `seg-${i + 1}`,
      startTime: i * segmentDuration,
      endTime: Math.min((i + 1) * segmentDuration, duration),
      text: transcript ? `Segment ${i + 1}` : 'Conte africain traditionnel',
      emotion,
      intensity,
      cameraMove: cameraMoves[i % cameraMoves.length],
      visualEffect: i === Math.floor(segmentCount / 2) ? 'glow' : undefined,
      assetHints: {
        flareRange: EMOTION_FLARE_RANGES[emotion] || EMOTION_FLARE_RANGES.neutral,
        leakIndex: Math.floor(intensity * 21) + 1,
        particleIntensity: intensity
      }
    });
  }

  return {
    title: 'Conte du Griot',
    theme: 'Sagesse ancestrale',
    segments,
    keyMoments: [
      { time: duration * 0.1, type: 'intro', description: 'Introduction', transitionAsset: MOMENT_TRANSITIONS.intro },
      { time: duration * 0.3, type: 'rising', description: 'Montée dramatique', transitionAsset: MOMENT_TRANSITIONS.rising },
      { time: duration * 0.6, type: 'climax', description: 'Point culminant', transitionAsset: MOMENT_TRANSITIONS.climax },
      { time: duration * 0.85, type: 'resolution', description: 'Résolution', transitionAsset: MOMENT_TRANSITIONS.resolution }
    ],
    totalDuration: duration
  };
}
