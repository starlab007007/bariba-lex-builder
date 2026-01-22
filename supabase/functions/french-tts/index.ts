import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TTSRequest {
  text: string;
  voice?: string;
  speed?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice = 'alloy', speed = 1.0 }: TTSRequest = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔊 French TTS: "${text.substring(0, 100)}..." voice=${voice}`);
    const startTime = Date.now();

    // Try to use Lovable AI for TTS-like generation
    // Since we don't have a dedicated TTS model, we'll return instructions for client-side synthesis
    // but also generate a script optimized for speech
    
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (lovableApiKey) {
      try {
        // Use AI to optimize the text for natural speech
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${lovableApiKey}`,
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `Tu es un assistant qui optimise les textes pour une lecture à voix haute naturelle en français. 
Ajoute des pauses naturelles avec "..." et des emphases avec des majuscules pour les mots importants.
Garde le texte court et percutant pour un journal TV.`
              },
              {
                role: 'user',
                content: `Optimise ce texte pour une narration de journal TV en français:\n\n${text}`
              }
            ],
            max_tokens: 500,
            temperature: 0.3,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const optimizedText = data.choices?.[0]?.message?.content || text;
          
          console.log(`[TTS] AI optimized text in ${Date.now() - startTime}ms`);
          
          return new Response(
            JSON.stringify({
              method: 'web-speech-synthesis',
              text: optimizedText,
              originalText: text,
              language: 'fr-FR',
              voice,
              speed,
              duration: Date.now() - startTime,
              optimized: true,
              instructions: 'Use browser speechSynthesis API with lang=fr-FR. Text has been optimized for natural speech.'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (aiError) {
        console.warn('[TTS] AI optimization failed, using original text:', aiError);
      }
    }

    // Fallback: return original text for client-side synthesis
    const duration = Date.now() - startTime;
    
    return new Response(
      JSON.stringify({
        method: 'web-speech-synthesis',
        text,
        language: 'fr-FR',
        voice,
        speed,
        duration,
        optimized: false,
        instructions: 'Use browser speechSynthesis API with lang=fr-FR'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'TTS failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
