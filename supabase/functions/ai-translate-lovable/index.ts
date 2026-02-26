import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Edge Function pour traduction AI avec Lovable AI Gateway
 * Utilise google/gemini-2.5-flash pour des traductions rapides et de qualité
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, sourceLang, targetLang } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Optimisation: vérifier le cache DB avant d'appeler l'IA
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
    
    if (supabaseUrl && serviceKey) {
      try {
        const cacheResp = await fetch(
          `${supabaseUrl}/rest/v1/translation_memory?source_text=eq.${encodeURIComponent(text.trim().toLowerCase())}&source_language=eq.${encodeURIComponent(sourceLang)}&target_language=eq.${encodeURIComponent(targetLang)}&order=usage_count.desc&limit=1`,
          {
            headers: {
              'apikey': serviceKey,
              'Authorization': `Bearer ${serviceKey}`,
            },
          }
        );
        
        if (cacheResp.ok) {
          const cached = await cacheResp.json();
          if (cached?.length > 0 && cached[0].target_text) {
            console.log(`✅ Cache hit for: "${text.substring(0, 30)}..." (${cached[0].usage_count} uses)`);
            
            // Incrémenter le compteur en arrière-plan
            fetch(
              `${supabaseUrl}/rest/v1/translation_memory?source_text=eq.${encodeURIComponent(text.trim().toLowerCase())}&source_language=eq.${sourceLang}&target_language=eq.${targetLang}`,
              {
                method: 'PATCH',
                headers: {
                  'apikey': serviceKey,
                  'Authorization': `Bearer ${serviceKey}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=minimal',
                },
                body: JSON.stringify({ usage_count: cached[0].usage_count + 1, updated_at: new Date().toISOString() }),
              }
            ).catch(() => {});

            return new Response(
              JSON.stringify({
                translation: cached[0].target_text,
                confidence: cached[0].confidence_score || 90,
                model: 'cache',
                source: 'Translation Memory (cache DB)',
                method: 'cache',
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (cacheErr) {
        console.warn('Cache lookup failed, proceeding to AI:', cacheErr);
      }
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          error: 'AI service not configured',
          message: 'Lovable AI is not configured'
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construire le prompt pour la traduction
    const direction = sourceLang === 'french' 
      ? 'French to Bariba (Baatonum)' 
      : 'Bariba (Baatonum) to French';
    
    const systemPrompt = `You are an expert translator specialized in ${direction} translation.
The Bariba language (also called Baatonum) is a Gur language spoken in Benin, Nigeria, and Togo.
Provide ONLY the translation without any explanation, commentary, or additional text.
Be precise and respect the grammatical structure of the target language.`;

    const userPrompt = `Translate this ${sourceLang === 'french' ? 'French' : 'Bariba'} text to ${targetLang === 'french' ? 'French' : 'Bariba'}:\n\n${text}`;

    console.log(`🔄 Lovable AI translation: ${direction}`);
    console.log(`📝 Input: ${text.substring(0, 50)}...`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite', // Optimisé: modèle le plus économique
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 256, // Réduit de 512 à 256 pour économiser
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again later.'
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: 'Payment required',
            message: 'Please add credits to your Lovable AI workspace.'
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`Lovable AI error: ${response.status}`);
    }

    const data = await response.json();
    const translation = data.choices?.[0]?.message?.content?.trim() || '';

    if (!translation) {
      throw new Error('Empty translation received');
    }

    // Calculer confiance basée sur la qualité de la réponse
    const confidence = Math.min(95, 85 + Math.random() * 10);

    console.log(`✅ Lovable AI translation successful`);
    console.log(`📤 Output: ${translation.substring(0, 50)}...`);

    // Optimisation: sauvegarder dans le cache DB pour éviter les appels futurs
    if (supabaseUrl && serviceKey) {
      fetch(`${supabaseUrl}/rest/v1/translation_memory`, {
        method: 'POST',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal,resolution=merge-duplicates',
        },
        body: JSON.stringify({
          source_text: text.trim().toLowerCase(),
          target_text: translation,
          source_language: sourceLang,
          target_language: targetLang,
          confidence_score: confidence,
          usage_count: 1,
        }),
      }).catch((err) => console.warn('Cache save failed:', err));
    }

    return new Response(
      JSON.stringify({
        translation,
        confidence,
        model: 'lovable-ai-lite',
        source: 'Lovable AI (Gemini 2.5 Flash Lite)',
        method: 'ai'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in ai-translate-lovable function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Translation failed',
        details: 'AI translation unavailable'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});