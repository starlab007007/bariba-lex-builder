/**
 * Gestionnaire de Contexte Conversationnel
 * 
 * Maintient une mémoire des N dernières traductions pour:
 * - Cohérence terminologique dans une session
 * - Détection de patterns récurrents
 * - Adaptation du style selon le contexte
 */

export interface ConversationContext {
  sessionId: string;
  translations: Array<{
    source: string;
    target: string;
    sourceLang: 'french' | 'bariba';
    targetLang: 'french' | 'bariba';
    timestamp: number;
    confidence: number;
    domain?: string;
    register?: string;
  }>;
  terminology: Map<string, string>; // Termes récurrents et leurs traductions
  userPreferences: {
    formalityLevel?: 'formal' | 'informal';
    preferredVariants?: string[];
  };
}

export class ContextManager {
  private contexts: Map<string, ConversationContext> = new Map();
  private readonly MAX_HISTORY = 100; // Nombre max de traductions par session
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  /**
   * Crée ou récupère une session de contexte
   */
  getOrCreateSession(sessionId: string): ConversationContext {
    if (!this.contexts.has(sessionId)) {
      this.contexts.set(sessionId, {
        sessionId,
        translations: [],
        terminology: new Map(),
        userPreferences: {}
      });
    }

    const context = this.contexts.get(sessionId)!;
    
    // Nettoyer les anciennes entrées
    this.cleanOldEntries(context);
    
    return context;
  }

  /**
   * Ajoute une traduction au contexte
   */
  addTranslation(
    sessionId: string,
    source: string,
    target: string,
    sourceLang: 'french' | 'bariba',
    targetLang: 'french' | 'bariba',
    confidence: number,
    metadata?: {
      domain?: string;
      register?: string;
    }
  ): void {
    const context = this.getOrCreateSession(sessionId);

    // Ajouter la traduction
    context.translations.push({
      source,
      target,
      sourceLang,
      targetLang,
      timestamp: Date.now(),
      confidence,
      domain: metadata?.domain,
      register: metadata?.register
    });

    // Limiter la taille de l'historique
    if (context.translations.length > this.MAX_HISTORY) {
      context.translations = context.translations.slice(-this.MAX_HISTORY);
    }

    // Mettre à jour la terminologie récurrente
    this.updateTerminology(context, source, target, sourceLang);
  }

  /**
   * Met à jour la terminologie récurrente
   */
  private updateTerminology(
    context: ConversationContext,
    source: string,
    target: string,
    sourceLang: 'french' | 'bariba'
  ): void {
    // Extraire les mots clés (>3 caractères)
    const keywords = source.split(/\s+/).filter(w => w.length > 3);
    const targetWords = target.split(/\s+/);

    // Si c'est une traduction mot-à-mot, associer les termes
    if (keywords.length === targetWords.length && keywords.length <= 3) {
      keywords.forEach((keyword, index) => {
        const key = `${sourceLang}:${keyword.toLowerCase()}`;
        if (!context.terminology.has(key)) {
          context.terminology.set(key, targetWords[index]);
        }
      });
    }
  }

  /**
   * Trouve une traduction similaire dans le contexte
   */
  findSimilarTranslation(
    sessionId: string,
    text: string,
    sourceLang: 'french' | 'bariba'
  ): { translation: string; confidence: number } | null {
    const context = this.contexts.get(sessionId);
    if (!context) return null;

    const textLower = text.toLowerCase().trim();

    // Recherche exacte
    for (const t of context.translations) {
      if (t.sourceLang === sourceLang && t.source.toLowerCase() === textLower) {
        return {
          translation: t.target,
          confidence: Math.min(95, t.confidence + 5) // Bonus de confiance pour contexte
        };
      }
    }

    // Recherche par similarité (Jaccard)
    const textWords = new Set(textLower.split(/\s+/));
    let bestMatch: { translation: string; confidence: number } | null = null;
    let bestSimilarity = 0;

    for (const t of context.translations) {
      if (t.sourceLang !== sourceLang) continue;

      const candidateWords = new Set(t.source.toLowerCase().split(/\s+/));
      const intersection = new Set([...textWords].filter(w => candidateWords.has(w)));
      const union = new Set([...textWords, ...candidateWords]);
      const similarity = intersection.size / union.size;

      if (similarity > bestSimilarity && similarity > 0.6) {
        bestSimilarity = similarity;
        bestMatch = {
          translation: t.target,
          confidence: Math.round(similarity * t.confidence)
        };
      }
    }

    return bestMatch;
  }

  /**
   * Récupère la terminologie pour cohérence
   */
  getTerminology(sessionId: string, lang: 'french' | 'bariba'): Map<string, string> {
    const context = this.contexts.get(sessionId);
    if (!context) return new Map();

    const filtered = new Map<string, string>();
    context.terminology.forEach((value, key) => {
      if (key.startsWith(`${lang}:`)) {
        filtered.set(key.replace(`${lang}:`, ''), value);
      }
    });

    return filtered;
  }

  /**
   * Détecte le domaine dominant dans le contexte
   */
  getDominantDomain(sessionId: string): string | null {
    const context = this.contexts.get(sessionId);
    if (!context || context.translations.length === 0) return null;

    const domains = new Map<string, number>();
    
    context.translations.forEach(t => {
      if (t.domain) {
        domains.set(t.domain, (domains.get(t.domain) || 0) + 1);
      }
    });

    if (domains.size === 0) return null;

    let maxDomain: string | null = null;
    let maxCount = 0;

    domains.forEach((count, domain) => {
      if (count > maxCount) {
        maxCount = count;
        maxDomain = domain;
      }
    });

    return maxDomain;
  }

  /**
   * Détecte le registre dominant (formel/informel)
   */
  getDominantRegister(sessionId: string): 'formal' | 'informal' | null {
    const context = this.contexts.get(sessionId);
    if (!context || context.translations.length === 0) return null;

    const registers = { formal: 0, informal: 0 };
    
    context.translations.forEach(t => {
      if (t.register === 'formal') registers.formal++;
      if (t.register === 'informal') registers.informal++;
    });

    if (registers.formal === 0 && registers.informal === 0) return null;
    
    return registers.formal > registers.informal ? 'formal' : 'informal';
  }

  /**
   * Nettoie les entrées expirées
   */
  private cleanOldEntries(context: ConversationContext): void {
    const now = Date.now();
    context.translations = context.translations.filter(
      t => now - t.timestamp < this.SESSION_TIMEOUT
    );
  }

  /**
   * Nettoie toutes les sessions expirées
   */
  cleanExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    this.contexts.forEach((context, sessionId) => {
      if (context.translations.length === 0) {
        expiredSessions.push(sessionId);
        return;
      }

      const lastTranslation = context.translations[context.translations.length - 1];
      if (now - lastTranslation.timestamp > this.SESSION_TIMEOUT) {
        expiredSessions.push(sessionId);
      }
    });

    expiredSessions.forEach(sessionId => {
      this.contexts.delete(sessionId);
    });

    if (expiredSessions.length > 0) {
      console.log(`🧹 ${expiredSessions.length} sessions expirées nettoyées`);
    }
  }

  /**
   * Récupère les statistiques du contexte
   */
  getStats(sessionId: string): {
    translationCount: number;
    terminologySize: number;
    dominantDomain: string | null;
    dominantRegister: 'formal' | 'informal' | null;
    averageConfidence: number;
  } {
    const context = this.contexts.get(sessionId);
    
    if (!context || context.translations.length === 0) {
      return {
        translationCount: 0,
        terminologySize: 0,
        dominantDomain: null,
        dominantRegister: null,
        averageConfidence: 0
      };
    }

    const avgConfidence = context.translations.reduce((sum, t) => sum + t.confidence, 0) / context.translations.length;

    return {
      translationCount: context.translations.length,
      terminologySize: context.terminology.size,
      dominantDomain: this.getDominantDomain(sessionId),
      dominantRegister: this.getDominantRegister(sessionId),
      averageConfidence: Math.round(avgConfidence)
    };
  }
}

// Export singleton
export const contextManager = new ContextManager();

// Nettoyer les sessions expirées toutes les 10 minutes
setInterval(() => {
  contextManager.cleanExpiredSessions();
}, 10 * 60 * 1000);
