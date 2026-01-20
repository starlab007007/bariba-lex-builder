/**
 * TemplateGalleryGrid - Responsive Voice-First Gallery
 * Features: Large touch targets, audio feedback, inclusive design
 */

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TemplateCardPremium } from './TemplateCardPremium';
import { Template } from '@/components/tamtam/creator/TemplateSystem/types';
import { Loader2, LayoutGrid, List, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateGalleryGridProps {
  templates: Template[];
  onSelectForPreview: (template: Template) => void;
  onUseTemplate: (template: Template) => void;
}

export function TemplateGalleryGrid({
  templates,
  onSelectForPreview,
  onUseTemplate
}: TemplateGalleryGridProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [touchedId, setTouchedId] = useState<string | null>(null);

  // Sort templates: Premium first, then new, then by usage
  const sortedTemplates = useMemo(() => {
    return [...templates].sort((a, b) => {
      if (a.isPremium && !b.isPremium) return -1;
      if (!a.isPremium && b.isPremium) return 1;
      if (a.isNew && !b.isNew) return -1;
      if (!a.isNew && b.isNew) return 1;
      return (b.usageCount || 0) - (a.usageCount || 0);
    });
  }, [templates]);

  // Handle touch for mobile (replaces hover)
  const handleTouch = useCallback((templateId: string) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
    setTouchedId(prev => prev === templateId ? null : templateId);
  }, []);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.04 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.97 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: 'spring' as const, stiffness: 350, damping: 28 }
    }
  };

  // Empty state with emoji
  if (templates.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 px-4 text-center"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
          className="text-6xl mb-4"
        >
          🔍
        </motion.div>
        <h3 className="text-xl font-bold text-foreground mb-2">
          Aucun template trouvé
        </h3>
        <p className="text-muted-foreground text-base max-w-xs">
          Essayez une autre recherche ou catégorie
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between px-1">
        {/* Results count with emoji */}
        <div className="flex items-center gap-2">
          <span className="text-xl">📦</span>
          <p className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground text-lg">{templates.length}</span>
            <span className="ml-1">templates</span>
          </p>
        </div>
        
        {/* View mode toggle - Large touch targets */}
        <div className="flex gap-1 bg-white/90 backdrop-blur-sm rounded-xl p-1 shadow-sm border border-white/50">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              "flex items-center justify-center w-11 h-11 rounded-lg transition-all",
              viewMode === 'grid' 
                ? "bg-primary text-white shadow-md" 
                : "text-muted-foreground hover:bg-muted active:scale-95"
            )}
            aria-label="Vue grille"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              "flex items-center justify-center w-11 h-11 rounded-lg transition-all",
              viewMode === 'list' 
                ? "bg-primary text-white shadow-md" 
                : "text-muted-foreground hover:bg-muted active:scale-95"
            )}
            aria-label="Vue liste"
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Grid/List Views */}
      <AnimatePresence mode="wait">
        {viewMode === 'grid' ? (
          <motion.div
            key="grid"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4"
          >
            {sortedTemplates.map((template) => (
              <motion.div
                key={template.id}
                variants={itemVariants}
                layout
                onMouseEnter={() => setHoveredId(template.id)}
                onMouseLeave={() => setHoveredId(null)}
                onTouchStart={() => handleTouch(template.id)}
              >
                <TemplateCardPremium
                  template={template}
                  isHovered={hoveredId === template.id || touchedId === template.id}
                  onPreview={() => onSelectForPreview(template)}
                  onUse={() => onUseTemplate(template)}
                  viewMode="grid"
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {sortedTemplates.map((template) => (
              <motion.div
                key={template.id}
                variants={itemVariants}
                layout
                onMouseEnter={() => setHoveredId(template.id)}
                onMouseLeave={() => setHoveredId(null)}
                onTouchStart={() => handleTouch(template.id)}
              >
                <TemplateCardPremium
                  template={template}
                  isHovered={hoveredId === template.id || touchedId === template.id}
                  onPreview={() => onSelectForPreview(template)}
                  onUse={() => onUseTemplate(template)}
                  viewMode="list"
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
