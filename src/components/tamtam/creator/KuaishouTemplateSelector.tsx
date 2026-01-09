/**
 * KuaishouTemplateSelector.tsx
 * Interface de sélection de templates avec catégories et previews
 * Version: 1.0.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, Star, Clock, Flame, X } from 'lucide-react';
import { KuaishouTemplateConfig } from '@/types/KuaishouTypes';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface KuaishouTemplateSelectorProps {
  templates: KuaishouTemplateConfig[];
  onSelect: (template: KuaishouTemplateConfig) => void;
  onBack?: () => void;
}

export const KuaishouTemplateSelector: React.FC<KuaishouTemplateSelectorProps> = ({
  templates,
  onSelect,
  onBack
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popularity' | 'rating' | 'recent'>('popularity');

  // Catégories uniques
  const categories = useMemo(() => {
    const cats = new Set<string>(['all']);
    templates.forEach(t => cats.add(t.category));
    return Array.from(cats);
  }, [templates]);

  // Templates filtrés
  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        t =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.metadata.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'popularity':
          return b.metadata.popularity - a.metadata.popularity;
        case 'rating':
          return b.metadata.rating - a.metadata.rating;
        case 'recent':
          return new Date(b.metadata.updatedAt).getTime() - new Date(a.metadata.updatedAt).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [templates, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border p-4">
        <div className="flex items-center gap-3 mb-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-xl font-bold text-foreground">Choisis ton template</h1>
            <p className="text-sm text-muted-foreground">{templates.length} templates disponibles</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher un template..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="whitespace-nowrap"
            >
              {getCategoryEmoji(cat)} {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Button>
          ))}
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-sm text-muted-foreground">Trier par:</span>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popularity">Popularité</SelectItem>
              <SelectItem value="rating">Note</SelectItem>
              <SelectItem value="recent">Plus récent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredTemplates.map(template => (
                <motion.div
                  key={template.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <KuaishouTemplateCard
                    template={template}
                    onClick={() => onSelect(template)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg text-muted-foreground mb-4">Aucun template trouvé 😕</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
            >
              Réinitialiser les filtres
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// TEMPLATE CARD COMPONENT
// ==========================================

interface KuaishouTemplateCardProps {
  template: KuaishouTemplateConfig;
  onClick: () => void;
}

const KuaishouTemplateCard: React.FC<KuaishouTemplateCardProps> = ({ template, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isPremium = !!template.kuaishouEffects;

  return (
    <motion.div
      className={`relative rounded-xl overflow-hidden bg-card border cursor-pointer group ${
        isPremium ? 'border-amber-500/50 ring-1 ring-amber-500/20' : 'border-border'
      }`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Premium glow effect */}
      {isPremium && (
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-orange-500/10 pointer-events-none z-0" />
      )}

      {/* Thumbnail / Preview */}
      <div className={`relative aspect-[9/16] ${
        isPremium 
          ? 'bg-gradient-to-br from-amber-500/30 via-orange-500/20 to-red-500/30' 
          : 'bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20'
      }`}>
        {isHovered && template.metadata.previewVideo ? (
          <video
            src={template.metadata.previewVideo}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        ) : template.metadata.thumbnail ? (
          <img
            src={template.metadata.thumbnail}
            alt={template.name}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        ) : null}

        {/* Fallback placeholder with emoji */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-6xl mb-2">
            {isPremium ? '🐴' : getCategoryEmoji(template.category)}
          </span>
          <span className={`text-sm font-medium ${isPremium ? 'text-amber-200' : 'text-foreground/60'}`}>
            {template.name}
          </span>
          {isPremium && (
            <div className="flex gap-1 mt-2">
              {['✨', '🎬', '🎵'].map((emoji, i) => (
                <motion.span
                  key={i}
                  className="text-lg"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
                >
                  {emoji}
                </motion.span>
              ))}
            </div>
          )}
        </div>

        {/* Overlay badges */}
        <div className="absolute top-2 left-2 right-2 flex justify-between">
          {isPremium ? (
            <Badge className="bg-amber-500 text-black font-bold animate-pulse">
              🐴 Premium
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
              {template.difficulty === 'beginner' && '⭐'}
              {template.difficulty === 'intermediate' && '⭐⭐'}
              {template.difficulty === 'advanced' && '⭐⭐⭐'}
            </Badge>
          )}
          <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
            {getCategoryEmoji(template.category)}
          </Badge>
        </div>

        {/* Premium features badges */}
        {isPremium && template.kuaishouEffects && (
          <div className="absolute left-2 bottom-10 flex flex-col gap-1">
            {template.kuaishouEffects.sparkles?.enabled && (
              <Badge className="bg-black/60 text-amber-300 text-[10px]">✨ Sparkles</Badge>
            )}
            {template.kuaishouEffects.beatGlow?.enabled && (
              <Badge className="bg-black/60 text-amber-300 text-[10px]">🎵 Beat Sync</Badge>
            )}
            {template.kuaishouEffects.horseSilhouette?.enabled && (
              <Badge className="bg-black/60 text-amber-300 text-[10px]">🐴 Horse</Badge>
            )}
          </div>
        )}

        {/* Duration badge */}
        <div className="absolute bottom-2 right-2">
          <Badge className="bg-black/70 text-white backdrop-blur-sm">
            <Clock className="w-3 h-3 mr-1" />
            {template.video.duration}s
          </Badge>
        </div>

        {/* Hover overlay */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 flex items-center justify-center"
            >
              <Button 
                size="sm" 
                className={isPremium 
                  ? 'bg-amber-500 hover:bg-amber-600 text-black font-bold' 
                  : 'bg-primary text-primary-foreground'
                }
              >
                {isPremium ? 'Utiliser Premium 🐴' : 'Utiliser 🚀'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Card Info */}
      <div className="p-3 relative z-10">
        <h3 className={`font-semibold text-sm truncate ${isPremium ? 'text-amber-400' : 'text-foreground'}`}>
          {template.name}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{template.description}</p>
        
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            <span>{template.metadata.rating.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Flame className="w-3 h-3 text-orange-500" />
            <span>{formatNumber(template.metadata.usageCount)}</span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-2">
          {template.metadata.tags.slice(0, 2).map(tag => (
            <Badge 
              key={tag} 
              variant="outline" 
              className={`text-[10px] px-1.5 py-0 ${isPremium ? 'border-amber-500/50 text-amber-400' : ''}`}
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    all: '🎬',
    dance: '💃',
    tutorial: '📚',
    story: '📖',
    challenge: '🏆',
    vlog: '🎥',
    comedy: '😂',
    beauty: '💄',
    food: '🍔',
    travel: '✈️',
    fitness: '💪'
  };
  return emojis[category] || '🎬';
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export default KuaishouTemplateSelector;
