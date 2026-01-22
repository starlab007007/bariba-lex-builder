import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
}

interface StoryStructure {
  title: string;
  theme: string;
  segments: StorySegment[];
  keyMoments: { time: number; type: string; description: string }[];
  totalDuration: number;
}

const STORY_ANALYSIS_PROMPT = `Tu es un expert en analyse narrative africaine. Analyse ce transcript d'histoire et retourne une structure JSON pour le rendu vidéo.

Pour chaque segment de l'histoire, identifie:
- L'émotion dominante (neutral, joy, sadness, excitement, tension, wisdom)
- L'intensité de 0 à 1
- Le mouvement de caméra approprié (static, zoom-in, zoom-out, pan-left, pan-right, orbit)
- Un effet visuel optionnel (particles, glow, shake, fade)

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
      "emotion": "neutral",
      "intensity": 0.5,
      "cameraMove": "static",
      "visualEffect": "particles"
    }
  ],
  "keyMoments": [
    { "time": 10, "type": "climax", "description": "Moment clé" }
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
      console.warn('LOVABLE_API_KEY not configured, using default structure');
      const defaultStructure = createDefaultStructure(duration, transcript);
      return new Response(JSON.stringify(defaultStructure), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[analyze-story] Analyzing transcript with Lovable AI...');
    
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
          { role: 'user', content: `Durée totale: ${duration} secondes\n\nTranscript:\n${transcript}` }
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
    storyStructure.totalDuration = duration;
    
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
  const segmentCount = Math.ceil(duration / segmentDuration);
  const segments: StorySegment[] = [];
  
  const emotions: StorySegment['emotion'][] = ['neutral', 'joy', 'wisdom', 'excitement', 'tension', 'joy'];
  const cameraMoves: StorySegment['cameraMove'][] = ['static', 'zoom-in', 'orbit', 'pan-left', 'zoom-out', 'static'];
  
  for (let i = 0; i < segmentCount; i++) {
    segments.push({
      id: `seg-${i + 1}`,
      startTime: i * segmentDuration,
      endTime: Math.min((i + 1) * segmentDuration, duration),
      text: transcript ? `Segment ${i + 1}` : 'Conte africain traditionnel',
      emotion: emotions[i % emotions.length],
      intensity: 0.5 + (i / segmentCount) * 0.3,
      cameraMove: cameraMoves[i % cameraMoves.length],
      visualEffect: i === Math.floor(segmentCount / 2) ? 'glow' : undefined
    });
  }

  return {
    title: 'Conte du Griot',
    theme: 'Sagesse ancestrale',
    segments,
    keyMoments: [
      { time: duration * 0.3, type: 'rising', description: 'Montée dramatique' },
      { time: duration * 0.7, type: 'climax', description: 'Point culminant' },
      { time: duration * 0.9, type: 'resolution', description: 'Résolution' }
    ],
    totalDuration: duration
  };
}
