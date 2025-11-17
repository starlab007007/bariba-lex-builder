/**
 * Service de mémoire contextuelle pour traduction
 * Phase 5 du rapport: maintenir la cohérence dans une session
 */

import { supabase } from "@/integrations/supabase/client";

export interface ContextEntry {
  id: string;
  session_id: string;
  source_text: string;
  target_text: string;
  source_language: string;
  target_language: string;
  confidence_score: number;
  created_at: string;
}

export class TranslationContextService {
  private sessionId: string;
  private contextMemory: ContextEntry[] = [];
  private maxMemorySize = 100; // Garder les 100 dernières traductions
  private similarityThreshold = 0.7; // Seuil de similarité pour réutilisation

  constructor() {
    // Générer un ID de session unique
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Ajoute une traduction à la mémoire contextuelle
   */
  async addToContext(
    sourceText: string,
    targetText: string,
    sourceLang: string,
    targetLang: string,
    confidence: number
  ): Promise<void> {
    const entry: Omit<ContextEntry, 'id' | 'created_at'> = {
      session_id: this.sessionId,
      source_text: sourceText,
      target_text: targetText,
      source_language: sourceLang,
      target_language: targetLang,
      confidence_score: confidence
    };

    try {
      // Stocker dans la base de données
      const { data, error } = await supabase
        .from('translation_context')
        .insert([entry])
        .select()
        .single();

      if (error) throw error;

      // Ajouter à la mémoire locale
      if (data) {
        this.contextMemory.push(data);

        // Limiter la taille de la mémoire
        if (this.contextMemory.length > this.maxMemorySize) {
          this.contextMemory.shift(); // Supprimer le plus ancien
        }
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout au contexte:", error);
    }
  }

  /**
   * Recherche dans la mémoire contextuelle une traduction similaire
   * Utilise la similarité Jaccard pour scorer
   */
  findSimilarTranslation(
    text: string,
    sourceLang: string,
    targetLang: string
  ): { translation: string; confidence: number } | null {
    if (this.contextMemory.length === 0) return null;

    const textLower = text.toLowerCase().trim();
    const queryWords = new Set(textLower.split(/\s+/));

    let bestMatch: ContextEntry | null = null;
    let bestScore = 0;

    // Filtrer par langues
    const relevantEntries = this.contextMemory.filter(
      entry => entry.source_language === sourceLang && entry.target_language === targetLang
    );

    // Calculer la similarité avec chaque entrée
    for (const entry of relevantEntries) {
      const entryWords = new Set(entry.source_text.toLowerCase().trim().split(/\s+/));
      
      // Similarité Jaccard
      const intersection = new Set([...queryWords].filter(w => entryWords.has(w)));
      const union = new Set([...queryWords, ...entryWords]);
      const similarity = intersection.size / union.size;

      if (similarity > bestScore) {
        bestScore = similarity;
        bestMatch = entry;
      }
    }

    // Si la similarité est suffisante, retourner la traduction
    if (bestMatch && bestScore >= this.similarityThreshold) {
      return {
        translation: bestMatch.target_text,
        confidence: Math.min(95, bestMatch.confidence_score * bestScore)
      };
    }

    return null;
  }

  /**
   * Charge le contexte récent depuis la base de données
   */
  async loadRecentContext(userId?: string): Promise<void> {
    try {
      let query = supabase
        .from('translation_context')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(this.maxMemorySize);

      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.eq('session_id', this.sessionId);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        this.contextMemory = data;
        console.log(`✅ ${data.length} entrées de contexte chargées`);
      }
    } catch (error) {
      console.error("Erreur lors du chargement du contexte:", error);
    }
  }

  /**
   * Nettoie la mémoire contextuelle
   */
  clearContext(): void {
    this.contextMemory = [];
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Retourne les dernières N traductions
   */
  getRecentTranslations(limit: number = 10): ContextEntry[] {
    return this.contextMemory.slice(-limit).reverse();
  }

  /**
   * Retourne le nombre d'entrées en mémoire
   */
  getContextSize(): number {
    return this.contextMemory.length;
  }
}

// Export singleton
export const translationContextService = new TranslationContextService();
