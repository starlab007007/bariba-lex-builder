/**
 * UnifiedTemplateSelector.tsx
 * Sélecteur de templates unifié combinant toutes les sources
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  X, 
  Star, 
  Sparkles, 
  Clock, 
  ChevronRight,
  Mic,
  Video,
  Camera,
  Music,
  Filter,
  Grid3X3,
  List
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUnifiedTemplates } from '@/hooks/useUnifiedTemplates';
import { UnifiedTemplate, TemplateCategory } from '@/types/UnifiedTemplateTypes';

interface UnifiedTemplateSelectorProps {
  onSelect: (template: UnifiedTemplate) => void;
  onClose?: () => void;
}

// Catégories avec labels bilingues
const CATEGORY_CONFIG: Record<TemplateCategory | 'all', { label: string; labelBa: string; icon: React.ReactNode }> = {
  all: { label: 'Tous', labelBa: 'Kúú', icon: <Grid3X3 className="w-4 h-4" /> },
  social: { label: 'Social', labelBa: 'Kɔ́ɔ̀gbɛ̀', icon: <Video className="w-4 h-4" /> },
  audio_first: { label: 'Audio', labelBa: 'Sɔ́ɔ́', icon: <Mic className="w-4 h-4" /> },
  photo_story: { label: 'Photo', labelBa: 'Wárɪ́', icon: <Camera className="w-4 h-4" /> },
  music: { label: 'Musique', labelBa: 'Dùùrù', icon: <Music className="w-4 h-4" /> },
  storytelling: { label: 'Histoire', labelBa: 'Tíísɔ́ɔ́', icon: <Sparkles className="w-4 h-4" /> },
  education: { label: 'Éducation', labelBa: 'Kɛ̀kɛ́', icon: <Star className="w-4 h-4" /> },
  tutorial: { label: 'Tutoriel', labelBa: 'Kɛ̀kɛ́sɔ́ɔ́', icon: <ChevronRight className="w-4 h-4" /> },
  challenge: { label: 'Challenge', labelBa: 'Kɔ́rɔ́', icon: <Sparkles className="w-4 h-4" /> },
  premium: { label: 'Premium', labelBa: 'Premium', icon: <Star className="w-4 h-4" /> }
};

const UnifiedTemplateSelector: React.FC<UnifiedTemplateSelectorProps> = ({
  onSelect,
  onClose
}) => {
  const { templates, isLoading, setFilters, filters, categories } = useUnifiedTemplates();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filtrer par recherche
  const displayedTemplates = useMemo(() => {
    let result = templates;
    
    if (selectedCategory !== 'all') {
      result = result.filter(t => t.category === selectedCategory);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    return result;
  }, [templates, selectedCategory, searchQuery]);

  // Grouper par source pour l'affichage
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, UnifiedTemplate[]> = {
      featured: displayedTemplates.filter(t => t.isFeatured || t.isPremium),
      kuaishou: displayedTemplates.filter(t => t.source === 'kuaishou' && !t.isFeatured && !t.isPremium),
      radio_village: displayedTemplates.filter(t => t.source === 'radio_village'),
      advanced: displayedTemplates.filter(t => t.source === 'advanced'),
      ai_generated: displayedTemplates.filter(t => t.source === 'ai_generated')
    };
    return groups;
  }, [displayedTemplates]);

  const handleTemplateSelect = (template: UnifiedTemplate) => {
    onSelect(template);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">
            🎬 Choisir un template
          </h1>
          <Badge variant="secondary" className="text-xs">
            {displayedTemplates.length} templates
          </Badge>
        </div>
        
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="p-4 space-y-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un template..."
            className="pl-10 bg-muted/50"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery('')}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-2 min-w-max">
            {(['all', ...categories] as (TemplateCategory | 'all')[]).map((cat) => {
              const config = CATEGORY_CONFIG[cat] || { label: cat, labelBa: cat, icon: null };
              return (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  className="flex-shrink-0 gap-1.5"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {config.icon}
                  {config.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground">Chargement des templates...</p>
              </div>
            </div>
          ) : displayedTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-medium text-foreground mb-2">Aucun template trouvé</h3>
              <p className="text-muted-foreground text-sm">
                Essaie une autre recherche ou catégorie
              </p>
            </div>
          ) : (
            <>
              {/* Featured Section */}
              {groupedTemplates.featured.length > 0 && (
                <TemplateSection
                  title="⭐ En vedette"
                  titleBa="Kúú kɔ́ɔ̀"
                  templates={groupedTemplates.featured}
                  onSelect={handleTemplateSelect}
                  featured
                />
              )}

              {/* Radio Village Section */}
              {groupedTemplates.radio_village.length > 0 && (
                <TemplateSection
                  title="🎙️ Radio Village"
                  titleBa="Radio Kɔ́ɔ̀gbɛ̀"
                  templates={groupedTemplates.radio_village}
                  onSelect={handleTemplateSelect}
                />
              )}

              {/* Kuaishou Section */}
              {groupedTemplates.kuaishou.length > 0 && (
                <TemplateSection
                  title="🎬 Vidéo Pro"
                  titleBa="Video Kúú"
                  templates={groupedTemplates.kuaishou}
                  onSelect={handleTemplateSelect}
                />
              )}

              {/* Advanced Section */}
              {groupedTemplates.advanced.length > 0 && (
                <TemplateSection
                  title="✨ Templates avancés"
                  titleBa="Templates kúú"
                  templates={groupedTemplates.advanced}
                  onSelect={handleTemplateSelect}
                />
              )}

              {/* AI Generated Section */}
              {groupedTemplates.ai_generated.length > 0 && (
                <TemplateSection
                  title="🤖 Générés par IA"
                  titleBa="IA kɛ̀ kúú"
                  templates={groupedTemplates.ai_generated}
                  onSelect={handleTemplateSelect}
                />
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
};

// Section de templates
interface TemplateSectionProps {
  title: string;
  titleBa: string;
  templates: UnifiedTemplate[];
  onSelect: (template: UnifiedTemplate) => void;
  featured?: boolean;
}

const TemplateSection: React.FC<TemplateSectionProps> = ({
  title,
  titleBa,
  templates,
  onSelect,
  featured
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold text-foreground">{title}</h2>
        <span className="text-xs text-muted-foreground">({templates.length})</span>
      </div>
      
      <div className={`grid gap-3 ${featured ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onSelect={onSelect}
            featured={featured}
          />
        ))}
      </div>
    </div>
  );
};

// Carte de template
interface TemplateCardProps {
  template: UnifiedTemplate;
  onSelect: (template: UnifiedTemplate) => void;
  featured?: boolean;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onSelect, featured }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(template)}
      className={`
        relative overflow-hidden rounded-xl border border-border 
        bg-card text-left transition-all hover:border-primary/50 hover:shadow-lg
        ${featured ? 'p-4' : 'p-3'}
      `}
      style={{
        background: featured 
          ? `linear-gradient(135deg, ${template.color}15, ${template.color}05)` 
          : undefined
      }}
    >
      {/* Badges */}
      <div className="absolute top-2 right-2 flex gap-1">
        {template.isPremium && (
          <Badge className="bg-amber-500 text-white text-[10px] px-1.5">
            Premium
          </Badge>
        )}
        {template.isNew && (
          <Badge className="bg-green-500 text-white text-[10px] px-1.5">
            Nouveau
          </Badge>
        )}
      </div>

      <div className="flex gap-3">
        {/* Icon */}
        <div 
          className={`
            flex items-center justify-center rounded-xl
            ${featured ? 'w-16 h-16 text-3xl' : 'w-12 h-12 text-2xl'}
          `}
          style={{ backgroundColor: `${template.color}20` }}
        >
          {template.emoji}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-foreground truncate ${featured ? 'text-base' : 'text-sm'}`}>
            {template.name}
          </h3>
          
          {template.name_bariba && (
            <p className="text-xs text-muted-foreground truncate">
              {template.name_bariba}
            </p>
          )}
          
          <p className={`text-muted-foreground line-clamp-2 mt-1 ${featured ? 'text-sm' : 'text-xs'}`}>
            {template.description}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              <Clock className="w-2.5 h-2.5 mr-0.5" />
              {template.duration}s
            </Badge>
            
            {template.contentType === 'audio' && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                <Mic className="w-2.5 h-2.5 mr-0.5" />
                Audio
              </Badge>
            )}
            
            {template.rating > 0 && (
              <div className="flex items-center gap-0.5 text-xs text-amber-500">
                <Star className="w-3 h-3 fill-current" />
                {template.rating.toFixed(1)}
              </div>
            )}
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className="w-5 h-5 text-muted-foreground self-center flex-shrink-0" />
      </div>
    </motion.button>
  );
};

export default UnifiedTemplateSelector;
