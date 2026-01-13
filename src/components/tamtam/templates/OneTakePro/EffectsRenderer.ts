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
   * Déclencher lens flare sur beat
   */
  async triggerLensFlare(beat: Beat): Promise<void> {
    // Ne déclencher que sur beats moyens/forts
    if (beat.strength < 0.6) return;
    
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
      const x = this.canvas.width * (0.6 + Math.random() * 0.3);
      const y = this.canvas.height * (0.05 + Math.random() * 0.2);
      
      // Créer effet
      const effect: Effect = {
        type: 'lens-flare',
        element: asset.element as HTMLImageElement,
        x,
        y,
        scale: 0.6 + Math.random() * 0.5,
        opacity: 0,
        targetOpacity: 0.5 + beat.strength * 0.4,
        fadeIn: true,
        fadeOut: false,
        startTime: now,
        duration: 500 + Math.random() * 300,
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
    // Seulement sur beats très forts
    if (beat.strength < 0.8) return;
    
    // 30% de chance seulement
    if (Math.random() > 0.3) return;
    
    const assetId = this.assetManager.getRandomAsset('light-leak');
    
    try {
      const asset = await this.assetManager.loadAsset(assetId);
      if (!asset.element) return;
      
      const video = asset.element as HTMLVideoElement;
      video.currentTime = 0;
      
      const playPromise = video.play();
      if (playPromise) {
        playPromise.catch(err => {
          console.warn('⚠️ Autoplay bloqué:', err);
        });
      }
      
      const effect: Effect = {
        type: 'light-leak',
        element: video,
        x: 0,
        y: 0,
        scale: 1,
        opacity: 0,
        targetOpacity: 0.6 + beat.strength * 0.2,
        fadeIn: true,
        fadeOut: false,
        startTime: Date.now(),
        duration: video.duration * 1000,
        blendMode: 'screen'
      };
      
      this.activeEffects.push(effect);
      
      video.addEventListener('ended', () => {
        effect.fadeOut = true;
      }, { once: true });
      
    } catch (error) {
      console.error('❌ Erreur chargement light leak:', error);
    }
  }
  
  /**
   * Ajouter smoke continu (appelé une fois au début)
   */
  async addContinuousSmoke(): Promise<void> {
    const assetId = this.assetManager.getRandomAsset('smoke');
    
    try {
      const asset = await this.assetManager.loadAsset(assetId);
      if (!asset.element) return;
      
      const video = asset.element as HTMLVideoElement;
      video.loop = true;
      
      const playPromise = video.play();
      if (playPromise) {
        playPromise.catch(err => {
          console.warn('⚠️ Smoke autoplay bloqué:', err);
        });
      }
      
      const effect: Effect = {
        type: 'smoke',
        element: video,
        x: 0,
        y: this.canvas.height - 300,
        scale: 1,
        opacity: 0,
        targetOpacity: 0.3,
        fadeIn: true,
        fadeOut: false,
        startTime: Date.now(),
        duration: Infinity,
        blendMode: 'multiply'
      };
      
      this.continuousEffects.push(effect);
      console.log('✅ Smoke continu ajouté');
    } catch (error) {
      console.error('❌ Erreur chargement smoke:', error);
    }
  }
  
  /**
   * Ajouter fire continu (appelé une fois au début)
   */
  async addContinuousFire(): Promise<void> {
    const assetId = this.assetManager.getRandomAsset('fire');
    
    try {
      const asset = await this.assetManager.loadAsset(assetId);
      if (!asset.element) return;
      
      const video = asset.element as HTMLVideoElement;
      video.loop = true;
      
      const playPromise = video.play();
      if (playPromise) {
        playPromise.catch(err => {
          console.warn('⚠️ Fire autoplay bloqué:', err);
        });
      }
      
      const effect: Effect = {
        type: 'fire',
        element: video,
        x: 0,
        y: this.canvas.height - 250,
        scale: 1,
        opacity: 0,
        targetOpacity: 0.4,
        fadeIn: true,
        fadeOut: false,
        startTime: Date.now(),
        duration: Infinity,
        blendMode: 'screen'
      };
      
      this.continuousEffects.push(effect);
      console.log('✅ Fire continu ajouté');
    } catch (error) {
      console.error('❌ Erreur chargement fire:', error);
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
        effect.opacity += 0.08;
        if (effect.opacity >= effect.targetOpacity) {
          effect.fadeIn = false;
        }
      }
      
      // Fade out
      if (effect.fadeOut && effect.opacity > 0) {
        effect.opacity -= 0.06;
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
    this.ctx.save();
    
    // Blend mode (CRUCIAL)
    this.ctx.globalCompositeOperation = effect.blendMode as GlobalCompositeOperation;
    this.ctx.globalAlpha = effect.opacity;
    
    // Calculer dimensions
    let width: number;
    let height: number;
    
    if (effect.element instanceof HTMLImageElement) {
      const aspectRatio = effect.element.height / effect.element.width;
      width = this.canvas.width * effect.scale * 0.4;
      height = width * aspectRatio;
    } else {
      if (effect.type === 'light-leak') {
        width = this.canvas.width;
        height = this.canvas.height;
      } else {
        width = this.canvas.width;
        height = 300;
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
    } catch (error) {
      console.warn('⚠️ Erreur dessin effet:', error);
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
}
