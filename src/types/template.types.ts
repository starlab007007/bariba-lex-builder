// ============================================================
// UNIFIED TEMPLATE TYPES - Kuaishou-style Template System
// ============================================================

export type TemplateInputType = 'video' | 'photo' | 'audio' | 'text';
export type OutputRatio = '9:16' | '1:1' | '16:9';
export type TemplateDuration = '10s' | '15s' | '30s' | '45s' | '60s' | '90s' | '120s';

// ============================================================
// SLOT DEFINITION (what the template needs from user)
// ============================================================

export interface SlotConstraints {
  minDurationSec?: number;
  maxDurationSec?: number;
  detectObject?: 'person' | 'face' | 'any';
  orientation?: 'portrait' | 'landscape' | 'any';
}

export interface SlotDefinition {
  id: string;
  description?: string;
  type: TemplateInputType;
  required: boolean;
  min: number;
  max: number;
  constraints?: SlotConstraints;
}

// ============================================================
// PIPELINE STEP (AI processing)
// ============================================================

export type PipelineOp =
  | 'smart_crop'
  | 'segmentation_person'
  | 'asr_subtitles'
  | 'beat_detect'
  | 'style_transfer'
  | 'audio_enhance'
  | 'denoise_sharpen'
  | 'translation_subtitles'
  | 'photo_animation'
  | 'icon_injection'
  | 'narrative_structure'
  | 'broll_insertion'
  | 'voice_clone_hook'
  | 'auto_editing'
  | 'multi_format_export_plan'
  | 'enhance'
  | 'color_grade';

export interface PipelineStep {
  op: PipelineOp | string;
  target?: string;
  params?: Record<string, any>;
  output?: string;
  weight?: number; // For progress calculation
  quality?: 'high' | 'medium' | 'low';
}

// ============================================================
// TIMELINE LAYER (composition)
// ============================================================

export interface Transform {
  x: number; // NORMALIZED 0..1
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export interface LayerAnimation {
  type: 'fade' | 'slide' | 'zoom' | 'bounce' | 'pop_in' | 'wiggle' | 'pulse';
  duration: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface TimelineLayer {
  id: string;
  type: 'video_layer' | 'user_media_layer' | 'text_layer' | 'sticker_layer' | 'overlay_layer';
  zIndex: number;
  start: number;
  end: number;
  asset?: string;
  slotRef?: string;
  transform?: Partial<Transform>;
  effects?: string[];
  animation?: LayerAnimation | null;
  text?: string;
  style?: string;
  blend?: 'normal' | 'screen' | 'add' | 'multiply';
}

// ============================================================
// TEMPLATE MANIFEST (full definition)
// ============================================================

export interface TemplateManifest {
  id: string;
  name: string;
  description?: string;
  version: string;
  duration: number; // in seconds
  ratio: OutputRatio;
  category?: string;
  family?: 'grand_public' | 'educatif_culture' | 'vocal_radio';
  collection?: string;
  tags?: string[];
  
  // Template contract
  slots: SlotDefinition[];
  pipeline?: PipelineStep[];
  timeline: TimelineLayer[];
  
  // User overrides allowed
  overrides?: string[];
  
  // Music settings
  music?: {
    enabled: boolean;
    beatSync?: boolean;
    defaultTrack?: string;
    bpm?: number;
  };
  
  // Export settings
  export?: {
    codec?: string;
    preset?: 'ultrafast' | 'fast' | 'medium';
    crf?: number;
    fps?: number;
  };
  
  // Publishing defaults
  publishDefaults?: {
    allowDuo?: boolean;
    hashtags?: string[];
    visibility?: 'public' | 'friends' | 'private';
  };
  
  // UI hints (Kuaishou-style)
  cardHint?: {
    inputSummary: string;
    timeLabel: string;
  };
  
  // Usage stats
  usage?: number;
  downloadCount?: number;
}

// ============================================================
// TEMPLATE PACK (assets collection)
// ============================================================

export interface StickerItem {
  id: string;
  src: string;
  defaultAnim?: {
    name: string;
    speed?: number;
    loop?: boolean;
    strength?: number;
    smoothing?: number;
    rate?: number;
  };
}

export interface StickerPack {
  id: string;
  type: 'sticker_pack';
  items: StickerItem[];
}

export interface AudioItem {
  id: string;
  src: string;
  duration?: number;
  bpm?: number;
}

export interface AudioPack {
  id: string;
  type: 'audio_pack' | 'music_source';
  items?: AudioItem[];
  provider?: string;
  queryPresets?: Array<{ id: string; label: string; params: Record<string, any> }>;
  selectionHint?: Record<string, any>;
}

export interface FilterPack {
  id: string;
  type: 'filter' | 'fx';
  pipeline: Array<{ op: string; amount?: number; [key: string]: any }>;
}

export interface TextStylePack {
  id: string;
  type: 'text_style';
  font: string;
  size: number;
  stroke?: { width: number; color: string };
  shadow?: { x: number; y: number; blur: number; opacity: number };
  bg?: { color: string; opacity: number; radius: number; padding: number };
  align: 'left' | 'center' | 'right';
}

export type TemplatePack = StickerPack | AudioPack | FilterPack | TextStylePack;

// ============================================================
// PROJECT DRAFT (user's work-in-progress)
// ============================================================

export interface AssetBinding {
  id: string;
  type: TemplateInputType;
  src: string; // local:// or https://
  durationSec?: number;
  width?: number;
  height?: number;
  blob?: Blob;
}

export interface ProjectDraft {
  id: string;
  templateId: string;
  createdAt: string;
  updatedAt: string;
  
  // Format settings
  format: {
    ratio: OutputRatio;
    fps: number;
    resolution: { w: number; h: number };
    durationSec: number;
  };
  
  // User's media assets
  assets: AssetBinding[];
  
  // Input bindings (slot -> asset)
  inputBindings: Record<string, string | string[]>;
  
  // Text inputs
  texts?: Record<string, string>;
  
  // User overrides
  overrides?: {
    publish?: {
      allowDuo?: boolean;
      hashtags?: string[];
      visibility?: 'public' | 'friends' | 'private';
    };
    music?: {
      trackId?: string;
      gain?: number;
      startOffset?: number;
    };
    filter?: string;
    [key: string]: any;
  };
  
  // Runtime state
  runtime?: {
    resolvedTimeline?: ResolvedTimeline;
    draft: boolean;
  };
}

// ============================================================
// RESOLVED TIMELINE (after manifest + project merge)
// ============================================================

export interface ResolvedClip {
  id: string;
  src: string;
  t0: number;
  t1: number;
  trim?: { start: number; end: number };
  transitionOut?: 'fade' | 'whip_pan' | 'dissolve';
  transitionIn?: 'fade' | 'slide' | 'zoom';
  fx?: string[];
  filter?: string;
  speed?: Array<{ t0: number; t1: number; rate: number }>;
  speedRamps?: Array<{ t0: number; t1: number; rate: number }>;
  layout?: string;
  bg?: string;
  stabilize?: boolean;
}

export interface ResolvedAudioClip {
  id: string;
  src: string;
  t0: number;
  t1: number;
  mix?: {
    gain: number;
    duckVoice?: boolean;
  };
}

export interface ResolvedOverlay {
  kind: 'text' | 'sticker' | 'subtitle';
  style?: string;
  text?: string;
  ref?: string;
  t0: number;
  t1: number;
  box?: { x: number; y: number; w: number; h: number };
  anim?: { name: string };
}

export interface ResolvedTrack {
  id: string;
  type: 'video' | 'audio' | 'overlay';
  clips?: ResolvedClip[];
  items?: ResolvedOverlay[];
}

export interface ResolvedTimeline {
  tracks: ResolvedTrack[];
}

// ============================================================
// TEMPLATE INDEX (catalogue)
// ============================================================

export interface TemplateIndexEntry {
  id: string;
  name: string;
  durationSec: number;
  ratio: OutputRatio;
  manifest: string; // path to manifest file
  tags: string[];
  family?: string;
  collection?: string;
  featured?: boolean;
  usage?: number;
}

export interface TemplateIndex {
  version: number;
  templates: TemplateIndexEntry[];
}

// ============================================================
// BEAT SYNC TYPES
// ============================================================

export interface BeatMarker {
  time: number; // seconds
  strength: number; // 0-1
  type: 'kick' | 'snare' | 'beat' | 'bar';
}

export interface BeatSyncResult {
  bpm: number;
  beats: BeatMarker[];
  drops: number[]; // timestamps of major drops
}
