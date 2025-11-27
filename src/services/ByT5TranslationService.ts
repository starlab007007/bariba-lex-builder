/**
 * Service de traduction utilisant le modèle ByT5 Expert
 * via l'API Gradio Space de Hugging Face
 */

import { supabase } from "@/integrations/supabase/client";

export interface ByT5TranslationResult {
  translation: string;
  confidence: number;
  duration: number;
  method: string;
  modelInfo?: {
    name: string;
    version: string;
    mode: string;
  };
}

export class ByT5TranslationService {
  private static instance: ByT5TranslationService;

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
    mode: 'quality' | 'fast' = 'quality'
  ): Promise<ByT5TranslationResult> {
    const startTime = Date.now();

    try {
      console.log(`🤖 ByT5 Expert: translating ${sourceLang} → ${targetLang} (${mode} mode)`);

      const { data, error } = await supabase.functions.invoke('byt5-bariba-translate', {
        body: {
          text,
          sourceLang,
          targetLang,
          mode
        }
      });

      if (error) {
        console.error('❌ ByT5 Edge Function error:', error);
        throw new Error(`ByT5 translation failed: ${error.message}`);
      }

      if (!data || !data.translation) {
        console.error('❌ Invalid ByT5 response:', data);
        throw new Error('Invalid response from ByT5 service');
      }

      const totalDuration = Date.now() - startTime;

      console.log(`✅ ByT5 translation completed in ${totalDuration}ms (confidence: ${data.confidence}%)`);

      return {
        translation: data.translation,
        confidence: data.confidence,
        duration: totalDuration,
        method: 'byt5-expert',
        modelInfo: data.modelInfo
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ ByT5 translation error after ${duration}ms:`, error);
      throw error;
    }
  }

  /**
   * Vérifie si le service ByT5 est disponible
   */
  async checkHealth(): Promise<boolean> {
    try {
      const testResult = await this.translate(
        'Bonjour',
        'french',
        'bariba',
        'fast'
      );
      return testResult.translation.length > 0;
    } catch (error) {
      console.error('ByT5 health check failed:', error);
      return false;
    }
  }

  /**
   * Retourne les informations sur le modèle
   */
  getModelInfo() {
    return {
      id: 'byt5-expert',
      name: 'ByT5 Expert',
      version: 'zimesongbian/modele_byt5_bariba_expert_api_v03',
      description: 'Modèle ByT5 fine-tuné spécifiquement pour le Bariba',
      capabilities: {
        frenchToBariba: true,
        baribaToFrench: true,
        qualityMode: true,
        fastMode: true,
        maxChars: 300
      }
    };
  }
}

// Export singleton instance
export const byT5TranslationService = ByT5TranslationService.getInstance();
