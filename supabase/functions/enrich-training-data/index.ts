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
    const { targetWords = 30000, targetPhrases = 40000 } = await req.json();
    
    console.log(`🎯 Objectif: ${targetWords} mots et ${targetPhrases} phrases`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer les statistiques actuelles
    const { count: wordCount } = await supabase
      .from('dictionary_entries')
      .select('*', { count: 'exact', head: true });

    const { count: phraseCount } = await supabase
      .from('training_phrases')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 État actuel: ${wordCount} mots, ${phraseCount} phrases`);

    const wordsToGenerate = Math.max(0, targetWords - (wordCount || 0));
    const phrasesToGenerate = Math.max(0, targetPhrases - (phraseCount || 0));

    if (wordsToGenerate === 0 && phrasesToGenerate === 0) {
      return new Response(JSON.stringify({ 
        message: 'Objectifs déjà atteints',
        current: { words: wordCount, phrases: phraseCount }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let generatedWords = 0;
    let generatedPhrases = 0;

    // 1. Enrichissement des mots existants avec variations
    if (wordsToGenerate > 0) {
      console.log(`🔄 Génération de ${wordsToGenerate} mots supplémentaires...`);
      
      // Récupérer un échantillon de mots existants
      const { data: existingWords } = await supabase
        .from('dictionary_entries')
        .select('word, definition, part_of_speech, nominal_class, verb_root')
        .limit(100);

      if (existingWords && existingWords.length > 0) {
        // Générer des variations par lot
        const batchSize = Math.min(50, Math.ceil(wordsToGenerate / 10));
        
        for (let i = 0; i < Math.min(10, Math.ceil(wordsToGenerate / batchSize)); i++) {
          const sampleWords = existingWords.slice(i * 10, (i + 1) * 10);
          
          const prompt = `En tant qu'expert linguiste Baatɔnum, génère ${batchSize} nouvelles entrées de dictionnaire basées sur ces exemples. Crée des variations naturelles, des dérivés, ou des mots composés.

Exemples existants:
${sampleWords.map(w => `- ${w.word} (${w.part_of_speech || 'n'}): ${w.definition}`).join('\n')}

INSTRUCTIONS STRICTES:
1. Génère EXACTEMENT ${batchSize} nouvelles entrées
2. Utilise des formes dérivées, composées ou apparentées aux exemples
3. Assure-toi que chaque mot est différent et unique
4. Respecte les règles grammaticales du Baatɔnum
5. Format JSON strict requis

Réponds UNIQUEMENT avec un tableau JSON (sans texte avant/après):
[
  {
    "word": "mot_baatonu",
    "definition": "définition en français",
    "part_of_speech": "n|v.tr|adj|adv",
    "nominal_class": "b|g|m|n|s|t|w|y (si nom)",
    "verb_root": "racine (si verbe)"
  }
]`;

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
                  { role: 'system', content: 'Tu es un expert en linguistique Baatɔnum. Tu réponds UNIQUEMENT en JSON valide.' },
                  { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 2000
              }),
            });

            if (!response.ok) {
              console.error(`❌ Erreur AI (batch ${i + 1}):`, response.status);
              continue;
            }

            const data = await response.json();
            const aiResponse = data.choices?.[0]?.message?.content;
            
            if (!aiResponse) continue;

            // Extraire et parser le JSON
            let newWords;
            try {
              newWords = JSON.parse(aiResponse);
            } catch {
              const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
              if (jsonMatch) {
                newWords = JSON.parse(jsonMatch[0]);
              } else {
                continue;
              }
            }

            // Insérer les nouveaux mots
            if (Array.isArray(newWords) && newWords.length > 0) {
              const { error } = await supabase
                .from('dictionary_entries')
                .insert(newWords.map(w => ({
                  ...w,
                  is_verified: false,
                  quality_score: 0.7,
                  created_by: null
                })));

              if (!error) {
                generatedWords += newWords.length;
                console.log(`✅ +${newWords.length} mots générés (batch ${i + 1})`);
              }
            }
          } catch (error) {
            console.error(`❌ Erreur génération mots (batch ${i + 1}):`, error);
          }

          // Pause pour éviter le rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    // 2. Génération de phrases d'entraînement
    if (phrasesToGenerate > 0) {
      console.log(`🔄 Génération de ${phrasesToGenerate} phrases supplémentaires...`);
      
      // Récupérer des mots avec exemples
      const { data: wordsWithExamples } = await supabase
        .from('dictionary_entries')
        .select('word, definition, example_bariba, example_francais')
        .not('example_bariba', 'is', null)
        .limit(50);

      if (wordsWithExamples && wordsWithExamples.length > 0) {
        const batchSize = Math.min(100, Math.ceil(phrasesToGenerate / 10));
        
        for (let i = 0; i < Math.min(10, Math.ceil(phrasesToGenerate / batchSize)); i++) {
          const sampleWords = wordsWithExamples.slice(i * 5, (i + 1) * 5);
          
          const prompt = `En tant qu'expert Baatɔnum, génère ${batchSize} paires de phrases (français ↔ Baatɔnum) pour l'entraînement d'un traducteur.

Mots de référence:
${sampleWords.map(w => `- ${w.word}: ${w.definition}`).join('\n')}

INSTRUCTIONS:
1. Génère ${batchSize} phrases naturelles et variées
2. Utilise des structures grammaticales diverses
3. Couvre différents contextes (quotidien, formel, informel)
4. Assure la cohérence et la correction grammaticale
5. Format JSON strict

Réponds UNIQUEMENT avec un tableau JSON:
[
  {
    "french_text": "phrase en français",
    "bariba_text": "traduction en baatɔnum"
  }
]`;

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
                  { role: 'system', content: 'Tu es un expert en linguistique Baatɔnum. Tu réponds UNIQUEMENT en JSON valide.' },
                  { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 3000
              }),
            });

            if (!response.ok) {
              console.error(`❌ Erreur AI phrases (batch ${i + 1}):`, response.status);
              continue;
            }

            const data = await response.json();
            const aiResponse = data.choices?.[0]?.message?.content;
            
            if (!aiResponse) continue;

            // Extraire et parser le JSON
            let newPhrases;
            try {
              newPhrases = JSON.parse(aiResponse);
            } catch {
              const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
              if (jsonMatch) {
                newPhrases = JSON.parse(jsonMatch[0]);
              } else {
                continue;
              }
            }

            // Insérer les nouvelles phrases
            if (Array.isArray(newPhrases) && newPhrases.length > 0) {
              const { error } = await supabase
                .from('training_phrases')
                .insert(newPhrases.map(p => ({
                  ...p,
                  source: 'ai_generated',
                  is_validated: false,
                  quality_score: 0.75,
                  created_by: null
                })));

              if (!error) {
                generatedPhrases += newPhrases.length;
                console.log(`✅ +${newPhrases.length} phrases générées (batch ${i + 1})`);
              }
            }
          } catch (error) {
            console.error(`❌ Erreur génération phrases (batch ${i + 1}):`, error);
          }

          // Pause pour éviter le rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    // Statistiques finales
    const { count: finalWordCount } = await supabase
      .from('dictionary_entries')
      .select('*', { count: 'exact', head: true });

    const { count: finalPhraseCount } = await supabase
      .from('training_phrases')
      .select('*', { count: 'exact', head: true });

    return new Response(JSON.stringify({
      success: true,
      initial: { words: wordCount, phrases: phraseCount },
      generated: { words: generatedWords, phrases: generatedPhrases },
      final: { words: finalWordCount, phrases: finalPhraseCount },
      targets: { words: targetWords, phrases: targetPhrases }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Erreur enrichissement:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Erreur lors de l\'enrichissement automatique'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
