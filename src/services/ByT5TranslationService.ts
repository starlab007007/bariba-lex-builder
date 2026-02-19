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
    advanced: boolean;
  };
}

const TIMEOUT_MS = 8000; // 8 seconds client-side timeout (reduced for better UX)

class ByT5TranslationService {
  private static instance: ByT5TranslationService;
  private isHealthy: boolean = false;
  private lastHealthCheck: number = 0;
  private healthCheckInterval: number = 60000; // 1 minute
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
      'Share via Link',
      'share via',
      'Loading',
      'Submit',
      'Clear',
      'Button',
      'Click',
      'Select',
      'Choose',
    ];
    const isValid = (t: unknown) =>
      typeof t === 'string' &&
      t.trim().length > 0 &&
      !invalidPatterns.some((p) => t.toLowerCase().includes(p.toLowerCase()));

    const knowledgeFallback = async (reason: string): Promise<ByT5TranslationResult> => {
      console.warn(`⚠️ ByT5 fallback → Knowledge Base (${reason})`);
      const direction = sourceLang === 'french' ? 'fr-ba' : 'ba-fr';
      const { data: refineData, error: refineError } = await supabase.functions.invoke('refine-bariba', {
        body: { text, type: 'translate', direction },
      });

      if (refineError) {
        throw new Error(refineError.message || 'Knowledge-based translation unavailable');
      }

      if (!refineData?.refined?.trim()) {
        throw new Error('No translation received from knowledge base');
      }

      return {
        translation: refineData.refined,
        confidence: refineData.confidence || 80,
        duration: Date.now() - startTime,
        method: 'knowledge-based',
        modelInfo: { name: 'Bariba Knowledge Base', version: 'refine-bariba', mode: 'translate', advanced: false },
      };
    };

    // Skip ByT5 if known unhealthy → fallback directly
    if (!this.isHealthy && Date.now() - this.lastHealthCheck < this.healthCheckInterval) {
      return knowledgeFallback('service marked unhealthy');
    }

    // (Note) supabase.functions.invoke does not support AbortSignal; keep TIMEOUT_MS for future transport.
    const timeoutId = setTimeout(() => {}, TIMEOUT_MS);

    try {
      console.log(`🤖 ByT5TranslationService: Calling Edge Function...`);

      const { data, error } = await supabase.functions.invoke('byt5-bariba-translate', {
        body: {
          text,
          sourceLang,
          targetLang,
          mode,
          advanced,
        },
      });

      clearTimeout(timeoutId);

      if (error) {
        console.error('❌ ByT5 Edge Function error:', error);
        this.isHealthy = false;
        this.lastHealthCheck = Date.now();
        return knowledgeFallback(error.message || 'edge function error');
      }

      if (data?.error) {
        console.error('❌ ByT5 returned error:', data.error, data.details);
        this.isHealthy = false;
        this.lastHealthCheck = Date.now();
        return knowledgeFallback(data.details || data.error || 'ByT5 returned error');
      }

      if (!isValid(data?.translation)) {
        console.error('❌ ByT5 returned invalid translation:', data?.translation);
        this.isHealthy = false;
        this.lastHealthCheck = Date.now();
        return knowledgeFallback('invalid translation payload');
      }

      this.isHealthy = true;
      this.lastHealthCheck = Date.now();

      console.log(`✅ ByT5 translation received in ${data.duration || (Date.now() - startTime)}ms`);

      return {
        translation: data.translation,
        confidence: data.confidence || 85,
        duration: data.duration || (Date.now() - startTime),
        method: 'byt5-expert',
        suggestions: data.suggestions,
        modelInfo: data.modelInfo,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      this.isHealthy = false;
      this.lastHealthCheck = Date.now();

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ ByT5TranslationService fatal error: ${errorMessage}`);

      // Final attempt: Lovable fallback
      return knowledgeFallback(`exception: ${errorMessage}`);
    }
  }

  async checkHealth(): Promise<boolean> {
    // Use cached result if recent
    if (Date.now() - this.lastHealthCheck < this.healthCheckInterval) {
      return this.isHealthy;
    }

    // De-dupe concurrent checks (feed can mount many cards at once)
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
    return {
      isHealthy: this.isHealthy,
      lastCheck: this.lastHealthCheck
    };
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
