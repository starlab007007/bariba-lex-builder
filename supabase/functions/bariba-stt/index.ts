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

async function pollForResult(
  spaceUrl: string,
  apiPrefix: string,
  sessionHash: string,
  hfToken: string,
  maxAttempts = 30
): Promise<any> {
  const pollUrl = `${spaceUrl}${apiPrefix}/queue/data?session_hash=${sessionHash}`;
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
              
              // Check for process_completed with error
              if (data.msg === 'process_completed' && data.output?.error) {
                console.error(`❌ HuggingFace error: ${data.output.error}`);
                throw new Error(`HuggingFace Space error: ${data.output.error}`);
              }
              
              // Check for complete event with data
              if (data.msg === 'process_completed' && data.output?.data) {
                console.log(`✅ Got result: ${JSON.stringify(data.output).substring(0, 200)}`);
                return data.output;
              }
              
              // Direct data response
              if (data.data && Array.isArray(data.data)) {
                return data;
              }
            } catch (e) {
              if (e.message?.includes('HuggingFace')) throw e;
              // Continue parsing for other errors
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

async function callGradioSTT(
  spaceUrl: string,
  apiPrefix: string,
  audioData: string,
  robustMode: boolean,
  speakerType: string,
  hfToken: string
): Promise<any> {
  const sessionHash = Math.random().toString(36).substring(7);
  
  // Format audio data for Gradio
  const audioInput = audioData.startsWith('data:') 
    ? audioData 
    : `data:audio/webm;base64,${audioData}`;
  
  // Data array: [audio, robustMode, speakerType]
  const data = [audioInput, robustMode, speakerType];
  
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
        JSON.stringify({ error: 'Audio data required', details: 'Aucune donnée audio reçue' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle health check requests (short strings like "test")
    if (audio === 'test' || audio.length < 20) {
      console.log(`🏥 Health check request detected (audio="${audio.substring(0, 10)}")`);
      return new Response(
        JSON.stringify({ 
          status: 'ok',
          service: 'bariba-stt',
          message: 'Service is available',
          isHealthCheck: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check minimum audio length (avoid sending too short recordings)
    // Base64 audio of ~0.5 second is approximately 500+ chars
    const minAudioLength = 100;
    if (audio.length < minAudioLength) {
      console.log(`⚠️ Audio too short: ${audio.length} chars (min: ${minAudioLength})`);
      return new Response(
        JSON.stringify({ 
          error: 'Audio too short', 
          details: 'L\'enregistrement est trop court. Parlez plus longtemps (au moins 1-2 secondes).',
          audioLength: audio.length
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const HF_TOKEN = Deno.env.get('HUGGING_FACE_API_TOKEN');
    if (!HF_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'HuggingFace token not configured', details: 'Configuration serveur manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎤 Bariba STT: audio=${audio.length} chars, robust=${robustMode}, speaker=${speakerType}`);
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
        details: 'HuggingFace Space API not responding. The Space may be sleeping or API access is disabled.',
        duration,
        suggestion: 'Visit the Space URL to wake it up, then enable API access in Settings'
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
