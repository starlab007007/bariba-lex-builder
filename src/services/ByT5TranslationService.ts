/**
 * Service de traduction FITILA (fonction edge byt5-bariba-translate).
 * Moteur principal : ByT5 Expert (Space Hugging Face). Si ce moteur est
 * indisponible, la fonction edge répond avec le corpus validé FITILA
 * (method « fitila-corpus:* », fallback: true) au lieu d'une erreur.
 */

import { supabase } from "@/integrations/supabase/client";

export interface ByT5TranslationResult {
  translation: string;
  confidence: number;
  duration: number;
  method: string;
  fallback?: boolean;
  notice?: string;
  suggestions?: string;
  modelInfo?: {
    name: string;
    version: string;
    mode: string;
    advanced: boolean;
  };
}

class ByT5TranslationService {
  private static instance: ByT5TranslationService;
  private isHealthy: boolean = false;
  private lastHealthCheck: number = 0;
  private healthCheckInterval: number = 60000;
  private healthCheckPromise: Promise<boolean> | null = null;

  private constructor() {}

  static getInstance(): ByT5TranslationService {
    if (!ByT5TranslationService.instance) {
      ByT5TranslationService.instance = new ByT5TranslationService();
    }
    return ByT5TranslationService.instance;
  }

  async translate(
    text: string,
    sourceLang: 'french' | 'bariba',
    targetLang: 'french' | 'bariba',
    mode: 'quality' | 'fast' = 'quality',
    advanced: boolean = true
  ): Promise<ByT5TranslationResult> {
    const startTime = Date.now();

    const invalidPatterns = [
      'Share via Link', 'share via', 'Loading', 'Submit',
      'Clear', 'Button', 'Click', 'Select', 'Choose',
    ];
    const isValid = (t: unknown) =>
      typeof t === 'string' &&
      t.trim().length > 0 &&
      !invalidPatterns.some((p) => t.toLowerCase().includes(p.toLowerCase()));

    try {
      console.log(`🤖 ByT5TranslationService: Calling Edge Function...`);

      const { data, error } = await supabase.functions.invoke('byt5-bariba-translate', {
        body: { text, sourceLang, targetLang, mode, advanced },
      });

      if (error) {
        console.error('❌ ByT5 Edge Function error:', error);
        this.isHealthy = false;
        this.lastHealthCheck = Date.now();
        // FunctionsHttpError : le corps JSON de la réponse porte le vrai message.
        let message = error.message || 'Erreur du service de traduction';
        const ctx = (error as { context?: Response }).context;
        if (ctx && typeof ctx.json === 'function') {
          try {
            const body = await ctx.json();
            message = body?.details || body?.error || message;
          } catch { /* corps non JSON */ }
        }
        throw new Error(message);
      }

      if (data?.error) {
        console.error('❌ ByT5 returned error:', data.error, data.details);
        this.isHealthy = false;
        this.lastHealthCheck = Date.now();
        throw new Error(data.details || data.error || 'ByT5 returned error');
      }

      if (!isValid(data?.translation)) {
        console.error('❌ ByT5 returned invalid translation:', data?.translation);
        this.isHealthy = false;
        this.lastHealthCheck = Date.now();
        throw new Error('ByT5 returned invalid translation');
      }

      this.isHealthy = true;
      this.lastHealthCheck = Date.now();

      console.log(`✅ ByT5 translation received in ${data.duration || (Date.now() - startTime)}ms`);

      return {
        translation: data.translation,
        confidence: data.confidence || 85,
        duration: data.duration || (Date.now() - startTime),
        method: data.method || 'byt5-expert',
        fallback: !!data.fallback,
        notice: data.notice,
        suggestions: data.suggestions,
        modelInfo: data.modelInfo,
      };
    } catch (error) {
      this.isHealthy = false;
      this.lastHealthCheck = Date.now();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ ByT5TranslationService error: ${errorMessage}`);
      throw error;
    }
  }

  async checkHealth(): Promise<boolean> {
    if (Date.now() - this.lastHealthCheck < this.healthCheckInterval) {
      return this.isHealthy;
    }

    if (this.healthCheckPromise) {
      return this.healthCheckPromise;
    }

    this.healthCheckPromise = (async () => {
      try {
        console.log('🏥 ByT5 health check...');
        const { data, error } = await supabase.functions.invoke('byt5-bariba-translate', {
          body: { healthCheck: true },
        });
        const healthy = !error && !!data?.healthy;
        this.isHealthy = healthy;
        this.lastHealthCheck = Date.now();
        console.log(`🏥 ByT5 health: ${healthy ? '✅ OK' : '❌ Failed'}`);
        return healthy;
      } catch {
        console.log('🏥 ByT5 health: ❌ Failed');
        this.isHealthy = false;
        this.lastHealthCheck = Date.now();
        return false;
      } finally {
        this.healthCheckPromise = null;
      }
    })();

    return this.healthCheckPromise;
  }

  getHealthStatus(): { isHealthy: boolean; lastCheck: number } {
    return { isHealthy: this.isHealthy, lastCheck: this.lastHealthCheck };
  }

  getModelInfo() {
    return {
      name: 'ByT5 Expert',
      version: 'zimesongbian/modele_byt5_bariba_expert_api_v03_improve',
      description: 'Modèle ByT5 fine-tuné pour la traduction Français-Bariba',
      isAvailable: this.isHealthy
    };
  }
}

export const byT5TranslationService = ByT5TranslationService.getInstance();
