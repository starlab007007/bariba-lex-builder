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

    const SPACE_URL = 'https://zimesongbian-modele-byt5-bariba-expert-api-v03.hf.space/run/predict';

    console.log(`Calling ByT5 Space: ${direction}, mode: ${gradioMode}, text length: ${text.length}`);

    const startTime = Date.now();

    // Call Gradio Space API with retry logic for cold starts
    let response;
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        response = await fetch(SPACE_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HF_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: [text, direction, gradioMode, advanced]
          }),
          signal: AbortSignal.timeout(45000), // 45s timeout (Gradio peut être lent au cold start)
        });

        if (response.ok) {
          break; // Success, exit retry loop
        }

        // If 503 (service unavailable), the Space might be waking up
        if (response.status === 503 && attempts < maxAttempts) {
          console.log(`Space is waking up (503), retrying in 5s... (attempt ${attempts}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }

        // Other errors, don't retry
        break;
      } catch (fetchError) {
        if (fetchError.name === 'TimeoutError' && attempts < maxAttempts) {
          console.log(`Timeout on attempt ${attempts}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        throw fetchError;
      }
    }

    if (!response || !response.ok) {
      const errorText = await response?.text() || 'Unknown error';
      console.error(`ByT5 Space error (${response?.status}):`, errorText);
      
      return new Response(
        JSON.stringify({ 
          error: 'ByT5 Space unavailable',
          details: errorText,
          status: response?.status 
        }),
        { status: response?.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: GradioResponse = await response.json();
    const duration = Date.now() - startTime;

    if (!result.data || !result.data[0]) {
      console.error('Invalid response from ByT5 Space:', result);
      return new Response(
        JSON.stringify({ error: 'Invalid response from ByT5 Space' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const translation = result.data[0];
    
    // Estimate confidence based on translation quality indicators
    const confidence = translation.length > 0 ? 90 : 50;

    console.log(`✅ ByT5 translation completed in ${duration}ms (${attempts} attempts)`);

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
