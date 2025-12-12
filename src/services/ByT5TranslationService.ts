/**
 * Service de traduction utilisant le modèle ByT5 Expert
 * via l'API Gradio Space de Hugging Face
 * 
 * Version améliorée: zimesongbian/modele_byt5_bariba_expert_api_v03_improve
 */

import { supabase } from "@/integrations/supabase/client";

export interface ByT5TranslationResult {
  translation: string;
  confidence: number;
  duration: number;
  method: string;
  suggestions?: string;
  modelInfo?: {
    name: string;
    version: string;
    mode: string;
    advanced?: boolean;
  };
}

export class ByT5TranslationService {
  private static instance: ByT5TranslationService;
  private isHealthy: boolean = false;
  private lastHealthCheck: number = 0;
  private healthCheckInterval: number = 60000; // 1 minute

  private constructor() {}

  static getInstance(): ByT5TranslationService {
    if (!ByT5TranslationService.instance) {
      ByT5TranslationService.instance = new ByT5TranslationService();
    }
    return ByT5TranslationService.instance;
  }

  /**
   * Traduit un texte en utilisant le modèle ByT5 Expert
   */
  async translate(
    text: string,
    sourceLang: 'french' | 'bariba',
    targetLang: 'french' | 'bariba',
    mode: 'quality' | 'fast' = 'quality',
    advanced: boolean = true
  ): Promise<ByT5TranslationResult> {
    const startTime = Date.now();

    try {
      console.log(`🤖 ByT5 Expert: translating ${sourceLang} → ${targetLang} (${mode} mode)`);

      const { data, error } = await supabase.functions.invoke('byt5-bariba-translate', {
        body: {
          text,
          sourceLang,
          targetLang,
          mode,
          advanced
        }
      });

      if (error) {
        console.error('❌ ByT5 Edge Function error:', error);
        this.isHealthy = false;
        throw new Error(`ByT5 translation failed: ${error.message}`);
      }

      if (!data || !data.translation) {
        console.error('❌ Invalid ByT5 response:', data);
        this.isHealthy = false;
        throw new Error(data?.error || 'Invalid response from ByT5 service');
      }

      const totalDuration = Date.now() - startTime;
      this.isHealthy = true;
      this.lastHealthCheck = Date.now();

      console.log(`✅ ByT5 translation completed in ${totalDuration}ms (confidence: ${data.confidence}%)`);

      return {
        translation: data.translation,
        confidence: data.confidence,
        duration: totalDuration,
        method: 'byt5-expert',
        suggestions: data.suggestions,
        modelInfo: data.modelInfo
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ ByT5 translation error after ${duration}ms:`, error);
      this.isHealthy = false;
      throw error;
    }
  }

  /**
   * Vérifie si le service ByT5 est disponible
   */
  async checkHealth(): Promise<boolean> {
    // Use cached result if recent
    if (Date.now() - this.lastHealthCheck < this.healthCheckInterval) {
      return this.isHealthy;
    }

    try {
      console.log('🏥 Checking ByT5 Expert health...');
      const testResult = await this.translate(
        'Bonjour',
        'french',
        'bariba',
        'fast',
        false
      );
      this.isHealthy = testResult.translation.length > 0;
      this.lastHealthCheck = Date.now();
      console.log(`🏥 ByT5 health: ${this.isHealthy ? '✅ OK' : '❌ DOWN'}`);
      return this.isHealthy;
    } catch (error) {
      console.error('❌ ByT5 health check failed:', error);
      this.isHealthy = false;
      this.lastHealthCheck = Date.now();
      return false;
    }
  }

  /**
   * Retourne l'état de santé du service (sans appel réseau)
   */
  getHealthStatus(): { isHealthy: boolean; lastCheck: number } {
    return {
      isHealthy: this.isHealthy,
      lastCheck: this.lastHealthCheck
    };
  }

  /**
   * Retourne les informations sur le modèle
   */
  getModelInfo() {
    return {
      id: 'byt5-expert',
      name: 'ByT5 Expert (Improved)',
      version: 'zimesongbian/modele_byt5_bariba_expert_api_v03_improve',
      description: 'Modèle ByT5 fine-tuné spécifiquement pour le Bariba avec correction grammaticale avancée',
      capabilities: {
        frenchToBariba: true,
        baribaToFrench: true,
        qualityMode: true,
        fastMode: true,
        advancedCorrection: true,
        reformulationSuggestions: true,
        maxChars: 500
      }
    };
  }
}

// Export singleton instance
export const byT5TranslationService = ByT5TranslationService.getInstance();
