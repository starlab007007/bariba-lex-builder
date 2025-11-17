/**
 * Edge Function pour Fine-Tuning d'un modèle LLM personnalisé
 * 
 * Support de:
 * - Gemma-2B (Google, léger, efficace)
 * - NLLB-200 (Meta, spécialisé multilingue)
 * 
 * Utilise Lovable AI pour le fine-tuning
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrainingPair {
  french: string;
  bariba: string;
  category: string;
  source: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { modelType = 'gemma-2b', maxPairs = 5000, includeValidatedFeedback = true } = await req.json();

    console.log(`🚀 Démarrage du fine-tuning: ${modelType}`);
    console.log(`📊 Paramètres: maxPairs=${maxPairs}, feedback=${includeValidatedFeedback}`);

    // 1. Collecter les données d'entraînement
    const trainingData: TrainingPair[] = [];

    // 1.1 Charger les phrases d'entraînement existantes
    const { data: trainingPhrases, error: phrasesError } = await supabaseClient
      .from('training_phrases')
      .select('french_text, bariba_text, metadata, source')
      .eq('is_validated', true)
      .limit(maxPairs);

    if (phrasesError) {
      throw new Error(`Erreur chargement phrases: ${phrasesError.message}`);
    }

    trainingPhrases?.forEach(phrase => {
      trainingData.push({
        french: phrase.french_text,
        bariba: phrase.bariba_text,
        category: phrase.metadata?.category || 'General',
        source: phrase.source || 'training_phrases'
      });
    });

    console.log(`✅ ${trainingData.length} phrases d'entraînement chargées`);

    // 1.2 Ajouter les feedbacks validés si demandé
    if (includeValidatedFeedback) {
      const { data: validatedFeedback, error: feedbackError } = await supabaseClient
        .from('translation_feedback')
        .select(`
          suggested_translation,
          translation_logs!inner(input_text, source_language, target_language)
        `)
        .eq('is_validated', true)
        .eq('used_for_training', false)
        .limit(500);

      if (!feedbackError && validatedFeedback) {
        validatedFeedback.forEach((fb: any) => {
          if (fb.translation_logs && fb.suggested_translation) {
            const isBariba = fb.translation_logs.target_language === 'bariba';
            trainingData.push({
              french: isBariba ? fb.translation_logs.input_text : fb.suggested_translation,
              bariba: isBariba ? fb.suggested_translation : fb.translation_logs.input_text,
              category: 'User Feedback',
              source: 'validated_feedback'
            });
          }
        });
        console.log(`✅ +${validatedFeedback.length} feedbacks utilisateur intégrés`);
      }
    }

    // 1.3 Ajouter les exemples du dictionnaire
    const { data: examples, error: examplesError } = await supabaseClient
      .from('dictionary_entries')
      .select('example_francais, example_bariba, part_of_speech')
      .not('example_francais', 'is', null)
      .not('example_bariba', 'is', null)
      .limit(Math.max(0, maxPairs - trainingData.length));

    if (!examplesError && examples) {
      examples.forEach(entry => {
        const frExamples = entry.example_francais || [];
        const bbExamples = entry.example_bariba || [];
        const minLength = Math.min(frExamples.length, bbExamples.length);

        for (let i = 0; i < minLength; i++) {
          if (trainingData.length >= maxPairs) break;
          trainingData.push({
            french: frExamples[i],
            bariba: bbExamples[i],
            category: entry.part_of_speech || 'Dictionary',
            source: 'dictionary'
          });
        }
      });
      console.log(`✅ Total: ${trainingData.length} paires d'entraînement`);
    }

    // 2. Préparer les données au format requis pour le fine-tuning
    const formattedData = trainingData.slice(0, maxPairs).map(pair => ({
      messages: [
        { role: "system", content: "Tu es un traducteur expert Français-Baatonum. Tu traduis avec précision en respectant la grammaire et les expressions idiomatiques." },
        { role: "user", content: `Traduis en baatonum: ${pair.french}` },
        { role: "assistant", content: pair.bariba }
      ],
      metadata: {
        category: pair.category,
        source: pair.source
      }
    }));

    // 3. Créer un contexte d'entraînement dans la DB
    const { data: trainingContext, error: contextError } = await supabaseClient
      .from('ai_training_context')
      .insert([{
        model_version: `${modelType}-${Date.now()}`,
        training_data: formattedData,
        dictionary_count: trainingData.filter(p => p.source === 'dictionary').length,
        phrases_count: trainingData.filter(p => p.source === 'training_phrases').length,
        metrics: {
          totalPairs: formattedData.length,
          categories: Array.from(new Set(trainingData.map(p => p.category))),
          sources: Array.from(new Set(trainingData.map(p => p.source)))
        }
      }])
      .select()
      .single();

    if (contextError) {
      throw new Error(`Erreur sauvegarde contexte: ${contextError.message}`);
    }

    console.log(`✅ Contexte d'entraînement sauvegardé: ${trainingContext.id}`);

    // 4. Simuler le fine-tuning (dans un vrai scénario, on appellerait l'API de fine-tuning)
    // Pour l'instant, on stocke juste les données et on retourne un résumé
    
    // Note: Le vrai fine-tuning nécessiterait:
    // - Pour Gemma-2B: Utiliser Hugging Face Training API ou Google Vertex AI
    // - Pour NLLB-200: Utiliser Meta's NLLB fine-tuning pipeline
    // - Coût estimé: $100-500 pour GPU + $20-100/mois hébergement

    return new Response(
      JSON.stringify({
        success: true,
        trainingContextId: trainingContext.id,
        modelVersion: trainingContext.model_version,
        summary: {
          totalPairs: formattedData.length,
          dictionaryPairs: trainingData.filter(p => p.source === 'dictionary').length,
          phrasesPairs: trainingData.filter(p => p.source === 'training_phrases').length,
          feedbackPairs: trainingData.filter(p => p.source === 'validated_feedback').length,
          categories: Array.from(new Set(trainingData.map(p => p.category))),
          modelType
        },
        message: `Données préparées pour fine-tuning ${modelType}. ${formattedData.length} paires formatées.`,
        nextSteps: [
          'Les données sont prêtes pour le fine-tuning',
          'Pour lancer le vrai fine-tuning, configurez votre API Hugging Face ou Google Cloud',
          `Budget estimé: $100-500 (entraînement) + $20-100/mois (hébergement)`
        ]
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('❌ Erreur fine-tuning:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Erreur lors de la préparation du fine-tuning'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
