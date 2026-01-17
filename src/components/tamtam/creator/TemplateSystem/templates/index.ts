/**
 * TAM-TAM Template Registry
 * Central registry for all video creation templates
 */

import { Template, TemplateCategory } from '../types';
import { griotDigitalTemplate } from './griotDigital';

// ============================================================================
// ALL TEMPLATES
// ============================================================================

export const allTemplates: Template[] = [
  griotDigitalTemplate,
];

// ============================================================================
// TEMPLATES BY CATEGORY
// ============================================================================

export const templatesByCategory: Record<TemplateCategory, Template[]> = {
  storytelling: [griotDigitalTemplate],
  music: [],
  business: [],
  education: [],
  future: [],
};

// ============================================================================
// TEMPLATE HELPERS
// ============================================================================

/**
 * Get a template by its ID
 */
export const getTemplateById = (id: string): Template | undefined => {
  return allTemplates.find(t => t.id === id);
};

/**
 * Get templates by category
 */
export const getTemplatesByCategory = (category: TemplateCategory | 'all'): Template[] => {
  if (category === 'all') return allTemplates;
  return templatesByCategory[category] || [];
};

/**
 * Get templates matching a search query
 */
export const searchTemplates = (query: string): Template[] => {
  const q = query.toLowerCase().trim();
  if (!q) return allTemplates;
  
  return allTemplates.filter(t => 
    t.name.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    t.nameBa?.toLowerCase().includes(q) ||
    t.metadata?.tags?.some(tag => tag.toLowerCase().includes(q)) ||
    t.tags?.some(tag => tag.toLowerCase().includes(q))
  );
};

/**
 * Get featured/new templates
 */
export const getFeaturedTemplates = (): Template[] => {
  return allTemplates.filter(t => t.isNew || t.isPremium);
};

/**
 * Get popular templates (sorted by usage count)
 */
export const getPopularTemplates = (limit = 5): Template[] => {
  return [...allTemplates]
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    .slice(0, limit);
};

// Re-export template for convenience
export { griotDigitalTemplate };
