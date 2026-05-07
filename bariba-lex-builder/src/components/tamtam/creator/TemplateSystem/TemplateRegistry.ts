/**
 * Template Registry v2.0
 * Gestion centralisée des templates - Version compatible
 */

import type { UnifiedTemplate, TemplateManifestData } from '@/types/UnifiedTemplateTypes';

class TemplateRegistryService {
  private templates: Map<string, TemplateManifestData> = new Map();
  private unifiedTemplates: UnifiedTemplate[] = [];

  register(template: TemplateManifestData): void {
    this.templates.set(template.id, template);
  }

  unregister(templateId: string): void {
    this.templates.delete(templateId);
  }

  get(templateId: string): TemplateManifestData | undefined {
    return this.templates.get(templateId);
  }

  getAll(): TemplateManifestData[] {
    return Array.from(this.templates.values());
  }

  getUnified(): UnifiedTemplate[] {
    return this.unifiedTemplates;
  }

  search(query: string): UnifiedTemplate[] {
    const lowerQuery = query.toLowerCase();
    return this.unifiedTemplates.filter(t => 
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery)
    );
  }

  async loadDefaults(): Promise<void> {
    console.log('📦 TemplateRegistry: Ready');
  }
}

export const templateRegistry = new TemplateRegistryService();
export default templateRegistry;
