/**
 * Service de monitoring en temps réel des services audio (TTS, STT, ByT5)
 * Capture toutes les métriques d'utilisation pour le dashboard admin
 */

export interface AudioServiceMetric {
  id: string;
  timestamp: number;
  serviceType: 'tts' | 'stt' | 'byt5';
  language: 'bariba' | 'french';
  duration: number; // ms
  success: boolean;
  error?: string;
  inputLength?: number; // chars for TTS, bytes for STT
  outputLength?: number;
  userId?: string;
}

export interface AudioServicesStats {
  totalCalls: number;
  successRate: number;
  avgDuration: number;
  byService: {
    [key: string]: {
      count: number;
      successRate: number;
      avgDuration: number;
      lastCall: number | null;
      errors: number;
    };
  };
  last24hCalls: number;
  peakHour: number | null;
  recentCalls: AudioServiceMetric[];
  hourlyDistribution: { hour: number; count: number }[];
}

class AudioServicesMonitoringService {
  private metrics: AudioServiceMetric[] = [];
  private listeners: Set<(stats: AudioServicesStats) => void> = new Set();
  private maxMetrics = 5000;

  logCall(metric: Omit<AudioServiceMetric, 'id' | 'timestamp'>): void {
    const fullMetric: AudioServiceMetric = {
      ...metric,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    this.metrics.push(fullMetric);

    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    this.notifyListeners();

    const status = metric.success ? '✅' : '❌';
    console.log(`🎵 Audio Monitoring: ${status} ${metric.serviceType} (${metric.language}) - ${metric.duration}ms`);
  }

  subscribe(listener: (stats: AudioServicesStats) => void): () => void {
    this.listeners.add(listener);
    listener(this.getStats());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const stats = this.getStats();
    this.listeners.forEach(listener => listener(stats));
  }

  getStats(): AudioServicesStats {
    if (this.metrics.length === 0) {
      return {
        totalCalls: 0,
        successRate: 0,
        avgDuration: 0,
        byService: {},
        last24hCalls: 0,
        peakHour: null,
        recentCalls: [],
        hourlyDistribution: []
      };
    }

    const totalCalls = this.metrics.length;
    const successfulCalls = this.metrics.filter(m => m.success).length;
    const successRate = Math.round((successfulCalls / totalCalls) * 100);
    const avgDuration = Math.round(
      this.metrics.filter(m => m.success).reduce((sum, m) => sum + m.duration, 0) / 
      (successfulCalls || 1)
    );

    // Stats by service
    const byService: AudioServicesStats['byService'] = {};
    const serviceKeys = ['tts-bariba', 'tts-french', 'stt-bariba', 'stt-french', 'byt5-bariba', 'byt5-french'];
    
    for (const key of serviceKeys) {
      const [type, lang] = key.split('-') as ['tts' | 'stt' | 'byt5', 'bariba' | 'french'];
      const serviceMetrics = this.metrics.filter(m => m.serviceType === type && m.language === lang);
      
      if (serviceMetrics.length > 0) {
        const successCount = serviceMetrics.filter(m => m.success).length;
        byService[key] = {
          count: serviceMetrics.length,
          successRate: Math.round((successCount / serviceMetrics.length) * 100),
          avgDuration: Math.round(serviceMetrics.filter(m => m.success).reduce((s, m) => s + m.duration, 0) / (successCount || 1)),
          lastCall: serviceMetrics[serviceMetrics.length - 1]?.timestamp || null,
          errors: serviceMetrics.length - successCount
        };
      }
    }

    // Last 24h
    const cutoff24h = Date.now() - 24 * 60 * 60 * 1000;
    const last24hMetrics = this.metrics.filter(m => m.timestamp >= cutoff24h);
    const last24hCalls = last24hMetrics.length;

    // Hourly distribution
    const hourCounts = new Map<number, number>();
    for (const m of last24hMetrics) {
      const hour = new Date(m.timestamp).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }
    
    const hourlyDistribution = Array.from(hourCounts.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour);

    const peakHour = hourlyDistribution.length > 0 
      ? hourlyDistribution.reduce((max, h) => h.count > max.count ? h : max).hour 
      : null;

    return {
      totalCalls,
      successRate,
      avgDuration,
      byService,
      last24hCalls,
      peakHour,
      recentCalls: this.metrics.slice(-20).reverse(),
      hourlyDistribution
    };
  }

  reset(): void {
    this.metrics = [];
    this.notifyListeners();
  }

  getMetrics(): AudioServiceMetric[] {
    return [...this.metrics];
  }
}

export const audioServicesMonitoring = new AudioServicesMonitoringService();
