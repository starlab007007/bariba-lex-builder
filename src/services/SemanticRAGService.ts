/**
 * Service RAG (Retrieval Augmented Generation) Sémantique
 * 
 * Remplace le "fine-tuned model" mock par un vrai système intelligent:
 * - Utilise des embeddings pour trouver les 5 exemples les plus similaires
 * - Passe ces exemples comme contexte à Lovable AI
 * - Génère des traductions naturelles et contextuelles
 */

import { pipeline } from "@huggingface/transformers";
import type { DictionaryEntry } from "@/data/fullDictionaryData";
import type { BiblicalPhrase, DictionaryExample } from "@/data/enhancedDictionaryLoader";
import { supabase } from "@/integrations/supabase/client";

export interface RAGExample {
  sourceLang: string;
  targetLang: string;
  sourceText: string;
  targetText: string;
  similarity: number;
  source: 'dictionary' | 'corpus' | 'feedback';
}

export class SemanticRAGService {
  private embedder: any = null;
  private exampleEmbeddings: Map<string, Float32Array> = new Map();
  private examples: Array<{ source: string; target: string; lang: string }> = [];
  private isInitialized = false;

  async initialize(
    entries: DictionaryEntry[],
    phrases: BiblicalPhrase[],
    dictionaryExamples: DictionaryExample[]
  ): Promise<void> {
    if (this.isInitialized) return;

    console.log("🧠 Initialisation du RAG sémantique avec embeddings...");
    const startTime = Date.now();

    try {
      // Charger le modèle d'embeddings (léger et rapide)
      this.embedder = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2",
        { device: "webgpu" }
      );

      // Construire la base d'exemples
      await this.buildExampleDatabase(entries, phrases, dictionaryExamples);

      // Générer les embeddings pour tous les exemples
      await this.generateEmbeddings();

      this.isInitialized = true;
      const duration = Date.now() - startTime;
      console.log(`✅ RAG initialisé avec ${this.examples.length} exemples en ${duration}ms`);
    } catch (error) {
      console.error("❌ Erreur lors de l'initialisation du RAG:", error);
      console.warn("⚠️ Le système fonctionnera sans RAG sémantique");
    }
  }

  private async buildExampleDatabase(
    entries: DictionaryEntry[],
    phrases: BiblicalPhrase[],
    dictionaryExamples: DictionaryExample[]
  ): Promise<void> {
    // 1. Ajouter les exemples du dictionnaire
    for (const example of dictionaryExamples) {
      this.examples.push({
        source: example.french,
        target: example.bariba,
        lang: 'fr-bba'
      });
    }

    // 2. Ajouter les phrases bibliques (limiter à 5000 plus pertinentes)
    const sortedPhrases = phrases
      .filter(p => p.french.length > 10 && p.bariba.length > 10)
      .sort((a, b) => a.french.length - b.french.length)
      .slice(0, 5000);

    for (const phrase of sortedPhrases) {
      this.examples.push({
        source: phrase.french,
        target: phrase.bariba,
        lang: 'fr-bba'
      });
      this.examples.push({
        source: phrase.bariba,
        target: phrase.french,
        lang: 'bba-fr'
      });
    }

    // 3. Charger les feedbacks validés depuis Supabase
    try {
      const { data: feedbacks } = await supabase
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
        .limit(1000);

      if (feedbacks) {
        for (const fb of feedbacks) {
          const log = (fb as any).translation_logs;
          if (fb.suggested_translation && log) {
            this.examples.push({
              source: log.input_text,
              target: fb.suggested_translation,
              lang: `${log.source_language}-${log.target_language}`
            });
          }
        }
      }
    } catch (error) {
      console.warn("⚠️ Impossible de charger les feedbacks:", error);
    }

    console.log(`📚 Base d'exemples RAG: ${this.examples.length} paires`);
  }

  private async generateEmbeddings(): Promise<void> {
    if (!this.embedder) return;

    console.log("🔢 Génération des embeddings...");
    const batchSize = 32;

    for (let i = 0; i < this.examples.length; i += batchSize) {
      const batch = this.examples.slice(i, i + batchSize);
      const texts = batch.map(ex => ex.source);

      try {
        const output = await this.embedder(texts, { pooling: "mean", normalize: true });
        const embeddings = output.tolist();

        for (let j = 0; j < batch.length; j++) {
          const exampleIndex = i + j;
          this.exampleEmbeddings.set(
            `example_${exampleIndex}`,
            new Float32Array(embeddings[j])
          );
        }
      } catch (error) {
        console.warn(`⚠️ Erreur génération embeddings batch ${i}:`, error);
      }
    }

    console.log(`✅ ${this.exampleEmbeddings.size} embeddings générés`);
  }

  /**
   * Trouve les N exemples les plus similaires sémantiquement
   */
  async findSimilarExamples(
    text: string,
    sourceLang: 'french' | 'bariba',
    targetLang: 'french' | 'bariba',
    topK: number = 5
  ): Promise<RAGExample[]> {
    if (!this.embedder || !this.isInitialized) {
      return [];
    }

    try {
      // Générer l'embedding de la requête
      const output = await this.embedder(text, { pooling: "mean", normalize: true });
      const queryEmbedding = new Float32Array(output.tolist()[0]);

      // Calculer la similarité cosinus avec tous les exemples
      const similarities: Array<{ index: number; similarity: number }> = [];
      const langKey = `${sourceLang === 'french' ? 'fr' : 'bba'}-${targetLang === 'french' ? 'fr' : 'bba'}`;

      this.examples.forEach((example, index) => {
        if (example.lang !== langKey) return;

        const exampleEmbedding = this.exampleEmbeddings.get(`example_${index}`);
        if (!exampleEmbedding) return;

        const similarity = this.cosineSimilarity(queryEmbedding, exampleEmbedding);
        similarities.push({ index, similarity });
      });

      // Trier par similarité décroissante et prendre les top K
      similarities.sort((a, b) => b.similarity - a.similarity);
      const topExamples = similarities.slice(0, topK);

      return topExamples.map(({ index, similarity }) => ({
        sourceLang: sourceLang,
        targetLang: targetLang,
        sourceText: this.examples[index].source,
        targetText: this.examples[index].target,
        similarity,
        source: 'corpus' as const
      }));
    } catch (error) {
      console.error("❌ Erreur lors de la recherche RAG:", error);
      return [];
    }
  }

  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Traduit en utilisant RAG + Lovable AI
   */
  async translateWithRAG(
    text: string,
    sourceLang: 'french' | 'bariba',
    targetLang: 'french' | 'bariba'
  ): Promise<{ translation: string; confidence: number; examples: RAGExample[] }> {
    // Trouver les 5 exemples les plus similaires
    const examples = await this.findSimilarExamples(text, sourceLang, targetLang, 5);

    if (examples.length === 0) {
      throw new Error("Pas d'exemples similaires trouvés");
    }

    // Construire le contexte pour Lovable AI
    const contextPrompt = this.buildContextPrompt(text, examples, sourceLang, targetLang);

    // Appeler Lovable AI avec le contexte
    try {
      const { data, error } = await supabase.functions.invoke('ai-translate', {
        body: {
          text,
          sourceLang,
          targetLang,
          context: contextPrompt,
          useRAG: true
        }
      });

      if (error) throw error;

      return {
        translation: data.translation,
        confidence: data.confidence || 85,
        examples
      };
    } catch (error) {
      console.error("❌ Erreur lors de la traduction RAG:", error);
      throw error;
    }
  }

  private buildContextPrompt(
    text: string,
    examples: RAGExample[],
    sourceLang: 'french' | 'bariba',
    targetLang: 'french' | 'bariba'
  ): string {
    const sourceLangName = sourceLang === 'french' ? 'français' : 'bariba';
    const targetLangName = targetLang === 'french' ? 'français' : 'bariba';

    let prompt = `Tu es un traducteur expert ${sourceLangName}-${targetLangName}.\n\n`;
    prompt += `Voici ${examples.length} exemples de traductions similaires pour t'aider:\n\n`;

    examples.forEach((ex, i) => {
      prompt += `Exemple ${i + 1} (similarité: ${(ex.similarity * 100).toFixed(1)}%):\n`;
      prompt += `  ${sourceLangName}: "${ex.sourceText}"\n`;
      prompt += `  ${targetLangName}: "${ex.targetText}"\n\n`;
    });

    prompt += `Maintenant, traduis cette phrase en respectant le style et les structures des exemples:\n`;
    prompt += `"${text}"\n\n`;
    prompt += `IMPORTANT:\n`;
    prompt += `- Comprends le SENS de la phrase, ne traduis pas mot à mot\n`;
    prompt += `- Utilise les structures grammaticales naturelles du ${targetLangName}\n`;
    prompt += `- Inspire-toi des exemples pour le style et le vocabulaire\n`;
    prompt += `- Produis une traduction fluide et naturelle\n`;

    return prompt;
  }

  getStats() {
    return {
      initialized: this.isInitialized,
      exampleCount: this.examples.length,
      embeddingCount: this.exampleEmbeddings.size
    };
  }
}

// Singleton
export const semanticRAGService = new SemanticRAGService();
