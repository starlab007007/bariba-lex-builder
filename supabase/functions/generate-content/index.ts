import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateContentRequest {
  type: 'script' | 'hashtags' | 'hook' | 'description' | 'suggestions';
  topic?: string;
  content?: string;
  audioTranscript?: string;
  language?: 'fr' | 'ba';
  templateKey?: string;
}

const CONTENT_PROMPTS: Record<string, string> = {
  script: `Tu es un créateur de contenu expert pour TamTam, la plateforme audio-first pour le Bénin rural.
Génère un script court et percutant pour une vidéo/audio de 30-60 secondes.

Structure:
1. ACCROCHE (5 sec): Une phrase qui capte l'attention immédiatement
2. CONTENU (20-40 sec): 3 points clés, simples et pratiques
3. CONCLUSION (5 sec): Appel à l'action clair

Style: Simple, oral, adapté à la culture Bariba. Utilise des exemples concrets.`,

  hashtags: `Tu es un expert des tendances TamTam.
Génère 5-8 hashtags pertinents pour ce contenu.
Mélange:
- 2-3 hashtags tendance globaux
- 2-3 hashtags locaux (Bénin, Bariba)
- 1-2 hashtags spécifiques au sujet

Format: #hashtag1 #hashtag2 ...`,

  hook: `Tu es un expert en accroches virales.
Génère 3 versions d'accroches (hooks) pour ce contenu:
1. Question intrigante
2. Affirmation surprenante
3. Promesse de valeur

Chaque accroche doit être courte (max 10 mots) et percutante.`,

  description: `Tu es un rédacteur pour TamTam.
Génère une description courte (2-3 phrases) pour ce contenu audio.
- Résume le contenu principal
- Ajoute un appel à l'action
- Reste simple et engageant`,

  suggestions: `Tu es un assistant créatif pour TamTam.
Suggère 3 idées de contenu liées à ce sujet:
1. Idée principale avec angle unique
2. Contenu éducatif pratique
3. Contenu divertissant/culturel

Pour chaque idée: titre + 1 phrase de description.`
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, topic, content, audioTranscript, language = 'fr', templateKey }: GenerateContentRequest = await req.json();

    if (!type) {
      return new Response(
        JSON.stringify({ error: 'Type required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎨 Generate Content: type=${type}, topic=${topic}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build prompt based on type
    const systemPrompt = CONTENT_PROMPTS[type] || CONTENT_PROMPTS.suggestions;
    
    let userPrompt = '';
    if (topic) userPrompt += `Sujet: ${topic}\n`;
    if (templateKey) userPrompt += `Template: ${templateKey}\n`;
    if (content) userPrompt += `Contenu existant: ${content}\n`;
    if (audioTranscript) userPrompt += `Transcription audio: ${audioTranscript}\n`;
    
    if (!userPrompt) {
      userPrompt = 'Génère du contenu créatif pour un post TamTam général.';
    }

    // Call Lovable AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 500,
        temperature: 0.8
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded', content: null }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = data.choices?.[0]?.message?.content || '';

    console.log(`✅ Generated ${type} content: ${generatedContent.substring(0, 100)}...`);

    // Parse response based on type
    let parsed: any = { raw: generatedContent };
    
    if (type === 'hashtags') {
      const hashtags = generatedContent.match(/#\w+/g) || [];
      parsed.hashtags = hashtags;
    } else if (type === 'hook') {
      const lines = generatedContent.split('\n').filter(l => l.trim());
      parsed.hooks = lines.slice(0, 3);
    } else if (type === 'script') {
      parsed.script = generatedContent;
      // Extract sections if possible
      const hookMatch = generatedContent.match(/ACCROCHE[:\s]*(.+?)(?=CONTENU|$)/is);
      const contentMatch = generatedContent.match(/CONTENU[:\s]*(.+?)(?=CONCLUSION|$)/is);
      const conclusionMatch = generatedContent.match(/CONCLUSION[:\s]*(.+?)$/is);
      
      if (hookMatch) parsed.hook = hookMatch[1].trim();
      if (contentMatch) parsed.mainContent = contentMatch[1].trim();
      if (conclusionMatch) parsed.conclusion = conclusionMatch[1].trim();
    }

    return new Response(
      JSON.stringify({
        success: true,
        type,
        content: generatedContent,
        parsed,
        language
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Generate content error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Generation failed',
        content: null
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
