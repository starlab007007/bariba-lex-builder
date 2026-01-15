/**
 * Template System Types v2.0
 * Re-export des types existants pour compatibilité
 */

// Re-export tous les types depuis UnifiedTemplateTypes pour compatibilité
export * from '@/types/UnifiedTemplateTypes';

// Types additionnels pour le nouveau système
export type TemplateAssetType = 'video' | 'audio' | 'image' | 'lottie' | '3d' | 'font';

export interface TemplateAsset {
  id: string;
  type: TemplateAssetType;
  url: string;
  fallbackUrl?: string;
  preloadPriority: 'high' | 'medium' | 'low';
}
