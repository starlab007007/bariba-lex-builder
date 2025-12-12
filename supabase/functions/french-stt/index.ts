import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface STTRequest {
  audio: string; // Base64 encoded audio
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio }: STTRequest = await req.json();

    if (!audio) {
      return new Response(
        JSON.stringify({ error: 'Audio data required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Lovable API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎤 French STT: Processing audio via Lovable AI`);
    const startTime = Date.now();

    // Use Lovable AI with Gemini for audio transcription
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Tu es un système de transcription audio français. Tu reçois de l'audio encodé en base64 et tu dois le transcrire fidèlement en texte français. Réponds UNIQUEMENT avec la transcription, sans commentaires ni explications.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Transcris cet audio en français:'
              },
              {
                type: 'input_audio',
                input_audio: {
                  data: audio,
                  format: 'webm'
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Lovable AI error: ${response.status} - ${errorText}`);
      
      // Fallback: Use Web Speech API info
      return new Response(
        JSON.stringify({
          error: 'French STT via Lovable AI unavailable',
          fallback: 'web-speech-api',
          details: 'Use browser Web Speech API as fallback'
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    const transcription = result.choices?.[0]?.message?.content || '';

    const duration = Date.now() - startTime;
    console.log(`✅ French STT Success in ${duration}ms: "${transcription.substring(0, 50)}..."`);

    return new Response(
      JSON.stringify({
        transcription,
        confidence: 95,
        duration,
        language: 'french',
        method: 'lovable-ai'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'STT failed',
        fallback: 'web-speech-api'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
