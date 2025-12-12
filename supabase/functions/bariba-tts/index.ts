import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TTSRequest {
  text: string;
  speakingRate?: number; // 0.8 - 1.5
  noiseScale?: number; // 0.3 - 0.8
  noiseScaleW?: number; // 0.3 - 0.9
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      text, 
      speakingRate = 1.0, 
      noiseScale = 0.5, 
      noiseScaleW = 0.6 
    }: TTSRequest = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text required' }),
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

    console.log(`🔊 Bariba TTS: "${text.substring(0, 50)}..." rate=${speakingRate}`);
    const startTime = Date.now();

    // API Space: zimesongbian/baatonum_tts_api_v001
    const SPACE_URL = 'https://zimesongbian-baatonum-tts-api-v001.hf.space';
    
    // Try the Gradio API endpoints
    const gradioEndpoints = [
      '/api/predict',
      '/run/predict',
      '/gradio_api/call/predict',
      '/bariba_tts'
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
            data: [text, speakingRate, noiseScale, noiseScaleW]
          }),
        });

        console.log(`   Status: ${response.status}`);

        if (response.ok) {
          const result = await response.json();
          console.log(`   Response type: ${typeof result}`);

          let audioData = null;
          
          // Handle different response formats
          if (result.data && result.data[0]) {
            // Gradio format: { data: [audio_base64] }
            audioData = result.data[0];
          } else if (result.audio) {
            audioData = result.audio;
          } else if (typeof result === 'string' && result.length > 100) {
            // Direct base64 audio
            audioData = result;
          }

          if (audioData) {
            const duration = Date.now() - startTime;
            console.log(`✅ Bariba TTS Success in ${duration}ms`);

            return new Response(
              JSON.stringify({
                audio: audioData,
                duration,
                text: text.substring(0, 100),
                settings: { speakingRate, noiseScale, noiseScaleW }
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (e) {
        console.error(`   ❌ Endpoint ${endpoint} failed: ${e.message}`);
      }
    }

    // Fallback: Return error
    const duration = Date.now() - startTime;
    console.error(`❌ All TTS endpoints failed after ${duration}ms`);

    return new Response(
      JSON.stringify({
        error: 'Bariba TTS service unavailable',
        details: 'Could not connect to HuggingFace Space',
        duration
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'TTS failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
