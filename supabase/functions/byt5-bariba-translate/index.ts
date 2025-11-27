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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, sourceLang, targetLang, mode = 'quality' }: TranslationRequest = await req.json();

    if (!text || !sourceLang || !targetLang) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const HF_TOKEN = Deno.env.get('HUGGING_FACE_API_TOKEN');
    if (!HF_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'HF token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Space URL from secrets (configurable via admin UI)
    let BYT5_SPACE_URL = Deno.env.get('BYT5_SPACE_URL');
    if (!BYT5_SPACE_URL || BYT5_SPACE_URL === '') {
      // Default fallback (NOTE: HuggingFace converts underscores to hyphens in URLs)
      BYT5_SPACE_URL = 'https://zimesongbian-modele-byt5-bariba-expert-api-v03.hf.space';
    }

    const direction = sourceLang === 'french' ? 'fr-ba' : 'ba-fr';
    const gradioMode = mode === 'fast' ? 'Rapide' : 'Qualité maximale';

    console.log(`🤖 ByT5 Translation: ${direction} - "${text.substring(0, 30)}..."`);
    console.log(`📍 Using Space URL: ${BYT5_SPACE_URL}`);
    
    const startTime = Date.now();
    const SPACE_NAME = 'zimesongbian/modele_byt5_bariba_expert_api_v03';
    let ACTUAL_SPACE_URL = BYT5_SPACE_URL; // Fallback to configured URL
    
    // Étape 1: Auto-detect correct Space URL from HuggingFace API
    console.log(`\n🔍 Step 1: Auto-detecting Space URL from HF API...`);
    try {
      const spaceInfoResponse = await fetch(`https://huggingface.co/api/spaces/${SPACE_NAME}`, {
        headers: { 'Authorization': `Bearer ${HF_TOKEN}` }
      });
      
      if (spaceInfoResponse.ok) {
        const spaceInfo = await spaceInfoResponse.json();
        console.log(`✅ Space found: ${spaceInfo.id}`);
        console.log(`   SDK: ${spaceInfo.sdk || 'unknown'}`);
        console.log(`   Runtime: ${JSON.stringify(spaceInfo.runtime)}`);
        
        // Extract correct domain from API response
        if (spaceInfo.runtime?.domains?.[0]?.domain) {
          ACTUAL_SPACE_URL = `https://${spaceInfo.runtime.domains[0].domain}`;
          console.log(`✅ Auto-detected URL: ${ACTUAL_SPACE_URL}`);
        } else if (spaceInfo.subdomain) {
          ACTUAL_SPACE_URL = `https://${spaceInfo.subdomain}.hf.space`;
          console.log(`✅ Auto-detected URL: ${ACTUAL_SPACE_URL}`);
        }
        
        // Warn if configured URL differs from detected URL
        if (BYT5_SPACE_URL && BYT5_SPACE_URL !== ACTUAL_SPACE_URL) {
          console.warn(`⚠️  Configured URL (${BYT5_SPACE_URL}) differs from detected URL (${ACTUAL_SPACE_URL})`);
          console.warn(`   Using auto-detected URL for better reliability`);
        }
      } else {
        console.warn(`⚠️  Could not fetch Space info (${spaceInfoResponse.status})`);
        console.warn(`   Falling back to configured URL: ${BYT5_SPACE_URL}`);
      }
    } catch (e) {
      console.warn(`⚠️  Space info check failed: ${e.message}`);
      console.warn(`   Falling back to configured URL: ${BYT5_SPACE_URL}`);
    }

    // Étape 2: Essayer le nouveau Router HuggingFace
    console.log(`\n🔄 Step 2: Trying new HF Router API...`);
    console.log(`   Using URL: ${ACTUAL_SPACE_URL}`);
    try {
      const routerUrl = `https://router.huggingface.co/spaces/${SPACE_NAME}`;
      console.log(`   URL: ${routerUrl}`);
      
      const routerResponse = await fetch(routerUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: text,
          parameters: {
            direction: direction,
            mode: gradioMode,
            advanced: true
          }
        }),
      });

      console.log(`   Status: ${routerResponse.status}`);

      if (routerResponse.ok) {
        const result = await routerResponse.json();
        console.log(`   Response:`, JSON.stringify(result).substring(0, 200));
        
        let translation = null;
        if (typeof result === 'string') {
          translation = result;
        } else if (result.generated_text) {
          translation = result.generated_text;
        } else if (Array.isArray(result) && result[0]?.generated_text) {
          translation = result[0].generated_text;
        } else if (result.data && result.data[0]) {
          translation = result.data[0];
        }

        if (translation) {
          const duration = Date.now() - startTime;
          console.log(`✅ SUCCESS via Router in ${duration}ms`);
          
          return new Response(
            JSON.stringify({
              translation,
              confidence: 90,
              duration,
              method: 'byt5-expert',
              endpoint: 'HuggingFace Router',
              modelInfo: {
                name: 'ByT5 Expert',
                version: SPACE_NAME,
                mode: gradioMode
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        const errorText = await routerResponse.text();
        console.error(`   ❌ Router failed: ${errorText}`);
      }
    } catch (e) {
      console.error(`   ❌ Router exception: ${e.message}`);
    }

    // Étape 3: Essayer l'endpoint Gradio direct avec le domaine correct
    console.log(`\n🔄 Step 3: Trying direct Gradio endpoint...`);
    const gradioBaseUrl = ACTUAL_SPACE_URL;
    
    // Essayer d'abord sans endpoint spécifique pour voir la page d'accueil
    try {
      console.log(`   Checking Space homepage: ${gradioBaseUrl}`);
      const homeResponse = await fetch(gradioBaseUrl, {
        headers: { 'Authorization': `Bearer ${HF_TOKEN}` }
      });
      console.log(`   Homepage status: ${homeResponse.status}`);
      
      if (homeResponse.status === 404) {
        console.error(`   ❌ Space homepage returns 404 - Space may not exist or URL is wrong`);
        console.error(`   📍 Please verify the exact Space URL on HuggingFace`);
      } else if (homeResponse.status === 200) {
        console.log(`   ✅ Space homepage is accessible!`);
        // Analyser le HTML pour trouver l'API endpoint
        const html = await homeResponse.text();
        console.log(`   📄 HTML length: ${html.length} chars`);
        
        // Chercher les endpoints Gradio dans le HTML
        const gradioApiMatch = html.match(/\/gradio_api/);
        const apiPredictMatch = html.match(/\/api\/predict/);
        const runPredictMatch = html.match(/\/run\/predict/);
        const callPredictMatch = html.match(/\/call\/predict/);
        
        if (gradioApiMatch) console.log(`   🎯 Found: /gradio_api`);
        if (apiPredictMatch) console.log(`   🎯 Found: /api/predict`);
        if (runPredictMatch) console.log(`   🎯 Found: /run/predict`);
        if (callPredictMatch) console.log(`   🎯 Found: /call/predict`);
        
        // Chercher la fonction predict dans le code JS
        const predictFnMatch = html.match(/function\s+predict|const\s+predict|predict\s*:\s*function/i);
        if (predictFnMatch) {
          console.log(`   🎯 Found predict function in page code`);
        }
      }
    } catch (e) {
      console.error(`   ❌ Homepage check failed: ${e.message}`);
    }

    // Essayer les endpoints Gradio courants
    const gradioEndpoints = [
      { path: '', method: 'GET', name: 'Root' },
      { path: '/api/predict', method: 'POST', name: 'API Predict', body: { data: [text, direction, gradioMode, true] } },
      { path: '/run/predict', method: 'POST', name: 'Run Predict', body: { data: [text, direction, gradioMode, true] } },
      { path: '/gradio_api/call/predict', method: 'POST', name: 'Gradio API Call', body: { data: [text, direction, gradioMode, true] } },
    ];

    for (const endpoint of gradioEndpoints) {
      try {
        const url = `${gradioBaseUrl}${endpoint.path}`;
        console.log(`   Trying: ${endpoint.method} ${url}`);
        
        const options: any = {
          method: endpoint.method,
          headers: {
            'Authorization': `Bearer ${HF_TOKEN}`,
          }
        };

        if (endpoint.body) {
          options.headers['Content-Type'] = 'application/json';
          options.body = JSON.stringify(endpoint.body);
        }

        const response = await fetch(url, options);
        console.log(`   Status: ${response.status}`);

        if (response.ok) {
          if (endpoint.method === 'GET') {
            const html = await response.text();
            console.log(`   ✅ Space accessible! HTML length: ${html.length}`);
            // Chercher l'endpoint API dans le HTML
            const apiMatch = html.match(/\/api\/predict|\/run\/predict|gradio_api/);
            if (apiMatch) {
              console.log(`   📍 Found potential endpoint in HTML: ${apiMatch[0]}`);
            }
          } else {
            const result = await response.json();
            let translation = null;
            
            if (result.data && result.data[0]) {
              translation = result.data[0];
            }

            if (translation) {
              const duration = Date.now() - startTime;
              console.log(`✅ SUCCESS via ${endpoint.name} in ${duration}ms`);
              
              return new Response(
                JSON.stringify({
                  translation,
                  confidence: 90,
                  duration,
                  method: 'byt5-expert',
                  endpoint: endpoint.name,
                  modelInfo: {
                    name: 'ByT5 Expert',
                    version: SPACE_NAME,
                    mode: gradioMode
                  }
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }
        }
      } catch (e) {
        console.error(`   ❌ ${endpoint.name} failed: ${e.message}`);
      }
    }

    // Tous les endpoints ont échoué
    const duration = Date.now() - startTime;
    console.error(`\n❌ ALL METHODS FAILED after ${duration}ms`);
    
    return new Response(
      JSON.stringify({ 
        error: 'ByT5 Space is not accessible',
        details: 'All connection methods failed',
        troubleshooting: [
          '⚠️  CRITICAL: Your Space URL may be incorrect',
          `1. Verify this URL works in browser: https://huggingface.co/spaces/${SPACE_NAME}`,
          '2. Check if Space is RUNNING (not sleeping/building)',
          '3. Verify token has READ access to private Space',
          '4. The Space may use a custom API - check Space README',
          '5. Try clicking "Duplicate this Space" on HF to create a working copy'
        ],
        nextSteps: 'Please verify the exact Space name and URL on HuggingFace, then update the configuration'
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Translation failed',
        details: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});