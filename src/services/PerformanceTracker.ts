import { supabase } from '@/integrations/supabase/client';

export class TranslationPerformanceTracker {
  private modelVersion = '1.0.0';

  async logTranslation(
    inputText: string,
    outputText: string,
    sourceLang: string,
    targetLang: string,
    confidence: number
  ) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('translation_logs').insert({
        input_text: inputText,
        output_text: outputText,
        source_language: sourceLang,
        target_language: targetLang,
        confidence_score: confidence,
        model_version: this.modelVersion,
        user_id: user?.id || null,
      });

      if (error) {
        console.error('Error logging translation:', error);
      }
    } catch (error) {
      console.error('Error logging translation:', error);
    }
  }

  async calculateMetrics() {
    try {
      const { data: logs, error: logsError } = await supabase
        .from('translation_logs')
        .select('confidence_score, created_at')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (logsError) throw logsError;

      if (!logs || logs.length === 0) {
        return {
          totalTranslations: 0,
          averageConfidence: 0,
          successRate: 0,
        };
      }

      const totalTranslations = logs.length;
      const averageConfidence =
        logs.reduce((sum, log) => sum + (log.confidence_score || 0), 0) /
        totalTranslations;
      const successRate = (logs.filter((log) => (log.confidence_score || 0) >= 70).length /
        totalTranslations) * 100;

      return {
        totalTranslations,
        averageConfidence: Math.round(averageConfidence * 100) / 100,
        successRate: Math.round(successRate * 100) / 100,
      };
    } catch (error) {
      console.error('Error calculating metrics:', error);
      return {
        totalTranslations: 0,
        averageConfidence: 0,
        successRate: 0,
      };
    }
  }

  async saveModelPerformance(metrics: Record<string, number>) {
    try {
      const entries = Object.entries(metrics).map(([name, value]) => ({
        model_version: this.modelVersion,
        metric_name: name,
        metric_value: value,
      }));

      const { error } = await supabase
        .from('model_performance')
        .insert(entries);

      if (error) {
        console.error('Error saving model performance:', error);
      }
    } catch (error) {
      console.error('Error saving model performance:', error);
    }
  }

  getCurrentModelVersion() {
    return this.modelVersion;
  }
}

export const performanceTracker = new TranslationPerformanceTracker();
