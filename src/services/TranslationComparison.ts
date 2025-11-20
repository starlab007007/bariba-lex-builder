/**
 * Service de comparaison des modèles de traduction
 * Permet de tester et comparer SimplifiedAI, BaatonuAI et Lovable AI
 */

import { SimplifiedTranslationAI } from './SimplifiedTranslationAI';
import { BaatonuTranslationAI } from './BaatonuTranslationAI';
import { supabase } from '@/integrations/supabase/client';
import type { DictionaryEntry } from '@/data/fullDictionaryData';

export interface ModelComparisonResult {
  testId: string;
  phrase: string;
  sourceLang: 'french' | 'bariba';
  targetLang: 'french' | 'bariba';
  results: {
    simplified: {
      translation: string;
      confidence: number;
      duration: number;
      cost: number;
    };
    baatonuAI: {
      translation: string;
      confidence: number;
      duration: number;
      cost: number;
      available: boolean;
    };
    lovableAI: {
      translation: string;
      confidence: number;
      duration: number;
      cost: number;
      available: boolean;
    };
  };
  timestamp: Date;
  reference?: string; // Traduction de référence (si disponible)
}

export interface TranslationMetrics {
  modelName: 'simplified' | 'baatonuAI' | 'lovableAI';
  avgConfidence: number;
  avgDuration: number;
  totalCost: number;
  successRate: number;
  totalTests: number;
}

export class TranslationComparisonService {
  private simplifiedModel: SimplifiedTranslationAI | null = null;
  private baatonuModel: BaatonuTranslationAI | null = null;
  private comparisonHistory: ModelComparisonResult[] = [];

  async initialize(
    entries: DictionaryEntry[],
    phrases: any[],
    examples: any[]
  ): Promise<void> {
    console.log("🧪 Initialisation du service de comparaison...");

    // Initialiser SimplifiedAI
    this.simplifiedModel = new SimplifiedTranslationAI(entries, phrases, examples);
    await this.simplifiedModel.initializeAdvancedFeatures();

    // Initialiser BaatonuAI
    try {
      this.baatonuModel = new BaatonuTranslationAI(entries);
      await this.baatonuModel.initialize();
    } catch (error) {
      console.warn("⚠️ BaatonuAI non disponible pour les tests:", error);
      this.baatonuModel = null;
    }

    console.log("✅ Service de comparaison prêt");
  }

  /**
   * Compare tous les modèles sur une phrase de test
   */
  async compareModels(
    phrase: string,
    sourceLang: 'french' | 'bariba',
    targetLang: 'french' | 'bariba',
    reference?: string
  ): Promise<ModelComparisonResult> {
    const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🧪 Test A/B: "${phrase}" (${sourceLang} → ${targetLang})`);

    const result: ModelComparisonResult = {
      testId,
      phrase,
      sourceLang,
      targetLang,
      results: {
        simplified: { translation: '', confidence: 0, duration: 0, cost: 0 },
        baatonuAI: { translation: '', confidence: 0, duration: 0, cost: 0, available: false },
        lovableAI: { translation: '', confidence: 0, duration: 0, cost: 0, available: false }
      },
      timestamp: new Date(),
      reference
    };

    // Test SimplifiedAI
    try {
      const startSimplified = Date.now();
      const simplifiedResult = sourceLang === 'french'
        ? await this.simplifiedModel!.translateFrenchToBariba(phrase)
        : await this.simplifiedModel!.translateBaribaToFrench(phrase);
      
      result.results.simplified = {
        translation: simplifiedResult.translation,
        confidence: simplifiedResult.confidence,
        duration: Date.now() - startSimplified,
        cost: 0
      };
      console.log(`✅ SimplifiedAI: ${simplifiedResult.confidence}% en ${result.results.simplified.duration}ms`);
    } catch (error) {
      console.error("❌ SimplifiedAI échec:", error);
    }

    // Test BaatonuAI
    if (this.baatonuModel?.isReady) {
      try {
        const startBaatonum = Date.now();
        const baatonumResult = sourceLang === 'french'
          ? await this.baatonuModel.translateFrenchToBariba(phrase)
          : await this.baatonuModel.translateBaribaToFrench(phrase);
        
        const hasSpecialChars = /[ɔɛɑɡãẽĩõũ]/.test(baatonumResult);
        const confidence = 70 + (hasSpecialChars ? 10 : 0);
        
        result.results.baatonuAI = {
          translation: baatonumResult,
          confidence,
          duration: Date.now() - startBaatonum,
          cost: 0,
          available: true
        };
        console.log(`✅ BaatonuAI: ${confidence}% en ${result.results.baatonuAI.duration}ms`);
      } catch (error) {
        console.error("❌ BaatonuAI échec:", error);
      }
    }

    // Test Lovable AI
    try {
      const startLovable = Date.now();
      const { data, error } = await supabase.functions.invoke('ai-translate', {
        body: {
          text: phrase,
          sourceLang,
          targetLang
        }
      });

      if (!error && data?.translation) {
        result.results.lovableAI = {
          translation: data.translation,
          confidence: data.confidence || 90,
          duration: Date.now() - startLovable,
          cost: 0, // Utilise crédits gratuits
          available: true
        };
        console.log(`✅ Lovable AI: ${data.confidence}% en ${result.results.lovableAI.duration}ms`);
      }
    } catch (error) {
      console.error("❌ Lovable AI échec:", error);
    }

    // Sauvegarder l'historique
    this.comparisonHistory.push(result);

    // Sauvegarder en base de données
    await this.saveComparisonResult(result);

    return result;
  }

  /**
   * Compare les modèles sur un ensemble de phrases
   */
  async runBatchTest(
    testPhrases: Array<{ phrase: string; sourceLang: 'french' | 'bariba'; targetLang: 'french' | 'bariba'; reference?: string }>
  ): Promise<ModelComparisonResult[]> {
    console.log(`🧪 Lancement du batch test avec ${testPhrases.length} phrases...`);
    
    const results: ModelComparisonResult[] = [];
    
    for (let i = 0; i < testPhrases.length; i++) {
      const test = testPhrases[i];
      console.log(`📝 Test ${i + 1}/${testPhrases.length}: "${test.phrase}"`);
      
      const result = await this.compareModels(
        test.phrase,
        test.sourceLang,
        test.targetLang,
        test.reference
      );
      
      results.push(result);
      
      // Petite pause entre chaque test pour éviter la surcharge
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`✅ Batch test terminé: ${results.length} comparaisons effectuées`);
    return results;
  }

  /**
   * Calcule les métriques par modèle
   */
  calculateMetrics(): TranslationMetrics[] {
    const metrics: TranslationMetrics[] = [
      { modelName: 'simplified', avgConfidence: 0, avgDuration: 0, totalCost: 0, successRate: 0, totalTests: 0 },
      { modelName: 'baatonuAI', avgConfidence: 0, avgDuration: 0, totalCost: 0, successRate: 0, totalTests: 0 },
      { modelName: 'lovableAI', avgConfidence: 0, avgDuration: 0, totalCost: 0, successRate: 0, totalTests: 0 }
    ];

    if (this.comparisonHistory.length === 0) return metrics;

    // Calculer pour chaque modèle
    const calculateForModel = (modelKey: 'simplified' | 'baatonuAI' | 'lovableAI'): TranslationMetrics => {
      const modelTests = this.comparisonHistory
        .filter(r => modelKey === 'simplified' || r.results[modelKey].available)
        .map(r => r.results[modelKey]);

      const totalTests = modelTests.length;
      const successfulTests = modelTests.filter(t => t.translation && t.translation.length > 0).length;

      return {
        modelName: modelKey,
        avgConfidence: totalTests > 0 ? modelTests.reduce((sum, t) => sum + t.confidence, 0) / totalTests : 0,
        avgDuration: totalTests > 0 ? modelTests.reduce((sum, t) => sum + t.duration, 0) / totalTests : 0,
        totalCost: modelTests.reduce((sum, t) => sum + t.cost, 0),
        successRate: totalTests > 0 ? (successfulTests / totalTests) * 100 : 0,
        totalTests
      };
    };

    return [
      calculateForModel('simplified'),
      calculateForModel('baatonuAI'),
      calculateForModel('lovableAI')
    ];
  }

  /**
   * Obtenir l'historique des comparaisons
   */
  getHistory(): ModelComparisonResult[] {
    return [...this.comparisonHistory];
  }

  /**
   * Effacer l'historique
   */
  clearHistory(): void {
    this.comparisonHistory = [];
  }

  /**
   * Sauvegarder un résultat de comparaison en base de données
   */
  private async saveComparisonResult(result: ModelComparisonResult): Promise<void> {
    try {
      const { error } = await supabase
        .from('model_test_results')
        .insert({
          test_phrase: result.phrase,
          source_language: result.sourceLang,
          target_language: result.targetLang,
          local_translation: result.results.simplified.translation,
          local_confidence: result.results.simplified.confidence,
          local_duration_ms: result.results.simplified.duration,
          api_translation: result.results.lovableAI.translation || null,
          api_confidence: result.results.lovableAI.confidence || null,
          api_duration_ms: result.results.lovableAI.duration || null,
          notes: JSON.stringify({
            baatonuAI: result.results.baatonuAI,
            reference: result.reference
          })
        });

      if (error) {
        console.error("Erreur lors de la sauvegarde du résultat:", error);
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
    }
  }
}

// Instance singleton
export const translationComparisonService = new TranslationComparisonService();
