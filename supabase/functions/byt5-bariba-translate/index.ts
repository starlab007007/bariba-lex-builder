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

    // Gradio API endpoint - utiliser /api/predict pour une réponse synchrone
    // Configuration du Space ByT5 Expert
    // IMPORTANT: Vérifiez que l'URL du Space est correcte
    // Format attendu: https://[username]-[space-name].hf.space
    const SPACE_BASE_URL = 'https://zimesongbian-modele-byt5-bariba-expert-api-v03.hf.space';
    const PREDICT_URL = `${SPACE_BASE_URL}/call/predict`;

    console.log(`🤖 Attempting ByT5 translation: ${direction}, mode: ${gradioMode}`);
    console.log(`📍 Space URL: ${SPACE_BASE_URL}`);
    console.log(`📝 Text length: ${text.length} chars`);

    const startTime = Date.now();

    // Étape 1: Initier la prédiction et obtenir l'event_id
    let initResponse;
    try {
      initResponse = await fetch(PREDICT_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [text, direction, gradioMode, advanced]
        }),
      });

      if (!initResponse.ok) {
        const errorText = await initResponse.text();
        console.error(`❌ ByT5 Space init error (${initResponse.status}):`, errorText);
        console.error(`📍 Attempted URL: ${PREDICT_URL}`);
        console.error(`⚠️  Possible causes:`);
        console.error(`   1. Space URL is incorrect (verify on Hugging Face)`);
        console.error(`   2. Space is private and token doesn't have access`);
        console.error(`   3. Space doesn't exist or has been moved`);
        console.error(`   4. Space is sleeping (try again in a few seconds)`);
        
        return new Response(
          JSON.stringify({ 
            error: 'ByT5 Space unavailable',
            details: `HTTP ${initResponse.status}: ${errorText}`,
            status: initResponse.status,
            spaceUrl: SPACE_BASE_URL,
            troubleshooting: 'Verify Space URL at Hugging Face and check token permissions'
          }),
          { status: initResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const initData = await initResponse.json();
      const eventId = initData.event_id;

      if (!eventId) {
        console.error('No event_id received from ByT5 Space');
        return new Response(
          JSON.stringify({ error: 'Invalid response from ByT5 Space - no event_id' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Got event_id: ${eventId}, polling for result...`);

      // Étape 2: Polling pour obtenir le résultat
      const POLL_URL = `https://zimesongbian-modele-byt5-bariba-expert-api-v03.hf.space/call/predict/${eventId}`;
      let attempts = 0;
      const maxPollAttempts = 60; // 60 secondes max

      while (attempts < maxPollAttempts) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1s entre chaque poll

        const pollResponse = await fetch(POLL_URL, {
          headers: {
            'Authorization': `Bearer ${HF_TOKEN}`,
          },
        });

        if (!pollResponse.ok) {
          if (attempts < maxPollAttempts) continue;
          const errorText = await pollResponse.text();
          console.error(`Polling failed after ${attempts} attempts:`, errorText);
          return new Response(
            JSON.stringify({ error: 'Polling timeout', details: errorText }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const pollData = await pollResponse.json();

        // Vérifier si la prédiction est terminée
        if (pollData.event === 'complete' && pollData.data) {
          const translation = pollData.data[0];
          const duration = Date.now() - startTime;
          const confidence = translation.length > 0 ? 90 : 50;

          console.log(`✅ ByT5 translation completed in ${duration}ms (${attempts} polls)`);

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
        }

        // Si erreur dans la prédiction
        if (pollData.event === 'error') {
          console.error('Prediction error:', pollData);
          return new Response(
            JSON.stringify({ error: 'Prediction failed', details: pollData }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Sinon, continuer à poller (event === 'generating' ou 'processing')
      }

      // Timeout après tous les polls
      return new Response(
        JSON.stringify({ error: 'Prediction timeout after 60s' }),
        { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
