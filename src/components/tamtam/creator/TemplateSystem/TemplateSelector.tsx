/**
 * Template Selector v3.0
 * Premium UI for browsing and selecting video templates
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Sparkles, Star, Clock, Play, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Template, TemplateCategory } from './types';

interface TemplateSelectorProps {
  onSelect: (template: Template) => void;
  onClose?: () => void;
  templates?: Template[];
}

// Category definitions
const CATEGORIES = [
  { id: 'all' as const, label: 'Tous', emoji: '✨' },
  { id: 'storytelling' as const, label: 'Histoires', emoji: '📖' },
  { id: 'music' as const, label: 'Musique', emoji: '🎵' },
  { id: 'business' as const, label: 'Business', emoji: '💼' },
  { id: 'education' as const, label: 'Éducation', emoji: '🎓' },
  { id: 'future' as const, label: 'Futur', emoji: '🚀' },
];

// Default templates (placeholder)
const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'griot-digital',
    name: 'Griot Digital',
    nameBa: 'Griot Numérique',
    category: 'storytelling',
    description: 'Traditional storytelling with 3D Adinkra symbols',
    thumbnail: '/assets/templates/griot-digital/thumbnail.jpg',
    demoVideo: '/assets/templates/griot-digital/demo.mp4',
    effects: [],
    duration: 30,
    isNew: true,
  },
  {
    id: 'afrobeat-pulse',
    name: 'Afrobeat Pulse',
    category: 'music',
    description: 'Dynamic music video with beat-synced effects',
    thumbnail: '/assets/templates/afrobeat-pulse/thumbnail.jpg',
    effects: [],
    duration: 60,
    isPremium: true,
  },
  {
    id: 'market-pro',
    name: 'Market Pro',
    nameBa: 'Marché Pro',
    category: 'business',
    description: 'Professional product showcase template',
    thumbnail: '/assets/templates/market-pro/thumbnail.jpg',
    effects: [],
    duration: 15,
  },
  {
    id: 'learn-easy',
    name: 'Learn Easy',
    nameBa: 'Apprendre Facile',
    category: 'education',
    description: 'Educational content with clear visuals',
    thumbnail: '/assets/templates/learn-easy/thumbnail.jpg',
    effects: [],
    duration: 45,
  },
];

export function TemplateSelector({ 
  onSelect, 
  onClose,
  templates = DEFAULT_TEMPLATES 
}: TemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let results = [...templates];
    
    if (selectedCategory !== 'all') {
      results = results.filter(t => t.category === selectedCategory);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.nameBa?.toLowerCase().includes(query)
      );
    }
    
    return results;
  }, [templates, searchQuery, selectedCategory]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col"
    >
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Templates</h1>
              <p className="text-sm text-muted-foreground">Choisissez votre style</p>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un template..."
            className="pl-10 bg-muted/50 border-border"
          />
        </div>

        {/* Categories */}
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            {CATEGORIES.map(cat => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className="flex-shrink-0 gap-1.5"
              >
                <span>{cat.emoji}</span>
                {cat.label}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Template Grid */}
      <ScrollArea className="flex-1 p-4">
        {filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredTemplates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative group cursor-pointer"
                  onClick={() => onSelect(template)}
                  onMouseEnter={() => setHoveredId(template.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* Card */}
                  <div className="bg-card rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
                    {/* Thumbnail */}
                    <div className="aspect-[9/16] relative bg-muted overflow-hidden">
                      <img
                        src={template.thumbnail}
                        alt={template.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='320'%3E%3Crect fill='%23374151' width='180' height='320'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%239CA3AF' font-size='40'%3E${template.name.charAt(0)}%3C/text%3E%3C/svg%3E`;
                        }}
                      />
                      
                      {/* Overlay on hover */}
                      <motion.div 
                        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: hoveredId === template.id ? 1 : 0 }}
                      >
                        <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
                          <Play className="w-6 h-6 text-white ml-1" fill="white" />
                        </div>
                      </motion.div>
                      
                      {/* Badges */}
                      <div className="absolute top-2 left-2 flex gap-1">
                        {template.isNew && (
                          <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0.5">
                            NEW
                          </Badge>
                        )}
                        {template.isPremium && (
                          <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 flex items-center gap-0.5">
                            <Crown className="w-3 h-3" />
                            PRO
                          </Badge>
                        )}
                      </div>
                      
                      {/* Duration */}
                      {template.duration && (
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {template.duration}s
                        </div>
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="p-3">
                      <h3 className="font-semibold text-foreground text-sm truncate">
                        {template.name}
                      </h3>
                      {template.nameBa && (
                        <p className="text-xs text-primary truncate">{template.nameBa}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {template.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-xl font-bold text-foreground mb-2">Aucun template trouvé</h2>
            <p className="text-muted-foreground max-w-md">
              Essayez une autre recherche ou catégorie
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
            >
              Réinitialiser les filtres
            </Button>
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 border-t border-border bg-background/80 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} disponible{filteredTemplates.length !== 1 ? 's' : ''}
          </p>
          <Button variant="ghost" size="sm" className="gap-2">
            <Star className="w-4 h-4" />
            Mes favoris
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default TemplateSelector;
