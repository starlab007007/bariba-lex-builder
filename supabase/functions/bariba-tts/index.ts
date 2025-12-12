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

const SPACE_URL = 'https://zimesongbian-baatonum-tts-api-v001.hf.space';

async function getGradioConfig(spaceUrl: string, hfToken: string): Promise<any> {
  console.log(`📋 Fetching Gradio config...`);
  
  try {
    const response = await fetch(`${spaceUrl}/config`, {
      headers: { 'Authorization': `Bearer ${hfToken}` }
    });
    
    if (response.ok) {
      const config = await response.json();
      console.log(`   Gradio version: ${config.version}`);
      console.log(`   API prefix: ${config.api_prefix}`);
      console.log(`   Mode: ${config.mode}`);
      return config;
    }
  } catch (e) {
    console.log(`   /config failed: ${e.message}`);
  }
  
  return null;
}

async function callGradioTTS(
  spaceUrl: string,
  apiPrefix: string,
  text: string,
  speakingRate: number,
  noiseScale: number,
  noiseScaleW: number,
  hfToken: string
): Promise<any> {
  // Data array must match the component order in the Space
  // Based on the TTS Space: [text, speaking_rate, noise_scale, noise_scale_w]
  const data = [text, speakingRate, noiseScale, noiseScaleW];
  
  // For Gradio 6.x, use the API with proper endpoint format
  // Try POST to /gradio_api/call/<fn_name> with fn_index
  
  // Method 1: Try direct /gradio_api/call/predict with proper body
  console.log(`🔄 Method 1: POST ${apiPrefix}/call/predict`);
  try {
    const response = await fetch(`${spaceUrl}${apiPrefix}/call/predict`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        data,
        fn_index: 0,
        session_hash: Math.random().toString(36).substring(7)
      }),
    });
    
    console.log(`   Status: ${response.status}`);
    const responseText = await response.text();
    console.log(`   Response: ${responseText.substring(0, 300)}`);
    
    if (response.ok) {
      try {
        const result = JSON.parse(responseText);
        
        if (result.event_id) {
          // Poll for result
          console.log(`   Polling event: ${result.event_id}`);
          const eventUrl = `${spaceUrl}${apiPrefix}/call/predict/${result.event_id}`;
          
          const eventResponse = await fetch(eventUrl, {
            headers: { 
              'Authorization': `Bearer ${hfToken}`,
              'Accept': 'text/event-stream'
            },
          });
          
          if (eventResponse.ok) {
            const eventText = await eventResponse.text();
            console.log(`   Event response: ${eventText.substring(0, 500)}`);
            
            // Parse SSE format
            const lines = eventText.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const parsed = JSON.parse(line.substring(6));
                  console.log(`   Parsed data: ${JSON.stringify(parsed).substring(0, 200)}`);
                  return parsed;
                } catch (e) {
                  // Not JSON, continue
                }
              }
            }
          }
        }
        return result;
      } catch (e) {
        console.log(`   Parse error: ${e.message}`);
      }
    }
  } catch (e) {
    console.log(`   Error: ${e.message}`);
  }

  // Method 2: Try /gradio_api/queue/join
  console.log(`🔄 Method 2: POST ${apiPrefix}/queue/join`);
  try {
    const sessionHash = Math.random().toString(36).substring(7);
    const response = await fetch(`${spaceUrl}${apiPrefix}/queue/join`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        data, 
        fn_index: 0, 
        session_hash: sessionHash 
      }),
    });
    
    console.log(`   Status: ${response.status}`);
    
    if (response.ok) {
      const responseText = await response.text();
      console.log(`   Response: ${responseText.substring(0, 300)}`);
      
      // This returns an SSE stream
      if (responseText.includes('event:')) {
        const lines = responseText.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.substring(6));
              if (parsed.output || parsed.data) {
                return parsed.output || parsed;
              }
            } catch (e) {
              // Continue
            }
          }
        }
      }
    }
  } catch (e) {
    console.log(`   Error: ${e.message}`);
  }

  // Method 3: Use the Client SDK approach - /gradio_api/call/<endpoint>
  // Looking at Gradio 6.x, we need to find the actual endpoint name
  console.log(`🔄 Method 3: Trying named endpoints...`);
  
  const endpointNames = ['synthesize', 'tts', 'generate', 'predict', 'run'];
  for (const name of endpointNames) {
    try {
      const response = await fetch(`${spaceUrl}${apiPrefix}/call/${name}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
      });
      
      console.log(`   ${apiPrefix}/call/${name}: ${response.status}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`   Result: ${JSON.stringify(result).substring(0, 200)}`);
        
        if (result.event_id) {
          const eventResponse = await fetch(`${spaceUrl}${apiPrefix}/call/${name}/${result.event_id}`, {
            headers: { 'Authorization': `Bearer ${hfToken}` },
          });
          
          if (eventResponse.ok) {
            const eventText = await eventResponse.text();
            const lines = eventText.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  return JSON.parse(line.substring(6));
                } catch (e) { /* continue */ }
              }
            }
          }
        }
        return result;
      }
    } catch (e) {
      // Continue to next endpoint
    }
  }

  throw new Error('All Gradio endpoints failed');
}

async function extractAudio(result: any, spaceUrl: string, hfToken: string): Promise<string | null> {
  console.log(`🔍 Extracting audio from: ${JSON.stringify(result).substring(0, 300)}`);
  
  let audioData = null;
  
  if (Array.isArray(result)) {
    audioData = result[0];
  } else if (result?.data && Array.isArray(result.data)) {
    audioData = result.data[0];
  } else if (result?.audio) {
    audioData = result.audio;
  }
  
  if (!audioData) return null;
  
  // Handle base64 data URL
  if (typeof audioData === 'string' && audioData.startsWith('data:audio')) {
    return audioData;
  }
  
  // Handle file object from Gradio
  if (typeof audioData === 'object' && (audioData.url || audioData.path)) {
    const fileUrl = audioData.url || `${spaceUrl}/file=${audioData.path}`;
    console.log(`   Fetching audio from: ${fileUrl}`);
    
    try {
      const audioResponse = await fetch(fileUrl, {
        headers: { 'Authorization': `Bearer ${hfToken}` }
      });
      
      if (audioResponse.ok) {
        const buffer = await audioResponse.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return `data:audio/wav;base64,${btoa(binary)}`;
      }
    } catch (e) {
      console.log(`   Error fetching audio: ${e.message}`);
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

    console.log(`🔊 Bariba TTS: "${text.substring(0, 50)}..."`);
    const startTime = Date.now();

    // Get Gradio config to find API prefix
    const config = await getGradioConfig(SPACE_URL, HF_TOKEN);
    const apiPrefix = config?.api_prefix || '/gradio_api';

    try {
      const result = await callGradioTTS(
        SPACE_URL,
        apiPrefix,
        text,
        speakingRate,
        noiseScale,
        noiseScaleW,
        HF_TOKEN
      );

      const audio = await extractAudio(result, SPACE_URL, HF_TOKEN);

      if (audio) {
        const duration = Date.now() - startTime;
        console.log(`✅ TTS Success in ${duration}ms`);

        return new Response(
          JSON.stringify({ audio, duration, text: text.substring(0, 100) }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (e) {
      console.error(`❌ API error: ${e.message}`);
    }

    const duration = Date.now() - startTime;
    console.error(`❌ TTS failed after ${duration}ms`);

    return new Response(
      JSON.stringify({
        error: 'Bariba TTS service unavailable',
        details: 'HuggingFace Space API not responding. Check if API is enabled in Space settings.',
        duration,
        suggestion: 'Go to Space Settings → Enable "API Access"'
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
