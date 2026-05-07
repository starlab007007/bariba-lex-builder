/**
 * Template Renderer v3.0
 * Moteur de rendu simplifié - Version compatible
 */

import type { TemplateManifestData } from '@/types/UnifiedTemplateTypes';
import type { TemplateState, TemplateLayer } from './types';

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

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    console.log('🎬 TemplateRenderer: Initialized');
  }

  async loadTemplate(manifest: TemplateManifestData): Promise<void> {
    this.state.isLoading = true;
    this.state.template = manifest;
    this.state.isLoading = false;
    console.log('✅ Template loaded:', manifest.name);
  }

  bindUserAsset(slotId: string, asset: Blob | string): void {
    this.state.boundAssets.set(slotId, asset);
  }

  play(): void {
    this.state.isPlaying = true;
  }

  pause(): void {
    this.state.isPlaying = false;
  }

  seek(time: number): void {
    this.state.currentTime = time;
  }

  getState(): TemplateState {
    return { ...this.state };
  }

  // Layer management for composition
  createLayer(config: Partial<TemplateLayer>): TemplateLayer {
    return {
      id: config.id || crypto.randomUUID(),
      type: config.type || 'video',
      zIndex: config.zIndex || 0,
      visible: config.visible ?? true,
      opacity: config.opacity ?? 1,
      timing: config.timing || { start: 0, duration: 10 },
      transform: config.transform
    };
  }

  dispose(): void {
    this.state.boundAssets.forEach((url) => {
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
