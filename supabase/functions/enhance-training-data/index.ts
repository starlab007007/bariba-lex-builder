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
    const { mode = 'generate', count = 10 } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`🚀 Enhancing training data: mode=${mode}, count=${count}`);

    // Get existing dictionary entries for context
    const { data: dictionaryEntries } = await supabaseClient
      .from('dictionary_entries')
      .select('word, definition, example_bariba, example_francais, french_keywords')
      .limit(200);

    // Get existing training phrases for analysis
    const { data: existingPhrases } = await supabaseClient
      .from('training_phrases')
      .select('french_text, bariba_text')
      .eq('is_validated', true)
      .limit(100);

    const dictionaryContext = dictionaryEntries
      ?.map(e => `${e.word}: ${e.definition}`)
      .join('\n') || '';

    const examplesContext = existingPhrases
      ?.slice(0, 10)
      .map(p => `FR: "${p.french_text}"\nBBA: "${p.bariba_text}"`)
      .join('\n\n') || '';

    const generatedPhrases = [];

    if (mode === 'generate') {
      // Generate new training phrases using AI
      const systemPrompt = `You are a linguistic expert in French and Bààtɔ̀nú (Bariba) language.

BARIBA LINGUISTIC RULES:
- Special characters: ɔ, ɛ, ɑ, ɡ, kp, tone marks (á, à, ã)
- Grammar: Subject + Verb + Object structure
- Pronouns: n (je), a (tu/il), u (nous/il), yi (vous), ba (ils)
- Common words: Gusunɔ (Dieu), tem (terre), bururɑm (lumière), nim (eau/esprit)

DICTIONARY SAMPLE:
${dictionaryContext.slice(0, 1000)}

EXISTING PHRASE EXAMPLES:
${examplesContext}

TASK: Generate ${count} NEW diverse training phrase pairs (French-Bariba) that:
1. Use vocabulary from the dictionary
2. Cover different topics: greetings, daily life, nature, family, time, actions
3. Apply correct Bariba grammar and special characters
4. Are culturally appropriate
5. Vary in length (5-20 words)

Return ONLY a JSON array of objects with "french" and "bariba" keys. No explanations.
Example format:
[
  {"french": "Bonjour, comment vas-tu aujourd'hui?", "bariba": "Aagu, foo ka bani wɛru?"},
  {"french": "Le soleil brille dans le ciel", "bariba": "Yɑm yeru u wɑ̃ɑ toruɑ sɔɔ"}
]`;

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
            { role: 'user', content: `Generate ${count} diverse French-Bariba phrase pairs as JSON array.` }
          ],
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI API error:', response.status, errorText);
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      console.log('AI Response:', aiResponse);

      // Parse JSON from response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        generatedPhrases.push(...parsed);
      }

    } else if (mode === 'augment') {
      // Augment existing dictionary entries with phrase variations
      const selectedEntries = dictionaryEntries?.slice(0, Math.min(count, 20)) || [];

      for (const entry of selectedEntries) {
        const systemPrompt = `Create 3 natural French sentences using the Bariba word "${entry.word}" (meaning: ${entry.definition}).

BARIBA WORD: ${entry.word}
DEFINITION: ${entry.definition}
${entry.example_francais?.length > 0 ? `EXAMPLE: ${entry.example_francais[0]}` : ''}

Generate 3 diverse sentences in French that naturally use this concept, varying in:
- Context (greeting, question, statement, description)
- Complexity (simple to moderate)
- Tone (formal, casual, narrative)

Return only JSON array: [{"french": "sentence1"}, {"french": "sentence2"}, {"french": "sentence3"}]`;

        try {
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
                { role: 'user', content: 'Generate the 3 French sentences as JSON.' }
              ],
              temperature: 0.7,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const content = data.choices[0].message.content;
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            
            if (jsonMatch) {
              const sentences = JSON.parse(jsonMatch[0]);
              
              // Now translate each to Bariba
              for (const sent of sentences) {
                const translateResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    model: 'google/gemini-2.5-flash',
                    messages: [
                      { 
                        role: 'system', 
                        content: `Translate to Bariba using proper special characters (ɔ, ɛ, ɑ, ɡ, kp, tone marks). Use word "${entry.word}" if appropriate. Return only the Bariba translation.` 
                      },
                      { role: 'user', content: sent.french }
                    ],
                  }),
                });

                if (translateResp.ok) {
                  const transData = await translateResp.json();
                  const bariba = transData.choices[0].message.content.trim();
                  
                  generatedPhrases.push({
                    french: sent.french,
                    bariba: bariba
                  });
                }
              }
            }
          }
        } catch (err) {
          console.error('Error augmenting entry:', entry.word, err);
        }
      }
    }

    // Insert generated phrases into database
    const phrasesToInsert = generatedPhrases.map(phrase => ({
      french_text: phrase.french,
      bariba_text: phrase.bariba,
      source: mode === 'generate' ? 'ai_generated' : 'ai_augmented',
      is_validated: false, // Require manual validation
      quality_score: 0.75, // Initial score
      metadata: {
        generated_at: new Date().toISOString(),
        model: 'google/gemini-2.5-flash',
        mode: mode
      }
    }));

    const { data: insertedPhrases, error: insertError } = await supabaseClient
      .from('training_phrases')
      .insert(phrasesToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting phrases:', insertError);
      throw insertError;
    }

    console.log(`✅ Successfully generated ${insertedPhrases?.length || 0} new training phrases`);

    return new Response(
      JSON.stringify({
        success: true,
        generated_count: insertedPhrases?.length || 0,
        phrases: insertedPhrases,
        message: `Generated ${insertedPhrases?.length || 0} new training phrases in ${mode} mode`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in enhance-training-data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});