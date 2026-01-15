/**
 * Template Registry v2.0
 * Gestion centralisée de tous les templates
 */

import type { TemplateManifest, UnifiedTemplate, TemplateCategory } from './types';

class TemplateRegistryService {
  private templates: Map<string, TemplateManifest> = new Map();
  private unifiedTemplates: UnifiedTemplate[] = [];

  /**
   * Enregistrer un nouveau template
   */
  register(template: TemplateManifest): void {
    this.templates.set(template.id, template);
    this.rebuildUnifiedList();
  }

  /**
   * Supprimer un template
   */
  unregister(templateId: string): void {
    this.templates.delete(templateId);
    this.rebuildUnifiedList();
  }

  /**
   * Obtenir un template par ID
   */
  get(templateId: string): TemplateManifest | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Obtenir tous les templates
   */
  getAll(): TemplateManifest[] {
    return Array.from(this.templates.values());
  }

  /**
   * Obtenir les templates unifiés (format simplifié)
   */
  getUnified(): UnifiedTemplate[] {
    return this.unifiedTemplates;
  }

  /**
   * Filtrer par catégorie
   */
  getByCategory(category: TemplateCategory): UnifiedTemplate[] {
    return this.unifiedTemplates.filter(t => t.category === category);
  }

  /**
   * Rechercher des templates
   */
  search(query: string): UnifiedTemplate[] {
    const lowerQuery = query.toLowerCase();
    return this.unifiedTemplates.filter(t => 
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Reconstruire la liste unifiée
   */
  private rebuildUnifiedList(): void {
    this.unifiedTemplates = Array.from(this.templates.values()).map(t => ({
      id: t.id,
      name: t.name,
      nameBa: t.nameBa,
      description: t.description,
      descriptionBa: t.descriptionBa,
      emoji: t.emoji,
      category: t.category,
      source: t.source,
      contentType: 'video',
      duration: t.duration,
      difficulty: t.difficulty,
      isPremium: t.isPremium,
      isNew: t.isNew,
      rating: t.rating,
      usageCount: t.usageCount,
      thumbnail: t.thumbnail,
      previewVideo: t.previewVideo,
      tags: t.tags,
      format: '9:16',
      resolution: t.export.resolution,
      originalConfig: t
    }));
  }

  /**
   * Charger les templates par défaut
   */
  async loadDefaults(): Promise<void> {
    // À implémenter: charger les templates depuis la DB ou les fichiers locaux
    console.log('📦 TemplateRegistry: Loading default templates...');
  }
}

export const templateRegistry = new TemplateRegistryService();
export default templateRegistry;
