import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting dictionary enrichment process...');

    // 1. Récupérer toutes les entrées du dictionnaire
    const { data: entries, error: entriesError } = await supabase
      .from('dictionary_entries')
      .select('*');

    if (entriesError) throw entriesError;

    console.log(`Analyzing ${entries.length} dictionary entries...`);

    // 2. Récupérer les données d'enrichissement
    const [idiomsRes, phrasesRes, feedbackRes] = await Promise.all([
      supabase.from('idiomatic_expressions').select('*').eq('is_verified', true),
      supabase.from('training_phrases').select('*').eq('is_validated', true),
      supabase.from('translation_feedback')
        .select('*')
        .eq('is_validated', true)
        .not('suggested_translation', 'is', null)
    ]);

    const idioms = idiomsRes.data || [];
    const phrases = phrasesRes.data || [];
    const feedback = feedbackRes.data || [];

    console.log(`Data sources: ${idioms.length} idioms, ${phrases.length} phrases, ${feedback.length} feedback`);

    const enrichments: any[] = [];
    let processedCount = 0;

    // 3. Analyser chaque entrée et trouver des enrichissements possibles
    for (const entry of entries) {
      const entryWord = entry.word.toLowerCase();
      const entryDefinition = entry.definition.toLowerCase();

      // A. Vérifier les idiomes correspondants
      for (const idiom of idioms) {
        const baribaExpr = idiom.bariba_expression.toLowerCase();
        const frenchExpr = idiom.french_expression.toLowerCase();

        // Si le mot fait partie d'une expression idiomatique
        if (baribaExpr.includes(entryWord) || entryWord.includes(baribaExpr)) {
          const hasExample = entry.example_bariba?.includes(idiom.bariba_expression);
          
          if (!hasExample) {
            enrichments.push({
              entry_id: entry.id,
              enrichment_type: 'idiom_match',
              field_name: 'examples',
              suggested_value: JSON.stringify({
                bariba: idiom.bariba_expression,
                french: idiom.french_expression
              }),
              confidence_score: 0.95,
              source_data: { idiom_id: idiom.id, category: idiom.category }
            });
          }
        }

        // Si la définition mentionne l'expression française
        if (entryDefinition.includes(frenchExpr)) {
          const hasNote = entry.grammatical_notes?.toLowerCase().includes('idiomatique');
          
          if (!hasNote) {
            enrichments.push({
              entry_id: entry.id,
              enrichment_type: 'idiom_match',
              field_name: 'grammatical_notes',
              suggested_value: `Expression idiomatique : "${idiom.french_expression}"`,
              confidence_score: 0.90,
              source_data: { idiom_id: idiom.id }
            });
          }
        }
      }

      // B. Vérifier les phrases d'entraînement correspondantes
      for (const phrase of phrases) {
        const baribaText = phrase.bariba_text.toLowerCase();
        const frenchText = phrase.french_text.toLowerCase();

        // Si le mot apparaît dans une phrase validée
        if (baribaText.includes(entryWord)) {
          const hasExample = entry.example_bariba?.some((ex: string) => 
            ex.toLowerCase() === baribaText
          );

          if (!hasExample && entry.example_bariba && entry.example_bariba.length < 3) {
            enrichments.push({
              entry_id: entry.id,
              enrichment_type: 'training_phrase',
              field_name: 'examples',
              suggested_value: JSON.stringify({
                bariba: phrase.bariba_text,
                french: phrase.french_text
              }),
              confidence_score: 0.85,
              source_data: { phrase_id: phrase.id }
            });
          }
        }
      }

      // C. Vérifier les corrections du feedback de traduction
      for (const fb of feedback) {
        const inputText = fb.suggested_translation?.toLowerCase() || '';
        
        if (inputText.includes(entryWord) && fb.notes) {
          // Ajouter comme note de contexte d'usage
          enrichments.push({
            entry_id: entry.id,
            enrichment_type: 'translation_feedback',
            field_name: 'usage_context',
            suggested_value: fb.notes,
            confidence_score: 0.75,
            source_data: { feedback_id: fb.id }
          });
        }
      }

      processedCount++;
      if (processedCount % 100 === 0) {
        console.log(`Processed ${processedCount}/${entries.length} entries...`);
      }
    }

    console.log(`Found ${enrichments.length} potential enrichments`);

    // 4. Insérer les enrichissements dans la base de données
    if (enrichments.length > 0) {
      // Supprimer les anciens enrichissements non appliqués
      await supabase
        .from('dictionary_enrichments')
        .delete()
        .eq('applied', false);

      // Insérer les nouveaux enrichissements par lots
      const batchSize = 100;
      for (let i = 0; i < enrichments.length; i += batchSize) {
        const batch = enrichments.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('dictionary_enrichments')
          .insert(batch);

        if (insertError) {
          console.error('Error inserting batch:', insertError);
        }
      }

      console.log('Successfully inserted enrichments');
    }

    // 5. Générer des statistiques
    const stats = {
      total_entries: entries.length,
      total_enrichments: enrichments.length,
      by_type: {
        idiom_match: enrichments.filter(e => e.enrichment_type === 'idiom_match').length,
        training_phrase: enrichments.filter(e => e.enrichment_type === 'training_phrase').length,
        translation_feedback: enrichments.filter(e => e.enrichment_type === 'translation_feedback').length,
      },
      by_field: {
        examples: enrichments.filter(e => e.field_name === 'examples').length,
        grammatical_notes: enrichments.filter(e => e.field_name === 'grammatical_notes').length,
        usage_context: enrichments.filter(e => e.field_name === 'usage_context').length,
      },
      avg_confidence: enrichments.length > 0 
        ? enrichments.reduce((sum, e) => sum + (e.confidence_score || 0), 0) / enrichments.length 
        : 0,
    };

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Dictionary enrichment completed',
      stats,
      enrichments_count: enrichments.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in enrich-dictionary:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Une erreur est survenue lors de l\'enrichissement du dictionnaire' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
