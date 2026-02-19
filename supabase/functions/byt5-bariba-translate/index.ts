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
const GLOBAL_TIMEOUT_MS = 55000;

async function pollForResult(
  spaceUrl: string,
  apiPrefix: string,
  sessionHash: string,
  hfToken: string,
  abortSignal?: AbortSignal
): Promise<{ success: boolean; data?: any; error?: string }> {
  const isValidTranslation = (result: string | undefined): boolean => {
    if (!result || typeof result !== 'string' || result.trim().length === 0) return false;
    const invalidPatterns = [
      'Share via Link', 'share via', 'Partager', 'Loading', 'Submit',
      'Clear', 'Button', 'Click', 'Select', 'Choose', 'Error', 'undefined'
    ];
    return !invalidPatterns.some(p => result.toLowerCase().includes(p.toLowerCase()));
  };

  const pollUrl = `${spaceUrl}${apiPrefix}/queue/data?session_hash=${sessionHash}`;
  console.log(`📡 Polling: ${pollUrl}`);

  for (let attempt = 0; attempt < 40; attempt++) {
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
        const responseText = await pollResponse.text();
        console.log(`   Poll ${attempt + 1}: ${responseText.substring(0, 400)}`);

        const lines = responseText.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.substring(6));

              if (parsed.msg === 'process_completed') {
                if (parsed.success === false) {
                  console.log(`   Process failed: ${JSON.stringify(parsed.output)}`);
                  return { success: false, error: parsed.output?.error || 'Translation failed' };
                }

                const resultData = parsed.output?.data || parsed.data;
                if (Array.isArray(resultData)) {
                  const translation = resultData[0];
                  console.log(`   Got result: "${translation}"`);
                  if (isValidTranslation(translation)) {
                    console.log(`✅ Valid translation: "${translation}"`);
                    return { success: true, data: { data: resultData } };
                  }
                }
              }

              if (parsed.data && Array.isArray(parsed.data)) {
                const translation = parsed.data[0];
                if (isValidTranslation(translation)) {
                  console.log(`✅ Direct data: "${translation}"`);
                  return { success: true, data: parsed };
                }
              }
            } catch (e) { /* continue parsing */ }
          }
        }
      }

      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      if (abortSignal?.aborted) return { success: false, error: 'Request timeout' };
    }
  }

  return { success: false, error: 'Translation failed - no valid response from HuggingFace Space' };
}

async function callGradioTranslate(
  spaceUrl: string,
  apiPrefix: string,
  text: string,
  direction: string,
  mode: string,
  advanced: boolean,
  hfToken: string,
  abortSignal?: AbortSignal,
  autocorrect: boolean = true
): Promise<{ success: boolean; data?: any; error?: string }> {
  
  const isValidTranslation = (result: string | undefined): boolean => {
    if (!result || typeof result !== 'string' || result.trim().length === 0) return false;
    const invalidPatterns = [
      'Share via Link', 'share via', 'Partager', 'Loading', 'Submit', 
      'Clear', 'Button', 'Click', 'Select', 'Choose', 'Error', 'undefined'
    ];
    return !invalidPatterns.some(p => result.toLowerCase().includes(p.toLowerCase()));
  };

  // Skip /info fetch to save time

  const data = [text, direction, mode, advanced, autocorrect];
  console.log(`📤 Sending to fn_index=2: ${JSON.stringify(data)}`);

  const sessionHash = Math.random().toString(36).substring(7);
  
  try {
    const joinResponse = await fetch(`${spaceUrl}${apiPrefix}/queue/join`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        data: data, 
        fn_index: 2,
        session_hash: sessionHash 
      }),
      signal: abortSignal,
    });

    console.log(`   Join status: ${joinResponse.status}`);

    if (joinResponse.ok) {
      const joinText = await joinResponse.text();
      console.log(`   Join response: ${joinText.substring(0, 300)}`);

      const pollUrl = `${spaceUrl}${apiPrefix}/queue/data?session_hash=${sessionHash}`;
      console.log(`📡 Polling: ${pollUrl}`);
      
      for (let attempt = 0; attempt < 40; attempt++) {
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
            const responseText = await pollResponse.text();
            console.log(`   Poll ${attempt + 1}: ${responseText.substring(0, 400)}`);
            
            const lines = responseText.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const parsed = JSON.parse(line.substring(6));
                  
                  if (parsed.msg === 'process_completed') {
                    if (parsed.success === false) {
                      console.log(`   Process failed: ${JSON.stringify(parsed.output)}`);
                      return { success: false, error: parsed.output?.error || 'Translation failed' };
                    }
                    
                    const resultData = parsed.output?.data || parsed.data;
                    if (Array.isArray(resultData)) {
                      const translation = resultData[0];
                      console.log(`   Got result: "${translation}"`);
                      if (isValidTranslation(translation)) {
                        console.log(`✅ Valid translation: "${translation}"`);
                        return { success: true, data: { data: resultData } };
                      }
                    }
                  }
                  
                  if (parsed.data && Array.isArray(parsed.data)) {
                    const translation = parsed.data[0];
                    if (isValidTranslation(translation)) {
                      console.log(`✅ Direct data: "${translation}"`);
                      return { success: true, data: parsed };
                    }
                  }
                } catch (e) { /* continue parsing */ }
              }
            }
          }
          
          await new Promise(r => setTimeout(r, 500));
        } catch (e) {
          if (abortSignal?.aborted) return { success: false, error: 'Request timeout' };
        }
      }
    } else {
      const errorText = await joinResponse.text().catch(() => '');
      console.log(`   Join error: ${errorText.substring(0, 300)}`);
    }
  } catch (e: unknown) {
    if (abortSignal?.aborted) return { success: false, error: 'Request timeout' };
    console.log(`   Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }

  return { success: false, error: 'Translation failed - no valid response from HuggingFace Space' };
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const abortController = new AbortController();
  
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
    
    // API exploration mode
    if (exploreApi) {
      clearTimeout(timeoutId);
      
      if (!HF_TOKEN) {
        return new Response(
          JSON.stringify({ error: 'HuggingFace token not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const exploration: any = { spaceUrl: SPACE_URL, endpoints: [] };
      
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

    // Health check
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
          JSON.stringify({ healthy, duration: Date.now() - hcStart, spaceUrl: SPACE_URL }),
          { status: healthy ? 200 : 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      } catch (e: unknown) {
        return new Response(
          JSON.stringify({
            healthy: false, error: 'ByT5 health check failed',
            details: e instanceof Error ? e.message : 'Unknown error',
            duration: Date.now() - hcStart, spaceUrl: SPACE_URL,
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

    const direction = sourceLang === 'french' ? 'fr-ba' : 'ba-fr';
    const gradioMode = mode === 'fast' ? 'Rapide' : 'Qualité maximale';

    console.log(`🤖 ByT5 Expert: ${direction} - "${text.substring(0, 100)}..."`);
    console.log(`📍 Space URL: ${SPACE_URL}`);
    console.log(`   Mode: ${gradioMode}, Advanced: ${advanced}`);

    const apiPrefix = '/gradio_api';

    const result = await callGradioTranslate(
      SPACE_URL, apiPrefix, text, direction, gradioMode, advanced,
      HF_TOKEN, abortController.signal, true
    );

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    if (!result.success) {
      console.error(`❌ ByT5 failed after ${duration}ms: ${result.error}`);
      return new Response(
        JSON.stringify({
          error: 'ByT5 translation service unavailable',
          details: result.error || 'HuggingFace Space API not responding',
          duration, spaceUrl: SPACE_URL,
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
      const invalidPatterns = [
        'Share via Link', 'share via', 'Partager', 'Error', 'Loading',
        'Submit', 'Clear', 'Button', 'Click', 'Select', 'Choose'
      ];
      const isInvalidResponse = invalidPatterns.some(pattern => 
        translation.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (isInvalidResponse) {
        console.error(`❌ ByT5 returned invalid UI text: "${translation}"`);
        return new Response(
          JSON.stringify({
            error: 'ByT5 returned invalid response (UI text instead of translation)',
            details: `Received: "${translation.substring(0, 50)}"`,
            duration, spaceUrl: SPACE_URL,
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
          duration: Date.now() - startTime,
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
        duration: Date.now() - startTime, spaceUrl: SPACE_URL
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    console.error(`Fatal error after ${duration}ms:`, error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Translation failed',
        duration 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
