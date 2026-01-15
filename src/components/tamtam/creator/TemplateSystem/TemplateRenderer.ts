/**
 * Template Renderer v2.0
 * Moteur de rendu pour templates créatifs
 */

import type { TemplateManifest, TemplateState, TemplateLayer } from './types';

class TemplateRendererService {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private state: TemplateState = {
    template: null,
    isLoading: false,
    isPlaying: false,
    currentTime: 0,
    boundAssets: new Map(),
    renderProgress: 0,
    error: null
  };
  private animationFrame: number | null = null;

  /**
   * Initialiser le renderer avec un canvas
   */
  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    console.log('🎬 TemplateRenderer: Initialized');
  }

  /**
   * Charger un template
   */
  async loadTemplate(manifest: TemplateManifest): Promise<void> {
    this.state.isLoading = true;
    this.state.template = manifest;
    
    try {
      // Précharger les assets
      await this.preloadAssets(manifest);
      this.state.isLoading = false;
      console.log('✅ Template loaded:', manifest.name);
    } catch (error) {
      this.state.error = `Failed to load template: ${error}`;
      this.state.isLoading = false;
      throw error;
    }
  }

  /**
   * Précharger les assets du template
   */
  private async preloadAssets(manifest: TemplateManifest): Promise<void> {
    const highPriority = manifest.assets.filter(a => a.preloadPriority === 'high');
    
    await Promise.all(
      highPriority.map(async asset => {
        try {
          const response = await fetch(asset.url);
          const blob = await response.blob();
          this.state.boundAssets.set(asset.id, URL.createObjectURL(blob));
        } catch (error) {
          console.warn(`Failed to preload asset ${asset.id}:`, error);
          if (asset.fallbackUrl) {
            this.state.boundAssets.set(asset.id, asset.fallbackUrl);
          }
        }
      })
    );
  }

  /**
   * Lier un asset utilisateur à un slot
   */
  bindUserAsset(slotId: string, asset: Blob | string): void {
    this.state.boundAssets.set(slotId, asset);
  }

  /**
   * Démarrer la lecture
   */
  play(): void {
    if (!this.state.template) return;
    this.state.isPlaying = true;
    this.startRenderLoop();
  }

  /**
   * Mettre en pause
   */
  pause(): void {
    this.state.isPlaying = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  /**
   * Aller à un temps spécifique
   */
  seek(time: number): void {
    this.state.currentTime = Math.max(0, Math.min(time, this.state.template?.duration || 0));
  }

  /**
   * Boucle de rendu principale
   */
  private startRenderLoop(): void {
    const render = () => {
      if (!this.state.isPlaying || !this.ctx || !this.canvas || !this.state.template) return;
      
      // Clear canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Render each layer
      const layers = this.getVisibleLayers(this.state.currentTime);
      for (const layer of layers) {
        this.renderLayer(layer);
      }
      
      // Update time
      this.state.currentTime += 1 / 30; // 30 fps
      
      // Loop or stop
      if (this.state.currentTime >= this.state.template.duration) {
        this.state.currentTime = 0;
      }
      
      this.animationFrame = requestAnimationFrame(render);
    };
    
    render();
  }

  /**
   * Obtenir les layers visibles à un temps donné
   */
  private getVisibleLayers(time: number): TemplateLayer[] {
    if (!this.state.template) return [];
    
    return this.state.template.layers
      .filter(layer => {
        const { start, duration } = layer.timing;
        return layer.visible && time >= start && time < start + duration;
      })
      .sort((a, b) => a.zIndex - b.zIndex);
  }

  /**
   * Rendre un layer
   */
  private renderLayer(layer: TemplateLayer): void {
    if (!this.ctx) return;
    
    this.ctx.save();
    this.ctx.globalAlpha = layer.opacity;
    
    if (layer.transform) {
      const { x = 0, y = 0, scale = 1, rotation = 0 } = layer.transform;
      this.ctx.translate(x, y);
      this.ctx.scale(scale, scale);
      this.ctx.rotate((rotation * Math.PI) / 180);
    }
    
    // Render based on layer type
    switch (layer.type) {
      case 'video':
      case 'image':
        // À implémenter
        break;
      case 'text':
        // À implémenter
        break;
      case 'shape':
        // À implémenter
        break;
      case 'effect':
        // À implémenter
        break;
    }
    
    this.ctx.restore();
  }

  /**
   * Exporter la vidéo finale
   */
  async export(): Promise<Blob> {
    // À implémenter: utiliser MediaRecorder ou ffmpeg.wasm
    throw new Error('Export not implemented yet');
  }

  /**
   * Obtenir l'état actuel
   */
  getState(): TemplateState {
    return { ...this.state };
  }

  /**
   * Nettoyer les ressources
   */
  dispose(): void {
    this.pause();
    this.state.boundAssets.forEach(url => {
      if (typeof url === 'string' && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    this.state.boundAssets.clear();
    this.canvas = null;
    this.ctx = null;
  }
}

export const templateRenderer = new TemplateRendererService();
export default templateRenderer;
