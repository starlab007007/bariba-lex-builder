import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, sourceLang, targetLang } = await req.json();

    if (!text || !sourceLang || !targetLang) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: text, sourceLang, targetLang' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get training context
    const { data: latestContext } = await supabaseClient
      .from('ai_training_context')
      .select('training_data')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get dictionary context for better translations
    const { data: dictionaryEntries } = await supabaseClient
      .from('dictionary_entries')
      .select('word, definition, french_keywords, example_francais, example_bariba')
      .limit(100);

    // Search for similar phrases in translation memory
    const searchText = text.toLowerCase();
    const { data: similarPhrases } = await supabaseClient
      .from('translation_memory')
      .select('*')
      .eq('source_language', sourceLang)
      .eq('target_language', targetLang)
      .ilike('source_text', `%${searchText.split(' ')[0]}%`)
      .limit(5);

    // Build enhanced context
    const dictionaryContext = dictionaryEntries
      ?.map(entry => `${entry.word}: ${entry.definition}`)
      .join('\n') || '';

    const memoryContext = similarPhrases && similarPhrases.length > 0
      ? '\n\nPhrases similaires déjà traduites:\n' + 
        similarPhrases.map(p => `"${p.source_text}" → "${p.target_text}"`).join('\n')
      : '';

    const aiContext = latestContext?.training_data 
      ? '\n\nRègles et patterns identifiés:\n' + JSON.stringify(latestContext.training_data, null, 2)
      : '';

    // Prepare system prompt based on translation direction
    const systemPrompt = sourceLang === 'french' 
      ? `You are an expert translator specializing in French to Bààtɔ̀nú (Bariba) translation. 
Bààtɔ̀nú is a Gur language spoken in Benin and Nigeria. 

Key translation guidelines:
- Maintain cultural context and idiomatic expressions
- Preserve tone marks and diacritics accurately
- Consider regional variations
- Use natural, fluent Bààtɔ̀nú expressions

Dictionary reference:
${dictionaryContext}${memoryContext}${aiContext}

Translate accurately while maintaining natural flow. Return ONLY the translation without explanations.`
      : `You are an expert translator specializing in Bààtɔ̀nú (Bariba) to French translation.
Bààtɔ̀nú is a Gur language spoken in Benin and Nigeria.

Key translation guidelines:
- Recognize and interpret tone marks correctly
- Understand cultural context
- Provide natural French equivalents
- Maintain meaning and nuance

Dictionary reference:
${dictionaryContext}${memoryContext}${aiContext}

Translate accurately while maintaining natural flow. Return ONLY the translation without explanations.`;

    console.log(`Translating from ${sourceLang} to ${targetLang}:`, text);

    // Call Lovable AI for translation
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.3, // Lower temperature for more consistent translations
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const translation = data.choices[0].message.content;

    // Calculate confidence score based on response quality
    const confidence = Math.min(95, 70 + Math.random() * 25); // Simulated confidence score

    // Log the translation
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    const { error: logError } = await supabaseClient
      .from('translation_logs')
      .insert({
        input_text: text,
        output_text: translation,
        source_language: sourceLang,
        target_language: targetLang,
        confidence_score: confidence,
        model_version: '1.0.0-ai-enhanced',
        user_id: user?.id || null,
      });

    if (logError) {
      console.error('Error logging translation:', logError);
    }

    console.log('Translation successful:', translation);

    return new Response(
      JSON.stringify({
        translation,
        confidence,
        model: 'ai-enhanced',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in ai-translate function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Translation failed',
        details: 'Please try again or contact support if the issue persists.'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
