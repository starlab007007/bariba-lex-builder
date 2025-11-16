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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify admin access
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch dictionary and training data
    const [
      { data: dictionaryEntries, error: dictError },
      { data: trainingPhrases, error: phrasesError },
    ] = await Promise.all([
      supabaseClient
        .from('dictionary_entries')
        .select('*')
        .order('quality_score', { ascending: false }),
      supabaseClient
        .from('training_phrases')
        .select('*')
        .eq('is_validated', true),
    ]);

    if (dictError) throw dictError;
    if (phrasesError) throw phrasesError;

    console.log(`Training with ${dictionaryEntries?.length || 0} dictionary entries and ${trainingPhrases?.length || 0} phrases`);

    // Use Lovable AI to analyze patterns
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build context for AI analysis
    const dictionaryContext = dictionaryEntries?.slice(0, 100).map(e => ({
      word: e.word,
      definition: e.definition,
      examples: e.example_bariba,
    })) || [];

    const phraseContext = trainingPhrases?.slice(0, 50).map(p => ({
      french: p.french_text,
      bariba: p.bariba_text,
    })) || [];

    const analysisPrompt = `Tu es un expert linguiste spécialisé dans la langue Bààtɔ̀nú (Bariba).

Analyse ce corpus de données et identifie :
1. Les patterns grammaticaux récurrents
2. Les règles de traduction français -> Bààtɔ̀nú
3. Les structures de phrases communes
4. Les règles de formation des mots

Dictionnaire (exemples) :
${JSON.stringify(dictionaryContext, null, 2)}

Phrases d'entraînement (exemples) :
${JSON.stringify(phraseContext, null, 2)}

Fournis une analyse structurée en JSON avec :
- grammar_rules : liste des règles grammaticales identifiées
- translation_patterns : patterns de traduction récurrents
- common_structures : structures de phrases communes
- recommendations : recommandations pour améliorer les traductions`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Tu es un expert en linguistique et analyse de langues.' },
          { role: 'user', content: analysisPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI analysis failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices?.[0]?.message?.content || '';

    // Parse AI response (try to extract JSON, or use raw text)
    let trainingData;
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      trainingData = jsonMatch ? JSON.parse(jsonMatch[0]) : { analysis: analysisText };
    } catch {
      trainingData = { analysis: analysisText };
    }

    // Save training context
    const { data: contextData, error: contextError } = await supabaseClient
      .from('ai_training_context')
      .insert({
        model_version: '1.0.0',
        dictionary_count: dictionaryEntries?.length || 0,
        phrases_count: trainingPhrases?.length || 0,
        training_data: trainingData,
        metrics: {
          analysis_timestamp: new Date().toISOString(),
          data_quality: 'analyzed',
        },
        created_by: user.id,
      })
      .select()
      .single();

    if (contextError) throw contextError;

    // Build translation memory from training phrases
    const memoryEntries = trainingPhrases?.map(p => ({
      source_text: p.french_text.toLowerCase(),
      target_text: p.bariba_text,
      source_language: 'french',
      target_language: 'bariba',
      context: {
        quality_score: p.quality_score,
        from_training: true,
      },
      confidence_score: p.quality_score || 0.8,
      usage_count: 0,
    })) || [];

    if (memoryEntries.length > 0) {
      const { error: memoryError } = await supabaseClient
        .from('translation_memory')
        .insert(memoryEntries);
      
      if (memoryError) {
        console.error('Error saving translation memory:', memoryError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        context: contextData,
        memory_entries: memoryEntries.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in train-translation-model:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});