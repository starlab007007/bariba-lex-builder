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

const SPACE_URL = 'https://zimesongbian-modele-byt5-bariba-expert-api-v03-improve.hf.space';
const GLOBAL_TIMEOUT_MS = 15000; // 15 seconds max

async function pollForResult(
  spaceUrl: string,
  apiPrefix: string,
  sessionHash: string,
  hfToken: string,
  maxAttempts = 30, // Reduced from 60
  abortSignal?: AbortSignal
): Promise<{ success: boolean; data?: any; error?: string }> {
  const pollUrl = `${spaceUrl}${apiPrefix}/queue/data?session_hash=${sessionHash}`;
  console.log(`📡 Polling: ${pollUrl}`);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (abortSignal?.aborted) {
      return { success: false, error: 'Request timeout' };
    }
    
    try {
      const response = await fetch(pollUrl, {
        headers: { 
          'Authorization': `Bearer ${hfToken}`,
          'Accept': 'text/event-stream'
        },
        signal: abortSignal,
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
              
              // CRITICAL: Check for process_completed with success: false
              if (data.msg === 'process_completed') {
                if (data.success === false) {
                  console.log(`❌ Model returned error: ${JSON.stringify(data.output)}`);
                  return { 
                    success: false, 
                    error: data.output?.error || data.title || 'Model processing failed' 
                  };
                }
                
                if (data.output?.data) {
                  console.log(`✅ Got result: ${JSON.stringify(data.output).substring(0, 300)}`);
                  return { success: true, data: data.output };
                }
              }
              
              // Direct data response
              if (data.data && Array.isArray(data.data)) {
                console.log(`✅ Got direct data: ${JSON.stringify(data.data).substring(0, 300)}`);
                return { success: true, data };
              }
            } catch (e) {
              // Continue parsing
            }
          }
        }
      }
      
      // Wait before next poll (faster polling, shorter wait)
      const waitTime = attempt < 5 ? 200 : attempt < 15 ? 400 : 600;
      await new Promise(r => setTimeout(r, waitTime));
    } catch (e) {
      if (abortSignal?.aborted) {
        return { success: false, error: 'Request timeout' };
      }
      console.log(`   Poll error: ${e.message}`);
    }
  }
  
  return { success: false, error: 'Polling timeout - no response received' };
}

async function callGradioTranslate(
  spaceUrl: string,
  apiPrefix: string,
  text: string,
  direction: string,
  mode: string,
  advanced: boolean,
  hfToken: string,
  abortSignal?: AbortSignal
): Promise<{ success: boolean; data?: any; error?: string }> {
  const sessionHash = Math.random().toString(36).substring(7);
  const data = [text, direction, mode, advanced];
  
  // Method 1: Queue-based API with named endpoint
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
      signal: abortSignal,
    });
    
    console.log(`   Join status: ${joinResponse.status}`);
    
    if (joinResponse.ok) {
      const joinText = await joinResponse.text();
      console.log(`   Join response: ${joinText.substring(0, 200)}`);
      
      const result = await pollForResult(spaceUrl, apiPrefix, sessionHash, hfToken, 30, abortSignal);
      if (result.success) return result;
      if (result.error && result.error !== 'Polling timeout - no response received') {
        return result; // Return error immediately if model failed
      }
    }
  } catch (e) {
    if (abortSignal?.aborted) {
      return { success: false, error: 'Request timeout' };
    }
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
      signal: abortSignal,
    });
    
    console.log(`   Join status: ${joinResponse.status}`);
    
    if (joinResponse.ok) {
      const result = await pollForResult(spaceUrl, apiPrefix, sessionHash2, hfToken, 30, abortSignal);
      if (result.success) return result;
      if (result.error && result.error !== 'Polling timeout - no response received') {
        return result;
      }
    }
  } catch (e) {
    if (abortSignal?.aborted) {
      return { success: false, error: 'Request timeout' };
    }
    console.log(`   Method 2 error: ${e.message}`);
  }

  // Method 3: Direct /call/traduire_byt5
  console.log(`🔄 Method 3: Direct /call/traduire_byt5`);
  try {
    const response = await fetch(`${spaceUrl}${apiPrefix}/call/traduire_byt5`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
      signal: abortSignal,
    });
    
    console.log(`   Status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log(`   Result: ${JSON.stringify(result).substring(0, 200)}`);
      
      if (result.event_id) {
        const eventUrl = `${spaceUrl}${apiPrefix}/call/traduire_byt5/${result.event_id}`;
        console.log(`   Polling event: ${eventUrl}`);
        
        for (let attempt = 0; attempt < 15; attempt++) {
          if (abortSignal?.aborted) {
            return { success: false, error: 'Request timeout' };
          }
          
          try {
            const eventResponse = await fetch(eventUrl, {
              headers: { 
                'Authorization': `Bearer ${hfToken}`,
                'Accept': 'text/event-stream'
              },
              signal: abortSignal,
            });
            
            if (eventResponse.ok) {
              const eventText = await eventResponse.text();
              console.log(`   Event text: ${eventText.substring(0, 300)}`);
              
              const lines = eventText.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const parsed = JSON.parse(line.substring(6));
                    if (Array.isArray(parsed) && parsed.length >= 1) {
                      return { success: true, data: { data: parsed } };
                    }
                    if (parsed.data && Array.isArray(parsed.data)) {
                      return { success: true, data: parsed };
                    }
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
      
      if (result.data) return { success: true, data: result };
    }
  } catch (e) {
    if (abortSignal?.aborted) {
      return { success: false, error: 'Request timeout' };
    }
    console.log(`   Method 3 error: ${e.message}`);
  }

  return { success: false, error: 'All Gradio API methods failed - Space may be sleeping or has internal errors' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const abortController = new AbortController();
  
  // Global timeout
  const timeoutId = setTimeout(() => {
    abortController.abort();
    console.log(`⏰ Global timeout reached (${GLOBAL_TIMEOUT_MS}ms)`);
  }, GLOBAL_TIMEOUT_MS);

  try {
    const { 
      text, 
      sourceLang, 
      targetLang, 
      mode = 'quality',
      advanced = true
    }: TranslationRequest = await req.json();

    if (!text || !sourceLang || !targetLang) {
      clearTimeout(timeoutId);
      return new Response(
        JSON.stringify({ error: 'Missing required fields: text, sourceLang, targetLang' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const HF_TOKEN = Deno.env.get('HUGGING_FACE_API_TOKEN');
    if (!HF_TOKEN) {
      clearTimeout(timeoutId);
      return new Response(
        JSON.stringify({ error: 'HuggingFace token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const direction = sourceLang === 'french' ? 'fr-ba' : 'ba-fr';
    const gradioMode = mode === 'fast' ? 'Rapide' : 'Qualité maximale';

    console.log(`🤖 ByT5 Expert: ${direction} - "${text.substring(0, 100)}..."`);
    console.log(`📍 Space URL: ${SPACE_URL}`);
    console.log(`   Mode: ${gradioMode}, Advanced: ${advanced}`);

    // Get API prefix from config
    let apiPrefix = '/gradio_api';
    try {
      const configResponse = await fetch(`${SPACE_URL}/config`, {
        headers: { 'Authorization': `Bearer ${HF_TOKEN}` },
        signal: abortController.signal,
      });
      if (configResponse.ok) {
        const config = await configResponse.json();
        apiPrefix = config.api_prefix || '/gradio_api';
        console.log(`📋 Gradio v${config.version}, prefix: ${apiPrefix}`);
      }
    } catch (e) {
      console.log(`   Config fetch failed, using default prefix`);
    }

    const result = await callGradioTranslate(
      SPACE_URL,
      apiPrefix,
      text,
      direction,
      gradioMode,
      advanced,
      HF_TOKEN,
      abortController.signal
    );

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    if (!result.success) {
      console.error(`❌ ByT5 failed after ${duration}ms: ${result.error}`);
      return new Response(
        JSON.stringify({
          error: 'ByT5 translation service unavailable',
          details: result.error || 'HuggingFace Space API not responding',
          duration,
          spaceUrl: SPACE_URL
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract translation from result
    let translation = null;
    let suggestions = null;

    if (result.data?.data && Array.isArray(result.data.data)) {
      translation = result.data.data[0];
      suggestions = result.data.data[1];
    } else if (Array.isArray(result.data)) {
      translation = result.data[0];
      suggestions = result.data[1];
    }

    if (translation && typeof translation === 'string' && translation.length > 0) {
      const hasSpecialChars = /[ɔɛɑɡãẽĩõũàèìòùâêîôûäëïöü]/.test(translation);
      const hasValidLength = translation.length >= text.length * 0.3;
      const baseConfidence = 85;
      const confidence = Math.min(
        95,
        baseConfidence + (hasSpecialChars ? 5 : 0) + (hasValidLength ? 5 : 0)
      );
      
      console.log(`✅ ByT5 Success in ${duration}ms: "${translation.substring(0, 150)}"`);
      if (suggestions) console.log(`   Suggestions: "${String(suggestions).substring(0, 100)}"`);

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

    console.error(`❌ ByT5 no valid translation in response after ${duration}ms`);
    return new Response(
      JSON.stringify({
        error: 'ByT5 returned no valid translation',
        details: 'Model processed but returned empty or invalid response',
        duration,
        spaceUrl: SPACE_URL
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    console.error(`Fatal error after ${duration}ms:`, error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Translation failed',
        duration 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
