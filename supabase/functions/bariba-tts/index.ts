import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TTSRequest {
  text: string;
  speakingRate?: number;
  noiseScale?: number;
  noiseScaleW?: number;
}

async function callGradioAPI(
  spaceUrl: string,
  fnName: string,
  data: any[],
  hfToken: string
): Promise<any> {
  // Step 1: Queue the job
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
  
  if (!queueResponse.ok) {
    // Try alternate format for Gradio 4.x
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

  const queueResult = await queueResponse.json();
  console.log(`   Queue result:`, JSON.stringify(queueResult).substring(0, 200));
  
  return queueResult;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      text, 
      speakingRate = 1.0, 
      noiseScale = 0.667, 
      noiseScaleW = 0.8 
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

    const SPACE_URL = 'https://zimesongbian-baatonum-tts-api-v001.hf.space';

    try {
      const result = await callGradioAPI(
        SPACE_URL,
        'bariba_tts',
        [text, speakingRate, noiseScale, noiseScaleW],
        HF_TOKEN
      );

      let audioData = null;
      
      if (result && result.data && result.data[0]) {
        audioData = result.data[0];
      } else if (result && Array.isArray(result) && result[0]) {
        audioData = result[0];
      } else if (result && result.audio) {
        audioData = result.audio;
      }

      if (audioData) {
        const duration = Date.now() - startTime;
        console.log(`✅ Bariba TTS Success in ${duration}ms`);

        // Handle file path or URL response
        let audioOutput = audioData;
        if (typeof audioData === 'object' && audioData.path) {
          // It's a file reference - need to fetch the actual audio
          const audioUrl = audioData.url || `${SPACE_URL}/file=${audioData.path}`;
          const audioResponse = await fetch(audioUrl, {
            headers: { 'Authorization': `Bearer ${HF_TOKEN}` }
          });
          if (audioResponse.ok) {
            const audioBuffer = await audioResponse.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
            audioOutput = `data:audio/wav;base64,${base64}`;
          }
        }

        return new Response(
          JSON.stringify({
            audio: audioOutput,
            duration,
            text: text.substring(0, 100)
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (e) {
      console.error(`   Gradio API error: ${e.message}`);
    }

    const duration = Date.now() - startTime;
    console.error(`❌ TTS failed after ${duration}ms`);

    return new Response(
      JSON.stringify({
        error: 'Bariba TTS service unavailable',
        details: 'HuggingFace Space may be sleeping. Please try again in 30 seconds.',
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
