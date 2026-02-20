import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Message requis' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('[fitila-ia] Pipeline start, message:', message.substring(0, 50));

    // Step 1: Translate Bariba -> French via byt5-bariba-translate
    console.log('[fitila-ia] Step 1: Translating Bariba -> French...');
    const translateToFrRes = await fetch(`${SUPABASE_URL}/functions/v1/byt5-bariba-translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        text: message,
        sourceLang: 'bariba',
        targetLang: 'french',
        mode: 'quality',
      }),
    });

    if (!translateToFrRes.ok) {
      const errText = await translateToFrRes.text();
      console.error('[fitila-ia] Step 1 failed:', errText);
      throw new Error(`Translation ba->fr failed: ${translateToFrRes.status}`);
    }

    const translateToFrData = await translateToFrRes.json();
    const questionFr = translateToFrData.translatedText || translateToFrData.translation || message;
    console.log('[fitila-ia] Step 1 done, French:', questionFr.substring(0, 80));

    // Step 2: Call AI via Lovable AI Gateway (multi-model fallback)
    console.log('[fitila-ia] Step 2: Calling AI...');
    const modelsToTry = [
      'openai/gpt-5-nano',
    ];

    let responseFr = '';
    let aiSuccess = false;

    for (const model of modelsToTry) {
      try {
        console.log(`[fitila-ia] Trying model: ${model}`);
        const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content: 'Tu es Fitila, un assistant IA chaleureux et engageant. Reponds en francais en MAXIMUM 3 phrases courtes au total. Une seule idee principale, un conseil pratique. Sois direct, concis et encourageant. Pas de listes. Pas plus de 50 mots.',
              },
              { role: 'user', content: questionFr },
            ],
            max_tokens: 120,
          }),
        });

        if (aiRes.status === 429) {
          return new Response(JSON.stringify({ error: 'Trop de requetes, reessayez dans un moment.' }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (aiRes.status === 402) {
          return new Response(JSON.stringify({ error: 'Credits insuffisants.' }), {
            status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!aiRes.ok) {
          const errText = await aiRes.text();
          console.warn(`[fitila-ia] Model ${model} failed (${aiRes.status}): ${errText.substring(0, 100)}`);
          continue;
        }

        const aiData = await aiRes.json();
        responseFr = aiData.choices?.[0]?.message?.content || '';
        if (responseFr) {
          console.log(`[fitila-ia] Step 2 done with ${model}: ${responseFr.substring(0, 80)}`);
          aiSuccess = true;
          break;
        }
      } catch (err) {
        console.warn(`[fitila-ia] Model ${model} error:`, err);
      }
    }

    if (!aiSuccess || !responseFr) {
      throw new Error('Tous les modeles IA sont temporairement indisponibles');
    }

    // Step 3: Translate French -> Bariba via byt5-bariba-translate
    console.log('[fitila-ia] Step 3: Translating French -> Bariba...');
    const translateToBaRes = await fetch(`${SUPABASE_URL}/functions/v1/byt5-bariba-translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        text: responseFr,
        sourceLang: 'french',
        targetLang: 'bariba',
        mode: 'quality',
      }),
    });

    if (!translateToBaRes.ok) {
      const errText = await translateToBaRes.text();
      console.error('[fitila-ia] Step 3 failed:', errText);
      // Fallback: clearly mark that response_ba is NOT available
      return new Response(JSON.stringify({
        response_ba: null,
        response_fr: responseFr,
        question_fr: questionFr,
        fallback: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const translateToBaData = await translateToBaRes.json();
    const responseBa = translateToBaData.translatedText || translateToBaData.translation || responseFr;
    console.log('[fitila-ia] Step 3 done, Bariba response:', responseBa.substring(0, 80));

    return new Response(JSON.stringify({
      response_ba: responseBa,
      response_fr: responseFr,
      question_fr: questionFr,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('[fitila-ia] Error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Erreur inconnue' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
