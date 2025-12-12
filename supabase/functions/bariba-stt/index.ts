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
    
    // First, try the Gradio client queue API
    const queueResponse = await fetch(`${SPACE_URL}/call/transcribe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: [audio, robustMode, speakerType]
      }),
    });

    console.log(`   Queue response status: ${queueResponse.status}`);

    if (queueResponse.ok) {
      const queueResult = await queueResponse.json();
      console.log(`   Queue result:`, JSON.stringify(queueResult).substring(0, 200));
      
      if (queueResult.event_id) {
        // Poll for the result
        const resultResponse = await fetch(`${SPACE_URL}/call/transcribe/${queueResult.event_id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${HF_TOKEN}`,
          },
        });

        if (resultResponse.ok) {
          const resultText = await resultResponse.text();
          console.log(`   Result text:`, resultText.substring(0, 300));
          
          // Parse SSE response
          const lines = resultText.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6));
                if (data && data[0]) {
                  const duration = Date.now() - startTime;
                  console.log(`✅ Bariba STT Success in ${duration}ms: "${data[0].substring(0, 50)}..."`);

                  return new Response(
                    JSON.stringify({
                      transcription: data[0],
                      confidence: 90,
                      duration,
                      language: 'bariba',
                      speakerType
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                  );
                }
              } catch (e) {
                // Continue parsing
              }
            }
          }
        }
      }
    }

    // Fallback: Try direct predict endpoint
    const predictResponse = await fetch(`${SPACE_URL}/api/predict`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fn_index: 0,
        data: [audio, robustMode, speakerType]
      }),
    });

    console.log(`   Predict response status: ${predictResponse.status}`);

    if (predictResponse.ok) {
      const result = await predictResponse.json();
      console.log(`   Predict result:`, JSON.stringify(result).substring(0, 200));

      if (result.data && result.data[0]) {
        const duration = Date.now() - startTime;
        console.log(`✅ Bariba STT Success (fallback) in ${duration}ms`);

        return new Response(
          JSON.stringify({
            transcription: result.data[0],
            confidence: 90,
            duration,
            language: 'bariba',
            speakerType
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Return error if all endpoints failed
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
