import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NewsSegment {
  id: string;
  type: 'opening' | 'news' | 'weather' | 'announcement' | 'closing';
  title: string;
  text: string;
  textBariba?: string;
  duration: number;
  cuePoints: { time: number; action: string; data: Record<string, unknown> }[];
  visualStyle: 'standard' | 'breaking' | 'highlight' | 'weather';
}

interface NewsShowStructure {
  villageName: string;
  broadcastDate: string;
  segments: NewsSegment[];
  totalDuration: number;
  language: 'french' | 'bariba' | 'bilingual';
}

const NEWS_ANALYSIS_PROMPT = `Tu es un directeur de journal télévisé africain professionnel. Génère un script de journal TV complet.

Pour chaque segment du journal:
- Génère un texte professionnel et engageant
- Adapte le ton selon le type (breaking = urgent, weather = détendu)
- Ajoute des points de repère visuels (cuePoints)

Retourne UNIQUEMENT un JSON valide avec cette structure:
{
  "villageName": "Nom du village",
  "broadcastDate": "2024-01-22",
  "segments": [
    {
      "id": "seg-1",
      "type": "opening",
      "title": "Ouverture",
      "text": "Bonsoir et bienvenue...",
      "textBariba": "Traduction optionnelle",
      "duration": 15,
      "cuePoints": [
        { "time": 0, "action": "logo_reveal", "data": {} },
        { "time": 5, "action": "anchor_appear", "data": {} }
      ],
      "visualStyle": "standard"
    }
  ],
  "totalDuration": 180,
  "language": "bilingual"
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { newsItems, villageName, language = 'bilingual' } = await req.json();
    
    if (!newsItems || newsItems.length === 0) {
      const defaultShow = createDefaultNewsShow(villageName || 'Mon Village', language);
      return new Response(JSON.stringify(defaultShow), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.warn('[analyze-news] LOVABLE_API_KEY not configured, using default structure');
      return new Response(JSON.stringify(createDefaultNewsShow(villageName, language)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[analyze-news] Generating news script with Lovable AI...');
    
    const newsContent = newsItems.map((item: { type: string; title: string; description: string; location?: string }) => 
      `- Type: ${item.type}, Titre: ${item.title}, Description: ${item.description}${item.location ? `, Lieu: ${item.location}` : ''}`
    ).join('\n');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: NEWS_ANALYSIS_PROMPT },
          { role: 'user', content: `Village: ${villageName}\nLangue: ${language}\n\nActualités:\n${newsContent}` }
        ],
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('[analyze-news] Rate limited');
        return new Response(JSON.stringify({ error: 'Rate limited', fallback: createDefaultNewsShow(villageName, language) }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        console.warn('[analyze-news] Payment required');
        return new Response(JSON.stringify({ error: 'Payment required' }), {
          status: 402,
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
      console.warn('[analyze-news] Could not parse AI response');
      return new Response(JSON.stringify(createDefaultNewsShow(villageName, language)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const newsShow: NewsShowStructure = JSON.parse(jsonMatch[0]);
    console.log(`[analyze-news] Generated ${newsShow.segments.length} segments`);

    return new Response(JSON.stringify(newsShow), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[analyze-news] Error:', error);
    return new Response(JSON.stringify(createDefaultNewsShow('Village', 'french')), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function createDefaultNewsShow(villageName: string, language: string): NewsShowStructure {
  const now = new Date().toISOString().split('T')[0];
  
  const segments: NewsSegment[] = [
    {
      id: 'seg-opening',
      type: 'opening',
      title: 'Ouverture',
      text: `Bonsoir et bienvenue au Journal de ${villageName}. Voici les principales informations de votre village aujourd'hui.`,
      textBariba: language === 'bilingual' ? `${villageName} Journal. Bienvenue.` : undefined,
      duration: 15,
      cuePoints: [
        { time: 0, action: 'logo_reveal', data: {} },
        { time: 5, action: 'anchor_appear', data: {} },
        { time: 10, action: 'lower_third', data: { text: villageName } }
      ],
      visualStyle: 'standard'
    },
    {
      id: 'seg-main',
      type: 'news',
      title: 'Actualité principale',
      text: 'Voici les dernières nouvelles de votre communauté. Restez informés des événements importants qui concernent votre village.',
      textBariba: language === 'bilingual' ? 'Nouvelles du village.' : undefined,
      duration: 45,
      cuePoints: [
        { time: 0, action: 'news_graphic', data: {} },
        { time: 20, action: 'b_roll', data: {} }
      ],
      visualStyle: 'standard'
    },
    {
      id: 'seg-weather',
      type: 'weather',
      title: 'Météo',
      text: 'Et maintenant, la météo. Temps ensoleillé prévu pour les prochains jours avec des températures agréables.',
      textBariba: language === 'bilingual' ? 'Météo du jour.' : undefined,
      duration: 30,
      cuePoints: [
        { time: 0, action: 'weather_map', data: {} },
        { time: 15, action: 'forecast', data: {} }
      ],
      visualStyle: 'weather'
    },
    {
      id: 'seg-closing',
      type: 'closing',
      title: 'Fermeture',
      text: `C'était le Journal de ${villageName}. Merci de nous avoir suivis et à demain pour de nouvelles informations.`,
      textBariba: language === 'bilingual' ? `Merci. À demain ${villageName}.` : undefined,
      duration: 15,
      cuePoints: [
        { time: 10, action: 'logo_outro', data: {} }
      ],
      visualStyle: 'standard'
    }
  ];

  return {
    villageName,
    broadcastDate: now,
    segments,
    totalDuration: segments.reduce((acc, s) => acc + s.duration, 0),
    language: language as 'french' | 'bariba' | 'bilingual'
  };
}
