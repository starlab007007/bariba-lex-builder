import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranslationRequest {
  text: string;
  sourceLang: 'french' | 'bariba';
  targetLang: 'french' | 'bariba';
  mode?: 'quality' | 'fast';
  advanced?: boolean;
}

// NEW IMPROVED Space URL from screenshots
const SPACE_URL = 'https://zimesongbian-modele-byt5-bariba-expert-api-v03-improve.hf.space';

async function pollForResult(
  spaceUrl: string,
  apiPrefix: string,
  sessionHash: string,
  hfToken: string,
  maxAttempts = 60
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
        console.log(`   Poll ${attempt + 1}: ${text.substring(0, 400)}`);
        
        // Parse SSE events
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              
              // Check for complete event
              if (data.msg === 'process_completed' && data.output?.data) {
                console.log(`✅ Got result: ${JSON.stringify(data.output).substring(0, 300)}`);
                return data.output;
              }
              
              // Direct data response
              if (data.data && Array.isArray(data.data)) {
                console.log(`✅ Got direct data: ${JSON.stringify(data.data).substring(0, 300)}`);
                return data;
              }
            } catch (e) {
              // Continue parsing
            }
          }
        }
      }
      
      // Wait before next poll (progressive backoff)
      const waitTime = attempt < 10 ? 300 : attempt < 30 ? 500 : 800;
      await new Promise(r => setTimeout(r, waitTime));
    } catch (e) {
      console.log(`   Poll error: ${e.message}`);
    }
  }
  
  return null;
}

async function callGradioTranslate(
  spaceUrl: string,
  apiPrefix: string,
  text: string,
  direction: string,
  mode: string,
  advanced: boolean,
  hfToken: string
): Promise<any> {
  const sessionHash = Math.random().toString(36).substring(7);
  
  // Parameters from the API documentation:
  // text: str, direction: 'fr-ba'|'ba-fr', mode: 'Qualité maximale'|'Rapide', advanced: bool
  const data = [text, direction, mode, advanced];
  
  // Method 1: Queue-based API with named endpoint /traduire_byt5
  console.log(`🔄 Method 1: Queue/join with endpoint /traduire_byt5`);
  try {
    const joinResponse = await fetch(`${spaceUrl}${apiPrefix}/queue/join`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        data,
        endpoint: '/traduire_byt5',
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
    console.log(`   Method 1 error: ${e.message}`);
  }

  // Method 2: Queue-based with fn_index=0
  console.log(`🔄 Method 2: Queue/join with fn_index=0`);
  const sessionHash2 = Math.random().toString(36).substring(7);
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
        session_hash: sessionHash2 
      }),
    });
    
    console.log(`   Join status: ${joinResponse.status}`);
    
    if (joinResponse.ok) {
      const result = await pollForResult(spaceUrl, apiPrefix, sessionHash2, hfToken);
      if (result) return result;
    }
  } catch (e) {
    console.log(`   Method 2 error: ${e.message}`);
  }

  // Method 3: Direct /call/traduire_byt5 endpoint
  console.log(`🔄 Method 3: Direct /call/traduire_byt5`);
  try {
    const response = await fetch(`${spaceUrl}${apiPrefix}/call/traduire_byt5`, {
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
        const eventUrl = `${spaceUrl}${apiPrefix}/call/traduire_byt5/${result.event_id}`;
        console.log(`   Polling event: ${eventUrl}`);
        
        for (let attempt = 0; attempt < 30; attempt++) {
          try {
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
                    if (Array.isArray(parsed) && parsed.length >= 1) return { data: parsed };
                    if (parsed.data && Array.isArray(parsed.data)) return parsed;
                  } catch (e) { /* continue */ }
                }
              }
            }
          } catch (e) {
            // Continue polling
          }
          await new Promise(r => setTimeout(r, 400));
        }
      }
      
      if (result.data) return result;
    }
  } catch (e) {
    console.log(`   Method 3 error: ${e.message}`);
  }

  // Method 4: Direct /run/traduire_byt5
  console.log(`🔄 Method 4: Direct /run/traduire_byt5`);
  try {
    const response = await fetch(`${spaceUrl}${apiPrefix}/run/traduire_byt5`, {
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
      if (result.data) return result;
    }
  } catch (e) {
    console.log(`   Method 4 error: ${e.message}`);
  }

  // Method 5: Legacy /api/predict
  console.log(`🔄 Method 5: Legacy /api/predict`);
  try {
    const response = await fetch(`${spaceUrl}/api/predict`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data, fn_index: 0 }),
    });
    
    console.log(`   Status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log(`   Result: ${JSON.stringify(result).substring(0, 200)}`);
      if (result.data) return result;
    }
  } catch (e) {
    console.log(`   Method 5 error: ${e.message}`);
  }

  throw new Error('All Gradio API methods failed - Space may be sleeping or API access disabled');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      text, 
      sourceLang, 
      targetLang, 
      mode = 'quality',
      advanced = true
    }: TranslationRequest = await req.json();

    if (!text || !sourceLang || !targetLang) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: text, sourceLang, targetLang' }),
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

    // Map direction
    const direction = sourceLang === 'french' ? 'fr-ba' : 'ba-fr';
    const gradioMode = mode === 'fast' ? 'Rapide' : 'Qualité maximale';

    console.log(`🤖 ByT5 Expert: ${direction} - "${text.substring(0, 100)}..."`);
    console.log(`📍 Space URL: ${SPACE_URL}`);
    console.log(`   Mode: ${gradioMode}, Advanced: ${advanced}`);
    
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
        console.log(`📋 Gradio v${config.version}, prefix: ${apiPrefix}`);
      }
    } catch (e) {
      console.log(`   Config fetch failed, using default prefix`);
    }

    try {
      const result = await callGradioTranslate(
        SPACE_URL,
        apiPrefix,
        text,
        direction,
        gradioMode,
        advanced,
        HF_TOKEN
      );

      // Extract translation from result
      // API returns tuple: [0] main translation, [1] reformulation suggestions
      let translation = null;
      let suggestions = null;

      if (result?.data && Array.isArray(result.data)) {
        translation = result.data[0];
        suggestions = result.data[1];
      } else if (Array.isArray(result)) {
        translation = result[0];
        suggestions = result[1];
      }

      if (translation && typeof translation === 'string' && translation.length > 0) {
        const duration = Date.now() - startTime;
        
        // Calculate confidence based on translation quality
        const hasSpecialChars = /[ɔɛɑɡãẽĩõũàèìòùâêîôûäëïöü]/.test(translation);
        const hasValidLength = translation.length >= text.length * 0.3;
        const baseConfidence = 85;
        const confidence = Math.min(
          95,
          baseConfidence + (hasSpecialChars ? 5 : 0) + (hasValidLength ? 5 : 0)
        );
        
        console.log(`✅ ByT5 Success in ${duration}ms: "${translation.substring(0, 150)}"`);
        if (suggestions) console.log(`   Suggestions: "${suggestions.substring(0, 100)}"`);

        return new Response(
          JSON.stringify({ 
            translation,
            suggestions,
            confidence,
            duration,
            method: 'byt5-expert',
            modelInfo: {
              name: 'ByT5 Expert (Improved)',
              version: 'zimesongbian/modele_byt5_bariba_expert_api_v03_improve',
              mode: gradioMode,
              advanced
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (e) {
      console.error(`❌ API error: ${e.message}`);
    }

    const duration = Date.now() - startTime;
    console.error(`❌ ByT5 failed after ${duration}ms`);

    return new Response(
      JSON.stringify({
        error: 'ByT5 translation service unavailable',
        details: 'HuggingFace Space API not responding. The Space may be sleeping or API access is disabled.',
        duration,
        spaceUrl: SPACE_URL,
        suggestion: 'Visit the Space URL to wake it up and enable API access in Settings'
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Translation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
