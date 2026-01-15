/**
 * TemplateEngine.ts - Wrapper de compatibilité
 * Fournit les types et fonctions legacy pour la transition
 */

// Types K-Engine
export type InputType = 'video' | 'image' | 'audio' | 'text';
export type LayerType = 'video' | 'image' | 'text' | 'shape' | 'effect' | 'audio';

export interface SlotDefinition {
  id: string;
  label: string;
  type: InputType;
  required: boolean;
  duration?: number;
  placeholder?: string;
}

export interface TimelineLayer {
  id: string;
  type: LayerType;
  zIndex: number;
  visible: boolean;
  opacity: number;
  blendMode?: string;
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

export interface TemplateManifest {
  id: string;
  version: string;
  name: string;
  description: string;
  category: string;
  duration: number;
  slots: SlotDefinition[];
  layers: TimelineLayer[];
  export: {
    resolution: string;
    fps: number;
    codec: string;
    bitrate: number;
  };
}

export interface BoundAsset {
  slotId: string;
  type: InputType;
  data: Blob | string;
  duration?: number;
}

export interface EngineState {
  template: TemplateManifest | null;
  isLoaded: boolean;
  isPlaying: boolean;
  currentTime: number;
  boundAssets: BoundAsset[];
  renderProgress: number;
  error: string | null;
}

export interface ExportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  outputUrl?: string;
  error?: string;
}

// K-Engine Runtime (placeholder)
class KEngineRuntime {
  private state: EngineState = {
    template: null,
    isLoaded: false,
    isPlaying: false,
    currentTime: 0,
    boundAssets: [],
    renderProgress: 0,
    error: null
  };

  async loadTemplate(manifest: TemplateManifest): Promise<void> {
    this.state.template = manifest;
    this.state.isLoaded = true;
    console.log('📦 K-Engine: Template loaded', manifest.name);
  }

  bindAsset(slotId: string, asset: Blob | string): void {
    const existing = this.state.boundAssets.findIndex(a => a.slotId === slotId);
    const boundAsset: BoundAsset = {
      slotId,
      type: typeof asset === 'string' ? 'text' : 'video',
      data: asset
    };
    
    if (existing >= 0) {
      this.state.boundAssets[existing] = boundAsset;
    } else {
      this.state.boundAssets.push(boundAsset);
    }
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

  getState(): EngineState {
    return { ...this.state };
  }

  async exportJob(): Promise<ExportJob> {
    return {
      id: `export_${Date.now()}`,
      status: 'pending',
      progress: 0
    };
  }

  reset(): void {
    this.state = {
      template: null,
      isLoaded: false,
      isPlaying: false,
      currentTime: 0,
      boundAssets: [],
      renderProgress: 0,
      error: null
    };
  }
}

export const kEngine = new KEngineRuntime();

// Legacy Template Engine Service (placeholder)
class TemplateEngineService {
  async processTemplate(templateId: string, inputs: Record<string, unknown>): Promise<Blob> {
    console.log('🔧 Legacy TemplateEngine: Processing', templateId);
    throw new Error('Legacy template processing not implemented');
  }

  async generateCaptions(audioUrl: string): Promise<string[]> {
    return [];
  }

  async enhanceAudio(audioBlob: Blob): Promise<Blob> {
    return audioBlob;
  }
}

export const templateEngine = new TemplateEngineService();
export default templateEngine;
