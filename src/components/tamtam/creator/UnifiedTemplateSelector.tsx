/**
 * UnifiedTemplateSelector.tsx
 * Sélecteur de templates unifié - Design moderne et fluide
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
  ChevronLeft,
  Mic,
  Video,
  Camera,
  Music,
  Grid3X3,
  Zap,
  TrendingUp,
  Heart,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUnifiedTemplates } from '@/hooks/useUnifiedTemplates';
import { UnifiedTemplate, TemplateCategory } from '@/types/UnifiedTemplateTypes';

interface UnifiedTemplateSelectorProps {
  onSelect: (template: UnifiedTemplate) => void;
  onClose?: () => void;
}

// Catégories avec design moderne
const CATEGORY_CONFIG: Record<TemplateCategory | 'all', { 
  label: string; 
  emoji: string;
  gradient: string;
}> = {
  all: { label: 'Tous', emoji: '✨', gradient: 'from-violet-500 to-purple-600' },
  social: { label: 'Social', emoji: '🎬', gradient: 'from-pink-500 to-rose-600' },
  audio_first: { label: 'Audio', emoji: '🎙️', gradient: 'from-orange-500 to-amber-600' },
  photo_story: { label: 'Photo', emoji: '📸', gradient: 'from-cyan-500 to-blue-600' },
  music: { label: 'Musique', emoji: '🎵', gradient: 'from-green-500 to-emerald-600' },
  storytelling: { label: 'Histoire', emoji: '📖', gradient: 'from-indigo-500 to-violet-600' },
  education: { label: 'Éducation', emoji: '🎓', gradient: 'from-blue-500 to-indigo-600' },
  tutorial: { label: 'Tutoriel', emoji: '💡', gradient: 'from-yellow-500 to-orange-600' },
  challenge: { label: 'Challenge', emoji: '🔥', gradient: 'from-red-500 to-pink-600' },
  premium: { label: 'Premium', emoji: '👑', gradient: 'from-amber-500 to-yellow-600' }
};

const UnifiedTemplateSelector: React.FC<UnifiedTemplateSelectorProps> = ({
  onSelect,
  onClose
}) => {
  const { templates, isLoading, categories } = useUnifiedTemplates();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

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

  // Grouper par source
  const groupedTemplates = useMemo(() => {
    return {
      featured: displayedTemplates.filter(t => t.isFeatured || t.isPremium),
      radio_village: displayedTemplates.filter(t => t.source === 'radio_village'),
      kuaishou: displayedTemplates.filter(t => t.source === 'kuaishou' && !t.isFeatured && !t.isPremium),
      advanced: displayedTemplates.filter(t => t.source === 'advanced'),
      ai_generated: displayedTemplates.filter(t => t.source === 'ai_generated')
    };
  }, [displayedTemplates]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed inset-0 z-50 bg-gradient-to-b from-background via-background to-muted/30 flex flex-col"
    >
      {/* Header avec bouton retour proéminent */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50"
      >
        <div className="flex items-center gap-3 p-4">
          {/* Bouton Retour */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 hover:border-primary/40 transition-all group"
          >
            <ChevronLeft className="w-5 h-5 text-primary group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm font-medium text-primary">Retour</span>
          </motion.button>

          {/* Titre */}
          <div className="flex-1 flex items-center gap-2">
            <motion.span 
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="text-2xl"
            >
              🎬
            </motion.span>
            <h1 className="text-lg font-bold text-foreground">Templates</h1>
            <Badge 
              variant="secondary" 
              className="bg-primary/10 text-primary border-0 text-xs font-medium"
            >
              {displayedTemplates.length}
            </Badge>
          </div>

          {/* Bouton fermer alternatif */}
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </motion.button>
        </div>

        {/* Barre de recherche modernisée */}
        <div className="px-4 pb-3">
          <motion.div 
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <div className="relative flex items-center bg-muted/50 rounded-2xl border border-border/50 focus-within:border-primary/50 transition-colors">
              <Search className="w-5 h-5 ml-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un template magique..."
                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base placeholder:text-muted-foreground/60"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="mr-2 h-8 w-8 rounded-full hover:bg-background"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </motion.div>
        </div>

        {/* Catégories en pills modernes */}
        <div className="px-4 pb-4">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {(['all', ...categories] as (TemplateCategory | 'all')[]).map((cat, index) => {
              const config = CATEGORY_CONFIG[cat] || { label: cat, emoji: '📁', gradient: 'from-gray-500 to-gray-600' };
              const isSelected = selectedCategory === cat;
              
              return (
                <motion.button
                  key={cat}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedCategory(cat)}
                  className={`
                    flex items-center gap-1.5 px-4 py-2 rounded-full flex-shrink-0 font-medium text-sm
                    transition-all duration-300 ease-out
                    ${isSelected 
                      ? `bg-gradient-to-r ${config.gradient} text-white shadow-lg shadow-primary/25` 
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }
                  `}
                >
                  <span className="text-base">{config.emoji}</span>
                  <span>{config.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Contenu avec scroll fluide */}
      <ScrollArea className="flex-1">
        <div className="p-4 pb-24 space-y-6">
          {isLoading ? (
            <LoadingState />
          ) : displayedTemplates.length === 0 ? (
            <EmptyState onReset={() => { setSearchQuery(''); setSelectedCategory('all'); }} />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedCategory + searchQuery}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Section En vedette */}
                {groupedTemplates.featured.length > 0 && (
                  <TemplateSection
                    icon="⭐"
                    title="En vedette"
                    subtitle="Les meilleurs templates du moment"
                    templates={groupedTemplates.featured}
                    onSelect={onSelect}
                    hoveredTemplate={hoveredTemplate}
                    setHoveredTemplate={setHoveredTemplate}
                    featured
                  />
                )}

                {/* Section Radio Village */}
                {groupedTemplates.radio_village.length > 0 && (
                  <TemplateSection
                    icon="🎙️"
                    title="Radio Village"
                    subtitle="Formats audio authentiques"
                    templates={groupedTemplates.radio_village}
                    onSelect={onSelect}
                    hoveredTemplate={hoveredTemplate}
                    setHoveredTemplate={setHoveredTemplate}
                  />
                )}

                {/* Section Vidéo Pro */}
                {groupedTemplates.kuaishou.length > 0 && (
                  <TemplateSection
                    icon="🎬"
                    title="Vidéo Pro"
                    subtitle="Effets professionnels"
                    templates={groupedTemplates.kuaishou}
                    onSelect={onSelect}
                    hoveredTemplate={hoveredTemplate}
                    setHoveredTemplate={setHoveredTemplate}
                  />
                )}

                {/* Section Avancés */}
                {groupedTemplates.advanced.length > 0 && (
                  <TemplateSection
                    icon="✨"
                    title="Templates avancés"
                    subtitle="Créations élaborées"
                    templates={groupedTemplates.advanced}
                    onSelect={onSelect}
                    hoveredTemplate={hoveredTemplate}
                    setHoveredTemplate={setHoveredTemplate}
                  />
                )}

                {/* Section IA */}
                {groupedTemplates.ai_generated.length > 0 && (
                  <TemplateSection
                    icon="🤖"
                    title="Générés par IA"
                    subtitle="Créations intelligentes"
                    templates={groupedTemplates.ai_generated}
                    onSelect={onSelect}
                    hoveredTemplate={hoveredTemplate}
                    setHoveredTemplate={setHoveredTemplate}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>

      {/* Floating back button pour mobile */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 md:hidden"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-foreground text-background shadow-2xl shadow-black/30"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="font-semibold">Retour à la caméra</span>
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

// État de chargement
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center py-20 gap-4">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-primary/20 rounded-full" />
      <div className="absolute inset-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
    <p className="text-muted-foreground font-medium">Chargement des templates...</p>
  </div>
);

// État vide
const EmptyState = ({ onReset }: { onReset: () => void }) => (
  <motion.div 
    initial={{ scale: 0.9, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    className="flex flex-col items-center justify-center py-20 text-center"
  >
    <motion.div 
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="text-7xl mb-6"
    >
      🔍
    </motion.div>
    <h3 className="text-xl font-bold text-foreground mb-2">Aucun template trouvé</h3>
    <p className="text-muted-foreground mb-6 max-w-xs">
      Essaie une autre recherche ou explore d'autres catégories
    </p>
    <Button onClick={onReset} variant="outline" className="rounded-full gap-2">
      <Sparkles className="w-4 h-4" />
      Voir tous les templates
    </Button>
  </motion.div>
);

// Section de templates
interface TemplateSectionProps {
  icon: string;
  title: string;
  subtitle: string;
  templates: UnifiedTemplate[];
  onSelect: (template: UnifiedTemplate) => void;
  hoveredTemplate: string | null;
  setHoveredTemplate: (id: string | null) => void;
  featured?: boolean;
}

const TemplateSection: React.FC<TemplateSectionProps> = ({
  icon,
  title,
  subtitle,
  templates,
  onSelect,
  hoveredTemplate,
  setHoveredTemplate,
  featured
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header de section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.span 
            animate={featured ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-2xl"
          >
            {icon}
          </motion.span>
          <div>
            <h2 className="font-bold text-foreground text-lg">{title}</h2>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">{templates.length}</Badge>
      </div>
      
      {/* Grille de templates */}
      <div className={`grid gap-3 ${featured ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {templates.map((template, index) => (
          <TemplateCard
            key={template.id}
            template={template}
            onSelect={onSelect}
            index={index}
            isHovered={hoveredTemplate === template.id}
            onHover={setHoveredTemplate}
            featured={featured}
          />
        ))}
      </div>
    </motion.div>
  );
};

// Carte de template modernisée
interface TemplateCardProps {
  template: UnifiedTemplate;
  onSelect: (template: UnifiedTemplate) => void;
  index: number;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  featured?: boolean;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ 
  template, 
  onSelect, 
  index,
  isHovered,
  onHover,
  featured 
}) => {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(template)}
      onMouseEnter={() => onHover(template.id)}
      onMouseLeave={() => onHover(null)}
      className={`
        relative overflow-hidden rounded-2xl border text-left
        transition-all duration-300 ease-out group
        ${featured 
          ? 'p-5 border-primary/30 bg-gradient-to-br from-primary/5 via-background to-purple-500/5' 
          : 'p-4 border-border/50 bg-card hover:border-primary/30'
        }
        ${isHovered ? 'shadow-xl shadow-primary/10 border-primary/40' : 'shadow-sm'}
      `}
    >
      {/* Background glow */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${template.color}15, transparent 60%)`
        }}
      />

      {/* Badges flottants */}
      <div className="absolute top-3 right-3 flex gap-1.5 z-10">
        {template.isPremium && (
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 text-[10px] px-2 py-0.5 shadow-lg">
              <Star className="w-2.5 h-2.5 mr-0.5 fill-current" />
              Premium
            </Badge>
          </motion.div>
        )}
        {template.isNew && (
          <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-[10px] px-2 py-0.5">
            <Zap className="w-2.5 h-2.5 mr-0.5" />
            Nouveau
          </Badge>
        )}
      </div>

      <div className="relative flex gap-4">
        {/* Preview / Emoji */}
        <motion.div 
          whileHover={{ rotate: [0, -5, 5, 0] }}
          transition={{ duration: 0.5 }}
          className={`
            flex items-center justify-center rounded-2xl flex-shrink-0
            ${featured ? 'w-20 h-20 text-4xl' : 'w-14 h-14 text-2xl'}
          `}
          style={{ 
            backgroundColor: `${template.color}15`,
            border: `2px solid ${template.color}30`
          }}
        >
          {template.emoji}
          
          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-6 h-6 text-white fill-white" />
          </div>
        </motion.div>

        {/* Contenu */}
        <div className="flex-1 min-w-0 py-0.5">
          <h3 className={`font-bold text-foreground truncate ${featured ? 'text-lg' : 'text-base'}`}>
            {template.name}
          </h3>
          
          <p className={`text-muted-foreground line-clamp-2 mt-1 ${featured ? 'text-sm' : 'text-xs'}`}>
            {template.description}
          </p>

          {/* Méta-infos */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Badge 
              variant="outline" 
              className="text-[10px] px-2 py-0.5 bg-muted/50 border-border/50"
            >
              <Clock className="w-2.5 h-2.5 mr-1" />
              {template.duration}s
            </Badge>
            
            {template.contentType === 'audio' && (
              <Badge 
                variant="outline" 
                className="text-[10px] px-2 py-0.5 bg-orange-500/10 text-orange-600 border-orange-500/30"
              >
                <Mic className="w-2.5 h-2.5 mr-1" />
                Audio
              </Badge>
            )}

            {template.contentType === 'video' && (
              <Badge 
                variant="outline" 
                className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-600 border-blue-500/30"
              >
                <Video className="w-2.5 h-2.5 mr-1" />
                Vidéo
              </Badge>
            )}
            
            {template.rating > 0 && (
              <div className="flex items-center gap-1 text-xs text-amber-500 ml-auto">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span className="font-semibold">{template.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Flèche animée */}
        <motion.div
          animate={{ x: isHovered ? 4 : 0 }}
          className="self-center flex-shrink-0"
        >
          <div className="w-8 h-8 rounded-full bg-muted/50 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </motion.div>
      </div>
    </motion.button>
  );
};

export default UnifiedTemplateSelector;
