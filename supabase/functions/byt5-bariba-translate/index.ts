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

interface GradioResponse {
  data: [string];
  duration?: number;
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
    const advanced = true; // Post-traitement avancé activé

    // Configuration du Space ByT5 Expert - Gradio 4.x uses /run/predict
    const SPACE_BASE_URL = 'https://zimesongbian-modele-byt5-bariba-expert-api-v03.hf.space';
    const PREDICT_URL = `${SPACE_BASE_URL}/run/predict`;

    console.log(`🤖 Attempting ByT5 translation: ${direction}, mode: ${gradioMode}`);
    console.log(`📍 Space URL: ${SPACE_BASE_URL}`);
    console.log(`📍 API Endpoint: ${PREDICT_URL}`);
    console.log(`📝 Text length: ${text.length} chars`);
    console.log(`🔑 Token configured: ${HF_TOKEN ? 'YES' : 'NO'}`);

    const startTime = Date.now();

    try {
      // Appel direct à l'API Gradio avec endpoint synchrone /api/predict
      const response = await fetch(PREDICT_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [text, direction, gradioMode, advanced]
        }),
      });

      console.log(`📡 API Response Status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ ByT5 API Error (${response.status}):`, errorText);
        console.error(`📍 Attempted URL: ${PREDICT_URL}`);
        console.error(`⚠️  Troubleshooting:`);
        console.error(`   1. Verify Space URL: https://huggingface.co/spaces/zimesongbian/modele_byt5_bariba_expert_api_v03`);
        console.error(`   2. Check Space is RUNNING (not sleeping)`);
        console.error(`   3. Verify token has access to this private Space`);
        console.error(`   4. Check if Space uses /api/predict endpoint`);
        
        return new Response(
          JSON.stringify({ 
            error: 'ByT5 Space API call failed',
            details: errorText,
            status: response.status,
            endpoint: PREDICT_URL,
            suggestion: 'Verify Space is awake on Hugging Face and token has FINEGRAINED access'
          }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await response.json();
      console.log(`📦 API Response:`, JSON.stringify(result).substring(0, 200));

      // Gradio API response format: { data: [translation] }
      if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
        console.error('Invalid API response format:', result);
        return new Response(
          JSON.stringify({ 
            error: 'Invalid ByT5 API response format',
            details: 'Expected { data: [translation] }',
            received: result
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const translation = result.data[0];
      const duration = Date.now() - startTime;
      const confidence = translation && translation.length > 0 ? 90 : 50;

      console.log(`✅ ByT5 translation completed in ${duration}ms`);
      console.log(`📤 Translation: ${translation?.substring(0, 50)}...`);

      return new Response(
        JSON.stringify({
          translation,
          confidence,
          duration,
          method: 'byt5-expert',
          modelInfo: {
            name: 'ByT5 Expert',
            version: 'zimesongbian/modele_byt5_bariba_expert_api_v03',
            mode: gradioMode
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Error calling ByT5 Space:', error);
      return new Response(
        JSON.stringify({ 
          error: error.message || 'Failed to call ByT5 Space',
          details: error.toString()
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
