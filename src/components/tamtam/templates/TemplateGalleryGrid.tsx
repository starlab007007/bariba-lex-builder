/**
 * TemplateGalleryGrid - Responsive masonry grid for templates
 * Features: 9:16 cards, hover previews, smooth animations
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TemplateCardPremium } from './TemplateCardPremium';
import { Template } from '@/components/tamtam/creator/TemplateSystem/types';
import { Loader2, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const [isLoading, setIsLoading] = useState(false);

  // Sort templates: Premium first, then new, then by usage
  const sortedTemplates = useMemo(() => {
    return [...templates].sort((a, b) => {
      // Premium first
      if (a.isPremium && !b.isPremium) return -1;
      if (!a.isPremium && b.isPremium) return 1;
      // Then new
      if (a.isNew && !b.isNew) return -1;
      if (!a.isNew && b.isNew) return 1;
      // Then by usage
      return (b.usageCount || 0) - (a.usageCount || 0);
    });
  }, [templates]);

  // Stagger animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: 'spring' as const, stiffness: 300, damping: 25 }
    }
  };

  if (templates.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <LayoutGrid className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Aucun template trouvé
        </h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          Essayez de modifier votre recherche ou de changer de catégorie
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* View Mode Toggle & Results Count */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{templates.length}</span> templates disponibles
        </p>
        <div className="flex gap-1 bg-white/80 backdrop-blur-sm rounded-lg p-1 shadow-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('grid')}
            className={cn(
              "h-8 w-8 p-0 rounded-md",
              viewMode === 'grid' && "bg-primary text-white"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('list')}
            className={cn(
              "h-8 w-8 p-0 rounded-md",
              viewMode === 'list' && "bg-primary text-white"
            )}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Grid View */}
      <AnimatePresence mode="wait">
        {viewMode === 'grid' ? (
          <motion.div
            key="grid"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4"
          >
            {sortedTemplates.map((template, index) => (
              <motion.div
                key={template.id}
                variants={itemVariants}
                layout
                onMouseEnter={() => setHoveredId(template.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <TemplateCardPremium
                  template={template}
                  isHovered={hoveredId === template.id}
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
            {sortedTemplates.map((template, index) => (
              <motion.div
                key={template.id}
                variants={itemVariants}
                layout
                onMouseEnter={() => setHoveredId(template.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <TemplateCardPremium
                  template={template}
                  isHovered={hoveredId === template.id}
                  onPreview={() => onSelectForPreview(template)}
                  onUse={() => onUseTemplate(template)}
                  viewMode="list"
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
