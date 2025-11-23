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
import { statisticalEngine } from "./StatisticalTranslationEngine";
import { enhancedCorrector } from "./EnhancedGrammaticalCorrector";
import { translationCache } from "@/utils/TranslationCache";
import { trieIndex } from "@/utils/TrieIndex";
import { smtInitializer } from "./SMTInitializer";
import { translationMonitoring } from "./TranslationMonitoringService";

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
  private dictionaryEntries: DictionaryEntry[] = [];

  // Seuils de confiance pour la cascade (OPTIMISÉS BALANCE)
  private readonly IDIOM_THRESHOLD = 98;  // Idiomes = 100% de confiance
  private readonly FUZZY_JSD_THRESHOLD = 85; // Fuzzy match avec JSD
  private readonly SMT_THRESHOLD = 65;     // Statistical MT Engine (NOUVEAU)
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

    this.dictionaryEntries = entries;

    console.log("🚀 Initialisation du système hybride OPTIMISÉE...");
    const startTime = Date.now();

    // 1. Initialiser SMT en priorité (le plus important)
    try {
      console.log("📊 Initialisation du moteur statistique SMT...");
      await smtInitializer.initialize();
      const status = smtInitializer.getStatus();
      if (status?.isInitialized) {
        console.log(`✅ Moteur SMT prêt: ${status.phrasesCount} paires, ${status.dictionaryCount} entrées`);
      }
    } catch (error) {
      console.warn("⚠️ SMT non disponible:", error);
    }

    // 2. Initialiser SimplifiedTranslationAI RAPIDEMENT (sans features avancées au démarrage)
    this.simplifiedModel = new SimplifiedTranslationAI(entries, phrases, examples);
    // Features avancées chargées en lazy loading
    
    // 3. BaatonuTranslationAI désactivé au démarrage (lazy loading on demand)
    // Il sera initialisé seulement si l'utilisateur sélectionne ce modèle
    console.log("⏭️ BaatonuTranslationAI en mode lazy loading (activation à la demande)");

    // 4. Charger le contexte de fine-tuning NLLB-200 (si disponible)
    try {
      const { data: latestModel } = await supabase
        .from('ai_training_context')
        .select('model_version, metrics')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestModel) {
        this.fineTunedModelVersion = latestModel.model_version;
        console.log(`✅ Contexte NLLB-200: ${this.fineTunedModelVersion}`);
      }
    } catch (error) {
      console.log("ℹ️ Pas encore de fine-tuning NLLB-200");
    }

    this.isInitialized = true;
    const duration = Date.now() - startTime;
    console.log(`✅ Système hybride initialisé en ${duration}ms (mode rapide)`);
  }

  /**
   * Lazy load BaatonuAI only when needed
   */
  private async ensureBaatonuAI(): Promise<void> {
    if (this.advancedModel?.isReady) return;
    
    if (!this.advancedModel) {
      console.log("🔄 Chargement BaatonuTranslationAI...");
      this.advancedModel = new BaatonuTranslationAI(this.dictionaryEntries || []);
      await this.advancedModel.initialize();
      console.log("✅ BaatonuTranslationAI prêt");
    }
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

      const result = {
        translation: idiomResult.translation,
        confidence: idiomResult.confidence,
        detectedLanguage: sourceLang,
        method: 'idiom' as const,
        cost: 0,
        duration: Date.now() - startTime
      };
      
      // Log monitoring
      translationMonitoring.logTranslation({
        inputText: text,
        outputText: result.translation,
        sourceLang,
        targetLang,
        method: result.method,
        confidence: result.confidence,
        duration: result.duration,
        cost: result.cost
      });
      
      return result;
    }

    // NIVEAU 1: Exact Match via Trie (confiance 100%, gratuit, < 1ms)
    if (trieIndex.getSize() > 0) {
      const exactMatch = trieIndex.search(text);
      if (exactMatch) {
        console.log("✅ Niveau 1: Exact Match (Trie)");
        const result = {
          translation: exactMatch.translation,
          confidence: 100,
          detectedLanguage: sourceLang,
          method: 'context' as const,
          cost: 0,
          duration: Date.now() - startTime
        };
        
        translationMonitoring.logTranslation({
          inputText: text,
          outputText: result.translation,
          sourceLang,
          targetLang,
          method: result.method,
          confidence: result.confidence,
          duration: result.duration,
          cost: result.cost
        });
        
        return result;
      }
    }

    // NIVEAU 2: Fuzzy Match avec JSD (confiance 85%+, gratuit, < 10ms)
    const cached = translationCache.get(text);
    if (cached && cached.confidence >= this.FUZZY_JSD_THRESHOLD) {
      console.log(`✅ Niveau 2: Cache Hit (${cached.confidence}%)`);
      const result = {
        translation: cached.translation,
        confidence: cached.confidence,
        detectedLanguage: sourceLang,
        method: 'context' as const,
        cost: 0,
        duration: Date.now() - startTime
      };
      
      translationMonitoring.logTranslation({
        inputText: text,
        outputText: result.translation,
        sourceLang,
        targetLang,
        method: result.method,
        confidence: result.confidence,
        duration: result.duration,
        cost: result.cost
      });
      
      return result;
    }

    // NIVEAU 2.5: Mémoire contextuelle (confiance 60%+, gratuit, < 5ms)
    const contextResult = translationContextService.findSimilarTranslation(
      text,
      sourceLang,
      targetLang
    );

    if (contextResult && contextResult.confidence >= this.CONTEXT_THRESHOLD) {
      console.log("✅ Niveau 2.5: Contexte trouvé");
      const result = {
        translation: contextResult.translation,
        confidence: contextResult.confidence,
        detectedLanguage: sourceLang,
        method: 'context' as const,
        cost: 0,
        duration: Date.now() - startTime
      };
      
      translationMonitoring.logTranslation({
        inputText: text,
        outputText: result.translation,
        sourceLang,
        targetLang,
        method: result.method,
        confidence: result.confidence,
        duration: result.duration,
        cost: result.cost
      });
      
      return result;
    }

    // NIVEAU 3: Statistical MT Engine (confiance 65-90%, gratuit, 40-120ms) - NOUVEAU!
    if (statisticalEngine.isReady()) {
      console.log("🔄 Niveau 3: Statistical Machine Translation");
      try {
        // Déterminer la direction de traduction
        const direction = sourceLang === 'french' ? 'fr-bba' : 'bba-fr';
        const smtResult = statisticalEngine.translate(text, 12, direction);
        
        console.log(`   📊 SMT Résultat: confiance=${smtResult.confidence}%, seuil=${this.SMT_THRESHOLD}%`);
        
        if (smtResult.confidence >= this.SMT_THRESHOLD) {
          // Apply enhanced grammatical correction
          const corrected = enhancedCorrector.isReady() 
            ? enhancedCorrector.correctSentence(smtResult.translation)
            : smtResult.translation;
          
          const finalConfidence = Math.min(smtResult.confidence + 5, 95); // Bonus for correction
          
          console.log(`✅ Niveau 3: SMT Engine (${finalConfidence}%)`);
          console.log(`   📝 Brut: "${smtResult.translation}"`);
          console.log(`   ✨ Corrigé: "${corrected}"`);
          
          const duration = Date.now() - startTime;
          
          // Save to cache with duration
          translationCache.set(text, corrected, finalConfidence, 'statistical_smt', duration);
          
          await translationContextService.addToContext(
            text,
            corrected,
            sourceLang,
            targetLang,
            finalConfidence
          );
          
          const result = {
            translation: corrected,
            confidence: finalConfidence,
            detectedLanguage: sourceLang,
            method: 'advanced' as const,
            cost: 0,
            duration: Date.now() - startTime
          };
          
          translationMonitoring.logTranslation({
            inputText: text,
            outputText: result.translation,
            sourceLang,
            targetLang,
            method: result.method,
            confidence: result.confidence,
            duration: result.duration,
            cost: result.cost
          });
          
          return result;
        }
      } catch (error) {
        console.warn("⚠️ SMT Engine error:", error);
      }
    }

    // NIVEAU 4: SimplifiedTranslationAI (confiance 40-95%, gratuit, < 50ms)
    console.log("🔄 Niveau 4: SimplifiedTranslationAI");
    const simplifiedResult = sourceLang === 'french'
      ? await this.simplifiedModel.translateFrenchToBariba(text)
      : await this.simplifiedModel.translateBaribaToFrench(text);

    console.log(`   📊 SimplifiedAI: confiance=${simplifiedResult.confidence}%, seuil=${this.SIMPLIFIED_THRESHOLD}%`);
    
    if (simplifiedResult.confidence >= this.SIMPLIFIED_THRESHOLD) {
      console.log(`✅ Niveau 4: SimplifiedAI accepté (${simplifiedResult.confidence}%)`);
      
      // Sauvegarder dans le cache et le contexte
      await translationContextService.addToContext(
        text,
        simplifiedResult.translation,
        sourceLang,
        targetLang,
        simplifiedResult.confidence
      );
      
      const result = {
        ...simplifiedResult,
        method: 'simplified' as const,
        cost: 0,
        duration: Date.now() - startTime
      };
      
      translationMonitoring.logTranslation({
        inputText: text,
        outputText: result.translation,
        sourceLang,
        targetLang,
        method: result.method,
        confidence: result.confidence,
        duration: result.duration,
        cost: result.cost
      });
      
      return result;
    }
    
    console.log(`⚠️ SimplifiedAI confiance trop basse: ${simplifiedResult.confidence}% < ${this.SIMPLIFIED_THRESHOLD}%`);

    // NIVEAU 3: BaatonuTranslationAI avancé avec Hugging Face Transformers (confiance 70-85%, <1s, GRATUIT)
    if (this.advancedModel?.isReady) {
      console.log("🔄 Niveau 3: BaatonuTranslationAI (Hugging Face Transformers + Embeddings sémantiques)");
      try {
        const advancedResult = sourceLang === 'french'
          ? await this.advancedModel.translateFrenchToBariba(text)
          : await this.advancedModel.translateBaribaToFrench(text);

        if (advancedResult && advancedResult.length > 0 && !advancedResult.includes('[') && !advancedResult.includes('undefined')) {
          // Calculer une confiance basée sur la qualité du résultat
          const hasSpecialChars = /[ɔɛɑɡãẽĩõũ]/.test(advancedResult);
          const hasValidStructure = advancedResult.split(/\s+/).length >= text.split(/\s+/).length * 0.7;
          const confidence = Math.max(
            simplifiedResult.confidence, 
            this.ADVANCED_THRESHOLD + (hasSpecialChars ? 8 : 0) + (hasValidStructure ? 7 : 0)
          );
          
          console.log(`✅ Niveau 3: BaatonuTranslationAI activé (${confidence}%)`);
          console.log(`   📝 Résultat: "${advancedResult}"`);
          console.log(`   🧠 Caractères spéciaux: ${hasSpecialChars}, Structure: ${hasValidStructure}`);
          
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
        } else {
          console.log("⚠️ Résultat BaatonuTranslationAI invalide, passage au niveau suivant");
        }
      } catch (error) {
        console.warn("❌ BaatonuTranslationAI a échoué:", error);
      }
    } else if (this.advancedModel && !this.advancedModel.isReady) {
      console.log("⏳ BaatonuTranslationAI non prêt (initialisation en cours ou échec), passage au niveau suivant");
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

    // NIVEAU 3.6: Lovable AI pour phrases complexes (confiance 85-95%, quasi-GRATUIT)
    const wordCount = text.split(/\s+/).length;
    if (wordCount >= 4) { // Phrases complexes uniquement
      try {
        console.log(`🔄 Niveau 3.6: Lovable AI (${wordCount} mots)`);
        const aiResult = await this.callLovableAI(text, sourceLang, targetLang);
        if (aiResult && aiResult.confidence >= 75) {
          console.log(`✅ Niveau 3.6: Lovable AI (${aiResult.confidence}%)`);
          // Sauvegarder dans le cache
          await this.saveToCache(text, aiResult.translation, sourceLang, targetLang, aiResult.confidence);
          return {
            ...aiResult,
            method: 'advanced',
            cost: 0,
            duration: Date.now() - startTime
          };
        }
      } catch (error) {
        console.warn("⚠️ Niveau 3.6 échec:", error);
      }
    }

    // NIVEAU 5: Lovable AI en DERNIER RECOURS (confiance 85-95%, coût réduit, 1-3s)
    // Appelé UNIQUEMENT si tous les autres niveaux ont échoué
    const shouldUseLovableAI = useAI || wordCount >= 7;
    
    if (shouldUseLovableAI) {
      console.log(`🔄 Niveau 5: Lovable AI (dernier recours - ${wordCount} mots)`);
      try {
        const aiResult = await this.callLovableAI(text, sourceLang, targetLang);
        if (aiResult) {
          console.log(`✅ Niveau 5: Lovable AI (${aiResult.confidence}%)`);
          await this.saveToCache(text, aiResult.translation, sourceLang, targetLang, aiResult.confidence);
          
          const result = {
            ...aiResult,
            method: 'ai' as const,
            cost: 0,
            duration: Date.now() - startTime
          };
          
          translationMonitoring.logTranslation({
            inputText: text,
            outputText: result.translation,
            sourceLang,
            targetLang,
            method: result.method,
            confidence: result.confidence,
            duration: result.duration,
            cost: result.cost
          });
          
          return result;
        }
      } catch (error) {
        console.error("❌ Lovable AI a échoué:", error);
      }
    }

    // FALLBACK FINAL: Retourner SimplifiedAI même avec confiance basse
    console.log(`⚠️ FALLBACK FINAL: SimplifiedAI (${simplifiedResult.confidence}%)`);
    console.log(`   📝 Traduction: "${simplifiedResult.translation}"`);
    
    const fallbackResult = {
      ...simplifiedResult,
      method: 'fallback' as const,
      cost: 0,
      duration: Date.now() - startTime
    };
    
    translationMonitoring.logTranslation({
      inputText: text,
      outputText: fallbackResult.translation,
      sourceLang,
      targetLang,
      method: fallbackResult.method,
      confidence: fallbackResult.confidence,
      duration: fallbackResult.duration,
      cost: fallbackResult.cost
    });
    
    return fallbackResult;
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
   * Appelle Lovable AI pour traduction intelligente
   */
  private async callLovableAI(
    text: string,
    sourceLang: string,
    targetLang: string
  ): Promise<HybridTranslationResult | null> {
    try {
      const { data, error } = await supabase.functions.invoke('ai-translate-lovable', {
        body: { text, sourceLang, targetLang }
      });

      // Gérer les erreurs gracieusement
      if (error) {
        const errorMsg = error.message || String(error);
        if (errorMsg.includes('503') || errorMsg.includes('not configured')) {
          console.log('ℹ️ Lovable AI non disponible - passage au niveau suivant');
          return null;
        }
        throw error;
      }
      
      // Vérifier aussi si la réponse contient une erreur
      if (data?.error) {
        console.log('ℹ️ HF Model non disponible:', data.message || data.error);
        return null;
      }
      
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
