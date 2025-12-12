import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface STTRequest {
  audio: string;
  robustMode?: boolean;
  speakerType?: 'Auto' | 'Enfant' | 'Femme' | 'Homme' | 'PersonneAgee';
}

async function callGradioAPI(
  spaceUrl: string,
  fnName: string,
  data: any[],
  hfToken: string
): Promise<any> {
  // Step 1: Try the call endpoint (Gradio 4.x)
  const callResponse = await fetch(`${spaceUrl}/call/${fnName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${hfToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data }),
  });

  console.log(`   Call endpoint status: ${callResponse.status}`);

  if (callResponse.ok) {
    const callResult = await callResponse.json();
    console.log(`   Call result:`, JSON.stringify(callResult).substring(0, 200));
    
    if (callResult.event_id) {
      // Poll for result using SSE
      const resultResponse = await fetch(`${spaceUrl}/call/${fnName}/${callResult.event_id}`, {
        headers: { 'Authorization': `Bearer ${hfToken}` },
      });

      if (resultResponse.ok) {
        const text = await resultResponse.text();
        console.log(`   SSE response:`, text.substring(0, 300));
        
        // Parse SSE format
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.substring(6));
              return parsed;
            } catch (e) {
              // Continue
            }
          }
        }
      }
    }
    return callResult;
  }

  // Fallback: queue/join endpoint
  const queueResponse = await fetch(`${spaceUrl}/queue/join`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${hfToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: data,
      fn_index: 0,
      session_hash: Math.random().toString(36).substring(7)
    }),
  });

  console.log(`   Queue join status: ${queueResponse.status}`);
  
  if (queueResponse.ok) {
    return await queueResponse.json();
  }

  // Try direct API predict
  const predictResponse = await fetch(`${spaceUrl}/api/predict`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${hfToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: data,
      fn_index: 0
    }),
  });

  console.log(`   API predict status: ${predictResponse.status}`);

  if (predictResponse.ok) {
    return await predictResponse.json();
  }

  throw new Error(`All Gradio endpoints failed`);
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

    const SPACE_URL = 'https://zimesongbian-baatonum-asr-stt-api-v001-improve.hf.space';

    try {
      const result = await callGradioAPI(
        SPACE_URL,
        'transcribe',
        [audio, robustMode, speakerType],
        HF_TOKEN
      );

      let transcription = null;
      
      if (result && result.data && result.data[0]) {
        transcription = result.data[0];
      } else if (result && Array.isArray(result) && result[0]) {
        transcription = result[0];
      } else if (result && result.transcription) {
        transcription = result.transcription;
      } else if (typeof result === 'string') {
        transcription = result;
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
    } catch (e) {
      console.error(`   Gradio API error: ${e.message}`);
    }

    const duration = Date.now() - startTime;
    console.error(`❌ STT failed after ${duration}ms`);

    return new Response(
      JSON.stringify({
        error: 'Bariba STT service unavailable',
        details: 'HuggingFace Space may be sleeping. Please try again in 30 seconds.',
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
