import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Edge Function pour préparer et lancer le fine-tuning de NLLB-200
 * sur les données françaises-bariba
 * 
 * Ce fonction:
 * 1. Collecte toutes les données d'entraînement (220k+ paires)
 * 2. Les formate au format requis pour NLLB-200 fine-tuning
 * 3. Les sauvegarde dans ai_training_context
 * 4. Retourne les instructions pour l'entraînement avec Hugging Face
 */

interface TrainingPair {
  source: string;
  target: string;
  source_lang: string;
  target_lang: string;
  quality_score?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { maxPairs = 50000 } = await req.json();

    console.log("🚀 Collecte des données pour fine-tuning NLLB-200...");

    // 1. Collecter les phrases d'entraînement validées
    const { data: trainingPhrases, error: phrasesError } = await supabase
      .from('training_phrases')
      .select('french_text, bariba_text, quality_score, is_validated')
      .eq('is_validated', true)
      .order('quality_score', { ascending: false, nullsLast: true })
      .limit(maxPairs);

    if (phrasesError) throw phrasesError;

    // 2. Collecter les entrées du dictionnaire avec exemples
    const { data: dictionaryEntries, error: dictError } = await supabase
      .from('dictionary_entries')
      .select('example_francais, example_bariba, is_verified')
      .eq('is_verified', true)
      .not('example_francais', 'is', null)
      .not('example_bariba', 'is', null)
      .limit(10000);

    if (dictError) throw dictError;

    // 3. Collecter les feedbacks utilisateurs validés
    const { data: feedbacks, error: feedbackError } = await supabase
      .from('translation_feedback')
      .select(`
        suggested_translation,
        translation_logs!inner(
          input_text,
          output_text,
          source_language,
          target_language
        )
      `)
      .eq('is_validated', true)
      .limit(5000);

    if (feedbackError) throw feedbackError;

    // 4. Formater toutes les données au format NLLB-200
    const trainingData: TrainingPair[] = [];

    // Ajouter les phrases d'entraînement
    if (trainingPhrases) {
      for (const phrase of trainingPhrases) {
        trainingData.push({
          source: phrase.french_text,
          target: phrase.bariba_text,
          source_lang: 'fra_Latn',
          target_lang: 'bam_Latn', // Code NLLB pour Bambara (similaire au Bariba)
          quality_score: phrase.quality_score || 1.0
        });
        // Ajouter aussi la direction inverse
        trainingData.push({
          source: phrase.bariba_text,
          target: phrase.french_text,
          source_lang: 'bam_Latn',
          target_lang: 'fra_Latn',
          quality_score: phrase.quality_score || 1.0
        });
      }
    }

    // Ajouter les exemples du dictionnaire
    if (dictionaryEntries) {
      for (const entry of dictionaryEntries) {
        const frenchExamples = entry.example_francais || [];
        const baribaExamples = entry.example_bariba || [];
        
        const minLength = Math.min(frenchExamples.length, baribaExamples.length);
        for (let i = 0; i < minLength; i++) {
          if (frenchExamples[i] && baribaExamples[i]) {
            trainingData.push({
              source: frenchExamples[i],
              target: baribaExamples[i],
              source_lang: 'fra_Latn',
              target_lang: 'bam_Latn',
              quality_score: 0.9
            });
            trainingData.push({
              source: baribaExamples[i],
              target: frenchExamples[i],
              source_lang: 'bam_Latn',
              target_lang: 'fra_Latn',
              quality_score: 0.9
            });
          }
        }
      }
    }

    // Ajouter les feedbacks validés
    if (feedbacks) {
      for (const fb of feedbacks) {
        const log = (fb as any).translation_logs;
        if (fb.suggested_translation && log) {
          trainingData.push({
            source: log.input_text,
            target: fb.suggested_translation,
            source_lang: log.source_language === 'french' ? 'fra_Latn' : 'bam_Latn',
            target_lang: log.target_language === 'french' ? 'fra_Latn' : 'bam_Latn',
            quality_score: 1.0
          });
        }
      }
    }

    console.log(`✅ Collecté ${trainingData.length} paires d'entraînement`);

    // 5. Formater au format JSONL pour Hugging Face
    const jsonlData = trainingData
      .map(pair => JSON.stringify({
        translation: {
          [pair.source_lang]: pair.source,
          [pair.target_lang]: pair.target
        }
      }))
      .join('\n');

    // 6. Sauvegarder dans ai_training_context
    const modelVersion = `nllb-200-finetuned-${Date.now()}`;
    
    const { data: contextData, error: contextError } = await supabase
      .from('ai_training_context')
      .insert([{
        model_version: modelVersion,
        training_data: {
          format: 'nllb-jsonl',
          pairs: trainingData.slice(0, 1000), // Sauvegarder un échantillon
          total_pairs: trainingData.length,
          jsonl_preview: jsonlData.split('\n').slice(0, 10).join('\n')
        },
        dictionary_count: dictionaryEntries?.length || 0,
        phrases_count: trainingPhrases?.length || 0,
        metrics: {
          total_training_pairs: trainingData.length,
          french_to_bariba: trainingData.filter(p => p.source_lang === 'fra_Latn').length,
          bariba_to_french: trainingData.filter(p => p.source_lang === 'bam_Latn').length,
          avg_quality_score: trainingData.reduce((sum, p) => sum + (p.quality_score || 0), 0) / trainingData.length
        }
      }])
      .select()
      .single();

    if (contextError) throw contextError;

    // 7. Générer les instructions pour le fine-tuning
    const instructions = {
      model: 'facebook/nllb-200-distilled-600M',
      training_data_format: 'jsonl',
      training_steps: Math.floor(trainingData.length / 8), // batch_size = 8
      learning_rate: 5e-5,
      batch_size: 8,
      num_epochs: 5,
      warmup_steps: 500,
      save_steps: 1000,
      eval_steps: 500,
      max_length: 256,
      tokenizer: 'facebook/nllb-200-distilled-600M',
      source_language: 'fra_Latn',
      target_language: 'bam_Latn',
      gradient_accumulation_steps: 4,
      fp16: true,
      dataloader_num_workers: 4,
      
      // Script Python pour Hugging Face
      python_script: `
# Installation
pip install transformers datasets torch accelerate sentencepiece

# Script d'entraînement
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, Seq2SeqTrainingArguments, Seq2SeqTrainer
from datasets import load_dataset

# Charger le modèle et tokenizer
model_name = "facebook/nllb-200-distilled-600M"
tokenizer = AutoTokenizer.from_pretrained(model_name, src_lang="fra_Latn", tgt_lang="bam_Latn")
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

# Charger les données (JSONL)
dataset = load_dataset("json", data_files={"train": "training_data.jsonl"})

# Preprocessing
def preprocess_function(examples):
    inputs = [ex["fra_Latn"] for ex in examples["translation"]]
    targets = [ex["bam_Latn"] for ex in examples["translation"]]
    model_inputs = tokenizer(inputs, max_length=256, truncation=True, padding="max_length")
    labels = tokenizer(targets, max_length=256, truncation=True, padding="max_length")
    model_inputs["labels"] = labels["input_ids"]
    return model_inputs

tokenized_dataset = dataset.map(preprocess_function, batched=True)

# Configuration de l'entraînement
training_args = Seq2SeqTrainingArguments(
    output_dir="./nllb-bariba-french",
    num_train_epochs=5,
    per_device_train_batch_size=8,
    gradient_accumulation_steps=4,
    learning_rate=5e-5,
    warmup_steps=500,
    save_steps=1000,
    eval_steps=500,
    fp16=True,
    predict_with_generate=True,
    generation_max_length=256,
)

# Entraîner
trainer = Seq2SeqTrainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_dataset["train"],
    tokenizer=tokenizer,
)

trainer.train()

# Sauvegarder le modèle fine-tuné
model.save_pretrained("./nllb-bariba-french-finetuned")
tokenizer.save_pretrained("./nllb-bariba-french-finetuned")
`
    };

    return new Response(
      JSON.stringify({
        success: true,
        context_id: contextData.id,
        model_version: modelVersion,
        statistics: {
          total_pairs: trainingData.length,
          french_to_bariba: trainingData.filter(p => p.source_lang === 'fra_Latn').length,
          bariba_to_french: trainingData.filter(p => p.source_lang === 'bam_Latn').length,
          sources: {
            training_phrases: trainingPhrases?.length || 0,
            dictionary_examples: dictionaryEntries?.length || 0,
            user_feedback: feedbacks?.length || 0
          }
        },
        instructions,
        next_steps: [
          "1. Télécharger les données d'entraînement depuis ai_training_context",
          "2. Configurer un environnement Hugging Face (GPU recommandé)",
          "3. Exécuter le script Python fourni",
          "4. Upload le modèle fine-tuné vers Hugging Face Hub ou stockage privé",
          "5. Intégrer le modèle dans HybridTranslationService"
        ]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("❌ Erreur:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
