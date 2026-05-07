/**
 * Template System v3.0
 * Unified template system for TAM-TAM video creation
 */

// Core exports
export * from './types';
export { AssetManager, assetManager } from './AssetManager';
export { EffectsRenderer } from './EffectsRenderer';
export { TemplateEngine, templateEngine } from './TemplateEngine';
export { TemplateSelector } from './TemplateSelector';

// Template registry exports (renamed to avoid conflicts with CreatorEffectsData)
export { 
  allTemplates, 
  templatesByCategory, 
  getTemplateById as getTemplateV3ById, 
  getTemplatesByCategory,
  searchTemplates,
  getFeaturedTemplates,
  getPopularTemplates,
  griotDigitalTemplate 
} from './templates';

// Default export for convenience
export { TemplateSelector as default } from './TemplateSelector';
