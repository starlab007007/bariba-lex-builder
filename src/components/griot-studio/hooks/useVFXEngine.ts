/**
 * Hook for managing VFX assets and preloading
 */

import { useState, useCallback, useRef } from 'react';
import { ANIMATION_STYLES, AnimationStyle } from '@/engines/GriotAnimationEngine';

export interface VFXAsset {
  id: string;
  type: 'flare' | 'leak' | 'particle';
  src: string;
  loaded: boolean;
}

export interface VFXState {
  isLoading: boolean;
  loadedCount: number;
  totalCount: number;
  error: string | null;
}

const FLARE_BASE_PATH = '/assets/envato/lens-flare';
const LEAK_BASE_PATH = '/assets/envato/light-leak';

export function useVFXEngine() {
  const flareCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const leakCache = useRef<Map<string, HTMLVideoElement>>(new Map());
  
  const [state, setState] = useState<VFXState>({
    isLoading: false,
    loadedCount: 0,
    totalCount: 0,
    error: null
  });

  /**
   * Load a single flare image
   */
  const loadFlare = useCallback(async (index: number): Promise<HTMLImageElement | null> => {
    const key = `flare-${index}`;
    
    if (flareCache.current.has(key)) {
      return flareCache.current.get(key)!;
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        flareCache.current.set(key, img);
        resolve(img);
      };
      img.onerror = () => {
        console.warn(`[VFXEngine] Failed to load flare ${index}`);
        resolve(null);
      };
      img.src = `${FLARE_BASE_PATH}/flare-${index.toString().padStart(3, '0')}.png`;
    });
  }, []);

  /**
   * Preload flares for a specific style
   */
  const preloadStyleFlares = useCallback(async (styleName: string): Promise<void> => {
    const style = ANIMATION_STYLES[styleName];
    if (!style) return;

    const [start, end] = style.vfxConfig.flareRange;
    const count = Math.min(15, end - start + 1);
    
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      loadedCount: 0, 
      totalCount: count,
      error: null 
    }));

    let loaded = 0;
    const promises: Promise<void>[] = [];

    for (let i = 0; i < count; i++) {
      const index = start + Math.floor((end - start) * (i / count));
      promises.push(
        loadFlare(index).then(() => {
          loaded++;
          setState(prev => ({ ...prev, loadedCount: loaded }));
        })
      );
    }

    await Promise.allSettled(promises);
    setState(prev => ({ ...prev, isLoading: false }));
  }, [loadFlare]);

  /**
   * Get a random flare from the loaded cache for a style
   */
  const getRandomFlare = useCallback((styleName: string): HTMLImageElement | null => {
    const style = ANIMATION_STYLES[styleName];
    if (!style) return null;

    const [start, end] = style.vfxConfig.flareRange;
    const keys = Array.from(flareCache.current.keys()).filter(key => {
      const index = parseInt(key.replace('flare-', ''));
      return index >= start && index <= end;
    });

    if (keys.length === 0) return null;
    
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    return flareCache.current.get(randomKey) || null;
  }, []);

  /**
   * Get style configuration
   */
  const getStyleConfig = useCallback((styleName: string): AnimationStyle => {
    return ANIMATION_STYLES[styleName] || ANIMATION_STYLES.traditional;
  }, []);

  /**
   * Clear all cached assets
   */
  const clearCache = useCallback(() => {
    flareCache.current.clear();
    leakCache.current.clear();
    setState({
      isLoading: false,
      loadedCount: 0,
      totalCount: 0,
      error: null
    });
  }, []);

  /**
   * Get emotion-based VFX settings
   */
  const getEmotionVFX = useCallback((emotion: string) => {
    const emotionMap: Record<string, { color: string; intensity: number; pulseRate: number }> = {
      joy: { color: '#FFD700', intensity: 0.8, pulseRate: 1.5 },
      sadness: { color: '#4169E1', intensity: 0.4, pulseRate: 0.5 },
      wonder: { color: '#9370DB', intensity: 0.9, pulseRate: 1.0 },
      fear: { color: '#2F4F4F', intensity: 0.5, pulseRate: 2.0 },
      anger: { color: '#DC143C', intensity: 0.7, pulseRate: 2.5 },
      peace: { color: '#98FB98', intensity: 0.4, pulseRate: 0.3 },
      excitement: { color: '#FF4500', intensity: 1.0, pulseRate: 2.0 }
    };

    return emotionMap[emotion] || emotionMap.wonder;
  }, []);

  return {
    state,
    preloadStyleFlares,
    getRandomFlare,
    getStyleConfig,
    getEmotionVFX,
    clearCache
  };
}
