/**
 * Service de monitoring en temps réel des traductions
 * Capture toutes les métriques de performance pour analyse
 */

export interface TranslationMetric {
  id: string;
  timestamp: number;
  inputText: string;
  outputText: string;
  sourceLang: 'french' | 'bariba';
  targetLang: 'french' | 'bariba';
  method: 'idiom' | 'context' | 'rag' | 'simplified' | 'advanced' | 'ai' | 'fallback';
  confidence: number;
  duration: number;
  cost: number;
  wordCount: number;
}

export interface MonitoringStats {
  totalTranslations: number;
  avgConfidence: number;
  avgDuration: number;
  totalCost: number;
  byMethod: {
    [key: string]: {
      count: number;
      avgConfidence: number;
      avgDuration: number;
      percentage: number;
    };
  };
  last10Translations: TranslationMetric[];
}

class TranslationMonitoringService {
  private metrics: TranslationMetric[] = [];
  private listeners: Set<(stats: MonitoringStats) => void> = new Set();
  private maxMetrics = 1000; // Garder les 1000 dernières traductions

  /**
   * Enregistrer une nouvelle métrique de traduction
   */
  logTranslation(metric: Omit<TranslationMetric, 'id' | 'timestamp' | 'wordCount'>): void {
    const wordCount = metric.inputText.split(/\s+/).length;
    
    const fullMetric: TranslationMetric = {
      ...metric,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      wordCount
    };

    this.metrics.push(fullMetric);

    // Limiter le nombre de métriques en mémoire
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Notifier tous les listeners
    this.notifyListeners();

    // Log dans la console pour debugging
    console.log(`📊 Monitoring: ${metric.method} (${metric.confidence}%, ${metric.duration}ms)`);
  }

  /**
   * S'abonner aux changements de statistiques
   */
  subscribe(listener: (stats: MonitoringStats) => void): () => void {
    this.listeners.add(listener);
    
    // Envoyer immédiatement les stats actuelles
    listener(this.getStats());
    
    // Retourner une fonction de désabonnement
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notifier tous les listeners
   */
  private notifyListeners(): void {
    const stats = this.getStats();
    this.listeners.forEach(listener => listener(stats));
  }

  /**
   * Calculer les statistiques globales
   */
  getStats(): MonitoringStats {
    if (this.metrics.length === 0) {
      return {
        totalTranslations: 0,
        avgConfidence: 0,
        avgDuration: 0,
        totalCost: 0,
        byMethod: {},
        last10Translations: []
      };
    }

    const totalTranslations = this.metrics.length;
    const avgConfidence = this.metrics.reduce((sum, m) => sum + m.confidence, 0) / totalTranslations;
    const avgDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0) / totalTranslations;
    const totalCost = this.metrics.reduce((sum, m) => sum + m.cost, 0);

    // Statistiques par méthode
    const byMethod: MonitoringStats['byMethod'] = {};
    const methodCounts = new Map<string, TranslationMetric[]>();

    for (const metric of this.metrics) {
      if (!methodCounts.has(metric.method)) {
        methodCounts.set(metric.method, []);
      }
      methodCounts.get(metric.method)!.push(metric);
    }

    for (const [method, metrics] of methodCounts.entries()) {
      const count = metrics.length;
      const avgConf = metrics.reduce((sum, m) => sum + m.confidence, 0) / count;
      const avgDur = metrics.reduce((sum, m) => sum + m.duration, 0) / count;
      
      byMethod[method] = {
        count,
        avgConfidence: Math.round(avgConf * 10) / 10,
        avgDuration: Math.round(avgDur),
        percentage: Math.round((count / totalTranslations) * 100)
      };
    }

    // Dernières 10 traductions (ordre inverse)
    const last10Translations = this.metrics.slice(-10).reverse();

    return {
      totalTranslations,
      avgConfidence: Math.round(avgConfidence * 10) / 10,
      avgDuration: Math.round(avgDuration),
      totalCost,
      byMethod,
      last10Translations
    };
  }

  /**
   * Réinitialiser toutes les métriques
   */
  reset(): void {
    this.metrics = [];
    this.notifyListeners();
  }

  /**
   * Obtenir les métriques brutes pour export
   */
  getMetrics(): TranslationMetric[] {
    return [...this.metrics];
  }

  /**
   * Obtenir les statistiques des dernières N minutes
   */
  getRecentStats(minutes: number = 5): MonitoringStats {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff);
    
    // Créer un service temporaire pour calculer les stats
    const tempService = new TranslationMonitoringService();
    tempService.metrics = recentMetrics;
    return tempService.getStats();
  }
}

// Export singleton
export const translationMonitoring = new TranslationMonitoringService();
