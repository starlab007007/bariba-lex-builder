/**
 * AssetEmotionMapper - Mapping intelligent émotion → assets visuels
 * 
 * Sélectionne dynamiquement les assets (lens flares, light leaks, particles)
 * basé sur l'émotion détectée et l'intensité narrative
 */

import { buildResolvedAssetUrl, pickRandomAssets } from './AssetRealMapping';
import type { StorySegment, KeyMoment } from './StoryAnalyzer';

// ============================================================================
// TYPES
// ============================================================================

export interface EmotionAssetPalette {
  flares: number[];           // Range d'index de lens flares (1-455)
  leaks: number[];            // Index de light leaks (1-22)
  particleIntensity: number;  // 0.0 - 1.0
  blendMode: GlobalCompositeOperation;
  colorTint?: string;         // Teinte CSS optionnelle
  cameraSpeed?: number;       // Vitesse d'animation caméra
}

export interface SelectedAssets {
  lensFlare: string;          // URL du lens flare
  lightLeak?: string;         // URL du light leak (optionnel)
  particleAsset?: string;     // URL des particules
  transition?: string;        // URL de la transition
  blendMode: GlobalCompositeOperation;
  opacity: number;
}

export interface FrameAssets {
  currentTime: number;
  segmentId: string;
  assets: SelectedAssets;
  cameraTransform: CameraTransform;
}

export interface CameraTransform {
  scale: number;
  translateX: number;
  translateY: number;
  rotation: number;
}

// ============================================================================
// EMOTION ASSET PALETTES
// ============================================================================

/**
 * Mapping détaillé émotion → palette d'assets
 * Basé sur 455 lens flares, 22 light leaks, 37 particles disponibles
 */
export const EMOTION_PALETTES: Record<StorySegment['emotion'], EmotionAssetPalette> = {
  joy: {
    flares: Array.from({ length: 50 }, (_, i) => 50 + i),  // 50-99: dorés, lumineux
    leaks: [1, 2, 3, 4, 5],                                // Light leaks chauds
    particleIntensity: 0.7,
    blendMode: 'screen',
    colorTint: 'rgba(255, 215, 0, 0.1)',                   // Or léger
    cameraSpeed: 1.2
  },
  wisdom: {
    flares: Array.from({ length: 49 }, (_, i) => 1 + i),   // 1-49: subtils, ambrés
    leaks: [6, 7, 8, 9, 10],                               // Light leaks doux
    particleIntensity: 0.4,
    blendMode: 'multiply',
    colorTint: 'rgba(139, 69, 19, 0.08)',                  // Sépia léger
    cameraSpeed: 0.7
  },
  tension: {
    flares: Array.from({ length: 50 }, (_, i) => 150 + i), // 150-199: rouges, intenses
    leaks: [11, 12, 13, 14],                               // Light leaks dramatiques
    particleIntensity: 0.9,
    blendMode: 'overlay',
    colorTint: 'rgba(255, 50, 50, 0.12)',                  // Rouge tension
    cameraSpeed: 1.5
  },
  sadness: {
    flares: Array.from({ length: 50 }, (_, i) => 250 + i), // 250-299: bleus, froids
    leaks: [15, 16, 17],                                   // Light leaks mélancoliques
    particleIntensity: 0.3,
    blendMode: 'screen',
    colorTint: 'rgba(100, 149, 237, 0.1)',                 // Bleu cornflower
    cameraSpeed: 0.5
  },
  excitement: {
    flares: Array.from({ length: 50 }, (_, i) => 100 + i), // 100-149: multicolores
    leaks: [18, 19, 20, 21, 22],                           // Light leaks énergiques
    particleIntensity: 1.0,
    blendMode: 'screen',
    colorTint: 'rgba(255, 165, 0, 0.15)',                  // Orange vif
    cameraSpeed: 1.8
  },
  neutral: {
    flares: Array.from({ length: 50 }, (_, i) => 300 + i), // 300-349: blancs, doux
    leaks: [1, 6, 11, 16],                                 // Variété équilibrée
    particleIntensity: 0.5,
    blendMode: 'screen',
    cameraSpeed: 1.0
  }
};

/**
 * Mapping moment clé → transition
 */
export const MOMENT_TRANSITIONS: Record<KeyMoment['type'], string> = {
  intro: 'transitions:transition-001.mp4',
  rising: 'transitions:transition-005.mp4',
  climax: 'transitions:transition-010.mp4',
  falling: 'transitions:transition-008.mp4',
  resolution: 'transitions:transition-003.mp4',
  emphasis: 'transitions:transition-006.mp4'
};

// ============================================================================
// ASSET EMOTION MAPPER CLASS
// ============================================================================

export class AssetEmotionMapper {
  private assetCache: Map<string, string> = new Map();
  private lastSelectedFlares: Map<string, number> = new Map();

  /**
   * Sélectionner les assets pour un segment donné
   */
  selectAssetsForSegment(segment: StorySegment): SelectedAssets {
    const palette = EMOTION_PALETTES[segment.emotion];
    
    // Sélectionner un lens flare (éviter les répétitions)
    const flareIndex = this.selectFlareIndex(segment.id, palette.flares);
    const flareNum = String(flareIndex).padStart(3, '0');
    const lensFlareUrl = `/assets/envato/lens-flare/flare-${flareNum}.png`;

    // Sélectionner un light leak basé sur l'intensité
    let lightLeakUrl: string | undefined;
    if (segment.intensity > 0.3) {
      const leakIndex = this.selectLeakIndex(palette.leaks, segment.intensity);
      const leakNum = String(leakIndex).padStart(3, '0');
      // Light leaks sont sur CDN
      lightLeakUrl = buildResolvedAssetUrl(`light-leak:leak-${leakNum}.webm`);
    }

    // Sélectionner des particules si l'intensité est suffisante
    let particleUrl: string | undefined;
    if (segment.intensity > 0.5 && palette.particleIntensity > 0.5) {
      const particleIndex = Math.floor(segment.intensity * 36) + 1;
      const particleNum = String(particleIndex).padStart(3, '0');
      particleUrl = buildResolvedAssetUrl(`particles:particle-${particleNum}.webm`);
    }

    // Calculer l'opacité basée sur l'intensité
    const opacity = 0.3 + (segment.intensity * 0.5);

    return {
      lensFlare: lensFlareUrl,
      lightLeak: lightLeakUrl,
      particleAsset: particleUrl,
      blendMode: palette.blendMode,
      opacity: Math.min(1, opacity)
    };
  }

  /**
   * Obtenir les assets pour un frame spécifique
   */
  getAssetsForFrame(
    currentTime: number,
    segments: StorySegment[],
    keyMoments: KeyMoment[]
  ): FrameAssets {
    // Trouver le segment actif
    const segment = segments.find(
      s => currentTime >= s.startTime && currentTime < s.endTime
    ) || segments[0];

    // Sélectionner les assets
    const assets = this.selectAssetsForSegment(segment);

    // Vérifier si on est sur un moment clé (pour les transitions)
    const nearbyMoment = keyMoments.find(
      m => Math.abs(currentTime - m.time) < 1.0 // À moins d'1 seconde du moment
    );
    if (nearbyMoment && nearbyMoment.transitionAsset) {
      assets.transition = buildResolvedAssetUrl(nearbyMoment.transitionAsset);
    }

    // Calculer la transformation caméra
    const segmentProgress = (currentTime - segment.startTime) / (segment.endTime - segment.startTime);
    const cameraTransform = this.calculateCameraTransform(
      segment.cameraMove,
      segmentProgress,
      EMOTION_PALETTES[segment.emotion].cameraSpeed || 1.0
    );

    return {
      currentTime,
      segmentId: segment.id,
      assets,
      cameraTransform
    };
  }

  /**
   * Calculer la transformation caméra pour un mouvement donné
   */
  private calculateCameraTransform(
    move: StorySegment['cameraMove'],
    progress: number,
    speed: number
  ): CameraTransform {
    const easeProgress = this.easeInOutCubic(progress);
    const adjustedProgress = easeProgress * speed;

    switch (move) {
      case 'zoom-in':
        return {
          scale: 1 + (adjustedProgress * 0.15),
          translateX: 0,
          translateY: 0,
          rotation: 0
        };
      
      case 'zoom-out':
        return {
          scale: 1.15 - (adjustedProgress * 0.15),
          translateX: 0,
          translateY: 0,
          rotation: 0
        };
      
      case 'pan-left':
        return {
          scale: 1.05,
          translateX: -adjustedProgress * 50,
          translateY: 0,
          rotation: 0
        };
      
      case 'pan-right':
        return {
          scale: 1.05,
          translateX: adjustedProgress * 50,
          translateY: 0,
          rotation: 0
        };
      
      case 'orbit':
        return {
          scale: 1.05 + Math.sin(adjustedProgress * Math.PI) * 0.05,
          translateX: Math.cos(adjustedProgress * Math.PI * 2) * 20,
          translateY: Math.sin(adjustedProgress * Math.PI * 2) * 10,
          rotation: adjustedProgress * 2 // Rotation légère
        };
      
      case 'static':
      default:
        // Même en "static", ajouter un léger Ken Burns
        return {
          scale: 1 + (adjustedProgress * 0.03),
          translateX: 0,
          translateY: 0,
          rotation: 0
        };
    }
  }

  /**
   * Sélectionner un index de flare (avec anti-répétition)
   */
  private selectFlareIndex(segmentId: string, availableFlares: number[]): number {
    const lastUsed = this.lastSelectedFlares.get(segmentId);
    let attempts = 0;
    let selected: number;

    do {
      const randomIndex = Math.floor(Math.random() * availableFlares.length);
      selected = availableFlares[randomIndex];
      attempts++;
    } while (selected === lastUsed && attempts < 3);

    this.lastSelectedFlares.set(segmentId, selected);
    return selected;
  }

  /**
   * Sélectionner un index de leak basé sur l'intensité
   */
  private selectLeakIndex(availableLeaks: number[], intensity: number): number {
    // Plus l'intensité est haute, plus on prend des leaks "forts"
    const index = Math.min(
      availableLeaks.length - 1,
      Math.floor(intensity * availableLeaks.length)
    );
    return availableLeaks[index];
  }

  /**
   * Easing function
   */
  private easeInOutCubic(t: number): number {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Précharger les assets pour les segments
   */
  async preloadSegmentAssets(segments: StorySegment[]): Promise<void> {
    const loadPromises: Promise<void>[] = [];

    for (const segment of segments) {
      const assets = this.selectAssetsForSegment(segment);
      
      // Précharger le lens flare
      if (assets.lensFlare && !this.assetCache.has(assets.lensFlare)) {
        loadPromises.push(this.preloadImage(assets.lensFlare));
      }
    }

    await Promise.allSettled(loadPromises);
  }

  /**
   * Précharger une image
   */
  private preloadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.assetCache.set(url, url);
        resolve();
      };
      img.onerror = () => {
        console.warn(`[AssetEmotionMapper] Failed to preload: ${url}`);
        resolve(); // Ne pas bloquer sur les erreurs
      };
      img.src = url;
    });
  }

  /**
   * Obtenir la teinte de couleur pour une émotion
   */
  getColorTintForEmotion(emotion: StorySegment['emotion']): string | undefined {
    return EMOTION_PALETTES[emotion].colorTint;
  }

  /**
   * Obtenir le blend mode pour une émotion
   */
  getBlendModeForEmotion(emotion: StorySegment['emotion']): GlobalCompositeOperation {
    return EMOTION_PALETTES[emotion].blendMode;
  }

  /**
   * Nettoyer le cache
   */
  clearCache(): void {
    this.assetCache.clear();
    this.lastSelectedFlares.clear();
  }
}

// Export singleton
export const assetEmotionMapper = new AssetEmotionMapper();
