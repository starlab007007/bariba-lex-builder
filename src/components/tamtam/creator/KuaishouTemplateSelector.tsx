/**
 * KuaishouTemplateSelector.tsx - Wrapper de compatibilité
 * Redirige vers le nouveau TemplateSystem
 */

import React from 'react';
import { TemplateSelector } from './TemplateSystem/TemplateSelector';
import type { UnifiedTemplate } from '@/types/UnifiedTemplateTypes';
import type { Template } from './TemplateSystem/types';
import type { KuaishouTemplateConfig } from '@/types/KuaishouTypes';

interface KuaishouTemplateSelectorProps {
  templates: KuaishouTemplateConfig[];
  onSelect: (template: KuaishouTemplateConfig) => void;
  onBack?: () => void;
}

const KuaishouTemplateSelector: React.FC<KuaishouTemplateSelectorProps> = ({
  templates,
  onSelect,
  onBack
}) => {
  const handleSelect = (template: Template) => {
    // Create a minimal KuaishouTemplateConfig from the selected template
    const config: KuaishouTemplateConfig = {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category as any,
      contentType: 'video',
      difficulty: 'beginner',
      video: {
        duration: template.duration || 15,
        format: '9:16',
        targetSize: '10MB',
        resolution: '1080x1920',
        frameRate: 30,
        bitrate: 5000000
      },
      segments: [{
        id: 'main',
        type: 'user_capture',
        start: 0,
        duration: template.duration || 15,
        editable: true,
        effects: []
      }],
      music: {
        trackUrl: '',
        bpm: 120,
        beatMarkers: [],
        autoSync: false,
        cutOnBeat: false,
        volume: 0.8
      },
      autoEffects: {
        beauty: { enabled: false, intensity: 0, skinSmooth: false, eyeEnhance: false, faceSlim: 0 },
        stabilization: { enabled: true, strength: 0.5, method: 'optical_flow', cropFactor: 1.1 },
        colorGrading: { lut: '', intensity: 0 },
        sharpness: { enabled: false, amount: 0, radius: 0, threshold: 0 },
        hdrLike: { enabled: false, highlights: 0, shadows: 0, midtones: 0, strength: 0 }
      },
      smartCuts: {
        enabled: false,
        algorithm: 'motion_only',
        rules: [],
        minSegmentDuration: 1,
        maxSegmentDuration: 10
      },
      transitions: [],
      overlays: { stickers: [], text: [] },
      hooks: {
        enabled: false,
        autoDetect: false,
        suggestions: [],
        openingHook: { enabled: false, type: 'text_flash', duration: 0 }
      },
      hashtags: {
        autoGenerate: true,
        suggestions: [],
        maxHashtags: 5
      },
      metadata: {
        createdAt: new Date().toISOString(),
        author: 'TAM-TAM',
        version: '1.0.0',
        tags: template.tags || []
      }
    } as unknown as KuaishouTemplateConfig;

    onSelect(config);
  };

  return (
    <TemplateSelector
      onSelect={handleSelect}
      onClose={onBack}
    />
  );
};

export default KuaishouTemplateSelector;
export { KuaishouTemplateSelector };
