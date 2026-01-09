/**
 * UnifiedTemplateTypes.ts
 * Types communs pour l'unification de tous les templates
 */

import { KuaishouTemplateConfig } from './KuaishouTypes';

// Source du template
export type TemplateSource = 'kuaishou' | 'advanced' | 'ai_generated' | 'radio_village';

// Phase du créateur unifié
export type CreatorPhase = 'templates' | 'capturing' | 'previewing' | 'exporting' | 'published';

// Difficulté du template
export type TemplateDifficulty = 'beginner' | 'intermediate' | 'advanced';

// Type de contenu
export type ContentType = 'video' | 'photo' | 'audio' | 'mixed';

// Format de sortie
export type OutputFormat = '9:16' | '16:9' | '1:1' | '4:5';

// Catégorie de template
export type TemplateCategory = 
  | 'social' 
  | 'education' 
  | 'storytelling' 
  | 'music' 
  | 'challenge' 
  | 'tutorial'
  | 'audio_first'
  | 'photo_story'
  | 'premium';

/**
 * Interface unifiée pour tous les templates
 */
export interface UnifiedTemplate {
  // Identifiants
  id: string;
  templateKey: string;
  
  // Labels bilingues
  name: string;
  name_bariba?: string;
  description: string;
  description_bariba?: string;
  
  // Affichage
  icon: string;
  emoji: string;
  color: string;
  thumbnail?: string;
  previewVideo?: string;
  
  // Classification
  category: TemplateCategory;
  contentType: ContentType;
  difficulty: TemplateDifficulty;
  tags: string[];
  
  // Configuration vidéo
  duration: number;
  minDuration?: number;
  maxDuration?: number;
  format: OutputFormat;
  resolution: {
    width: number;
    height: number;
  };
  
  // Statistiques
  rating: number;
  usageCount: number;
  downloadCount: number;
  
  // Flags
  isPremium: boolean;
  isNew: boolean;
  isFeatured: boolean;
  isActive: boolean;
  
  // Source et données originales
  source: TemplateSource;
  originalConfig: KuaishouTemplateConfig | AdvancedTemplateData | AIGeneratedTemplateData | null;
  
  // Pour le rendu K-Engine
  manifest?: TemplateManifestData;
  kuaishouEffects?: KuaishouEffectsData;
  
  // Voice instructions bilingues
  voiceInstructions?: {
    fr: string;
    bariba?: string;
  };
  
  // Inputs requis
  inputs?: TemplateInputDef[];
}

/**
 * Données d'un template avancé
 */
export interface AdvancedTemplateData {
  id: string;
  key: string;
  label: string;
  labelBa?: string;
  description: string;
  descriptionBa?: string;
  family: string;
  collection?: string;
  emoji: string;
  color: string;
  features: string[];
  inputs: Record<string, unknown>;
  voiceInstructions: {
    fr: string;
    ba?: string;
  };
  outputRatios: string[];
  supportedDurations: string[];
}

/**
 * Données d'un template généré par IA
 */
export interface AIGeneratedTemplateData {
  id: string;
  template_key: string;
  label_fr: string;
  label_ba?: string;
  description_fr: string;
  description_ba?: string;
  emoji: string;
  color: string;
  family: string;
  collection?: string;
  features: unknown;
  inputs: unknown;
  voice_instructions: unknown;
  output_ratios: string[];
  supported_durations: string[];
  usage_count: number;
  download_count: number;
  rating_average: number;
  is_active: boolean;
  is_featured: boolean;
  generation_status: string;
  ai_preview_image_url?: string;
  demo_video_url?: string;
}

/**
 * Données de manifest K-Engine
 */
export interface TemplateManifestData {
  id: string;
  name: string;
  segments: unknown[];
  layers: unknown[];
  effects: unknown;
  music?: unknown;
}

/**
 * Effets Kuaishou natifs
 */
export interface KuaishouEffectsData {
  sparkles?: boolean;
  glow?: boolean;
  beatSync?: boolean;
  calligraphy?: boolean;
  particles?: boolean;
}

/**
 * Définition d'un input de template
 */
export interface TemplateInputDef {
  id: string;
  type: 'video' | 'photo' | 'audio' | 'text' | 'choice';
  label: string;
  label_bariba?: string;
  required: boolean;
  constraints?: {
    minDuration?: number;
    maxDuration?: number;
    maxSize?: number;
    formats?: string[];
  };
}

/**
 * Segment capturé
 */
export interface CapturedSegment {
  segmentId: string;
  blob: Blob;
  duration: number;
  thumbnail?: string;
}

/**
 * Projet de création en cours
 */
export interface CreatorProject {
  templateId: string;
  template: UnifiedTemplate;
  segments: CapturedSegment[];
  photos?: File[];
  audioFile?: File;
  textInputs?: Record<string, string>;
  selectedStyle?: string;
  music?: {
    url: string;
    name: string;
    startTime: number;
    volume: number;
  };
  captions?: {
    enabled: boolean;
    language: string;
  };
}

/**
 * Filtres pour le sélecteur de templates
 */
export interface TemplateFilters {
  category?: TemplateCategory;
  source?: TemplateSource;
  difficulty?: TemplateDifficulty;
  contentType?: ContentType;
  search?: string;
  isPremium?: boolean;
  isFeatured?: boolean;
}

/**
 * Options de tri
 */
export type TemplateSortOption = 
  | 'popular' 
  | 'recent' 
  | 'rating' 
  | 'name_asc' 
  | 'name_desc';
