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

    console.log(`🔊 French TTS: "${text.substring(0, 50)}..." voice=${voice}`);
    const startTime = Date.now();

    // French TTS uses browser's Web Speech Synthesis API
    // We return instructions for client-side synthesis
    // This is more reliable and free
    
    const duration = Date.now() - startTime;
    
    return new Response(
      JSON.stringify({
        method: 'web-speech-synthesis',
        text,
        language: 'fr-FR',
        voice,
        speed,
        duration,
        instructions: 'Use browser speechSynthesis API with lang=fr-FR'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'TTS failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
