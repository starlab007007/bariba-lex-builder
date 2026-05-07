// ==========================================
// CAPTIONS
// ==========================================

export interface Caption {
  text: string;
  startTime: number;
  endTime: number;
  style: TextStyle;
  animation: string;
  position: Position;
  words?: WordTiming[];
}

export interface WordTiming {
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

/**
 * KuaishouTypes.ts
 * Types TypeScript complets pour le système de templates vidéo Kuaishou
 * Version: 1.0.0
 */

// ==========================================
// CONFIGURATION TEMPLATE PRINCIPALE
// ==========================================

// ==========================================
// EFFETS NATIFS KUAISHOU
// ==========================================

export interface SparklesEffect {
  enabled: boolean;
  count: number;
  colors: string[];
  sizeRange?: [number, number];
  twinkleSpeed?: number;
}

export interface HorseSilhouetteEffect {
  enabled: boolean;
  animation: 'gallop_across' | 'jump' | 'static';
  color?: string;
  startTime?: number;
  endTime?: number;
}

export interface CalligraphyEffect {
  enabled: boolean;
  texts: string[];
  font?: string;
  color?: string;
}

export interface WarmGlowEffect {
  enabled: boolean;
  intensity?: number;
  color?: string;
}

export interface BeatGlowEffect {
  enabled: boolean;
  syncToBeat: boolean;
  bpm?: number;
  color?: string;
}

export interface ProgressBarEffect {
  enabled: boolean;
  color?: string;
  glowColor?: string;
  height?: number;
}

export interface KuaishouNativeEffects {
  sparkles?: SparklesEffect;
  horseSilhouette?: HorseSilhouetteEffect;
  calligraphy?: CalligraphyEffect;
  warmGlow?: WarmGlowEffect;
  beatGlow?: BeatGlowEffect;
  progressBar?: ProgressBarEffect;
}

// ==========================================
// CONFIGURATION TEMPLATE PRINCIPALE
// ==========================================

export interface KuaishouTemplateConfig {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  contentType: ContentType;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  
  // Configuration vidéo
  video: VideoConfig;
  
  // Segments du template
  segments: TemplateSegment[];
  
  // Configuration musique
  music: MusicConfig;
  
  // Effets automatiques
  autoEffects: AutoEffectsConfig;
  
  // Smart cuts (IA)
  smartCuts: SmartCutsConfig;
  
  // Transitions
  transitions: TransitionConfig[];
  
  // Overlays (stickers, texte, CTA)
  overlays: OverlaysConfig;
  
  // Hooks pour viralité
  hooks: HooksConfig;
  
  // Hashtags
  hashtags: HashtagsConfig;
  
  // Métadonnées
  metadata: TemplateMetadata;
  
  // Effets Kuaishou natifs (sparkles, horse, calligraphy, etc.)
  kuaishouEffects?: KuaishouNativeEffects;
}

export type TemplateCategory = 
  | 'dance' 
  | 'tutorial' 
  | 'story' 
  | 'challenge' 
  | 'vlog' 
  | 'comedy'
  | 'beauty'
  | 'food'
  | 'travel'
  | 'fitness';

export type ContentType = 'video' | 'photo' | 'mixed';

// ==========================================
// CONFIGURATION VIDÉO
// ==========================================

export interface VideoConfig {
  duration: number;
  format: '9:16' | '16:9' | '1:1' | '4:5';
  targetSize: string;
  resolution: {
    width: number;
    height: number;
  };
  frameRate: 30 | 60;
  bitrate: number;
}

// ==========================================
// SEGMENTS
// ==========================================

export interface TemplateSegment {
  id: string;
  type: SegmentType;
  start: number;
  duration: number;
  minDuration?: number;
  maxDuration?: number;
  
  // Pour segments template
  videoUrl?: string;
  editable: boolean;
  
  // Pour segments utilisateur
  guidance?: GuidanceConfig;
  
  // Effets à appliquer
  effects: EffectType[];
  
  // Configurations spécifiques
  kenBurns?: KenBurnsConfig;
  lightLeak?: LightLeakConfig;
  colorGrading?: ColorGradingConfig;
}

export type SegmentType = 
  | 'template_video'   // Vidéo fournie par le template
  | 'user_capture'     // Vidéo captée par l'utilisateur
  | 'photo_slot'       // Photo uploadée par l'utilisateur
  | 'text_screen';     // Écran de texte

export type EffectType = 
  | 'beauty'
  | 'stabilization'
  | 'ken_burns'
  | 'light_leak'
  | 'color_grading'
  | 'film_grain'
  | 'vignette'
  | 'hdr_like'
  | 'sharpness'
  | 'slow_motion'
  | 'speed_up'
  | 'reverse'
  | 'glitch'
  | 'rgb_split'
  | 'zoom_blur'
  | 'beat_sync';

// ==========================================
// GUIDANCE (Instructions pour l'utilisateur)
// ==========================================

export interface GuidanceConfig {
  text: string;
  countdown: boolean;
  beatIndicator: boolean;
  onScreenGuide?: string;
  visualCues: VisualCue[];
  voiceInstructions?: VoiceInstruction[];
}

export interface VisualCue {
  type: 'silhouette' | 'arrow' | 'circle' | 'text' | 'spotlight';
  position: Position;
  size?: Size;
  animation?: string;
  timing: Timing;
  color?: string;
}

export interface VoiceInstruction {
  text: string;
  timing: number;
  voice: 'male' | 'female' | 'robotic';
  language: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Timing {
  start: number;
  end: number;
}

// ==========================================
// EFFETS
// ==========================================

export interface KenBurnsConfig {
  startScale: number;
  endScale: number;
  startPosition: Position;
  endPosition: Position;
  easing?: EasingFunction;
}

export type EasingFunction = 
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'easeInOutQuad'
  | 'easeInOutCubic';

export interface LightLeakConfig {
  asset: string;
  position: string | Position;
  animation: string;
  opacity: number;
  blendMode: BlendMode;
}

export type BlendMode = 
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light';

export interface ColorGradingConfig {
  enabled?: boolean;
  lut: string;
  intensity: number;
  temperature?: number;
  tint?: number;
  saturation?: number;
  contrast?: number;
  brightness?: number;
}

// ==========================================
// MUSIQUE
// ==========================================

export interface MusicConfig {
  trackUrl: string;
  title?: string;
  artist?: string;
  bpm: number;
  beatMarkers: number[];
  autoSync: boolean;
  cutOnBeat: boolean;
  volume: number;
  fadeIn?: number;
  fadeOut?: number;
}

// ==========================================
// EFFETS AUTOMATIQUES
// ==========================================

export interface AutoEffectsConfig {
  beauty: BeautyFilterConfig;
  stabilization: StabilizationConfig;
  colorGrading: ColorGradingConfig;
  sharpness: SharpnessConfig;
  hdrLike: HDRConfig;
  filmGrain?: FilmGrainConfig;
  denoising?: DenoisingConfig;
}

export interface BeautyFilterConfig {
  enabled: boolean;
  intensity: number;
  skinSmooth: boolean;
  eyeEnhance: boolean;
  faceSlim: number;
  eyesBigger?: number;
  noseRefine?: number;
  teethWhiten?: number;
}

export interface StabilizationConfig {
  enabled: boolean;
  strength: number;
  method: 'optical_flow' | 'feature_tracking' | 'gyroscope';
  cropFactor: number;
}

export interface SharpnessConfig {
  enabled: boolean;
  amount: number;
  radius: number;
  threshold: number;
}

export interface HDRConfig {
  enabled: boolean;
  highlights: number;
  shadows: number;
  midtones: number;
  strength: number;
}

export interface FilmGrainConfig {
  enabled: boolean;
  intensity: number;
  size: number;
  type: 'fine' | 'medium' | 'coarse';
}

export interface DenoisingConfig {
  enabled: boolean;
  strength: number;
  preserveDetails: boolean;
}

// ==========================================
// SMART CUTS (IA)
// ==========================================

export interface SmartCutsConfig {
  enabled: boolean;
  algorithm: CutAlgorithm;
  rules: CutRule[];
  minSegmentDuration: number;
  maxSegmentDuration: number;
}

export type CutAlgorithm = 
  | 'beat_motion_hybrid'
  | 'motion_only'
  | 'beat_only'
  | 'scene_detection'
  | 'emotion_detection';

export interface CutRule {
  type: CutRuleType;
  priority: 'high' | 'medium' | 'low';
  threshold?: number;
  action?: string;
  cutOnBeat?: boolean;
  minSegmentDuration?: number;
  avoidCuttingFaces?: boolean;
}

export type CutRuleType = 
  | 'beat_sync'
  | 'motion_intensity'
  | 'face_detection'
  | 'scene_change'
  | 'emotion_peak'
  | 'speech_pause';

export interface Cut {
  segmentId: string;
  timestamp: number;
  type: string;
  transitionType: TransitionType;
  confidence?: number;
  reason?: string;
}

// ==========================================
// TRANSITIONS
// ==========================================

export interface TransitionConfig {
  between: [string, string];
  type: TransitionType;
  duration: number;
  beatSync: boolean;
  algorithm?: string;
  easing?: EasingFunction;
}

export type TransitionType = 
  | 'crossfade'
  | 'smart_cut'
  | 'zoom_blur'
  | 'push'
  | 'wipe'
  | 'slide'
  | 'fade_to_black'
  | 'fade_to_white'
  | 'dissolve'
  | 'glitch'
  | 'luminance_fade'
  | 'match_cut';

// ==========================================
// OVERLAYS
// ==========================================

export interface OverlaysConfig {
  stickers: StickerOverlay[];
  text: TextOverlay[];
  cta?: CTAOverlay;
  watermark?: WatermarkConfig;
}

export interface StickerOverlay {
  id: string;
  assetUrl: string;
  tracking: TrackingType;
  position: string | Position;
  size: Size;
  animation: string;
  startTime: number;
  endTime: number;
  opacity: number;
  rotation?: number;
}

export type TrackingType = 
  | 'face'
  | 'hand'
  | 'body'
  | 'eyes'
  | 'mouth'
  | 'none';

export interface TextOverlay {
  id: string;
  content: string | 'AUTO_DETECT';
  style: TextStyle;
  position: string | Position;
  animation: string;
  timing: 'manual' | 'auto_sync';
  font?: FontConfig;
  color?: string;
  backgroundColor?: string;
  outline?: OutlineConfig;
  shadow?: ShadowConfig;
}

export type TextStyle = 
  | 'karaoke'
  | 'subtitle'
  | 'title'
  | 'caption'
  | 'quote'
  | 'typewriter';

export interface FontConfig {
  family: string;
  size: number;
  weight: number | string;
  italic?: boolean;
}

export interface OutlineConfig {
  color: string;
  width: number;
}

export interface ShadowConfig {
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

export interface CTAOverlay {
  type: 'button' | 'link' | 'swipe_up' | 'follow' | 'like';
  text: string;
  position: string | Position;
  startTime: number;
  endTime?: number;
  action: string;
  style?: CTAStyle;
}

export interface CTAStyle {
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  padding: number;
  animation?: string;
}

export interface WatermarkConfig {
  imageUrl: string;
  position: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right' | 'center';
  opacity: number;
  size: Size;
}

// ==========================================
// HOOKS (Viralité)
// ==========================================

export interface HooksConfig {
  enabled: boolean;
  autoDetect: boolean;
  suggestions: HookSuggestion[];
}

export interface HookSuggestion {
  type: HookType;
  text: string;
  duration?: number;
  timestamp?: number;
  style: string;
  voiceOver?: boolean;
}

export type HookType = 
  | 'opening_hook'
  | 'mid_hook'
  | 'end_hook'
  | 'cliffhanger'
  | 'question'
  | 'shocking_statement';

// ==========================================
// HASHTAGS
// ==========================================

export interface HashtagsConfig {
  autoGenerate: boolean;
  trending: string[];
  aiSuggested: string | string[];
  maxHashtags: number;
}

// ==========================================
// MÉTADONNÉES
// ==========================================

export interface TemplateMetadata {
  createdAt: string;
  updatedAt: string;
  author: string;
  version: string;
  popularity: number;
  usageCount: number;
  rating: number;
  tags: string[];
  thumbnail: string;
  previewVideo: string;
}

// ==========================================
// SEGMENTS VIDÉO
// ==========================================

export interface VideoSegment {
  id: string;
  templateSegmentId?: string;
  blob?: Blob;
  videoElement?: HTMLVideoElement;
  image?: HTMLImageElement;
  duration: number;
  timestamp: number;
  effects: EffectType[];
  metadata?: SegmentMetadata;
}

export interface SegmentMetadata {
  width: number;
  height: number;
  frameRate: number;
  codec: string;
  size: number;
  hasAudio: boolean;
}

// ==========================================
// AUDIO
// ==========================================

export interface MusicTrack {
  url: string;
  audioBuffer: AudioBuffer;
  duration: number;
  bpm?: number;
  beatMarkers?: number[];
  waveform?: number[];
}

export interface BPMAnalysis {
  bpm: number;
  beatMarkers: number[];
  confidence: number;
  timeSignature: string;
  tempo: 'slow' | 'medium' | 'fast';
}

// ==========================================
// ANALYSE MOTION
// ==========================================

export interface MotionData {
  segmentId: string;
  intensity: MotionIntensity[];
  direction: MotionDirection[];
  peaks: MotionPeak[];
}

export interface MotionIntensity {
  timestamp: number;
  magnitude: number;
  normalized: number;
}

export interface MotionDirection {
  timestamp: number;
  angle: number;
  velocity: number;
}

export interface MotionPeak {
  timestamp: number;
  intensity: number;
  type: 'major' | 'minor';
}

// ==========================================
// FACE DETECTION
// ==========================================

export interface FaceDetectionResult {
  faces: Face[];
  timestamp: number;
}

export interface Face {
  id: string;
  boundingBox: BoundingBox;
  landmarks: FaceLandmarks;
  emotions?: Emotions;
  age?: number;
  gender?: 'male' | 'female';
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceLandmarks {
  leftEye: Position;
  rightEye: Position;
  nose: Position;
  mouth: Position;
  leftEar?: Position;
  rightEar?: Position;
}

export interface Emotions {
  happy: number;
  sad: number;
  angry: number;
  surprised: number;
  neutral: number;
}

// ==========================================
// PREVIEW & EXPORT
// ==========================================

export interface PreviewVideo {
  url: string;
  duration: number;
  quality: 'preview' | 'sd' | 'hd' | 'uhd';
  size: number;
  readyTime: number;
  format: string;
}

export interface FinalVideo {
  url: string;
  duration: number;
  quality: string;
  size: number;
  codec: string;
  readyTime: number;
  cdnUrl?: string;
  thumbnailUrl?: string;
}

export interface ExportOptions {
  quality: 'preview' | 'sd' | 'hd' | 'uhd';
  format: 'mp4' | 'webm' | 'mov';
  codec: 'h264' | 'h265' | 'vp9' | 'av1';
  preset: 'ultrafast' | 'fast' | 'medium' | 'slow' | 'veryslow';
  crf: number;
  bitrate?: number;
  audio: AudioExportOptions;
}

export interface AudioExportOptions {
  codec: 'aac' | 'opus' | 'mp3';
  bitrate: number;
  sampleRate: number;
  channels: 1 | 2;
}

// ==========================================
// UPLOAD & COMPRESSION
// ==========================================

export interface UploadResult {
  success: boolean;
  url: string;
  key: string;
  size: number;
  duration: number;
  error?: string;
}

export interface CompressedVideo {
  url: string;
  compressed: boolean;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export interface CDNUrls {
  hd: string;
  sd: string;
  low: string;
  thumbnail: string;
}

// ==========================================
// CAPTIONS
// ==========================================

export interface KuaishouCaption {
  text: string;
  startTime: number;
  endTime: number;
  style: TextStyle;
  animation: string;
  position: Position;
  words?: WordTiming[];
}

export interface WordTiming {
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

// ==========================================
// DEVICE & PERFORMANCE
// ==========================================

export interface DeviceSpecs {
  gpu: GPUSpecs;
  memory: number;
  cores: number;
  screenSize: Size;
  pixelRatio: number;
}

export interface GPUSpecs {
  vendor: string;
  renderer: string;
  score: number;
  tier: 'low' | 'medium' | 'high';
}

export interface RenderConfig {
  resolution: Size;
  frameRate: number;
  effects: 'all' | 'essential' | 'minimal';
  preview: 'realtime' | 'fast' | 'instant';
  quality: number;
}

// ==========================================
// ERRORS & STATUS
// ==========================================

export interface ProcessingStatus {
  stage: ProcessingStage;
  progress: number;
  message: string;
  estimatedTime?: number;
}

export type ProcessingStage = 
  | 'initializing'
  | 'loading'
  | 'processing'
  | 'rendering'
  | 'encoding'
  | 'uploading'
  | 'complete'
  | 'error';

export interface ErrorInfo {
  code: string;
  message: string;
  details?: any;
  recoverable: boolean;
}

// ==========================================
// TRENDING & CHALLENGES
// ==========================================

export interface TrendSegment {
  startTime: number;
  endTime: number;
  views: number;
  engagement: number;
  hashtags: string[];
  reusable: boolean;
}

export interface Challenge {
  id: string;
  name: string;
  templateId: string;
  hashtag: string;
  description: string;
  participantsCount: number;
  totalViews: number;
  startDate: string;
  endDate: string;
  prize?: string;
}
