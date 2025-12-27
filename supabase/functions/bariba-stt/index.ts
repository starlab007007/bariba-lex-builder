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

// Check if the HuggingFace Space is awake
async function wakeUpSpace(hfToken: string): Promise<boolean> {
  try {
    console.log('🔄 Checking if HuggingFace Space is awake...');
    const response = await fetch(`${SPACE_URL}/`, {
      headers: { 'Authorization': `Bearer ${hfToken}` },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    console.log(`   Space status: ${response.status}`);
    return response.ok;
  } catch (e) {
    console.log(`   Space wake-up check failed: ${e.message}`);
    return false;
  }
}

async function pollForResult(
  spaceUrl: string,
  apiPrefix: string,
  sessionHash: string,
  hfToken: string,
  maxAttempts = 30 // Increased from 15 for more reliability
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
        signal: AbortSignal.timeout(10000) // 10 second timeout per poll
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
      
      // Wait before next poll (increased to 800ms for more stability)
      await new Promise(r => setTimeout(r, 800));
    } catch (e) {
      console.log(`   Poll error: ${e.message}`);
      if (e.message?.includes('HuggingFace')) throw e;
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
      signal: AbortSignal.timeout(15000) // 15 second timeout
    });
    
    console.log(`   Join status: ${joinResponse.status}`);
    
    if (joinResponse.ok) {
      const joinText = await joinResponse.text();
      console.log(`   Join response: ${joinText.substring(0, 200)}`);
      
      // Poll for result with increased attempts
      const result = await pollForResult(spaceUrl, apiPrefix, sessionHash, hfToken, 30);
      if (result) return result;
    }
  } catch (e) {
    console.log(`   Queue error: ${e.message}`);
    if (e.message?.includes('HuggingFace')) throw e;
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
      signal: AbortSignal.timeout(30000) // 30 second timeout
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
          signal: AbortSignal.timeout(30000)
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

function extractTranscription(result: any): { transcription: string | null; error: string | null } {
  console.log(`🔍 Extracting from result: ${JSON.stringify(result).substring(0, 500)}`);
  
  // Check for errors first
  if (result?.error) {
    console.error(`❌ Result contains error: ${result.error}`);
    return { transcription: null, error: result.error };
  }
  
  if (result?.data?.[0]?.error) {
    return { transcription: null, error: result.data[0].error };
  }
  
  // Extract transcription
  if (typeof result === 'string') return { transcription: result, error: null };
  if (Array.isArray(result) && typeof result[0] === 'string') return { transcription: result[0], error: null };
  if (result?.data?.[0] && typeof result.data[0] === 'string') return { transcription: result.data[0], error: null };
  if (result?.transcription) return { transcription: result.transcription, error: null };
  if (result?.text) return { transcription: result.text, error: null };
  
  return { transcription: null, error: null };
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

    // Check minimum audio length
    const minAudioLength = 100;
    console.log(`📏 Audio received: ${audio.length} chars (min: ${minAudioLength})`);
    console.log(`📏 Audio preview (first 100 chars): ${audio.substring(0, 100)}`);
    
    if (audio.length < minAudioLength) {
      console.log(`⚠️ Audio too short: ${audio.length} chars (min: ${minAudioLength})`);
      return new Response(
        JSON.stringify({ 
          error: 'Audio too short', 
          details: 'L\'enregistrement est trop court. Parlez plus longtemps (au moins 2 secondes).',
          audioLength: audio.length,
          suggestion: 'Maintenez le bouton micro et parlez pendant au moins 2 secondes avant de relâcher.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check maximum audio length to avoid timeouts
    const maxAudioLength = 300000;
    if (audio.length > maxAudioLength) {
      console.log(`⚠️ Audio too large: ${audio.length} chars (max: ${maxAudioLength})`);
      return new Response(
        JSON.stringify({ 
          error: 'Audio too large', 
          details: 'L\'enregistrement est trop long. Limitez à 30 secondes maximum.',
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

    // Try to wake up the space first
    const isAwake = await wakeUpSpace(HF_TOKEN);
    if (!isAwake) {
      console.log('⚠️ HuggingFace Space may be sleeping, attempting anyway...');
    }

    // Get API prefix from config
    let apiPrefix = '/gradio_api';
    try {
      const configResponse = await fetch(`${SPACE_URL}/config`, {
        headers: { 'Authorization': `Bearer ${HF_TOKEN}` },
        signal: AbortSignal.timeout(5000)
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

      const { transcription, error: extractError } = extractTranscription(result);
      const duration = Date.now() - startTime;

      // Check for extraction error
      if (extractError) {
        console.error(`❌ HuggingFace model returned error: ${extractError}`);
        return new Response(
          JSON.stringify({
            error: 'HuggingFace model error',
            details: extractError,
            duration,
            suggestion: 'Le modèle ASR Bariba a rencontré un problème. Essayez avec un enregistrement plus long et clair.'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (transcription) {
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
      
      // No transcription but no error either
      console.warn(`⚠️ No transcription returned after ${duration}ms`);
      
      return new Response(
        JSON.stringify({
          error: 'No transcription returned',
          details: 'Le modèle HuggingFace n\'a pas retourné de transcription. L\'audio peut être trop court ou inaudible.',
          duration,
          suggestion: 'Parlez plus fort et plus longtemps (3-5 secondes minimum).'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } catch (e) {
      const duration = Date.now() - startTime;
      console.error(`❌ API error after ${duration}ms: ${e.message}`);
      
      // Check if it's a HuggingFace-specific error
      const isHFError = e.message?.includes('HuggingFace');
      
      return new Response(
        JSON.stringify({
          error: isHFError ? 'HuggingFace model error' : 'Bariba STT service unavailable',
          details: e.message || 'HuggingFace Space API not responding.',
          duration,
          suggestion: isHFError 
            ? 'Le modèle Bariba a retourné une erreur. Réessayez avec un audio plus clair.'
            : 'Le service est temporairement indisponible. Réessayez dans quelques secondes.'
        }),
        { status: isHFError ? 400 : 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'STT failed', suggestion: 'Une erreur inattendue s\'est produite. Réessayez.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
