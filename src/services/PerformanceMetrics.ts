/**
 * Service de Métriques de Performance et Qualité
 * 
 * Collecte et analyse les métriques pour:
 * - Qualité des traductions (BLEU score approximatif)
 * - Performance des modèles (temps, confiance)
 * - Feedback utilisateurs
 */

import { supabase } from '@/integrations/supabase/client';

export interface TranslationMetrics {
  translationId?: string;
  method: 'idiom' | 'context' | 'rag' | 'simplified' | 'advanced' | 'ai' | 'fallback';
  sourceText: string;
  targetText: string;
  sourceLang: 'french' | 'bariba';
  targetLang: 'french' | 'bariba';
  confidence: number;
  duration: number;
  cost: number;
  timestamp: number;
  userId?: string;
  sessionId?: string;
}

export interface QualityMetrics {
  averageConfidence: number;
  averageDuration: number;
  totalCost: number;
  methodDistribution: Record<string, number>;
  successRate: number; // % de traductions avec confiance > 70%
  userSatisfaction?: number; // basé sur feedback
}

export class PerformanceMetrics {
  private metrics: TranslationMetrics[] = [];
  private readonly MAX_METRICS = 1000;

  /**
   * Enregistre une métrique de traduction
   */
  async recordTranslation(metric: TranslationMetrics): Promise<void> {
    // Ajouter à la mémoire locale
    this.metrics.push(metric);

    // Limiter la taille
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Enregistrer dans la base de données (async, non-bloquant)
    try {
      const { error } = await supabase.from('translation_logs').insert({
        input_text: metric.sourceText,
        output_text: metric.targetText,
        source_language: metric.sourceLang,
        target_language: metric.targetLang,
        translation_method: metric.method,
        confidence_score: metric.confidence,
        duration_ms: metric.duration,
        user_id: metric.userId,
        model_version: 'hybrid-v1.0'
      });

      if (error) {
        console.warn('⚠️ Erreur enregistrement métrique:', error);
      }
    } catch (error) {
      console.warn('⚠️ Impossible d\'enregistrer la métrique:', error);
    }
  }

  /**
   * Calcule les métriques de qualité globales
   */
  getQualityMetrics(lastN?: number): QualityMetrics {
    const metricsToAnalyze = lastN 
      ? this.metrics.slice(-lastN)
      : this.metrics;

    if (metricsToAnalyze.length === 0) {
      return {
        averageConfidence: 0,
        averageDuration: 0,
        totalCost: 0,
        methodDistribution: {},
        successRate: 0
      };
    }

    // Calculs
    const totalConfidence = metricsToAnalyze.reduce((sum, m) => sum + m.confidence, 0);
    const totalDuration = metricsToAnalyze.reduce((sum, m) => sum + m.duration, 0);
    const totalCost = metricsToAnalyze.reduce((sum, m) => sum + m.cost, 0);
    const successCount = metricsToAnalyze.filter(m => m.confidence > 70).length;

    // Distribution des méthodes
    const methodDistribution: Record<string, number> = {};
    metricsToAnalyze.forEach(m => {
      methodDistribution[m.method] = (methodDistribution[m.method] || 0) + 1;
    });

    return {
      averageConfidence: Math.round(totalConfidence / metricsToAnalyze.length),
      averageDuration: Math.round(totalDuration / metricsToAnalyze.length),
      totalCost: Math.round(totalCost * 1000) / 1000,
      methodDistribution,
      successRate: Math.round((successCount / metricsToAnalyze.length) * 100)
    };
  }

  /**
   * Calcule un score BLEU approximatif (n-gram overlap)
   */
  calculateApproximateBLEU(candidate: string, reference: string): number {
    const candidateTokens = candidate.toLowerCase().split(/\s+/);
    const referenceTokens = reference.toLowerCase().split(/\s+/);

    // Unigram precision
    const unigramMatches = candidateTokens.filter(t => referenceTokens.includes(t)).length;
    const unigramPrecision = candidateTokens.length > 0 
      ? unigramMatches / candidateTokens.length 
      : 0;

    // Bigram precision
    const candidateBigrams = this.generateBigrams(candidateTokens);
    const referenceBigrams = this.generateBigrams(referenceTokens);
    const bigramMatches = candidateBigrams.filter(b => referenceBigrams.includes(b)).length;
    const bigramPrecision = candidateBigrams.length > 0
      ? bigramMatches / candidateBigrams.length
      : 0;

    // Brevity penalty (penalize too short translations)
    const lengthRatio = candidateTokens.length / referenceTokens.length;
    const brevityPenalty = lengthRatio >= 1 ? 1 : Math.exp(1 - 1/lengthRatio);

    // Simplified BLEU score (geometric mean of unigram and bigram precision)
    const bleu = brevityPenalty * Math.sqrt(unigramPrecision * bigramPrecision);

    return Math.round(bleu * 100);
  }

  /**
   * Génère des bigrams à partir de tokens
   */
  private generateBigrams(tokens: string[]): string[] {
    const bigrams: string[] = [];
    for (let i = 0; i < tokens.length - 1; i++) {
      bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
    }
    return bigrams;
  }

  /**
   * Analyse les performances par méthode
   */
  getMethodPerformance(): Record<string, {
    count: number;
    avgConfidence: number;
    avgDuration: number;
    successRate: number;
  }> {
    const methodStats: Record<string, {
      confidences: number[];
      durations: number[];
      successes: number;
    }> = {};

    this.metrics.forEach(m => {
      if (!methodStats[m.method]) {
        methodStats[m.method] = {
          confidences: [],
          durations: [],
          successes: 0
        };
      }

      methodStats[m.method].confidences.push(m.confidence);
      methodStats[m.method].durations.push(m.duration);
      if (m.confidence > 70) {
        methodStats[m.method].successes++;
      }
    });

    const result: Record<string, any> = {};
    Object.entries(methodStats).forEach(([method, stats]) => {
      const count = stats.confidences.length;
      result[method] = {
        count,
        avgConfidence: Math.round(stats.confidences.reduce((a, b) => a + b, 0) / count),
        avgDuration: Math.round(stats.durations.reduce((a, b) => a + b, 0) / count),
        successRate: Math.round((stats.successes / count) * 100)
      };
    });

    return result;
  }

  /**
   * Récupère les métriques depuis la base de données
   */
  async loadHistoricalMetrics(limit: number = 1000): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('translation_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      if (data) {
        // Convertir en format TranslationMetrics
        this.metrics = data.map(log => ({
          translationId: log.id,
          method: log.translation_method as any || 'fallback',
          sourceText: log.input_text,
          targetText: log.output_text,
          sourceLang: log.source_language as any,
          targetLang: log.target_language as any,
          confidence: log.confidence_score || 0,
          duration: log.duration_ms || 0,
          cost: 0,
          timestamp: new Date(log.created_at || Date.now()).getTime(),
          userId: log.user_id || undefined
        }));

        console.log(`📊 ${this.metrics.length} métriques historiques chargées`);
      }
    } catch (error) {
      console.warn('⚠️ Impossible de charger les métriques historiques:', error);
    }
  }

  /**
   * Exporte les métriques au format CSV
   */
  exportToCSV(): string {
    const headers = ['Timestamp', 'Method', 'Source', 'Target', 'Confidence', 'Duration', 'Cost'];
    const rows = this.metrics.map(m => [
      new Date(m.timestamp).toISOString(),
      m.method,
      `"${m.sourceText.replace(/"/g, '""')}"`,
      `"${m.targetText.replace(/"/g, '""')}"`,
      m.confidence,
      m.duration,
      m.cost
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Nettoie les anciennes métriques
   */
  clearMetrics(): void {
    this.metrics = [];
    console.log('🧹 Métriques nettoyées');
  }
}

// Export singleton
export const performanceMetrics = new PerformanceMetrics();
