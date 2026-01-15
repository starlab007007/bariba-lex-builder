/**
 * Template System Types v2.0
 * Types locaux + re-export depuis UnifiedTemplateTypes
 */

// Re-export depuis UnifiedTemplateTypes pour compatibilité
export * from '@/types/UnifiedTemplateTypes';

// Types locaux additionnels
export type TemplateAssetType = 'video' | 'audio' | 'image' | 'lottie' | '3d' | 'font';

export interface TemplateAsset {
  id: string;
  type: TemplateAssetType;
  url: string;
  fallbackUrl?: string;
  preloadPriority: 'high' | 'medium' | 'low';
}

export interface TemplateLayer {
  id: string;
  type: string;
  zIndex: number;
  visible: boolean;
  opacity: number;
  timing: {
    start: number;
    duration: number;
  };
  transform?: {
    x?: number;
    y?: number;
    scale?: number;
    rotation?: number;
  };
}

export interface TemplateState {
  template: unknown;
  isLoading: boolean;
  isPlaying: boolean;
  currentTime: number;
  boundAssets: Map<string, Blob | string>;
  renderProgress: number;
  error: string | null;
}

// Alias pour compatibilité
export type TemplateManifest = import('@/types/UnifiedTemplateTypes').TemplateManifestData;
