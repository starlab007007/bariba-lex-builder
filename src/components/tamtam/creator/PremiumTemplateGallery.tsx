/**
 * Premium Template Gallery - Catalogue avec Effets Envato
 * Design UI chinois moderne avec animations Framer Motion
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, X, Sparkles, Download, Play, Check, 
  Star, Zap, Crown, Music, BookOpen, Briefcase, 
  GraduationCap, Rocket, Filter, Grid3X3, List
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Template, TemplateCategory } from './TemplateSystem/types';
import { allTemplates, templatesByCategory } from './TemplateSystem/templates';

// Premium template imports
import { GriotDigitalTemplate } from '@/templates/GriotDigital';
import { BeatMakerAITemplate } from '@/templates/BeatMakerAI';
import { VillageChronicleTemplate } from '@/templates/VillageChronicle';

interface PremiumTemplateGalleryProps {
  onSelect: (template: Template) => void;
  onClose: () => void;
}

interface TemplateDownloadState {
  templateId: string;
  progress: number;
  status: 'idle' | 'downloading' | 'ready' | 'error';
}

// Category configuration
const CATEGORIES = [
  { id: 'all' as const, label: 'Tous', emoji: '✨', icon: Grid3X3, color: 'from-primary to-orange-500' },
  { id: 'storytelling' as const, label: 'Contes', emoji: '📖', icon: BookOpen, color: 'from-purple-500 to-pink-500' },
  { id: 'music' as const, label: 'Musique', emoji: '🎵', icon: Music, color: 'from-green-500 to-emerald-500' },
  { id: 'business' as const, label: 'Business', emoji: '💼', icon: Briefcase, color: 'from-blue-500 to-cyan-500' },
  { id: 'education' as const, label: 'Éducation', emoji: '🎓', icon: GraduationCap, color: 'from-yellow-500 to-orange-500' },
  { id: 'future' as const, label: 'Futuriste', emoji: '🚀', icon: Rocket, color: 'from-violet-500 to-purple-500' },
];

// Premium templates with enhanced metadata
const PREMIUM_TEMPLATES: Template[] = [
  GriotDigitalTemplate,
  BeatMakerAITemplate,
  VillageChronicleTemplate,
];

// Merge premium templates with existing templates
const ALL_GALLERY_TEMPLATES = [...PREMIUM_TEMPLATES, ...allTemplates];

export function PremiumTemplateGallery({ onSelect, onClose }: PremiumTemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [downloadStates, setDownloadStates] = useState<Map<string, TemplateDownloadState>>(new Map());
  const [selectedForPreview, setSelectedForPreview] = useState<Template | null>(null);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let results = [...ALL_GALLERY_TEMPLATES];
    
    // Sort premium templates first
    results.sort((a, b) => {
      if (a.isPremium && !b.isPremium) return -1;
      if (!a.isPremium && b.isPremium) return 1;
      if (a.isNew && !b.isNew) return -1;
      if (!a.isNew && b.isNew) return 1;
      return 0;
    });
    
    if (selectedCategory !== 'all') {
      results = results.filter(t => t.category === selectedCategory);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.nameBa?.toLowerCase().includes(query) ||
        t.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    return results;
  }, [searchQuery, selectedCategory]);

  // Simulate asset download
  const handleDownload = useCallback((template: Template) => {
    const state: TemplateDownloadState = {
      templateId: template.id,
      progress: 0,
      status: 'downloading'
    };
    
    setDownloadStates(prev => new Map(prev).set(template.id, state));
    
    // Simulate progressive download
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setDownloadStates(prev => {
          const newMap = new Map(prev);
          newMap.set(template.id, { ...state, progress: 100, status: 'ready' });
          return newMap;
        });
      } else {
        setDownloadStates(prev => {
          const newMap = new Map(prev);
          newMap.set(template.id, { ...state, progress, status: 'downloading' });
          return newMap;
        });
      }
    }, 200);
  }, []);

  const handleApply = useCallback((template: Template) => {
    onSelect(template);
  }, [onSelect]);

  const getDownloadState = (templateId: string): TemplateDownloadState => {
    return downloadStates.get(templateId) || { templateId, progress: 0, status: 'idle' };
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/98 backdrop-blur-xl flex flex-col overflow-hidden"
    >
      {/* Animated Background Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-primary/20"
            initial={{ 
              x: Math.random() * window.innerWidth, 
              y: Math.random() * window.innerHeight,
              scale: Math.random() * 0.5 + 0.5
            }}
            animate={{ 
              y: [null, Math.random() * -200],
              opacity: [0.3, 0.8, 0.3]
            }}
            transition={{ 
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Header */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex-shrink-0 p-4 border-b border-border/50 bg-background/80 backdrop-blur-md"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div 
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-orange-500 to-pink-500 flex items-center justify-center shadow-lg shadow-primary/30"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Templates Premium
              </h1>
              <p className="text-sm text-muted-foreground">
                {filteredTemplates.length} templates disponibles
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="rounded-xl"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              className="rounded-xl"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose} 
              className="rounded-xl hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un template..."
            className="pl-12 h-12 bg-muted/30 border-border/50 rounded-2xl text-base"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Categories */}
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            {CATEGORIES.map((cat, index) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Button
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "flex-shrink-0 gap-2 rounded-xl h-10 px-4 transition-all duration-300",
                      isSelected && `bg-gradient-to-r ${cat.color} border-0 shadow-lg`
                    )}
                  >
                    <span className="text-lg">{cat.emoji}</span>
                    <span className="hidden sm:inline">{cat.label}</span>
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      </motion.div>

      {/* Template Grid */}
      <ScrollArea className="flex-1 p-4">
        {filteredTemplates.length > 0 ? (
          <motion.div 
            className={cn(
              "gap-4",
              viewMode === 'grid' 
                ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" 
                : "flex flex-col"
            )}
            layout
          >
            <AnimatePresence mode="popLayout">
              {filteredTemplates.map((template, index) => {
                const downloadState = getDownloadState(template.id);
                const isHovered = hoveredId === template.id;
                
                return (
                  <motion.div
                    key={template.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.03 }}
                    className={cn(
                      "relative group cursor-pointer",
                      viewMode === 'list' && "flex gap-4 items-center"
                    )}
                    onMouseEnter={() => setHoveredId(template.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {/* Card */}
                    <motion.div 
                      className={cn(
                        "bg-card/80 backdrop-blur-sm rounded-2xl overflow-hidden border border-border/50 transition-all duration-300",
                        isHovered && "border-primary/50 shadow-xl shadow-primary/20",
                        viewMode === 'list' ? "w-24 flex-shrink-0" : "w-full"
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Thumbnail */}
                      <div className={cn(
                        "relative bg-gradient-to-br from-muted to-muted/50 overflow-hidden",
                        viewMode === 'grid' ? "aspect-[9/16]" : "aspect-square"
                      )}>
                        {template.thumbnail ? (
                          <img
                            src={template.thumbnail}
                            alt={template.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                              className="text-6xl opacity-30"
                            >
                              ✨
                            </motion.div>
                          </div>
                        )}
                        
                        {/* Hover Overlay with Video Preview */}
                        <AnimatePresence>
                          {isHovered && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-3"
                            >
                              {/* Light Leak Effect on Hover */}
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-orange-500/20 via-pink-500/20 to-purple-500/20"
                                animate={{ x: ['-100%', '100%'] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                              
                              <div className="relative z-10 flex gap-2">
                                {downloadState.status === 'idle' && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownload(template);
                                    }}
                                    className="flex-1 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30"
                                  >
                                    <Download className="w-4 h-4 mr-1" />
                                    Download
                                  </Button>
                                )}
                                
                                {downloadState.status === 'downloading' && (
                                  <div className="flex-1 space-y-1">
                                    <Progress value={downloadState.progress} className="h-2" />
                                    <p className="text-xs text-white/70 text-center">
                                      {Math.round(downloadState.progress)}%
                                    </p>
                                  </div>
                                )}
                                
                                {downloadState.status === 'ready' && (
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleApply(template);
                                    }}
                                    className="flex-1 rounded-xl bg-gradient-to-r from-primary to-orange-500"
                                  >
                                    <Play className="w-4 h-4 mr-1" />
                                    Appliquer
                                  </Button>
                                )}
                                
                                {downloadState.status !== 'downloading' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedForPreview(template);
                                    }}
                                    className="rounded-xl bg-white/10 hover:bg-white/20"
                                  >
                                    <Play className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Badges */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          {template.isPremium && (
                            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-xs px-2">
                              <Crown className="w-3 h-3 mr-1" />
                              PRO
                            </Badge>
                          )}
                          {template.isNew && (
                            <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-xs px-2">
                              <Zap className="w-3 h-3 mr-1" />
                              NEW
                            </Badge>
                          )}
                        </div>

                        {/* AI Badge */}
                        {(template.id === 'griot-digital' || 
                          template.id === 'beat-maker-ai' || 
                          template.id === 'village-chronicle') && (
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0 text-xs px-2">
                              <Sparkles className="w-3 h-3 mr-1" />
                              AI
                            </Badge>
                          </div>
                        )}

                        {/* Ready Indicator */}
                        {downloadState.status === 'ready' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center"
                          >
                            <Check className="w-4 h-4 text-white" />
                          </motion.div>
                        )}
                      </div>
                    </motion.div>

                    {/* Info */}
                    <div className={cn(
                      "mt-2",
                      viewMode === 'list' && "flex-1 mt-0"
                    )}>
                      <h3 className="font-semibold text-sm text-foreground truncate">
                        {template.name}
                      </h3>
                      {template.nameBa && (
                        <p className="text-xs text-muted-foreground truncate">
                          {template.nameBa}
                        </p>
                      )}
                      {viewMode === 'list' && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {template.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        {template.tags?.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Search className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">Aucun template trouvé</p>
            <p className="text-sm">Essayez une autre recherche</p>
          </div>
        )}
      </ScrollArea>

      {/* Preview Modal */}
      <AnimatePresence>
        {selectedForPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedForPreview(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              className="bg-card rounded-3xl overflow-hidden max-w-md w-full max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="aspect-[9/16] bg-gradient-to-br from-muted to-muted/50 relative">
                {selectedForPreview.demoVideo ? (
                  <video
                    src={selectedForPreview.demoVideo}
                    autoPlay
                    loop
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-8xl"
                    >
                      ✨
                    </motion.div>
                  </div>
                )}
              </div>
              
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">{selectedForPreview.name}</h2>
                  <div className="flex gap-1">
                    {selectedForPreview.isPremium && (
                      <Badge className="bg-amber-500">PRO</Badge>
                    )}
                    {selectedForPreview.isNew && (
                      <Badge className="bg-green-500">NEW</Badge>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {selectedForPreview.description}
                </p>
                
                <div className="flex gap-2">
                  <Button
                    className="flex-1 rounded-xl bg-gradient-to-r from-primary to-orange-500"
                    onClick={() => {
                      handleApply(selectedForPreview);
                      setSelectedForPreview(null);
                    }}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Utiliser ce template
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => setSelectedForPreview(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default PremiumTemplateGallery;
