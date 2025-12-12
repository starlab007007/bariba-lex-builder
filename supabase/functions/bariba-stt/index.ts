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

// Corrected Space URL based on actual HuggingFace Space name
const SPACE_NAME = 'zimesongbian/baatonum_asr_stt_api_v001_improve';
const SPACE_URL = 'https://zimesongbian-baatonum-asr-stt-api-v001-improve.hf.space';

async function getGradioApiInfo(spaceUrl: string, hfToken: string): Promise<any> {
  console.log(`📋 Fetching Gradio API info from ${spaceUrl}`);
  
  // Try /info endpoint
  try {
    const infoResponse = await fetch(`${spaceUrl}/info`, {
      headers: { 'Authorization': `Bearer ${hfToken}` }
    });
    
    if (infoResponse.ok) {
      const info = await infoResponse.json();
      console.log(`   /info response:`, JSON.stringify(info).substring(0, 500));
      return info;
    }
  } catch (e) {
    console.log(`   /info failed: ${e.message}`);
  }
  
  // Try /config for older Gradio versions
  try {
    const configResponse = await fetch(`${spaceUrl}/config`, {
      headers: { 'Authorization': `Bearer ${hfToken}` }
    });
    
    if (configResponse.ok) {
      const config = await configResponse.json();
      console.log(`   /config response:`, JSON.stringify(config).substring(0, 500));
      return config;
    }
  } catch (e) {
    console.log(`   /config failed: ${e.message}`);
  }
  
  return null;
}

async function callGradioSTT(
  spaceUrl: string,
  audioData: string,
  robustMode: boolean,
  speakerType: string,
  hfToken: string
): Promise<any> {
  // The audio data needs to be in the right format for Gradio
  // Gradio expects either a file path or a dict with name, data, etc.
  
  // Convert base64 to Gradio-compatible format
  const audioInput = audioData.startsWith('data:') 
    ? audioData 
    : `data:audio/webm;base64,${audioData}`;
  
  const data = [audioInput, robustMode, speakerType];
  
  // Method 1: Try gradio_api/call/predict (Gradio 4.x+)
  console.log(`🔄 Trying gradio_api/call/predict...`);
  try {
    const response = await fetch(`${spaceUrl}/gradio_api/call/predict`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
    });
    
    console.log(`   gradio_api/call/predict status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log(`   Result:`, JSON.stringify(result).substring(0, 300));
      
      if (result.event_id) {
        // Poll for SSE result
        const sseUrl = `${spaceUrl}/gradio_api/call/predict/${result.event_id}`;
        console.log(`   Polling SSE: ${sseUrl}`);
        
        const sseResponse = await fetch(sseUrl, {
          headers: { 'Authorization': `Bearer ${hfToken}` },
        });
        
        if (sseResponse.ok) {
          const sseText = await sseResponse.text();
          console.log(`   SSE response:`, sseText.substring(0, 500));
          
          // Parse SSE format
          const lines = sseText.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(line.substring(6));
                if (parsed && (parsed[0] || parsed.data)) {
                  return parsed;
                }
              } catch (e) {
                // Continue parsing
              }
            }
          }
        }
      }
      return result;
    }
  } catch (e) {
    console.log(`   gradio_api/call/predict error: ${e.message}`);
  }

  // Method 2: Try /run/predict (Gradio 3.x)
  console.log(`🔄 Trying /run/predict...`);
  try {
    const response = await fetch(`${spaceUrl}/run/predict`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
    });
    
    console.log(`   /run/predict status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log(`   Result:`, JSON.stringify(result).substring(0, 300));
      return result;
    }
  } catch (e) {
    console.log(`   /run/predict error: ${e.message}`);
  }

  // Method 3: Try /api/predict
  console.log(`🔄 Trying /api/predict...`);
  try {
    const response = await fetch(`${spaceUrl}/api/predict`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data, fn_index: 0 }),
    });
    
    console.log(`   /api/predict status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log(`   Result:`, JSON.stringify(result).substring(0, 300));
      return result;
    }
  } catch (e) {
    console.log(`   /api/predict error: ${e.message}`);
  }

  // Method 4: Try queue/join
  console.log(`🔄 Trying /queue/join...`);
  try {
    const sessionHash = Math.random().toString(36).substring(7);
    const response = await fetch(`${spaceUrl}/queue/join`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data, fn_index: 0, session_hash: sessionHash }),
    });
    
    console.log(`   /queue/join status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log(`   Result:`, JSON.stringify(result).substring(0, 300));
      return result;
    }
  } catch (e) {
    console.log(`   /queue/join error: ${e.message}`);
  }

  throw new Error('All Gradio endpoints failed');
}

function extractTranscription(result: any): string | null {
  console.log(`🔍 Extracting transcription from result type: ${typeof result}`);
  
  // Handle various response formats
  if (typeof result === 'string') {
    return result;
  }
  
  if (Array.isArray(result)) {
    if (typeof result[0] === 'string') {
      return result[0];
    }
    if (result[0]?.value) {
      return result[0].value;
    }
  }
  
  if (result?.data && Array.isArray(result.data)) {
    if (typeof result.data[0] === 'string') {
      return result.data[0];
    }
    if (result.data[0]?.value) {
      return result.data[0].value;
    }
  }
  
  if (result?.transcription) {
    return result.transcription;
  }
  
  if (result?.text) {
    return result.text;
  }
  
  console.log(`   Could not extract transcription from:`, JSON.stringify(result).substring(0, 200));
  return null;
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

    console.log(`🎤 Bariba STT Request`);
    console.log(`   Audio size: ${audio.length} chars`);
    console.log(`   Params: robustMode=${robustMode}, speaker=${speakerType}`);
    console.log(`   Space: ${SPACE_URL}`);
    
    const startTime = Date.now();

    // First, get API info to understand the endpoint structure
    await getGradioApiInfo(SPACE_URL, HF_TOKEN);

    try {
      const result = await callGradioSTT(
        SPACE_URL,
        audio,
        robustMode,
        speakerType,
        HF_TOKEN
      );

      const transcription = extractTranscription(result);

      if (transcription) {
        const duration = Date.now() - startTime;
        console.log(`✅ Bariba STT Success in ${duration}ms`);
        console.log(`   Transcription: "${transcription.substring(0, 100)}"`);

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
      console.error(`❌ Gradio API error: ${e.message}`);
    }

    const duration = Date.now() - startTime;
    console.error(`❌ STT failed after ${duration}ms`);

    return new Response(
      JSON.stringify({
        error: 'Bariba STT service unavailable',
        details: 'HuggingFace Space API endpoints not responding. The Space may need API access enabled.',
        duration,
        spaceUrl: SPACE_URL,
        suggestion: 'Check Space settings: Settings → Enable API Access'
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
