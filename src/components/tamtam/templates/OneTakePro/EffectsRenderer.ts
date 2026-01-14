// src/components/templates/OneTakePro/EffectsRenderer.ts

import { AssetManager, Asset } from './AssetManager';

export interface Beat {
  time: number;
  strength: number; // 0-1
}

interface Effect {
  type: 'lens-flare' | 'light-leak' | 'smoke' | 'fire';
  element: HTMLImageElement | HTMLVideoElement;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  targetOpacity: number;
  fadeIn: boolean;
  fadeOut: boolean;
  startTime: number;
  duration: number;
  blendMode: string;
}

export class EffectsRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private assetManager: AssetManager;
  private activeEffects: Effect[] = [];
  private lastEffectTime = 0;
  private continuousEffects: Effect[] = [];
  private autoplayBlocked = false;
  private videoErrors: string[] = [];
  
  constructor(canvas: HTMLCanvasElement, assetManager: AssetManager) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Impossible d\'obtenir le contexte 2D du canvas');
    }
    this.ctx = ctx;
    this.assetManager = assetManager;
  }
  
  /**
   * Check if autoplay was blocked
   */
  isAutoplayBlocked(): boolean {
    return this.autoplayBlocked;
  }
  
  /**
   * Get video errors
   */
  getVideoErrors(): string[] {
    return this.videoErrors;
  }
  
  /**
   * Attempt to resume all video effects (call on user interaction)
   */
  async primeOrResumeVideos(): Promise<boolean> {
    let allSuccess = true;
    
    for (const effect of this.continuousEffects) {
      if (effect.element instanceof HTMLVideoElement) {
        try {
          const video = effect.element;
          if (video.paused) {
            await video.play();
            console.log(`✅ Video resumed: ${effect.type}`);
          }
        } catch (err) {
          console.warn(`⚠️ Could not resume ${effect.type}:`, err);
          allSuccess = false;
        }
      }
    }
    
    if (allSuccess) {
      this.autoplayBlocked = false;
    }
    
    return allSuccess;
  }
  
  /**
   * Déclencher lens flare sur beat
   */
  async triggerLensFlare(beat: Beat): Promise<void> {
    // Ne déclencher que sur beats moyens/forts
    if (beat.strength < 0.5) return;
    
    // Throttle : minimum 250ms entre effets
    const now = Date.now();
    if (now - this.lastEffectTime < 250) return;
    this.lastEffectTime = now;
    
    // Choisir asset aléatoire
    const assetId = this.assetManager.getRandomAsset('lens-flare-png');
    
    try {
      // Charger asset
      const asset = await this.assetManager.loadAsset(assetId);
      if (!asset.element) return;
      
      // Position aléatoire dans coin supérieur droit
      const x = this.canvas.width * (0.5 + Math.random() * 0.4);
      const y = this.canvas.height * (0.05 + Math.random() * 0.25);
      
      // Créer effet
      const effect: Effect = {
        type: 'lens-flare',
        element: asset.element as HTMLImageElement,
        x,
        y,
        scale: 0.7 + Math.random() * 0.6,
        opacity: 0,
        targetOpacity: 0.6 + beat.strength * 0.35,
        fadeIn: true,
        fadeOut: false,
        startTime: now,
        duration: 600 + Math.random() * 400,
        blendMode: 'screen'
      };
      
      this.activeEffects.push(effect);
      
      // Auto fade-out après 60% de la durée
      setTimeout(() => {
        effect.fadeOut = true;
      }, effect.duration * 0.6);
      
    } catch (error) {
      console.error('❌ Erreur chargement lens flare:', error);
    }
  }
  
  /**
   * Déclencher light leak sur beat fort
   */
  async triggerLightLeak(beat: Beat): Promise<void> {
    // Trigger on strong beats
    if (beat.strength < 0.7) return;
    
    // 50% chance (increased from 30%)
    if (Math.random() > 0.5) return;
    
    // Find a playable light leak
    const assetId = await this.assetManager.findFirstPlayableVideo('light-leak') 
      || this.assetManager.getRandomAsset('light-leak');
    
    try {
      const asset = await this.assetManager.loadAsset(assetId);
      if (!asset.element) {
        this.videoErrors.push(`Light leak ${assetId}: element not loaded`);
        return;
      }
      
      const video = asset.element as HTMLVideoElement;
      video.currentTime = 0;
      
      try {
        await video.play();
      } catch (err) {
        console.warn('⚠️ Light leak autoplay bloqué:', err);
        this.autoplayBlocked = true;
        return;
      }
      
      const effect: Effect = {
        type: 'light-leak',
        element: video,
        x: 0,
        y: 0,
        scale: 1,
        opacity: 0,
        targetOpacity: 0.6 + beat.strength * 0.25,
        fadeIn: true,
        fadeOut: false,
        startTime: Date.now(),
        duration: (video.duration || 2) * 1000,
        blendMode: 'screen'
      };
      
      this.activeEffects.push(effect);
      
      video.addEventListener('ended', () => {
        effect.fadeOut = true;
      }, { once: true });
      
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.videoErrors.push(`Light leak: ${errMsg}`);
      console.error('❌ Erreur chargement light leak:', error);
    }
  }
  
  /**
   * Ajouter smoke continu - with smart fallback
   */
  async addContinuousSmoke(): Promise<void> {
    // Try to find a playable video (will fallback to light-leak if .mov not supported)
    const assetId = await this.assetManager.findFirstPlayableVideo('smoke');
    
    if (!assetId) {
      this.videoErrors.push('Smoke: No playable video found');
      throw new Error('Smoke: No playable video found');
    }
    
    try {
      const asset = await this.assetManager.loadAsset(assetId);
      if (!asset.element) {
        throw new Error('Element not loaded');
      }
      
      const video = asset.element as HTMLVideoElement;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      
      try {
        await video.play();
      } catch (err) {
        console.warn('⚠️ Smoke autoplay bloqué:', err);
        this.autoplayBlocked = true;
      }
      
      const effect: Effect = {
        type: 'smoke',
        element: video,
        x: 0,
        y: this.canvas.height - 450,
        scale: 1,
        opacity: 0,
        targetOpacity: 0.25,
        fadeIn: true,
        fadeOut: false,
        startTime: Date.now(),
        duration: Infinity,
        blendMode: 'screen'
      };
      
      this.continuousEffects.push(effect);
      const isFallback = assetId.startsWith('leak-') ? ' (light-leak fallback)' : '';
      console.log(`✅ Smoke continu ajouté${isFallback}`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.videoErrors.push(`Smoke: ${errMsg}`);
      console.error('❌ Erreur chargement smoke:', error);
      throw error;
    }
  }
  
  /**
   * Ajouter fire continu - with smart fallback
   */
  async addContinuousFire(): Promise<void> {
    // Try to find a playable video (will fallback to light-leak if .mov not supported)
    const assetId = await this.assetManager.findFirstPlayableVideo('fire');
    
    if (!assetId) {
      this.videoErrors.push('Fire: No playable video found');
      throw new Error('Fire: No playable video found');
    }
    
    try {
      const asset = await this.assetManager.loadAsset(assetId);
      if (!asset.element) {
        throw new Error('Element not loaded');
      }
      
      const video = asset.element as HTMLVideoElement;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      
      try {
        await video.play();
      } catch (err) {
        console.warn('⚠️ Fire autoplay bloqué:', err);
        this.autoplayBlocked = true;
      }
      
      const effect: Effect = {
        type: 'fire',
        element: video,
        x: 0,
        y: this.canvas.height - 350,
        scale: 1,
        opacity: 0,
        targetOpacity: 0.3,
        fadeIn: true,
        fadeOut: false,
        startTime: Date.now(),
        duration: Infinity,
        blendMode: 'screen'
      };
      
      this.continuousEffects.push(effect);
      const isFallback = assetId.startsWith('leak-') ? ' (light-leak fallback)' : '';
      console.log(`✅ Fire continu ajouté${isFallback}`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.videoErrors.push(`Fire: ${errMsg}`);
      console.error('❌ Erreur chargement fire:', error);
      throw error;
    }
  }
  
  /**
   * Render tous les effets actifs (appeler dans render loop principal)
   */
  render(): void {
    // Render effets continus d'abord (background)
    this.continuousEffects.forEach(effect => {
      if (effect.fadeIn && effect.opacity < effect.targetOpacity) {
        effect.opacity += 0.02;
        if (effect.opacity >= effect.targetOpacity) {
          effect.fadeIn = false;
        }
      }
      
      this.drawEffect(effect);
    });
    
    // Render effets temporaires
    this.activeEffects = this.activeEffects.filter(effect => {
      // Fade in
      if (effect.fadeIn && effect.opacity < effect.targetOpacity) {
        effect.opacity += 0.1;
        if (effect.opacity >= effect.targetOpacity) {
          effect.fadeIn = false;
        }
      }
      
      // Fade out
      if (effect.fadeOut && effect.opacity > 0) {
        effect.opacity -= 0.08;
      }
      
      // Supprimer si terminé
      if (effect.opacity <= 0 && effect.fadeOut) {
        if (effect.element instanceof HTMLVideoElement) {
          effect.element.pause();
          effect.element.currentTime = 0;
        }
        return false;
      }
      
      this.drawEffect(effect);
      return true;
    });
  }
  
  /**
   * Dessiner un effet individuel
   */
  private drawEffect(effect: Effect): void {
    // Skip if video not ready
    if (effect.element instanceof HTMLVideoElement) {
      const video = effect.element;
      if (video.readyState < 2 || video.videoWidth === 0) {
        return; // Not ready to draw
      }
    }
    
    this.ctx.save();
    
    // Blend mode (CRUCIAL)
    this.ctx.globalCompositeOperation = effect.blendMode as GlobalCompositeOperation;
    this.ctx.globalAlpha = effect.opacity;
    
    // Calculer dimensions
    let width: number;
    let height: number;
    
    if (effect.element instanceof HTMLImageElement) {
      const aspectRatio = effect.element.height / effect.element.width;
      width = this.canvas.width * effect.scale * 0.45;
      height = width * aspectRatio;
    } else {
      if (effect.type === 'light-leak') {
        width = this.canvas.width;
        height = this.canvas.height;
      } else {
        // smoke/fire - cover width, fixed height
        width = this.canvas.width;
        height = 500;
      }
    }
    
    // Dessiner
    try {
      this.ctx.drawImage(
        effect.element as CanvasImageSource,
        effect.x,
        effect.y,
        width,
        height
      );
    } catch {
      // Silently fail if video not ready
    }
    
    this.ctx.restore();
  }
  
  /**
   * Nettoyer tous les effets
   */
  clear(): void {
    this.activeEffects = [];
    this.continuousEffects.forEach(effect => {
      if (effect.element instanceof HTMLVideoElement) {
        effect.element.pause();
      }
    });
    this.continuousEffects = [];
  }
  
  /**
   * Obtenir statistiques
   */
  getStats(): { active: number; continuous: number } {
    return {
      active: this.activeEffects.length,
      continuous: this.continuousEffects.length
    };
  }
  
  /**
   * Get detailed video status for debugging
   */
  getVideoStatus(): { type: string; paused: boolean; readyState: number; currentTime: number }[] {
    return this.continuousEffects
      .filter(e => e.element instanceof HTMLVideoElement)
      .map(e => {
        const video = e.element as HTMLVideoElement;
        return {
          type: e.type,
          paused: video.paused,
          readyState: video.readyState,
          currentTime: video.currentTime
        };
      });
  }
}
