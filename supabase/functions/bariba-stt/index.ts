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

const SPACE_URL = 'https://zimesongbian-baatonum-asr-stt-api-v001-improve.hf.space';

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
      return config;
    }
  } catch (e) {
    console.log(`   /config failed: ${e.message}`);
  }
  
  return null;
}

async function callGradioSTT(
  spaceUrl: string,
  apiPrefix: string,
  audioData: string,
  robustMode: boolean,
  speakerType: string,
  hfToken: string
): Promise<any> {
  // Format audio data for Gradio
  const audioInput = audioData.startsWith('data:') 
    ? audioData 
    : `data:audio/webm;base64,${audioData}`;
  
  // Data array: [audio, robustMode, speakerType]
  const data = [audioInput, robustMode, speakerType];
  
  // Method 1: Try /gradio_api/call/predict
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
            
            const lines = eventText.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const parsed = JSON.parse(line.substring(6));
                  return parsed;
                } catch (e) { /* continue */ }
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
      body: JSON.stringify({ data, fn_index: 0, session_hash: sessionHash }),
    });
    
    console.log(`   Status: ${response.status}`);
    
    if (response.ok) {
      const responseText = await response.text();
      console.log(`   Response: ${responseText.substring(0, 300)}`);
      
      if (responseText.includes('event:')) {
        const lines = responseText.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.substring(6));
              if (parsed.output || parsed.data) {
                return parsed.output || parsed;
              }
            } catch (e) { /* continue */ }
          }
        }
      }
    }
  } catch (e) {
    console.log(`   Error: ${e.message}`);
  }

  // Method 3: Try named endpoints
  console.log(`🔄 Method 3: Trying named endpoints...`);
  const endpointNames = ['transcribe', 'recognize', 'stt', 'predict', 'run'];
  
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
      // Continue to next
    }
  }

  throw new Error('All Gradio endpoints failed');
}

function extractTranscription(result: any): string | null {
  console.log(`🔍 Extracting transcription from: ${JSON.stringify(result).substring(0, 200)}`);
  
  if (typeof result === 'string') return result;
  if (Array.isArray(result) && typeof result[0] === 'string') return result[0];
  if (result?.data?.[0] && typeof result.data[0] === 'string') return result.data[0];
  if (result?.transcription) return result.transcription;
  if (result?.text) return result.text;
  
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

    console.log(`🎤 Bariba STT: audio=${audio.length} chars, robust=${robustMode}`);
    const startTime = Date.now();

    const config = await getGradioConfig(SPACE_URL, HF_TOKEN);
    const apiPrefix = config?.api_prefix || '/gradio_api';

    try {
      const result = await callGradioSTT(
        SPACE_URL,
        apiPrefix,
        audio,
        robustMode,
        speakerType,
        HF_TOKEN
      );

      const transcription = extractTranscription(result);

      if (transcription) {
        const duration = Date.now() - startTime;
        console.log(`✅ STT Success in ${duration}ms: "${transcription.substring(0, 50)}"`);

        return new Response(
          JSON.stringify({
            transcription,
            confidence: 90,
            duration,
            language: 'bariba'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (e) {
      console.error(`❌ API error: ${e.message}`);
    }

    const duration = Date.now() - startTime;
    console.error(`❌ STT failed after ${duration}ms`);

    return new Response(
      JSON.stringify({
        error: 'Bariba STT service unavailable',
        details: 'HuggingFace Space API not responding. Check if API is enabled.',
        duration,
        suggestion: 'Go to Space Settings → Enable "API Access"'
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
