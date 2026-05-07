/**
 * Service de vérification de santé des modèles de traduction et audio
 * Modèles actifs : ByT5 Expert, Bariba TTS, Bariba STT, Lovable AI
 */

import { supabase } from "@/integrations/supabase/client";
import { byT5TranslationService } from "./ByT5TranslationService";

export interface ModelHealthStatus {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'offline';
  responseTime: number;
  lastChecked: number;
  error?: string;
  endpoint?: string;
}

class ModelHealthCheckService {
  private healthStatus: Map<string, ModelHealthStatus> = new Map();

  async checkAllModels(): Promise<ModelHealthStatus[]> {
    const models = [
      { id: 'byt5-expert', name: 'ByT5 Expert (Translation)', checker: this.checkByT5 },
      { id: 'bariba-tts', name: 'Bariba TTS', checker: this.checkBaribaTTS },
      { id: 'bariba-stt', name: 'Bariba STT', checker: this.checkBaribaSTT },
      { id: 'lovable-ai', name: 'Lovable AI (Fallback)', checker: this.checkLovableAI },
    ];

    const results = await Promise.all(
      models.map(async (model) => {
        const status = await model.checker.call(this);
        this.healthStatus.set(model.id, status);
        return status;
      })
    );

    return results;
  }

  private async checkByT5(): Promise<ModelHealthStatus> {
    const start = Date.now();
    const endpoint = 'https://zimesongbian-modele-byt5-bariba-expert-api-v03-improve.hf.space';
    
    try {
      const isHealthy = await byT5TranslationService.checkHealth();
      return {
        id: 'byt5-expert',
        name: 'ByT5 Expert (Translation)',
        status: isHealthy ? 'healthy' : 'degraded',
        responseTime: Date.now() - start,
        lastChecked: Date.now(),
        endpoint,
      };
    } catch (error) {
      return {
        id: 'byt5-expert',
        name: 'ByT5 Expert (Translation)',
        status: 'offline',
        responseTime: Date.now() - start,
        lastChecked: Date.now(),
        error: error instanceof Error ? error.message : 'HF Space offline',
        endpoint,
      };
    }
  }

  private async checkBaribaTTS(): Promise<ModelHealthStatus> {
    const start = Date.now();
    const endpoint = 'https://zimesongbian-baatonum-tts-api-v001.hf.space';
    
    try {
      const response = await fetch(`${endpoint}/`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
      });
      
      return {
        id: 'bariba-tts',
        name: 'Bariba TTS',
        status: response.ok ? 'healthy' : 'degraded',
        responseTime: Date.now() - start,
        lastChecked: Date.now(),
        endpoint,
      };
    } catch (error) {
      return {
        id: 'bariba-tts',
        name: 'Bariba TTS',
        status: 'offline',
        responseTime: Date.now() - start,
        lastChecked: Date.now(),
        error: error instanceof Error ? error.message : 'HF Space offline',
        endpoint,
      };
    }
  }

  private async checkBaribaSTT(): Promise<ModelHealthStatus> {
    const start = Date.now();
    const endpoint = 'https://zimesongbian-baatonum-asr-stt-api-v001-improve.hf.space';
    
    try {
      const response = await fetch(`${endpoint}/`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
      });
      
      return {
        id: 'bariba-stt',
        name: 'Bariba STT',
        status: response.ok ? 'healthy' : 'degraded',
        responseTime: Date.now() - start,
        lastChecked: Date.now(),
        endpoint,
      };
    } catch (error) {
      return {
        id: 'bariba-stt',
        name: 'Bariba STT',
        status: 'offline',
        responseTime: Date.now() - start,
        lastChecked: Date.now(),
        error: error instanceof Error ? error.message : 'HF Space offline',
        endpoint,
      };
    }
  }

  private async checkLovableAI(): Promise<ModelHealthStatus> {
    const start = Date.now();
    
    try {
      const { error } = await supabase.functions.invoke('ai-translate-lovable', {
        body: { text: 'test', sourceLang: 'french', targetLang: 'bariba' }
      });

      return {
        id: 'lovable-ai',
        name: 'Lovable AI (Fallback)',
        status: error ? 'degraded' : 'healthy',
        responseTime: Date.now() - start,
        lastChecked: Date.now(),
        error: error?.message,
        endpoint: 'Lovable Cloud Edge Function',
      };
    } catch (error) {
      return {
        id: 'lovable-ai',
        name: 'Lovable AI (Fallback)',
        status: 'offline',
        responseTime: Date.now() - start,
        lastChecked: Date.now(),
        error: error instanceof Error ? error.message : 'API unavailable',
        endpoint: 'Lovable Cloud Edge Function',
      };
    }
  }

  getStatus(modelId: string): ModelHealthStatus | undefined {
    return this.healthStatus.get(modelId);
  }

  getAllStatuses(): ModelHealthStatus[] {
    return Array.from(this.healthStatus.values());
  }
}

export const modelHealthCheck = new ModelHealthCheckService();
