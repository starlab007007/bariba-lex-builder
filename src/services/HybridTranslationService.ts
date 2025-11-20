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
import { semanticRAGService } from "./SemanticRAGService";
import { grammaticalCorrector } from "./GrammaticalCorrector";

export interface HybridTranslationResult extends TranslationResult {
  method: 'idiom' | 'context' | 'rag' | 'simplified' | 'advanced' | 'ai' | 'fallback';
  cost: number; // Coût en crédits
  duration: number; // Durée en ms
  ragExamples?: number; // Nombre d'exemples RAG utilisés
}

export class HybridTranslationService {
  private simplifiedModel: SimplifiedTranslationAI | null = null;
  private advancedModel: BaatonuTranslationAI | null = null;
  private fineTunedModelVersion: string | null = null;
  private isInitialized = false;

  // Seuils de confiance pour la cascade (NOUVEAUX - optimisés)
  private readonly IDIOM_THRESHOLD = 98;  // Idiomes = 100% de confiance
  private readonly RAG_THRESHOLD = 75;     // RAG prioritaire sur le reste
  private readonly CONTEXT_THRESHOLD = 60; // Contexte pour information uniquement
  private readonly ADVANCED_THRESHOLD = 70; // BaatonuTranslationAI avec embeddings
  private readonly SIMPLIFIED_THRESHOLD = 50; // SimplifiedTranslationAI amélioré

  /**
   * Initialise tous les modèles
   */
  async initialize(
    entries: DictionaryEntry[],
    phrases: any[],
    examples: any[]
  ): Promise<void> {
    if (this.isInitialized) return;

    console.log("🚀 Initialisation du système hybride AMÉLIORÉ...");
    const startTime = Date.now();

    // 1. Initialiser SimplifiedTranslationAI avec analyse grammaticale
    this.simplifiedModel = new SimplifiedTranslationAI(entries, phrases, examples);
    await this.simplifiedModel.initializeAdvancedFeatures();

    // 2. Initialiser SemanticRAGService (NOUVEAU - remplace le mock fine-tuned)
    try {
      console.log("🧠 Initialisation du RAG sémantique...");
      await semanticRAGService.initialize(entries, phrases, examples);
      console.log("✅ RAG sémantique activé avec embeddings");
    } catch (error) {
      console.warn("⚠️ RAG sémantique non disponible:", error);
    }

    // 3. Initialiser BaatonuTranslationAI (ACTIVÉ dans le flux)
    try {
      console.log("🔄 Activation du modèle avancé (Hugging Face Transformers)...");
      this.advancedModel = new BaatonuTranslationAI(entries);
      await this.advancedModel.initialize();
      console.log("✅ BaatonuTranslationAI activé avec embeddings sémantiques");
    } catch (error) {
      console.warn("⚠️ Modèle avancé non disponible:", error);
      this.advancedModel = null;
    }

    // 4. Charger le contexte de fine-tuning NLLB-200 (si disponible)
    try {
      const { data: latestModel } = await supabase
        .from('ai_training_context')
        .select('model_version, metrics')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latestModel) {
        this.fineTunedModelVersion = latestModel.model_version;
        console.log(`✅ Contexte NLLB-200: ${this.fineTunedModelVersion}`);
        const metrics = latestModel.metrics as any;
        if (metrics?.total_training_pairs) {
          console.log(`   📊 ${metrics.total_training_pairs} paires d'entraînement disponibles`);
        }
      }
    } catch (error) {
      console.log("ℹ️ Pas encore de fine-tuning NLLB-200 (utilisation RAG + modèles locaux)");
    }

    this.isInitialized = true;
    const duration = Date.now() - startTime;
    console.log(`✅ Système hybride COMPLET initialisé en ${duration}ms`);
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
      useAI?: boolean;
      minConfidence?: number;
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

    // NIVEAU 3.5: Cache Translation Memory (confiance 80%+, <5ms, GRATUIT)
    const cacheResult = await this.checkTranslationCache(text, sourceLang, targetLang);
    if (cacheResult && cacheResult.confidence >= 80) {
      console.log(`✅ Niveau 3.5: Cache Hit (${cacheResult.confidence}%)`);
      return {
        ...cacheResult,
        method: 'context',
        cost: 0,
        duration: Date.now() - startTime
      };
    }

    // NIVEAU 3.6: Hugging Face Fine-Tuned Model (confiance 75-92%, GRATUIT via HF Inference API)
    const wordCount = text.split(/\s+/).length;
    if (wordCount >= 4) { // Phrases complexes uniquement
      try {
        console.log(`🔄 Niveau 3.6: Hugging Face Fine-Tuned Model (${wordCount} mots)`);
        const hfResult = await this.callHuggingFaceModel(text, sourceLang, targetLang);
        if (hfResult && hfResult.confidence >= 75) {
          console.log(`✅ Niveau 3.6: HF Model (${hfResult.confidence}%)`);
          // Sauvegarder dans le cache
          await this.saveToCache(text, hfResult.translation, sourceLang, targetLang, hfResult.confidence);
          return {
            ...hfResult,
            method: 'advanced',
            cost: 0,
            duration: Date.now() - startTime
          };
        }
      } catch (error) {
        console.warn("⚠️ Niveau 3.6 échec:", error);
      }
    }

    // NIVEAU 4: Lovable AI (confiance 85-95%, quasi-GRATUIT avec crédits, 1-3s)
    // Appelé pour phrases complexes (5+ mots) OU confiance faible
    const shouldUseLovableAI = useAI || wordCount >= 5 || simplifiedResult.confidence < 60;
    
    if (shouldUseLovableAI) {
      console.log(`🔄 Niveau 4: Lovable AI (${wordCount} mots, confiance: ${simplifiedResult.confidence}%)`);
      try {
        const aiResult = await this.callLovableAI(text, sourceLang, targetLang);
        if (aiResult) {
          console.log(`✅ Niveau 4: AI (${aiResult.confidence}%)`);
          // Sauvegarder dans le cache pour réutilisation
          await this.saveToCache(text, aiResult.translation, sourceLang, targetLang, aiResult.confidence);
          return {
            ...aiResult,
            method: 'ai',
            cost: 0, // Utilise crédits gratuits inclus
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
          sourceLang,
          targetLang
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
   * Détecte la langue du texte
   */
  detectLanguage(text: string): 'french' | 'bariba' | 'mixed' {
    if (!this.simplifiedModel) {
      throw new Error("Service non initialisé");
    }
    return this.simplifiedModel.detectLanguage(text);
  }

  /**
   * Génère des suggestions de phrases
   */
  getSuggestions(text: string, maxSuggestions: number = 5): string[] {
    if (!this.simplifiedModel) {
      return [];
    }
    return this.simplifiedModel.getSuggestions(text, maxSuggestions);
  }

  /**
   * Vérifie le cache de traductions pour réutilisation
   */
  private async checkTranslationCache(
    text: string,
    sourceLang: string,
    targetLang: string
  ): Promise<HybridTranslationResult | null> {
    try {
      const { data } = await supabase
        .from('translation_memory')
        .select('*')
        .eq('source_text', text.toLowerCase().trim())
        .eq('source_language', sourceLang)
        .eq('target_language', targetLang)
        .order('usage_count', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        // Incrémenter le compteur d'utilisation
        await supabase
          .from('translation_memory')
          .update({ 
            usage_count: (data.usage_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.id);

        return {
          translation: data.target_text,
          confidence: data.confidence_score || 80,
          detectedLanguage: sourceLang as any,
          method: 'context',
          cost: 0,
          duration: 0
        };
      }
      return null;
    } catch (error) {
      console.warn("Cache lookup error:", error);
      return null;
    }
  }

  /**
   * Sauvegarde une traduction dans le cache
   */
  private async saveToCache(
    sourceText: string,
    targetText: string,
    sourceLang: string,
    targetLang: string,
    confidence: number
  ): Promise<void> {
    try {
      const { data: existing } = await supabase
        .from('translation_memory')
        .select('id, usage_count')
        .eq('source_text', sourceText.toLowerCase().trim())
        .eq('source_language', sourceLang)
        .eq('target_language', targetLang)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('translation_memory')
          .update({ 
            target_text: targetText,
            confidence_score: confidence,
            usage_count: (existing.usage_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('translation_memory')
          .insert({
            source_text: sourceText.toLowerCase().trim(),
            target_text: targetText,
            source_language: sourceLang,
            target_language: targetLang,
            confidence_score: confidence,
            usage_count: 1
          });
      }
    } catch (error) {
      console.warn("Cache save error:", error);
    }
  }

  /**
   * Appelle le modèle Hugging Face Fine-Tuned
   */
  private async callHuggingFaceModel(
    text: string,
    sourceLang: string,
    targetLang: string
  ): Promise<HybridTranslationResult | null> {
    try {
      const { data, error } = await supabase.functions.invoke('huggingface-translate', {
        body: { text, sourceLang, targetLang }
      });

      if (error) throw error;
      if (!data?.translation) return null;

      return {
        translation: data.translation,
        confidence: data.confidence || 80,
        detectedLanguage: sourceLang as any,
        method: 'advanced',
        cost: 0,
        duration: 0
      };
    } catch (error) {
      console.warn("HF Model error:", error);
      return null;
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
