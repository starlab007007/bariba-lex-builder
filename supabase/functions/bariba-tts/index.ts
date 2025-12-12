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

async function pollForResult(
  spaceUrl: string,
  apiPrefix: string,
  eventId: string,
  hfToken: string,
  maxAttempts = 30
): Promise<any> {
  const pollUrl = `${spaceUrl}${apiPrefix}/queue/data?session_hash=${eventId}`;
  console.log(`📡 Polling: ${pollUrl}`);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(pollUrl, {
        headers: { 
          'Authorization': `Bearer ${hfToken}`,
          'Accept': 'text/event-stream'
        },
      });
      
      if (response.ok) {
        const text = await response.text();
        console.log(`   Poll ${attempt + 1}: ${text.substring(0, 300)}`);
        
        // Parse SSE events
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              
              // Check for complete event
              if (data.msg === 'process_completed' && data.output?.data) {
                console.log(`✅ Got result: ${JSON.stringify(data.output).substring(0, 200)}`);
                return data.output;
              }
              
              // Direct data response
              if (data.data && Array.isArray(data.data)) {
                return data;
              }
            } catch (e) {
              // Continue parsing
            }
          }
        }
      }
      
      // Wait before next poll
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      console.log(`   Poll error: ${e.message}`);
    }
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
  const sessionHash = Math.random().toString(36).substring(7);
  const data = [text, speakingRate, noiseScale, noiseScaleW];
  
  // Method 1: Queue-based API (Gradio 4.x+)
  console.log(`🔄 Trying queue/join with session: ${sessionHash}`);
  try {
    const joinResponse = await fetch(`${spaceUrl}${apiPrefix}/queue/join`, {
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
    
    console.log(`   Join status: ${joinResponse.status}`);
    
    if (joinResponse.ok) {
      const joinText = await joinResponse.text();
      console.log(`   Join response: ${joinText.substring(0, 200)}`);
      
      // Parse the SSE response to get event_id
      let eventId = sessionHash;
      const lines = joinText.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.substring(6));
            if (parsed.event_id) eventId = parsed.event_id;
          } catch (e) { /* continue */ }
        }
      }
      
      // Poll for result
      const result = await pollForResult(spaceUrl, apiPrefix, sessionHash, hfToken);
      if (result) return result;
    }
  } catch (e) {
    console.log(`   Queue error: ${e.message}`);
  }

  // Method 2: Direct call API
  console.log(`🔄 Trying direct /call/predict`);
  try {
    const response = await fetch(`${spaceUrl}${apiPrefix}/call/predict`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
    });
    
    console.log(`   Status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log(`   Result: ${JSON.stringify(result).substring(0, 200)}`);
      
      if (result.event_id) {
        // Poll using SSE endpoint
        const eventUrl = `${spaceUrl}${apiPrefix}/call/predict/${result.event_id}`;
        console.log(`   Polling event: ${eventUrl}`);
        
        const eventResponse = await fetch(eventUrl, {
          headers: { 
            'Authorization': `Bearer ${hfToken}`,
            'Accept': 'text/event-stream'
          },
        });
        
        if (eventResponse.ok) {
          const eventText = await eventResponse.text();
          console.log(`   Event text: ${eventText.substring(0, 300)}`);
          
          const lines = eventText.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(line.substring(6));
                if (parsed.data || Array.isArray(parsed)) return parsed;
              } catch (e) { /* continue */ }
            }
          }
        }
      }
      
      return result;
    }
  } catch (e) {
    console.log(`   Direct call error: ${e.message}`);
  }

  throw new Error('All Gradio API methods failed');
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
  if (typeof audioData === 'object' && (audioData.url || audioData.path || audioData.name)) {
    const filePath = audioData.path || audioData.name;
    const fileUrl = audioData.url || `${spaceUrl}/file=${filePath}`;
    console.log(`   Fetching audio file: ${fileUrl}`);
    
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

    // Get API prefix from config
    let apiPrefix = '/gradio_api';
    try {
      const configResponse = await fetch(`${SPACE_URL}/config`, {
        headers: { 'Authorization': `Bearer ${HF_TOKEN}` }
      });
      if (configResponse.ok) {
        const config = await configResponse.json();
        apiPrefix = config.api_prefix || '/gradio_api';
        console.log(`📋 Gradio ${config.version}, prefix: ${apiPrefix}`);
      }
    } catch (e) {
      console.log(`   Config fetch failed, using default prefix`);
    }

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
        details: 'HuggingFace Space API not responding. The Space may be sleeping or API access is disabled.',
        duration,
        suggestion: 'Visit the Space URL to wake it up, then enable API access in Settings'
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
