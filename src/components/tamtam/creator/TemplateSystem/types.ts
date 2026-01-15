/**
 * Template System Types v3.0
 * Core interfaces for TAM-TAM video creation platform
 */

// Re-export from UnifiedTemplateTypes for compatibility
export * from '@/types/UnifiedTemplateTypes';

// Asset categories matching Envato structure
export type AssetCategory = 
  | '3d-models'
  | 'audio'
  | 'fonts'
  | 'particles'
  | 'transitions'
  | 'textures'
  | 'lens-flare'
  | 'light-leak';

// Effect trigger types
export type EffectTrigger = 'beat' | 'keyword' | 'time' | 'always';

// Effect types
export type EffectType = 
  | 'lens-flare' 
  | 'light-leak' 
  | '3d-object' 
  | 'particles' 
  | 'text' 
  | 'transition' 
  | 'texture';

// Effect configuration
export interface EffectConfig {
  x?: number;
  y?: number;
  scale?: number;
  opacity?: number;
  rotation?: number;
  blendMode?: GlobalCompositeOperation;
  content?: string;
  font?: string;
  color?: string;
  align?: CanvasTextAlign;
  startTime?: number;
  endTime?: number;
  duration?: number;
  [key: string]: unknown;
}

// Single effect definition
export interface Effect {
  id?: string;
  type: EffectType;
  assetId: string; // Format: "category:filename" (e.g., "lens-flare:flare-001.png")
  trigger: EffectTrigger;
  config: EffectConfig;
}

// Audio configuration
export interface AudioConfig {
  backgroundMusic?: string;
  volume?: number;
  fadeWithSpeech?: boolean;
  beatDetection?: boolean;
}

// Text overlay configuration
export interface TextConfig {
  content: string;
  font: string;
  size: number;
  color: string;
  position: { x: number; y: number };
  animation?: 'fade' | 'slide' | 'typewriter' | 'none';
}

// Template slot for user content
export interface TemplateSlot {
  id: string;
  type: 'video' | 'audio' | 'image' | 'text';
  label: string;
  description?: string;
  required: boolean;
  constraints?: {
    minDuration?: number;
    maxDuration?: number;
    aspectRatio?: string;
  };
}

// Local template definition (simpler than UnifiedTemplate)
export interface Template {
  id: string;
  name: string;
  nameBa?: string; // Bariba name
  category: 'storytelling' | 'music' | 'business' | 'education' | 'future';
  description: string;
  descriptionBa?: string; // Bariba description
  thumbnail: string;
  demoVideo?: string;
  effects: Effect[];
  audio?: AudioConfig;
  text?: TextConfig[];
  slots?: TemplateSlot[];
  duration?: number;
  tags?: string[];
  isPremium?: boolean;
  isNew?: boolean;
  usageCount?: number;
}

// Template state for rendering
export interface TemplateState {
  template: unknown;
  isLoading: boolean;
  isPlaying: boolean;
  currentTime: number;
  boundAssets: Map<string, Blob | string>;
  renderProgress: number;
  error: string | null;
}

// Template layer for composition
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

// Template engine state
export interface EngineState {
  isLoaded: boolean;
  isRendering: boolean;
  currentTime: number;
  progress: number;
  error: string | null;
}

// Export job tracking
export interface ExportJob {
  id: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number;
  outputBlob?: Blob;
  error?: string;
}

// Asset loading result
export interface LoadedAsset {
  id: string;
  type: AssetCategory;
  data: HTMLImageElement | HTMLVideoElement | AudioBuffer | FontFace | unknown;
  loaded: boolean;
}

// Render frame options
export interface RenderOptions {
  width?: number;
  height?: number;
  fps?: number;
  quality?: 'low' | 'medium' | 'high';
}

// Template selector filter
export interface TemplateFilter {
  category?: 'storytelling' | 'music' | 'business' | 'education' | 'future' | 'all';
  search?: string;
  isPremium?: boolean;
  tags?: string[];
}
