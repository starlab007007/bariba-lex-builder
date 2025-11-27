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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, sourceLang, targetLang, mode = 'quality' }: TranslationRequest = await req.json();

    if (!text || !sourceLang || !targetLang) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: text, sourceLang, targetLang' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Hugging Face token from environment
    const HF_TOKEN = Deno.env.get('HUGGING_FACE_API_TOKEN');
    if (!HF_TOKEN) {
      console.error('HUGGING_FACE_API_TOKEN is not configured');
      return new Response(
        JSON.stringify({ error: 'HF token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map to Gradio API format
    const direction = sourceLang === 'french' ? 'fr-ba' : 'ba-fr';
    const gradioMode = mode === 'fast' ? 'Rapide' : 'Qualité maximale';
    const advanced = true;

    console.log(`🤖 ByT5 Expert Translation Request`);
    console.log(`   Direction: ${direction}`);
    console.log(`   Mode: ${gradioMode}`);
    console.log(`   Text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    console.log(`   Token: ${HF_TOKEN.substring(0, 10)}...`);

    const startTime = Date.now();
    const SPACE_ID = 'zimesongbian/modele_byt5_bariba_expert_api_v03';
    
    // Liste des endpoints à essayer dans l'ordre
    const endpoints = [
      // Méthode 1: API Inference directe (recommandée pour Spaces privés)
      {
        name: 'Inference API',
        url: `https://api-inference.huggingface.co/models/${SPACE_ID}`,
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: text,
          parameters: {
            direction: direction,
            mode: gradioMode,
            advanced: advanced
          }
        })
      },
      // Méthode 2: Gradio API /api/predict
      {
        name: 'Gradio /api/predict',
        url: `https://zimesongbian-modele-byt5-bariba-expert-api-v03.hf.space/api/predict`,
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [text, direction, gradioMode, advanced]
        })
      },
      // Méthode 3: Gradio API /run/predict
      {
        name: 'Gradio /run/predict',
        url: `https://zimesongbian-modele-byt5-bariba-expert-api-v03.hf.space/run/predict`,
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [text, direction, gradioMode, advanced]
        })
      },
      // Méthode 4: Gradio API /call/predict (avec polling)
      {
        name: 'Gradio /call/predict',
        url: `https://zimesongbian-modele-byt5-bariba-expert-api-v03.hf.space/call/predict`,
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [text, direction, gradioMode, advanced]
        })
      }
    ];

    const errors = [];

    // Essayer chaque endpoint
    for (const endpoint of endpoints) {
      console.log(`\n🔄 Trying ${endpoint.name}...`);
      console.log(`   URL: ${endpoint.url}`);
      
      try {
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: endpoint.headers,
          body: endpoint.body,
        });

        console.log(`   Status: ${response.status} ${response.statusText}`);

        if (response.ok) {
          const result = await response.json();
          console.log(`   Response:`, JSON.stringify(result).substring(0, 200));

          // Extraction de la traduction selon le format de réponse
          let translation = null;

          // Format Inference API: { generated_text: "..." } ou [{"generated_text": "..."}]
          if (result.generated_text) {
            translation = result.generated_text;
          } else if (Array.isArray(result) && result[0]?.generated_text) {
            translation = result[0].generated_text;
          }
          // Format Gradio: { data: [...] }
          else if (result.data && Array.isArray(result.data) && result.data.length > 0) {
            translation = result.data[0];
          }
          // Format direct: tableau de résultats
          else if (Array.isArray(result) && result.length > 0) {
            translation = result[0];
          }

          if (translation) {
            const duration = Date.now() - startTime;
            console.log(`✅ Translation successful via ${endpoint.name} in ${duration}ms`);
            console.log(`   Result: "${translation.substring(0, 100)}${translation.length > 100 ? '...' : ''}"`);

            return new Response(
              JSON.stringify({
                translation,
                confidence: 90,
                duration,
                method: 'byt5-expert',
                endpoint: endpoint.name,
                modelInfo: {
                  name: 'ByT5 Expert',
                  version: SPACE_ID,
                  mode: gradioMode
                }
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } else {
            console.warn(`   ⚠️ Success but unexpected response format`);
            errors.push({
              endpoint: endpoint.name,
              status: response.status,
              error: 'Unexpected response format',
              response: result
            });
          }
        } else {
          const errorText = await response.text();
          console.error(`   ❌ Error ${response.status}: ${errorText.substring(0, 200)}`);
          errors.push({
            endpoint: endpoint.name,
            status: response.status,
            error: errorText
          });
        }
      } catch (error) {
        console.error(`   ❌ Exception: ${error.message}`);
        errors.push({
          endpoint: endpoint.name,
          error: error.message
        });
      }
    }

    // Si tous les endpoints ont échoué
    const duration = Date.now() - startTime;
    console.error(`\n❌ All endpoints failed after ${duration}ms`);
    console.error(`Errors summary:`, JSON.stringify(errors, null, 2));

    return new Response(
      JSON.stringify({ 
        error: 'ByT5 Space unavailable - all endpoints failed',
        details: 'Tried multiple API endpoints without success',
        attempts: errors,
        troubleshooting: [
          `1. Verify Space exists: https://huggingface.co/spaces/${SPACE_ID}`,
          `2. Check Space is RUNNING (not sleeping or building)`,
          `3. Verify token ${HF_TOKEN.substring(0, 10)}... has READ access to private Space`,
          `4. Try accessing the Space URL manually in your browser`,
          `5. Check Space logs on Hugging Face for errors`
        ]
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in byt5-bariba-translate:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Translation failed',
        details: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});