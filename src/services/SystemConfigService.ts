/**
 * Service de Configuration Système
 * 
 * Gère tous les paramètres configurables de la plateforme
 * - Limites de requêtes dynamiques
 * - Paramètres de performance
 * - Configuration des modèles
 */

export interface SystemConfig {
  // Limites de requêtes
  databaseQueryLimit: number;
  performanceMetricsLimit: number;
  translationLogsLimit: number;
  
  // SMT Configuration
  smtBeamSize: number;
  smtMaxPhrases: number;
  
  // Cache Configuration
  cacheMaxEntries: number;
  cacheExpiryHours: number;
  
  // Training Configuration
  maxTrainingPhrases: number | null; // null = illimité
  batchSize: number;
  
  // Performance
  translationTimeout: number; // ms
  maxConcurrentRequests: number;
}

class SystemConfigService {
  private config: SystemConfig;
  private readonly STORAGE_KEY = 'system_config_v1';
  private readonly DEFAULT_CONFIG: SystemConfig = {
    // Limites par défaut (dynamiques et raisonnables)
    databaseQueryLimit: 5000,
    performanceMetricsLimit: 2000,
    translationLogsLimit: 1000,
    
    // SMT
    smtBeamSize: 12,
    smtMaxPhrases: 100000, // Utiliser toutes les données disponibles
    
    // Cache
    cacheMaxEntries: 10000,
    cacheExpiryHours: 168, // 7 jours
    
    // Training
    maxTrainingPhrases: null, // Pas de limite par défaut
    batchSize: 100,
    
    // Performance
    translationTimeout: 30000, // 30s
    maxConcurrentRequests: 5
  };

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Charge la configuration depuis localStorage ou utilise les valeurs par défaut
   */
  private loadConfig(): SystemConfig {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Fusionner avec les valeurs par défaut pour les nouvelles clés
        return { ...this.DEFAULT_CONFIG, ...parsed };
      }
    } catch (error) {
      console.warn('Erreur chargement config, utilisation des valeurs par défaut:', error);
    }
    return { ...this.DEFAULT_CONFIG };
  }

  /**
   * Sauvegarde la configuration dans localStorage
   */
  private saveConfig(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
      console.log('✅ Configuration sauvegardée');
    } catch (error) {
      console.error('Erreur sauvegarde config:', error);
    }
  }

  /**
   * Récupère toute la configuration
   */
  getConfig(): SystemConfig {
    return { ...this.config };
  }

  /**
   * Met à jour un ou plusieurs paramètres
   */
  updateConfig(updates: Partial<SystemConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
    console.log('🔄 Configuration mise à jour:', updates);
  }

  /**
   * Réinitialise la configuration aux valeurs par défaut
   */
  resetConfig(): void {
    this.config = { ...this.DEFAULT_CONFIG };
    this.saveConfig();
    console.log('🔄 Configuration réinitialisée');
  }

  /**
   * Récupère une valeur spécifique
   */
  get<K extends keyof SystemConfig>(key: K): SystemConfig[K] {
    return this.config[key];
  }

  /**
   * Met à jour une valeur spécifique
   */
  set<K extends keyof SystemConfig>(key: K, value: SystemConfig[K]): void {
    this.config[key] = value;
    this.saveConfig();
  }

  /**
   * Valide la configuration
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.config.databaseQueryLimit < 100 || this.config.databaseQueryLimit > 50000) {
      errors.push('databaseQueryLimit doit être entre 100 et 50000');
    }

    if (this.config.smtBeamSize < 1 || this.config.smtBeamSize > 50) {
      errors.push('smtBeamSize doit être entre 1 et 50');
    }

    if (this.config.batchSize < 10 || this.config.batchSize > 1000) {
      errors.push('batchSize doit être entre 10 et 1000');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Exporte la configuration en JSON
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Importe une configuration depuis JSON
   */
  importConfig(json: string): boolean {
    try {
      const imported = JSON.parse(json);
      const validation = this.validateConfig();
      
      if (!validation.isValid) {
        console.error('Configuration invalide:', validation.errors);
        return false;
      }

      this.config = { ...this.DEFAULT_CONFIG, ...imported };
      this.saveConfig();
      return true;
    } catch (error) {
      console.error('Erreur import config:', error);
      return false;
    }
  }
}

// Export singleton
export const systemConfig = new SystemConfigService();
