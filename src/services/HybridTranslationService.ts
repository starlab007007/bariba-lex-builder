/**
 * Service de Traduction Hybride Haute Performance
 * 
 * Architecture en CASCADE (du rapport technique) :
 * 1. Idiomes (confiance 100%)
 * 2. Mémoire contextuelle (confiance 70%+)
 * 3. SimplifiedTranslationAI (local, gratuit, rapide)
 * 4. BaatonuTranslationAI (Hugging Face, avancé)
 * 5. Lovable AI (cloud, haute qualité)
 * 
 * Objectif : Traduction proche-humaine avec optimisation coût/qualité
 */

import { SimplifiedTranslationAI, type TranslationResult } from "./SimplifiedTranslationAI";
import { BaatonuTranslationAI } from "./BaatonuTranslationAI";
import type { DictionaryEntry } from "@/data/fullDictionaryData";
import { idiomService } from "./IdiomService";
import { translationContextService } from "./TranslationContextService";
import { supabase } from "@/integrations/supabase/client";

export interface HybridTranslationResult extends TranslationResult {
  method: 'idiom' | 'context' | 'simplified' | 'advanced' | 'ai' | 'fallback';
  cost: number; // Coût en crédits
  duration: number; // Durée en ms
}

export class HybridTranslationService {
  private simplifiedModel: SimplifiedTranslationAI | null = null;
  private advancedModel: BaatonuTranslationAI | null = null;
  private isInitialized = false;

  // Seuils de confiance pour la cascade
  private readonly IDIOM_THRESHOLD = 95;
  private readonly CONTEXT_THRESHOLD = 70;
  private readonly SIMPLIFIED_THRESHOLD = 60;
  private readonly ADVANCED_THRESHOLD = 50;

  /**
   * Initialise tous les modèles
   */
  async initialize(
    entries: DictionaryEntry[],
    phrases: any[],
    examples: any[]
  ): Promise<void> {
    if (this.isInitialized) return;

    console.log("🚀 Initialisation du système hybride...");
    const startTime = Date.now();

    // 1. Initialiser SimplifiedTranslationAI (priorité 1)
    this.simplifiedModel = new SimplifiedTranslationAI(entries, phrases, examples);
    await this.simplifiedModel.initializeAdvancedFeatures();

    // 2. Initialiser BaatonuTranslationAI (priorité 2) - ACTIVÉ
    try {
      console.log("🔄 Activation du modèle avancé (Hugging Face Transformers)...");
      this.advancedModel = new BaatonuTranslationAI(entries);
      await this.advancedModel.initialize();
      console.log("✅ Modèle avancé (Hugging Face) activé avec embeddings sémantiques");
    } catch (error) {
      console.warn("⚠️ Modèle avancé non disponible:", error);
      console.warn("   Le système utilisera uniquement le modèle simplifié");
      this.advancedModel = null;
    }

    this.isInitialized = true;
    const duration = Date.now() - startTime;
    console.log(`✅ Système hybride initialisé en ${duration}ms`);
  }

  /**
   * TRADUCTION HYBRIDE EN CASCADE
   * 
   * Stratégie optimale coût/qualité selon le rapport technique
   */
  async translate(
    text: string,
    sourceLang: 'french' | 'bariba',
    targetLang: 'french' | 'bariba',
    options?: {
      useAI?: boolean; // Utiliser Lovable AI si local échoue
      minConfidence?: number; // Confiance minimale acceptée
    }
  ): Promise<HybridTranslationResult> {
    if (!this.isInitialized || !this.simplifiedModel) {
      throw new Error("Service non initialisé");
    }

    const startTime = Date.now();
    const { useAI = false, minConfidence = 50 } = options || {};

    console.log(`🔄 Traduction hybride: ${sourceLang} → ${targetLang}`);

    // NIVEAU 0: Idiomes (confiance 100%, gratuit, < 1ms)
    const idiomResult = sourceLang === 'french'
      ? idiomService.findFrenchIdiom(text)
      : idiomService.findBaribaIdiom(text);

    if (idiomResult && idiomResult.confidence >= this.IDIOM_THRESHOLD) {
      console.log("✅ Niveau 0: Idiome trouvé");
      await translationContextService.addToContext(
        text,
        idiomResult.translation,
        sourceLang,
        targetLang,
        idiomResult.confidence
      );

      return {
        translation: idiomResult.translation,
        confidence: idiomResult.confidence,
        detectedLanguage: sourceLang,
        method: 'idiom',
        cost: 0,
        duration: Date.now() - startTime
      };
    }

    // NIVEAU 1: Mémoire contextuelle (confiance 70%+, gratuit, < 5ms)
    const contextResult = translationContextService.findSimilarTranslation(
      text,
      sourceLang,
      targetLang
    );

    if (contextResult && contextResult.confidence >= this.CONTEXT_THRESHOLD) {
      console.log("✅ Niveau 1: Contexte trouvé");
      return {
        translation: contextResult.translation,
        confidence: contextResult.confidence,
        detectedLanguage: sourceLang,
        method: 'context',
        cost: 0,
        duration: Date.now() - startTime
      };
    }

    // NIVEAU 2: SimplifiedTranslationAI (confiance 40-95%, gratuit, < 50ms)
    const simplifiedResult = sourceLang === 'french'
      ? await this.simplifiedModel.translateFrenchToBariba(text)
      : await this.simplifiedModel.translateBaribaToFrench(text);

    if (simplifiedResult.confidence >= this.SIMPLIFIED_THRESHOLD) {
      console.log(`✅ Niveau 2: Simplified (${simplifiedResult.confidence}%)`);
      return {
        ...simplifiedResult,
        method: 'simplified',
        cost: 0,
        duration: Date.now() - startTime
      };
    }

    // NIVEAU 3: BaatonuTranslationAI (confiance 50-90%, gratuit, 200-500ms)
    if (this.advancedModel?.isReady) {
      console.log("🔄 Niveau 3: Essai avec modèle avancé...");
      try {
        const advancedResult = sourceLang === 'french'
          ? await this.advancedModel.translateFrenchToBariba(text)
          : await this.advancedModel.translateBaribaToFrench(text);

        if (advancedResult && advancedResult.length > 0) {
          // Calculer une confiance basée sur la cohérence
          const confidence = Math.max(simplifiedResult.confidence, this.ADVANCED_THRESHOLD);
          
          console.log(`✅ Niveau 3: Advanced (${confidence}%)`);
          await translationContextService.addToContext(
            text,
            advancedResult,
            sourceLang,
            targetLang,
            confidence
          );

          return {
            translation: advancedResult,
            confidence,
            detectedLanguage: sourceLang,
            method: 'advanced',
            cost: 0,
            duration: Date.now() - startTime
          };
        }
      } catch (error) {
        console.warn("⚠️ Modèle avancé a échoué:", error);
      }
    }

    // NIVEAU 4: Lovable AI (confiance 85-95%, payant, 1-3s)
    if (useAI && simplifiedResult.confidence < minConfidence) {
      console.log("🔄 Niveau 4: Appel à Lovable AI...");
      try {
        const aiResult = await this.callLovableAI(text, sourceLang, targetLang);
        if (aiResult) {
          console.log(`✅ Niveau 4: AI (${aiResult.confidence}%)`);
          return {
            ...aiResult,
            method: 'ai',
            cost: 0.001, // Coût approximatif
            duration: Date.now() - startTime
          };
        }
      } catch (error) {
        console.error("❌ Lovable AI a échoué:", error);
      }
    }

    // FALLBACK: Retourner SimplifiedTranslationAI même si confiance basse
    console.log(`⚠️ Fallback: SimplifiedTranslationAI (${simplifiedResult.confidence}%)`);
    return {
      ...simplifiedResult,
      method: 'fallback',
      cost: 0,
      duration: Date.now() - startTime
    };
  }

  /**
   * Appelle Lovable AI pour traduction haute qualité
   */
  private async callLovableAI(
    text: string,
    sourceLang: string,
    targetLang: string
  ): Promise<HybridTranslationResult | null> {
    try {
      const { data, error } = await supabase.functions.invoke('ai-translate', {
        body: {
          text,
          source_language: sourceLang,
          target_language: targetLang
        }
      });

      if (error) throw error;

      if (data?.translation) {
        await translationContextService.addToContext(
          text,
          data.translation,
          sourceLang as any,
          targetLang as any,
          data.confidence || 90
        );

        return {
          translation: data.translation,
          confidence: data.confidence || 90,
          detectedLanguage: sourceLang as any,
          method: 'ai',
          cost: 0.001,
          duration: 0
        };
      }

      return null;
    } catch (error) {
      console.error("Erreur Lovable AI:", error);
      return null;
    }
  }

  /**
   * Traduction intelligente avec détection automatique
   */
  async translateIntelligent(text: string, useAI = false): Promise<HybridTranslationResult> {
    if (!this.simplifiedModel) {
      throw new Error("Service non initialisé");
    }

    const detectedLang = this.simplifiedModel.detectLanguage(text);
    
    if (detectedLang === 'french') {
      return this.translate(text, 'french', 'bariba', { useAI });
    } else if (detectedLang === 'bariba') {
      return this.translate(text, 'bariba', 'french', { useAI });
    } else {
      // Mixed: essayer les deux et prendre le meilleur
      const [resultFR, resultBBA] = await Promise.all([
        this.translate(text, 'french', 'bariba', { useAI }),
        this.translate(text, 'bariba', 'french', { useAI })
      ]);
      
      return resultFR.confidence > resultBBA.confidence ? resultFR : resultBBA;
    }
  }

  /**
   * Retourne les statistiques du système
   */
  getStats() {
    return {
      idiomCount: idiomService.getIdiomCount(),
      contextSize: translationContextService.getContextSize(),
      simplifiedReady: this.simplifiedModel?.isReady || false,
      advancedReady: this.advancedModel?.isReady || false
    };
  }
}

// Export singleton
export const hybridTranslationService = new HybridTranslationService();
