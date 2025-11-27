/**
 * Service de vérification de santé de tous les modèles de traduction
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
}

class ModelHealthCheckService {
  private healthStatus: Map<string, ModelHealthStatus> = new Map();
  private checkInterval: number = 5 * 60 * 1000; // 5 minutes

  async checkAllModels(): Promise<ModelHealthStatus[]> {
    const models = [
      { id: 'smt', name: 'SMT Engine', checker: this.checkSMT },
      { id: 'simplified', name: 'SimplifiedAI', checker: this.checkSimplified },
      { id: 'baatonu', name: 'BaatonuAI', checker: this.checkBaatonu },
      { id: 'byt5-expert', name: 'ByT5 Expert', checker: this.checkByT5 },
      { id: 'lovable-ai', name: 'Lovable AI', checker: this.checkLovableAI },
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

  private async checkSMT(): Promise<ModelHealthStatus> {
    const start = Date.now();
    try {
      // Vérifier si les données SMT sont chargées
      const { data, error } = await supabase
        .from('training_phrases')
        .select('id', { count: 'exact', head: true });

      if (error) throw error;

      return {
        id: 'smt',
        name: 'SMT Engine',
        status: 'healthy',
        responseTime: Date.now() - start,
        lastChecked: Date.now(),
      };
    } catch (error) {
      return {
        id: 'smt',
        name: 'SMT Engine',
        status: 'offline',
        responseTime: Date.now() - start,
        lastChecked: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkSimplified(): Promise<ModelHealthStatus> {
    const start = Date.now();
    try {
      // SimplifiedAI est toujours disponible (local)
      return {
        id: 'simplified',
        name: 'SimplifiedAI',
        status: 'healthy',
        responseTime: Date.now() - start,
        lastChecked: Date.now(),
      };
    } catch (error) {
      return {
        id: 'simplified',
        name: 'SimplifiedAI',
        status: 'degraded',
        responseTime: Date.now() - start,
        lastChecked: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkBaatonu(): Promise<ModelHealthStatus> {
    const start = Date.now();
    try {
      // BaatonuAI est local aussi
      return {
        id: 'baatonu',
        name: 'BaatonuAI',
        status: 'healthy',
        responseTime: Date.now() - start,
        lastChecked: Date.now(),
      };
    } catch (error) {
      return {
        id: 'baatonu',
        name: 'BaatonuAI',
        status: 'degraded',
        responseTime: Date.now() - start,
        lastChecked: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkByT5(): Promise<ModelHealthStatus> {
    const start = Date.now();
    try {
      const isHealthy = await byT5TranslationService.checkHealth();
      return {
        id: 'byt5-expert',
        name: 'ByT5 Expert',
        status: isHealthy ? 'healthy' : 'degraded',
        responseTime: Date.now() - start,
        lastChecked: Date.now(),
      };
    } catch (error) {
      return {
        id: 'byt5-expert',
        name: 'ByT5 Expert',
        status: 'offline',
        responseTime: Date.now() - start,
        lastChecked: Date.now(),
        error: error instanceof Error ? error.message : 'HF Space offline',
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
        name: 'Lovable AI',
        status: error ? 'degraded' : 'healthy',
        responseTime: Date.now() - start,
        lastChecked: Date.now(),
        error: error?.message,
      };
    } catch (error) {
      return {
        id: 'lovable-ai',
        name: 'Lovable AI',
        status: 'offline',
        responseTime: Date.now() - start,
        lastChecked: Date.now(),
        error: error instanceof Error ? error.message : 'API unavailable',
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
