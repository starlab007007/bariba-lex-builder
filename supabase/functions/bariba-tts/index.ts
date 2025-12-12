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

// Corrected Space URL based on actual HuggingFace Space name
const SPACE_NAME = 'zimesongbian/baatonum_tts_api_v001';
const SPACE_URL = 'https://zimesongbian-baatonum-tts-api-v001.hf.space';

async function getGradioApiInfo(spaceUrl: string, hfToken: string): Promise<any> {
  console.log(`📋 Fetching Gradio API info from ${spaceUrl}/info`);
  
  try {
    const infoResponse = await fetch(`${spaceUrl}/info`, {
      headers: { 'Authorization': `Bearer ${hfToken}` }
    });
    
    if (infoResponse.ok) {
      const info = await infoResponse.json();
      console.log(`   API info:`, JSON.stringify(info).substring(0, 500));
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
      console.log(`   Config:`, JSON.stringify(config).substring(0, 500));
      return config;
    }
  } catch (e) {
    console.log(`   /config failed: ${e.message}`);
  }
  
  return null;
}

async function callGradioTTS(
  spaceUrl: string,
  text: string,
  speakingRate: number,
  noiseScale: number,
  noiseScaleW: number,
  hfToken: string
): Promise<any> {
  const data = [text, speakingRate, noiseScale, noiseScaleW];
  
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
          
          // Parse SSE format - find the "complete" event with data
          const lines = sseText.split('\n');
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
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

async function extractAudioFromResult(result: any, spaceUrl: string, hfToken: string): Promise<string | null> {
  console.log(`🔍 Extracting audio from result type: ${typeof result}`);
  
  let audioData = null;
  
  // Handle various response formats
  if (Array.isArray(result)) {
    audioData = result[0];
  } else if (result?.data && Array.isArray(result.data)) {
    audioData = result.data[0];
  } else if (result?.audio) {
    audioData = result.audio;
  }
  
  if (!audioData) {
    console.log(`   No audio data found in result`);
    return null;
  }
  
  console.log(`   Audio data type: ${typeof audioData}`);
  
  // If it's already a base64 data URL
  if (typeof audioData === 'string' && audioData.startsWith('data:audio')) {
    return audioData;
  }
  
  // If it's a base64 string without prefix
  if (typeof audioData === 'string' && audioData.length > 100 && !audioData.startsWith('http')) {
    return `data:audio/wav;base64,${audioData}`;
  }
  
  // If it's an object with path/url (Gradio file response)
  if (typeof audioData === 'object') {
    console.log(`   Audio object:`, JSON.stringify(audioData).substring(0, 200));
    
    const fileUrl = audioData.url || 
                    (audioData.path ? `${spaceUrl}/file=${audioData.path}` : null) ||
                    (audioData.name ? `${spaceUrl}/file/${audioData.name}` : null);
    
    if (fileUrl) {
      console.log(`   Fetching audio from: ${fileUrl}`);
      try {
        const audioResponse = await fetch(fileUrl, {
          headers: { 'Authorization': `Bearer ${hfToken}` }
        });
        
        if (audioResponse.ok) {
          const audioBuffer = await audioResponse.arrayBuffer();
          const bytes = new Uint8Array(audioBuffer);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          console.log(`   ✅ Audio fetched, size: ${bytes.length} bytes`);
          return `data:audio/wav;base64,${base64}`;
        }
      } catch (e) {
        console.log(`   Error fetching audio: ${e.message}`);
      }
    }
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      text, 
      speakingRate = 1.0, 
      noiseScale = 0.3, 
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

    console.log(`🔊 Bariba TTS Request`);
    console.log(`   Text: "${text.substring(0, 80)}..."`);
    console.log(`   Params: rate=${speakingRate}, noise=${noiseScale}, noiseW=${noiseScaleW}`);
    console.log(`   Space: ${SPACE_URL}`);
    
    const startTime = Date.now();

    // First, get API info to understand the endpoint structure
    await getGradioApiInfo(SPACE_URL, HF_TOKEN);

    try {
      const result = await callGradioTTS(
        SPACE_URL,
        text,
        speakingRate,
        noiseScale,
        noiseScaleW,
        HF_TOKEN
      );

      const audio = await extractAudioFromResult(result, SPACE_URL, HF_TOKEN);

      if (audio) {
        const duration = Date.now() - startTime;
        console.log(`✅ Bariba TTS Success in ${duration}ms`);

        return new Response(
          JSON.stringify({
            audio,
            duration,
            text: text.substring(0, 100)
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (e) {
      console.error(`❌ Gradio API error: ${e.message}`);
    }

    const duration = Date.now() - startTime;
    console.error(`❌ TTS failed after ${duration}ms`);

    return new Response(
      JSON.stringify({
        error: 'Bariba TTS service unavailable',
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
      JSON.stringify({ error: error.message || 'TTS failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
