/**
 * Hook pour gérer le téléchargement et cache des assets templates
 * Fournit progress en temps réel et état de disponibilité
 */

import { useState, useEffect, useCallback } from 'react';
import { templateAssetLoader, DownloadProgress, TemplateAssetManifest } from '@/lib/TemplateAssetLoader';

export interface UseTemplateAssetsResult {
  /** Démarre le téléchargement des assets */
  downloadAssets: (templateId: string, manifest: TemplateAssetManifest) => Promise<void>;
  /** Annule le téléchargement en cours */
  cancelDownload: (templateId: string) => void;
  /** Vérifie si le template est prêt (tous assets en cache) */
  checkReady: (templateId: string, manifest: TemplateAssetManifest) => Promise<boolean>;
  /** Progress actuel par template */
  progressMap: Map<string, DownloadProgress>;
  /** Obtient le progress d'un template */
  getProgress: (templateId: string) => DownloadProgress;
  /** Stats globales du cache */
  cacheStats: { totalSize: number; assetCount: number; templateCount: number } | null;
  /** Rafraîchir les stats */
  refreshStats: () => Promise<void>;
}

export function useTemplateAssets(): UseTemplateAssetsResult {
  const [progressMap, setProgressMap] = useState<Map<string, DownloadProgress>>(new Map());
  const [cacheStats, setCacheStats] = useState<{ totalSize: number; assetCount: number; templateCount: number } | null>(null);

  // Charger les stats au démarrage
  useEffect(() => {
    templateAssetLoader.init().then(() => {
      refreshStats();
    });
  }, []);

  const refreshStats = useCallback(async () => {
    const stats = await templateAssetLoader.getCacheStats();
    setCacheStats(stats);
  }, []);

  const downloadAssets = useCallback(async (templateId: string, manifest: TemplateAssetManifest) => {
    await templateAssetLoader.preloadTemplateAssets(templateId, manifest, (progress) => {
      setProgressMap(prev => {
        const newMap = new Map(prev);
        newMap.set(templateId, progress);
        return newMap;
      });
    });
    
    // Rafraîchir stats après téléchargement
    await refreshStats();
  }, [refreshStats]);

  const cancelDownload = useCallback((templateId: string) => {
    templateAssetLoader.cancelDownload(templateId);
    setProgressMap(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(templateId);
      if (current) {
        newMap.set(templateId, { ...current, status: 'idle' });
      }
      return newMap;
    });
  }, []);

  const checkReady = useCallback(async (templateId: string, manifest: TemplateAssetManifest): Promise<boolean> => {
    return templateAssetLoader.isTemplateReady(templateId, manifest);
  }, []);

  const getProgress = useCallback((templateId: string): DownloadProgress => {
    return progressMap.get(templateId) || templateAssetLoader.getDownloadProgress(templateId);
  }, [progressMap]);

  return {
    downloadAssets,
    cancelDownload,
    checkReady,
    progressMap,
    getProgress,
    cacheStats,
    refreshStats,
  };
}

export default useTemplateAssets;
