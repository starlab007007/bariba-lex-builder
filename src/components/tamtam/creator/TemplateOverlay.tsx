// src/components/tamtam/creator/TemplateOverlay.tsx
// Visual overlay for templates with gradients and effects

import React from 'react';
import { motion } from 'framer-motion';
import { CULTURAL_TEMPLATES, getTemplateById } from './CreatorEffectsData';
import { cn } from '@/lib/utils';

interface TemplateOverlayProps {
  templateId: string;
  className?: string;
  showWatermark?: boolean;
}

export const TemplateOverlay: React.FC<TemplateOverlayProps> = ({
  templateId,
  className,
  showWatermark = true,
}) => {
  const template = getTemplateById(templateId);
  
  if (!template || templateId === 'free' || !template.overlayGradient) {
    return null;
  }

  return (
    <div className={cn('absolute inset-0 pointer-events-none z-10', className)}>
      {/* Gradient overlay */}
      <div 
        className={cn(
          'absolute inset-0 bg-gradient-to-b',
          template.overlayGradient
        )}
      />
      
      {/* Watermark/badge */}
      {showWatermark && template.emoji && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/20"
        >
          <span className="text-lg">{template.emoji}</span>
          <span className="text-xs font-medium text-white/90">{template.label}</span>
        </motion.div>
      )}
    </div>
  );
};

// ============= TEMPLATE CAROUSEL =============

interface TemplateCarouselProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

export const TemplateCarousel: React.FC<TemplateCarouselProps> = ({
  selectedId,
  onSelect,
}) => {

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
      {CULTURAL_TEMPLATES.map((tpl) => {
        const isSelected = selectedId === tpl.id;
        
        return (
          <motion.button
            key={tpl.id}
            onClick={() => onSelect(tpl.id)}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'flex-shrink-0 transition-all',
              isSelected && 'scale-105'
            )}
          >
            <div
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
                isSelected
                  ? 'bg-white text-black shadow-lg'
                  : 'bg-black/40 text-white/80 border border-white/20 hover:bg-white/10'
              )}
            >
              {tpl.label}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};

// ============= CATEGORY FILTER =============

interface TemplateCategoryFilterProps {
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

const CATEGORY_LABELS = {
  libre: { label: 'Libre', emoji: '🎬' },
  conte: { label: 'Contes', emoji: '📖' },
  sagesse: { label: 'Sagesse', emoji: '🧓' },
  marche: { label: 'Marché', emoji: '🛒' },
  conseil: { label: 'Conseils', emoji: '💡' },
  creation: { label: 'Création', emoji: '🎨' },
};

export const TemplateCategoryFilter: React.FC<TemplateCategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      <button
        onClick={() => onSelectCategory(null)}
        className={cn(
          'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all',
          !selectedCategory
            ? 'bg-white text-black'
            : 'bg-white/10 text-white/80 hover:bg-white/15'
        )}
      >
        Tous
      </button>
      {Object.entries(CATEGORY_LABELS).map(([key, { label, emoji }]) => (
        <button
          key={key}
          onClick={() => onSelectCategory(key)}
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all',
            selectedCategory === key
              ? 'bg-white text-black'
              : 'bg-white/10 text-white/80 hover:bg-white/15'
          )}
        >
          <span>{emoji}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
};

export default TemplateOverlay;
