import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranslationRequest {
  text?: string;
  sourceLang?: 'french' | 'bariba';
  targetLang?: 'french' | 'bariba';
  mode?: 'quality' | 'fast';
  advanced?: boolean;
  healthCheck?: boolean;
}

const SPACE_URL = 'https://zimesongbian-modele-byt5-bariba-expert-api-v03-improve.hf.space';
const GLOBAL_TIMEOUT_MS = 10000; // 10 seconds max (reduced for better UX)

type LovableFallbackResult =
  | { ok: true; translation: string; confidence: number; model: string }
  | { ok: false; error: string; status?: number; details?: string };

async function lovableFallbackTranslate(params: {
  text: string;
  sourceLang: 'french' | 'bariba';
  targetLang: 'french' | 'bariba';
  abortSignal?: AbortSignal;
}): Promise<LovableFallbackResult> {
  const key = Deno.env.get('LOVABLE_API_KEY');
  if (!key) return { ok: false, error: 'LOVABLE_API_KEY not configured' };

  const from = params.sourceLang === 'french' ? 'French' : 'Bariba (Baatonum)';
  const to = params.targetLang === 'french' ? 'French' : 'Bariba (Baatonum)';

  const system = `You are a strict translation engine. Translate from ${from} to ${to}. Return ONLY the translated text. No quotes, no explanations.`;

  try {
    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: params.text },
        ],
        max_tokens: 512,
      }),
      signal: params.abortSignal,
    });

    if (!resp.ok) {
      const t = await resp.text();
      return { ok: false, error: 'Lovable AI gateway error', status: resp.status, details: t };
    }

    const json = await resp.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      return { ok: false, error: 'Lovable AI returned empty response' };
    }

    return { ok: true, translation: content.trim(), confidence: 75, model: 'google/gemini-2.5-flash' };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Lovable AI request failed' };
  }
}
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
                  const errorDetail = data.output?.error || data.title || 'Model processing failed';
                  console.log(`❌ Model returned error: ${JSON.stringify(data.output)}, title: ${data.title}`);
                  return { 
                    success: false, 
                    error: `HuggingFace Space error: ${errorDetail}` 
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
  const data = [text, direction, mode, advanced];
  
  console.log(`📤 Sending: text="${text}", direction="${direction}", mode="${mode}", advanced=${advanced}`);
  
  // Helper to validate translation result
  const isValidTranslation = (result: string | undefined): boolean => {
    if (!result || typeof result !== 'string' || result.trim().length === 0) return false;
    const invalidPatterns = [
      'Share via Link', 'share via', 'Partager', 'Loading', 'Submit', 
      'Clear', 'Button', 'Click', 'Select', 'Choose', 'Error', 'undefined'
    ];
    return !invalidPatterns.some(p => result.toLowerCase().includes(p.toLowerCase()));
  };

  // Try different endpoints - Gradio Spaces can have various configurations
  // The main function is usually at fn_index 0 or 2-3, not 1 (which is often Share button)
  const endpointsToTry = [
    // The correct endpoint from API config
    { type: 'named', endpoint: '/translate_pipeline' },
    // Fallbacks
    { type: 'named', endpoint: '/traduire_byt5' },
    { type: 'named', endpoint: '/predict' },
    // Try fn_index 0, 2, 3 (skip 1 which is Share button)
    { type: 'fn_index', index: 0 },
    { type: 'fn_index', index: 2 },
    { type: 'fn_index', index: 3 },
  ];

  for (const endpoint of endpointsToTry) {
    const sessionHash = Math.random().toString(36).substring(7);
    
    try {
      let joinBody: any = { data, session_hash: sessionHash };
      
      if (endpoint.type === 'named') {
        joinBody.endpoint = endpoint.endpoint;
        console.log(`🔄 Trying named endpoint: ${endpoint.endpoint}`);
      } else {
        joinBody.fn_index = endpoint.index;
        console.log(`🔄 Trying fn_index: ${endpoint.index}`);
      }

      const joinResponse = await fetch(`${spaceUrl}${apiPrefix}/queue/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(joinBody),
        signal: abortSignal,
      });

      if (!joinResponse.ok) {
        console.log(`   Join failed: ${joinResponse.status}`);
        continue;
      }

      // Poll for result
      const pollUrl = `${spaceUrl}${apiPrefix}/queue/data?session_hash=${sessionHash}`;
      
      for (let attempt = 0; attempt < 20; attempt++) {
        if (abortSignal?.aborted) {
          return { success: false, error: 'Request timeout' };
        }

        try {
          const pollResponse = await fetch(pollUrl, {
            headers: { 
              'Authorization': `Bearer ${hfToken}`,
              'Accept': 'text/event-stream'
            },
            signal: abortSignal,
          });

          if (pollResponse.ok) {
            const text = await pollResponse.text();
            const lines = text.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const parsed = JSON.parse(line.substring(6));
                  
                  if (parsed.msg === 'process_completed') {
                    if (parsed.success === false) {
                      console.log(`   Endpoint error: ${parsed.title || 'Unknown'}`);
                      break; // Try next endpoint
                    }
                    
                    const resultData = parsed.output?.data || parsed.data;
                    if (Array.isArray(resultData)) {
                      const translation = resultData[0];
                      if (isValidTranslation(translation)) {
                        console.log(`✅ Valid translation from ${endpoint.type === 'named' ? endpoint.endpoint : `fn_index=${endpoint.index}`}: "${translation}"`);
                        return { success: true, data: { data: resultData } };
                      } else {
                        console.log(`   Invalid result: "${translation}" - trying next endpoint`);
                        break; // Try next endpoint
                      }
                    }
                  }
                } catch (e) { /* continue parsing */ }
              }
            }
          }
          
          await new Promise(r => setTimeout(r, 300));
        } catch (e) {
          if (abortSignal?.aborted) return { success: false, error: 'Request timeout' };
        }
      }
    } catch (e) {
      if (abortSignal?.aborted) return { success: false, error: 'Request timeout' };
      console.log(`   Error: ${e.message}`);
    }
  }

  // Method: Direct /call/{endpoint} for newer Gradio versions
  const callEndpoints = ['/traduire_byt5', '/predict', '/translate'];
  for (const callEndpoint of callEndpoints) {
    console.log(`🔄 Trying direct call: ${callEndpoint}`);
    try {
      const response = await fetch(`${spaceUrl}${apiPrefix}/call${callEndpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
        signal: abortSignal,
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.event_id) {
          const eventUrl = `${spaceUrl}${apiPrefix}/call${callEndpoint}/${result.event_id}`;
          
          for (let attempt = 0; attempt < 15; attempt++) {
            if (abortSignal?.aborted) return { success: false, error: 'Request timeout' };
            
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
                const lines = eventText.split('\n');
                
                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    try {
                      const parsed = JSON.parse(line.substring(6));
                      const resultData = Array.isArray(parsed) ? parsed : parsed.data;
                      if (Array.isArray(resultData) && isValidTranslation(resultData[0])) {
                        console.log(`✅ Valid translation from call ${callEndpoint}: "${resultData[0]}"`);
                        return { success: true, data: { data: resultData } };
                      }
                    } catch (e) { /* continue */ }
                  }
                }
              }
            } catch (e) { /* continue */ }
            await new Promise(r => setTimeout(r, 400));
          }
        }
        
        if (result.data && Array.isArray(result.data) && isValidTranslation(result.data[0])) {
          return { success: true, data: result };
        }
      }
    } catch (e) {
      if (abortSignal?.aborted) return { success: false, error: 'Request timeout' };
      console.log(`   Call error: ${e.message}`);
    }
  }

  // Legacy methods for older Gradio versions
  const legacyEndpoints = ['/api/predict', '/run/predict'];
  for (const legacyEndpoint of legacyEndpoints) {
    console.log(`🔄 Trying legacy: ${legacyEndpoint}`);
    try {
      const response = await fetch(`${spaceUrl}${legacyEndpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data, fn_index: 0 }),
        signal: abortSignal,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data && Array.isArray(result.data) && isValidTranslation(result.data[0])) {
          console.log(`✅ Valid translation from ${legacyEndpoint}: "${result.data[0]}"`);
          return { success: true, data: result };
        }
      }
    } catch (e) {
      console.log(`   Legacy error: ${e.message}`);
    }
  }

  return { success: false, error: 'All Gradio API methods failed - no valid translation received' };
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
      healthCheck = false,
      exploreApi = false,
      text,
      sourceLang,
      targetLang,
      mode = 'quality',
      advanced = true,
    }: TranslationRequest & { exploreApi?: boolean } = await req.json();

    const HF_TOKEN = Deno.env.get('HUGGING_FACE_API_TOKEN');
    
    // API exploration mode - get Space info for debugging
    if (exploreApi) {
      clearTimeout(timeoutId);
      
      if (!HF_TOKEN) {
        return new Response(
          JSON.stringify({ error: 'HuggingFace token not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const exploration: any = { spaceUrl: SPACE_URL, endpoints: [] };
      
      // Try to get Gradio config
      const configUrls = [
        `${SPACE_URL}/gradio_api/config`,
        `${SPACE_URL}/config`, 
        `${SPACE_URL}/gradio_api/info`,
        `${SPACE_URL}/info`
      ];
      
      for (const url of configUrls) {
        try {
          const resp = await fetch(url, { 
            headers: { 'Authorization': `Bearer ${HF_TOKEN}` } 
          });
          if (resp.ok) {
            const data = await resp.json();
            exploration[url.split('/').pop() || 'config'] = data;
            
            // Extract endpoints from config
            if (data.dependencies) {
              exploration.endpoints = data.dependencies.map((d: any, i: number) => ({
                fn_index: i,
                api_name: d.api_name,
                inputs: d.inputs?.length || 0,
                outputs: d.outputs?.length || 0
              }));
            }
          }
        } catch (e) { /* continue */ }
      }
      
      return new Response(
        JSON.stringify(exploration),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Fast health check mode (avoids running an actual translation)
    if (healthCheck) {
      clearTimeout(timeoutId);

      if (!HF_TOKEN) {
        return new Response(
          JSON.stringify({ error: 'HuggingFace token not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const hcStart = Date.now();
      const hcController = new AbortController();
      const hcTimeoutId = setTimeout(() => hcController.abort(), 4000);

      try {
        // Try both config endpoints
        let healthy = false;
        for (const configPath of ['/gradio_api/config', '/config']) {
          try {
            const configResponse = await fetch(`${SPACE_URL}${configPath}`, {
              headers: { 'Authorization': `Bearer ${HF_TOKEN}` },
              signal: hcController.signal,
            });
            if (configResponse.ok) {
              healthy = true;
              break;
            }
          } catch (e) { /* continue */ }
        }

        return new Response(
          JSON.stringify({
            healthy,
            duration: Date.now() - hcStart,
            spaceUrl: SPACE_URL,
          }),
          { status: healthy ? 200 : 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      } catch (e) {
        return new Response(
          JSON.stringify({
            healthy: false,
            error: 'ByT5 health check failed',
            details: e?.message || 'Unknown error',
            duration: Date.now() - hcStart,
            spaceUrl: SPACE_URL,
          }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      } finally {
        clearTimeout(hcTimeoutId);
      }
    }

    if (!text || !sourceLang || !targetLang) {
      clearTimeout(timeoutId);
      return new Response(
        JSON.stringify({ error: 'Missing required fields: text, sourceLang, targetLang' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!HF_TOKEN) {
      clearTimeout(timeoutId);
      return new Response(
        JSON.stringify({ error: 'HuggingFace token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CRITICAL: Use exact direction format from the Space UI: "fr-ba" or "ba-fr"
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

      const fallback = await lovableFallbackTranslate({
        text,
        sourceLang,
        targetLang,
        abortSignal: abortController.signal,
      });

      if (fallback.ok) {
        console.log(`✅ Lovable AI fallback in ${duration}ms`);
        return new Response(
          JSON.stringify({
            translation: fallback.translation,
            confidence: fallback.confidence,
            duration,
            method: 'lovable-ai-fallback',
            modelInfo: { name: 'Lovable AI', version: fallback.model, mode: 'fallback', advanced: false },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({
          error: 'ByT5 translation service unavailable',
          details: result.error || 'HuggingFace Space API not responding',
          duration,
          spaceUrl: SPACE_URL,
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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
      // CRITICAL: Validate that this is a real translation, not UI text from the Space
      const invalidPatterns = [
        'Share via Link', 'share via', 'Partager', 'Error', 'Loading',
        'Submit', 'Clear', 'Button', 'Click', 'Select', 'Choose'
      ];
      const isInvalidResponse = invalidPatterns.some(pattern => 
        translation.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (isInvalidResponse) {
        console.error(`❌ ByT5 returned invalid UI text: "${translation}"`);

        const fallback = await lovableFallbackTranslate({
          text,
          sourceLang,
          targetLang,
          abortSignal: abortController.signal,
        });

        if (fallback.ok) {
          console.log(`✅ Lovable AI fallback after invalid ByT5 output in ${duration}ms`);
          return new Response(
            JSON.stringify({
              translation: fallback.translation,
              confidence: fallback.confidence,
              duration,
              method: 'lovable-ai-fallback',
              modelInfo: { name: 'Lovable AI', version: fallback.model, mode: 'fallback', advanced: false },
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        return new Response(
          JSON.stringify({
            error: 'ByT5 returned invalid response (UI text instead of translation)',
            details: `Received: "${translation.substring(0, 50)}"`,
            duration,
            spaceUrl: SPACE_URL,
          }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      
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
