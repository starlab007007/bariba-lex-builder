/**
 * Hook unifié pour la traduction offline
 * Gère automatiquement le basculement online/offline
 */

import { useState, useCallback, useEffect } from 'react';
import { useOfflineStatus } from './useOfflineStatus';
import { offlineTranslationService } from '@/services/OfflineTranslationService';
import { audioCacheService } from '@/services/AudioCacheService';

export interface OfflineCapabilities {
  textTranslation: boolean;
  frenchSTT: boolean;
  frenchTTS: boolean;
  baribaSTT: boolean;
  baribaTTS: boolean;
  ocr: boolean;
}

export interface OfflineCacheStats {
  dictionaryEntries: number;
  dictionaryLoaded: boolean;
  audioCacheEntries: number;
  audioCacheSizeMB: number;
  storageUsedMB: number;
  storageQuotaMB: number;
}

export interface UseOfflineTranslatorReturn {
  // État
  isOnline: boolean;
  isOfflineReady: boolean;
  isLoadingDictionary: boolean;
  loadingProgress: number;
  loadingPhase: string;
  
  // Capacités
  capabilities: OfflineCapabilities;
  cacheStats: OfflineCacheStats;
  
  // Actions
  translateOffline: (text: string, from: 'french' | 'bariba', to: 'french' | 'bariba') => Promise<{ translation: string; confidence: number; method: string }>;
  preloadForOffline: () => Promise<void>;
  clearCache: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

export function useOfflineTranslator(): UseOfflineTranslatorReturn {
  const { isOnline } = useOfflineStatus();
  
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [isLoadingDictionary, setIsLoadingDictionary] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState('');
  const [cacheStats, setCacheStats] = useState<OfflineCacheStats>({
    dictionaryEntries: 0,
    dictionaryLoaded: false,
    audioCacheEntries: 0,
    audioCacheSizeMB: 0,
    storageUsedMB: 0,
    storageQuotaMB: 0
  });

  // Capacités disponibles en mode offline
  const capabilities: OfflineCapabilities = {
    textTranslation: isOfflineReady,
    frenchSTT: true, // Web Speech API natif
    frenchTTS: true, // SpeechSynthesis natif
    baribaSTT: false, // Nécessite serveur
    baribaTTS: cacheStats.audioCacheEntries > 0, // Seulement si préchargé
    ocr: false // Nécessite serveur
  };

  // Charger les stats au montage
  const refreshStats = useCallback(async () => {
    try {
      const dictStats = await offlineTranslationService.getStats();
      const audioStats = await audioCacheService.getStats();
      
      // Estimer l'usage du stockage
      let storageUsedMB = 0;
      let storageQuotaMB = 0;
      
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        storageUsedMB = (estimate.usage || 0) / (1024 * 1024);
        storageQuotaMB = (estimate.quota || 0) / (1024 * 1024);
      }

      setCacheStats({
        dictionaryEntries: dictStats.totalEntries,
        dictionaryLoaded: dictStats.isLoaded,
        audioCacheEntries: audioStats.totalEntries,
        audioCacheSizeMB: audioStats.estimatedSizeMB,
        storageUsedMB,
        storageQuotaMB
      });

      setIsOfflineReady(dictStats.isLoaded);
    } catch (error) {
      console.error('[useOfflineTranslator] Erreur chargement stats:', error);
    }
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // Traduction offline
  const translateOffline = useCallback(async (
    text: string,
    from: 'french' | 'bariba',
    to: 'french' | 'bariba'
  ): Promise<{ translation: string; confidence: number; method: string }> => {
    try {
      const result = await offlineTranslationService.translate(text, from, to);
      return {
        translation: result.translation,
        confidence: result.confidence,
        method: `offline_${result.method}`
      };
    } catch (error) {
      console.error('[useOfflineTranslator] Erreur traduction:', error);
      return {
        translation: text,
        confidence: 0,
        method: 'offline_error'
      };
    }
  }, []);

  // Précharger pour usage offline
  const preloadForOffline = useCallback(async () => {
    setIsLoadingDictionary(true);
    setLoadingProgress(0);
    setLoadingPhase('Initialisation...');

    try {
      // 1. Charger le dictionnaire
      await offlineTranslationService.loadDictionary((current, total, phase) => {
        setLoadingProgress(Math.round((current / total) * 70));
        setLoadingPhase(phase);
      });

      // 2. Précharger les audios fréquents (si online)
      if (isOnline) {
        setLoadingPhase('Préchargement audio...');
        setLoadingProgress(75);
        
        // Liste de phrases fréquentes à précharger
        const frequentPhrases = [
          'Bonjour',
          'Merci',
          'Au revoir',
          'Comment allez-vous ?',
          'Je ne comprends pas',
          'Oui',
          'Non',
          'S\'il vous plaît',
          'Excusez-moi',
          'Bienvenue'
        ];

        await audioCacheService.preloadFrequentPhrases(frequentPhrases, 'bariba', (current, total) => {
          setLoadingProgress(75 + Math.round((current / total) * 20));
        });
      }

      setLoadingProgress(100);
      setLoadingPhase('Prêt pour usage hors-ligne!');
      setIsOfflineReady(true);
      
      await refreshStats();
    } catch (error) {
      console.error('[useOfflineTranslator] Erreur préchargement:', error);
      setLoadingPhase('Erreur lors du préchargement');
    } finally {
      setIsLoadingDictionary(false);
    }
  }, [isOnline, refreshStats]);

  // Vider le cache
  const clearCache = useCallback(async () => {
    try {
      await offlineTranslationService.clear();
      await audioCacheService.clear();
      setIsOfflineReady(false);
      await refreshStats();
    } catch (error) {
      console.error('[useOfflineTranslator] Erreur nettoyage cache:', error);
    }
  }, [refreshStats]);

  return {
    isOnline,
    isOfflineReady,
    isLoadingDictionary,
    loadingProgress,
    loadingPhase,
    capabilities,
    cacheStats,
    translateOffline,
    preloadForOffline,
    clearCache,
    refreshStats
  };
}
