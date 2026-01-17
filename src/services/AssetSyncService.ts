/**
 * AssetSyncService - Service de synchronisation centralisé pour les assets
 * Gère le téléchargement automatique, la mise à jour et l'actualisation
 */

import { ENVATO_ASSET_MAP, EnvatoAssetMapping } from '@/lib/EnvatoDownloader';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface AssetInfo {
  id: string;
  local: string;
  category: string;
  status: 'installed' | 'missing' | 'lfs-pointer' | 'downloading' | 'error';
  size?: number;
  lastUpdated?: Date;
  error?: string;
}

export interface CategoryStatus {
  name: string;
  icon: string;
  installed: number;
  total: number;
  downloading: number;
  errors: number;
}

export interface SyncProgress {
  isRunning: boolean;
  currentCategory: string | null;
  currentFile: string | null;
  overallProgress: number;
  categoryProgress: number;
  speed: number; // bytes/sec
  eta: number; // seconds
  downloaded: number;
  totalToDownload: number;
  errors: SyncError[];
}

export interface SyncError {
  file: string;
  category: string;
  error: string;
  timestamp: Date;
  retryCount: number;
}

export interface SyncState {
  lastSync: Date | null;
  categories: Record<string, CategoryStatus>;
  assets: AssetInfo[];
  isConnected: boolean;
  progress: SyncProgress;
}

// ============================================================================
// CATEGORY CONFIGURATION
// ============================================================================

const CATEGORY_CONFIG: Record<string, { icon: string; displayName: string }> = {
  'light-leak': { icon: '🎬', displayName: 'Light Leaks' },
  'particles': { icon: '✨', displayName: 'Particles' },
  'lens-flare': { icon: '📸', displayName: 'Lens Flares' },
  'transitions': { icon: '🔀', displayName: 'Transitions' },
  'textures': { icon: '🎨', displayName: 'Textures' },
  '3d-models': { icon: '📦', displayName: '3D Models' },
  'fonts': { icon: '🔤', displayName: 'Fonts' },
  'audio': { icon: '🎵', displayName: 'Audio' },
};

// ============================================================================
// ASSET SYNC SERVICE
// ============================================================================

class AssetSyncService {
  private state: SyncState;
  private listeners: Set<(state: SyncState) => void> = new Set();
  private abortController: AbortController | null = null;
  private autoSyncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.state = {
      lastSync: null,
      categories: {},
      assets: [],
      isConnected: false,
      progress: {
        isRunning: false,
        currentCategory: null,
        currentFile: null,
        overallProgress: 0,
        categoryProgress: 0,
        speed: 0,
        eta: 0,
        downloaded: 0,
        totalToDownload: 0,
        errors: [],
      },
    };

    // Charger l'état depuis localStorage
    this.loadState();

    // Initialiser les catégories
    this.initializeCategories();
  }

  // ============ STATE MANAGEMENT ============

  private loadState(): void {
    try {
      const saved = localStorage.getItem('tamtam-asset-sync-state');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state = {
          ...this.state,
          ...parsed,
          lastSync: parsed.lastSync ? new Date(parsed.lastSync) : null,
          progress: this.state.progress, // Reset progress on load
        };
      }
    } catch (error) {
      console.error('Failed to load sync state:', error);
    }
  }

  private saveState(): void {
    try {
      const toSave = {
        lastSync: this.state.lastSync?.toISOString(),
        categories: this.state.categories,
        isConnected: this.state.isConnected,
      };
      localStorage.setItem('tamtam-asset-sync-state', JSON.stringify(toSave));
    } catch (error) {
      console.error('Failed to save sync state:', error);
    }
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener({ ...this.state });
    }
  }

  subscribe(listener: (state: SyncState) => void): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  // ============ INITIALIZATION ============

  private initializeCategories(): void {
    const categories: Record<string, CategoryStatus> = {};

    for (const [categoryKey, mappings] of Object.entries(ENVATO_ASSET_MAP)) {
      const config = CATEGORY_CONFIG[categoryKey] || { icon: '📁', displayName: categoryKey };
      const total = Array.isArray(mappings) ? mappings.length : 0;

      categories[categoryKey] = {
        name: config.displayName,
        icon: config.icon,
        installed: 0,
        total,
        downloading: 0,
        errors: 0,
      };
    }

    this.state.categories = categories;
    this.notifyListeners();
  }

  // ============ ASSET SCANNING ============

  async scanAssets(): Promise<void> {
    console.log('🔍 Scanning assets...');

    const assets: AssetInfo[] = [];

    for (const [category, mappings] of Object.entries(ENVATO_ASSET_MAP)) {
      if (!Array.isArray(mappings)) continue;

      for (const mapping of mappings) {
        const assetInfo = await this.checkAssetStatus(mapping, category);
        assets.push(assetInfo);
      }
    }

    this.state.assets = assets;
    this.updateCategoryStats();
    this.state.lastSync = new Date();
    this.saveState();
    this.notifyListeners();

    console.log(`✅ Scan complete: ${assets.filter(a => a.status === 'installed').length}/${assets.length} assets installed`);
  }

  private async checkAssetStatus(mapping: EnvatoAssetMapping, category: string): Promise<AssetInfo> {
    const localPath = `/assets/envato/${category}/${mapping.local}`;

    try {
      const response = await fetch(localPath, { method: 'HEAD' });

      if (response.ok) {
        const contentLength = response.headers.get('content-length');
        const size = contentLength ? parseInt(contentLength) : 0;

        // Check for LFS pointer (small file with specific size patterns)
        if (size < 200 && size > 100) {
          return {
            id: mapping.id,
            local: mapping.local,
            category,
            status: 'lfs-pointer',
            size,
          };
        }

        return {
          id: mapping.id,
          local: mapping.local,
          category,
          status: 'installed',
          size,
          lastUpdated: new Date(),
        };
      }

      return {
        id: mapping.id,
        local: mapping.local,
        category,
        status: 'missing',
      };
    } catch {
      return {
        id: mapping.id,
        local: mapping.local,
        category,
        status: 'missing',
      };
    }
  }

  private updateCategoryStats(): void {
    const categories = { ...this.state.categories };

    for (const categoryKey of Object.keys(categories)) {
      const categoryAssets = this.state.assets.filter(a => a.category === categoryKey);
      categories[categoryKey] = {
        ...categories[categoryKey],
        installed: categoryAssets.filter(a => a.status === 'installed').length,
        total: categoryAssets.length,
        downloading: categoryAssets.filter(a => a.status === 'downloading').length,
        errors: categoryAssets.filter(a => a.status === 'error' || a.status === 'lfs-pointer').length,
      };
    }

    this.state.categories = categories;
  }

  // ============ DOWNLOAD MANAGEMENT ============

  async downloadMissing(categories?: string[]): Promise<void> {
    if (this.state.progress.isRunning) {
      console.warn('Download already in progress');
      return;
    }

    this.abortController = new AbortController();

    const categoriesToProcess = categories || Object.keys(this.state.categories);
    const missingAssets = this.state.assets.filter(
      a => (a.status === 'missing' || a.status === 'lfs-pointer') &&
           categoriesToProcess.includes(a.category)
    );

    if (missingAssets.length === 0) {
      console.log('✅ All assets are already installed');
      return;
    }

    this.state.progress = {
      isRunning: true,
      currentCategory: null,
      currentFile: null,
      overallProgress: 0,
      categoryProgress: 0,
      speed: 0,
      eta: 0,
      downloaded: 0,
      totalToDownload: missingAssets.length,
      errors: [],
    };
    this.notifyListeners();

    console.log(`📥 Starting download of ${missingAssets.length} assets...`);

    for (let i = 0; i < missingAssets.length; i++) {
      if (this.abortController.signal.aborted) {
        console.log('⏹️ Download cancelled');
        break;
      }

      const asset = missingAssets[i];
      
      this.state.progress.currentCategory = asset.category;
      this.state.progress.currentFile = asset.local;
      this.state.progress.overallProgress = (i / missingAssets.length) * 100;
      this.notifyListeners();

      await this.downloadAsset(asset);

      this.state.progress.downloaded = i + 1;
      this.notifyListeners();
    }

    this.state.progress.isRunning = false;
    this.state.progress.overallProgress = 100;
    this.state.progress.currentCategory = null;
    this.state.progress.currentFile = null;
    this.notifyListeners();

    // Re-scan to update stats
    await this.scanAssets();

    console.log('✅ Download complete');
  }

  private async downloadAsset(asset: AssetInfo): Promise<void> {
    // Simulate download with progress
    const steps = 10;
    for (let step = 0; step < steps; step++) {
      if (this.abortController?.signal.aborted) return;

      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      
      this.state.progress.categoryProgress = ((step + 1) / steps) * 100;
      this.state.progress.speed = Math.floor(500000 + Math.random() * 2000000); // 0.5-2.5 MB/s
      this.state.progress.eta = Math.floor((this.state.progress.totalToDownload - this.state.progress.downloaded) * 2);
      this.notifyListeners();
    }

    // Mark as installed (simulation)
    const assetIndex = this.state.assets.findIndex(a => a.id === asset.id);
    if (assetIndex >= 0) {
      this.state.assets[assetIndex] = {
        ...this.state.assets[assetIndex],
        status: 'installed',
        lastUpdated: new Date(),
        size: Math.floor(1000000 + Math.random() * 10000000),
      };
    }

    this.updateCategoryStats();
  }

  stopDownload(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.state.progress.isRunning = false;
      this.notifyListeners();
    }
  }

  // ============ AUTO SYNC ============

  startAutoSync(intervalMinutes: number = 30): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }

    this.autoSyncInterval = setInterval(() => {
      this.scanAssets();
    }, intervalMinutes * 60 * 1000);

    console.log(`🔄 Auto-sync enabled every ${intervalMinutes} minutes`);
  }

  stopAutoSync(): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
      console.log('⏹️ Auto-sync disabled');
    }
  }

  // ============ CONNECTION ============

  setConnected(connected: boolean): void {
    this.state.isConnected = connected;
    this.saveState();
    this.notifyListeners();
  }

  // ============ GETTERS ============

  getState(): SyncState {
    return { ...this.state };
  }

  getMissingCount(): number {
    return this.state.assets.filter(a => a.status === 'missing' || a.status === 'lfs-pointer').length;
  }

  getInstalledCount(): number {
    return this.state.assets.filter(a => a.status === 'installed').length;
  }

  getTotalCount(): number {
    return Object.values(this.state.categories).reduce((sum, cat) => sum + cat.total, 0);
  }

  getCategoryAssets(category: string): AssetInfo[] {
    return this.state.assets.filter(a => a.category === category);
  }
}

// Singleton instance
export const assetSyncService = new AssetSyncService();

// React hook
export function useAssetSync() {
  const [state, setState] = React.useState<SyncState>(assetSyncService.getState());

  React.useEffect(() => {
    return assetSyncService.subscribe(setState);
  }, []);

  return {
    state,
    scanAssets: () => assetSyncService.scanAssets(),
    downloadMissing: (categories?: string[]) => assetSyncService.downloadMissing(categories),
    stopDownload: () => assetSyncService.stopDownload(),
    setConnected: (connected: boolean) => assetSyncService.setConnected(connected),
    startAutoSync: (interval?: number) => assetSyncService.startAutoSync(interval),
    stopAutoSync: () => assetSyncService.stopAutoSync(),
  };
}

// Need to import React for the hook
import React from 'react';
