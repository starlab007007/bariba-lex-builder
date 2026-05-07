/**
 * UnifiedTemplateSelector.tsx - Wrapper de compatibilité
 */

import React from 'react';
import { TemplateSelector } from './TemplateSystem/TemplateSelector';
import type { UnifiedTemplate } from '@/types/UnifiedTemplateTypes';
import type { Template } from './TemplateSystem/types';

interface UnifiedTemplateSelectorProps {
  onSelect: (template: UnifiedTemplate) => void;
  onClose?: () => void;
}

// Convert local Template to UnifiedTemplate
function toUnifiedTemplate(template: Template): UnifiedTemplate {
  return {
    id: template.id,
    templateKey: template.id,
    name: template.name,
    name_bariba: template.nameBa,
    description: template.description,
    description_bariba: template.descriptionBa,
    icon: '🎬',
    emoji: '✨',
    color: '#FF6B35',
    thumbnail: template.thumbnail,
    previewVideo: template.demoVideo,
    category: (template.category === 'future' || template.category === 'business' ? 'premium' : template.category) as any,
    contentType: 'video',
    difficulty: 'beginner',
    tags: template.tags || [],
    duration: template.duration || 15,
    format: '9:16',
    resolution: { width: 1080, height: 1920 },
    rating: 4.5,
    usageCount: template.usageCount || 0,
    downloadCount: 0,
    isPremium: template.isPremium || false,
    isNew: template.isNew || false,
    isFeatured: false,
    isActive: true,
    source: 'kuaishou',
    originalConfig: null
  };
}

const UnifiedTemplateSelector: React.FC<UnifiedTemplateSelectorProps> = ({
  onSelect,
  onClose
}) => {
  const handleSelect = (template: Template) => {
    onSelect(toUnifiedTemplate(template));
  };

  return (
    <TemplateSelector
      onSelect={handleSelect}
      onClose={onClose}
    />
  );
};

export default UnifiedTemplateSelector;
