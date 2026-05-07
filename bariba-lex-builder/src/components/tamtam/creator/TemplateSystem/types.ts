/**
 * TAM-TAM Template System Types v4.0
 * Comprehensive type definitions for video creation platform
 */

// Re-export from UnifiedTemplateTypes for compatibility
export * from '@/types/UnifiedTemplateTypes';

// ============================================================================
// ASSET TYPES
// ============================================================================

export type AssetCategory = 
  | '3d-models' | 'audio' | 'fonts' | 'particles' 
  | 'transitions' | 'textures' | 'lens-flare' | 'light-leak';

// ============================================================================
// TEMPLATE CATEGORIES
// ============================================================================

export type TemplateCategory = 
  | 'storytelling' | 'music' | 'business' | 'education' | 'future';

// ============================================================================
// EFFECT TYPES
// ============================================================================

export type EffectType = 
  | 'lens-flare' | 'light-leak' | '3d-object' | 'particles' 
  | 'text' | 'transition' | 'texture' | 'color-grade' | 'sticker';

export type EffectTrigger = 'beat' | 'keyword' | 'time' | 'always';

export type BlendMode = GlobalCompositeOperation;

// ============================================================================
// EFFECT CONFIGURATION
// ============================================================================

export interface EffectConfig {
  // Position
  x?: number; 
  y?: number; 
  z?: number;
  
  // Transform
  scale?: number;
  rotation?: number;
  rotationX?: number; 
  rotationY?: number; 
  rotationZ?: number;
  
  // Appearance
  opacity?: number;
  blendMode?: BlendMode;
  
  // Animation
  duration?: number; 
  delay?: number; 
  loop?: boolean;
  
  // Text-specific
  text?: string; 
  font?: string; 
  color?: string;
  align?: 'left' | 'center' | 'right';
  strokeColor?: string; 
  strokeWidth?: number;
  shadow?: boolean;
  
  // Trigger-specific
  keywords?: string[];
  timeRange?: [number, number];
  beatThreshold?: number;
  
  // Legacy support
  startTime?: number;
  endTime?: number;
  content?: string;
  [key: string]: unknown;
}

// ============================================================================
// EFFECT DEFINITION
// ============================================================================

export interface Effect {
  id?: string;
  type: EffectType;
  assetId: string; // Format: "category:filename" (e.g., "lens-flare:flare-001.png")
  trigger: EffectTrigger;
  config: EffectConfig;
}

// ============================================================================
// AUDIO CONFIGURATION
// ============================================================================

export interface AudioConfig {
  backgroundMusic?: string;
  volume?: number;
  fadeWithSpeech?: boolean;
  beatDetection?: boolean;
}

// ============================================================================
// TEMPLATE DEFINITION
// ============================================================================

export interface Template {
  id: string;
  name: string;
  nameBa?: string; // Bariba name
  category: TemplateCategory;
  description: string;
  descriptionBa?: string; // Bariba description
  thumbnail: string;
  demoVideo?: string;
  effects: Effect[];
  audio?: AudioConfig;
  metadata?: {
    author?: string;
    version?: string;
    tags?: string[];
  };
  // Legacy support
  text?: TextConfig[];
  slots?: TemplateSlot[];
  duration?: number;
  tags?: string[];
  isPremium?: boolean;
  isNew?: boolean;
  usageCount?: number;
  emoji?: string; // Icon emoji for fallback display
}

// ============================================================================
// RENDER STATE
// ============================================================================

export interface RenderState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  fps: number;
  loadedAssets: number;
  totalAssets: number;
}

// ============================================================================
// LEGACY TYPES (for backward compatibility)
// ============================================================================

export interface TextConfig {
  content: string;
  font: string;
  size: number;
  color: string;
  position: { x: number; y: number };
  animation?: 'fade' | 'slide' | 'typewriter' | 'none';
}

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

export interface TemplateState {
  template: unknown;
  isLoading: boolean;
  isPlaying: boolean;
  currentTime: number;
  boundAssets: Map<string, Blob | string>;
  renderProgress: number;
  error: string | null;
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

export interface EngineState {
  isLoaded: boolean;
  isRendering: boolean;
  currentTime: number;
  progress: number;
  error: string | null;
}

export interface ExportJob {
  id: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number;
  outputBlob?: Blob;
  error?: string;
}

export interface LoadedAsset {
  id: string;
  type: AssetCategory;
  data: HTMLImageElement | HTMLVideoElement | AudioBuffer | FontFace | unknown;
  loaded: boolean;
}

export interface RenderOptions {
  width?: number;
  height?: number;
  fps?: number;
  quality?: 'low' | 'medium' | 'high';
}

export interface TemplateFilter {
  category?: TemplateCategory | 'all';
  search?: string;
  isPremium?: boolean;
  tags?: string[];
}
