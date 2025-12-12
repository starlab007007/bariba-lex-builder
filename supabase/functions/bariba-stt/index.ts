import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface STTRequest {
  audio: string; // Base64 encoded audio
  robustMode?: boolean;
  speakerType?: 'Auto' | 'Enfant' | 'Femme' | 'Homme' | 'PersonneAgee';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio, robustMode = true, speakerType = 'Auto' }: STTRequest = await req.json();

    if (!audio) {
      return new Response(
        JSON.stringify({ error: 'Audio data required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const HF_TOKEN = Deno.env.get('HUGGING_FACE_API_TOKEN');
    if (!HF_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'HuggingFace token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎤 Bariba STT: Processing audio, robustMode=${robustMode}, speaker=${speakerType}`);
    const startTime = Date.now();

    // API Space: zimesongbian/baatonum_asr_stt_api_v001_improve
    const SPACE_URL = 'https://zimesongbian-baatonum-asr-stt-api-v001-improve.hf.space';
    
    // Try the Gradio API endpoint
    const gradioEndpoints = [
      '/api/predict',
      '/run/predict',
      '/gradio_api/call/predict',
      '/transcribe'
    ];

    for (const endpoint of gradioEndpoints) {
      try {
        const url = `${SPACE_URL}${endpoint}`;
        console.log(`   Trying: POST ${url}`);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HF_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: [audio, robustMode, speakerType]
          }),
        });

        console.log(`   Status: ${response.status}`);

        if (response.ok) {
          const result = await response.json();
          console.log(`   Response:`, JSON.stringify(result).substring(0, 200));

          let transcription = null;
          if (result.data && result.data[0]) {
            transcription = result.data[0];
          } else if (typeof result === 'string') {
            transcription = result;
          } else if (result.transcription) {
            transcription = result.transcription;
          }

          if (transcription) {
            const duration = Date.now() - startTime;
            console.log(`✅ Bariba STT Success in ${duration}ms: "${transcription.substring(0, 50)}..."`);

            return new Response(
              JSON.stringify({
                transcription,
                confidence: 90,
                duration,
                language: 'bariba',
                speakerType
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (e) {
        console.error(`   ❌ Endpoint ${endpoint} failed: ${e.message}`);
      }
    }

    // Fallback: Return error with diagnostics
    const duration = Date.now() - startTime;
    console.error(`❌ All STT endpoints failed after ${duration}ms`);

    return new Response(
      JSON.stringify({
        error: 'Bariba STT service unavailable',
        details: 'Could not connect to HuggingFace Space',
        duration
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'STT failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
