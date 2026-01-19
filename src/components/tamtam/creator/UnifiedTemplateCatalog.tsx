/**
 * Unified Template Catalog - Catalogue avec aperçu vidéo temps réel
 * Design premium avec indicateurs de téléchargement des assets
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, X, Sparkles, Download, Play, Check, Pause,
  Star, Zap, Crown, Music, BookOpen, Briefcase, 
  GraduationCap, Rocket, Grid3X3, List, Volume2, VolumeX,
  Wifi, WifiOff, HardDrive, Clock, Eye, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Template as BaseTemplate, TemplateCategory } from './TemplateSystem/types';
import { TemplateAssetManifest } from '@/lib/TemplateAssetLoader';

// Extended Template type with preview and assets
interface Template extends BaseTemplate {
  previewVideo?: string;
  requiredAssets?: TemplateAssetManifest;
}
import { allTemplates } from './TemplateSystem/templates';
import { useTemplateAssets } from '@/hooks/useTemplateAssets';

// Import premium templates
import { GriotDigitalTemplate } from '@/templates/GriotDigital';
import { BeatMakerAITemplate } from '@/templates/BeatMakerAI';
import { VillageChronicleTemplate } from '@/templates/VillageChronicle';

interface UnifiedTemplateCatalogProps {
  onSelect: (template: Template) => void;
  onClose: () => void;
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

// Premium templates converted to standard Template interface
const PREMIUM_TEMPLATES: Template[] = [
  GriotDigitalTemplate as unknown as Template,
  BeatMakerAITemplate as unknown as Template,
  VillageChronicleTemplate as unknown as Template,
].filter(t => t && t.id);

// Merge all templates
const ALL_TEMPLATES = [...PREMIUM_TEMPLATES, ...allTemplates];

// Format bytes to human readable
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Video Preview Component
const VideoPreviewPlayer: React.FC<{
  template: Template;
  isActive: boolean;
  muted: boolean;
}> = ({ template, isActive, muted }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive && !hasError) {
      video.play().then(() => setIsPlaying(true)).catch(() => setHasError(true));
    } else {
      video.pause();
      video.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isActive, hasError]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, [muted]);

  // Fallback to animated gradient if no video
  if (!template.previewVideo || hasError) {
    return (
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-primary/30 via-orange-500/30 to-pink-500/30"
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        style={{ backgroundSize: '200% 200%' }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="text-6xl opacity-50"
          >
            {template.name.charAt(0) === 'G' ? '🎭' : template.name.charAt(0) === 'B' ? '🎵' : '📰'}
          </motion.div>
        </div>
      </motion.div>
    );
  }

  return (
    <video
      ref={videoRef}
      src={template.previewVideo}
      className="absolute inset-0 w-full h-full object-cover"
      loop
      playsInline
      muted={muted}
      preload="metadata"
    />
  );
};

// Template Card Component
const TemplateCard: React.FC<{
  template: Template;
  isHovered: boolean;
  downloadProgress: number;
  downloadStatus: 'idle' | 'downloading' | 'ready' | 'error';
  isReady: boolean;
  onHover: (id: string | null) => void;
  onDownload: () => void;
  onSelect: () => void;
  onPreview: () => void;
  viewMode: 'grid' | 'list';
  globalMuted: boolean;
}> = ({
  template,
  isHovered,
  downloadProgress,
  downloadStatus,
  isReady,
  onHover,
  onDownload,
  onSelect,
  onPreview,
  viewMode,
  globalMuted,
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        "relative group cursor-pointer",
        viewMode === 'list' && "flex gap-4 items-center"
      )}
      onMouseEnter={() => onHover(template.id)}
      onMouseLeave={() => onHover(null)}
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
        {/* Thumbnail / Video Preview */}
        <div className={cn(
          "relative bg-gradient-to-br from-muted to-muted/50 overflow-hidden",
          viewMode === 'grid' ? "aspect-[9/16]" : "aspect-square"
        )}>
          {/* Static thumbnail */}
          {template.thumbnail && (
            <img
              src={template.thumbnail}
              alt={template.name}
              className={cn(
                "w-full h-full object-cover transition-opacity duration-300",
                isHovered && "opacity-0"
              )}
            />
          )}
          
          {/* Video Preview on Hover */}
          <VideoPreviewPlayer
            template={template}
            isActive={isHovered}
            muted={globalMuted}
          />
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          
          {/* Status Indicators */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {template.isPremium && (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-xs px-2">
                <Crown className="w-3 h-3 mr-1" />
                PRO
              </Badge>
            )}
            {template.isNew && (
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-xs">
                NEW
              </Badge>
            )}
          </div>

          {/* Ready/Download Status Badge */}
          <div className="absolute top-2 right-2">
            {isReady ? (
              <Badge className="bg-green-500/90 text-white border-0 text-xs flex items-center gap-1">
                <Check className="w-3 h-3" />
                Prêt
              </Badge>
            ) : downloadStatus === 'downloading' ? (
              <Badge className="bg-primary/90 text-white border-0 text-xs flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                {Math.round(downloadProgress)}%
              </Badge>
            ) : (
              <Badge className="bg-muted/80 text-muted-foreground border-0 text-xs flex items-center gap-1">
                <Download className="w-3 h-3" />
              </Badge>
            )}
          </div>

          {/* Duration Badge */}
          {template.duration && (
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {template.duration}s
            </div>
          )}
          
          {/* Hover Actions */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-0 left-0 right-0 p-3 flex gap-2"
              >
                {/* Download Progress Bar */}
                {downloadStatus === 'downloading' && (
                  <div className="flex-1 space-y-1">
                    <Progress value={downloadProgress} className="h-2 bg-white/20" />
                    <p className="text-xs text-white/70 text-center">
                      Téléchargement... {Math.round(downloadProgress)}%
                    </p>
                  </div>
                )}
                
                {downloadStatus !== 'downloading' && (
                  <>
                    {!isReady && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownload();
                        }}
                        className="flex-1 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Assets
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect();
                      }}
                      className={cn(
                        "rounded-xl text-white",
                        isReady 
                          ? "flex-1 bg-gradient-to-r from-primary to-orange-500" 
                          : "bg-white/20 backdrop-blur-sm hover:bg-white/30"
                      )}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      {isReady ? 'Utiliser' : 'Aperçu'}
                    </Button>
                    
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreview();
                      }}
                      className="rounded-xl bg-white/10 hover:bg-white/20 text-white"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Info - Grid Mode Only */}
        {viewMode === 'grid' && (
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
            
            {/* Effects Tags */}
            {template.effects && template.effects.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {template.effects.slice(0, 3).map((effect, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                    {effect.type}
                  </Badge>
                ))}
                {template.effects.length > 3 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    +{template.effects.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>
      
      {/* List View Info */}
      {viewMode === 'list' && (
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{template.name}</h3>
          <p className="text-sm text-muted-foreground truncate">{template.description}</p>
          <div className="flex items-center gap-2 mt-1">
            {template.isPremium && (
              <Badge className="bg-amber-500/20 text-amber-600 border-0 text-xs">PRO</Badge>
            )}
            {template.duration && (
              <span className="text-xs text-muted-foreground">{template.duration}s</span>
            )}
            {isReady && (
              <Badge className="bg-green-500/20 text-green-600 border-0 text-xs flex items-center gap-1">
                <Check className="w-3 h-3" />
                Prêt offline
              </Badge>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

// Preview Modal
const TemplatePreviewModal: React.FC<{
  template: Template | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: () => void;
  onDownload: () => void;
  downloadProgress: number;
  downloadStatus: 'idle' | 'downloading' | 'ready' | 'error';
  isReady: boolean;
}> = ({
  template,
  isOpen,
  onClose,
  onSelect,
  onDownload,
  downloadProgress,
  downloadStatus,
  isReady,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (isOpen && videoRef.current && template?.previewVideo) {
      videoRef.current.play().catch(() => {});
    }
  }, [isOpen, template]);

  if (!template || !isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Video Preview */}
        <div className="aspect-[9/16] relative bg-black">
          {template.previewVideo ? (
            <>
              <video
                ref={videoRef}
                src={template.previewVideo}
                className="w-full h-full object-cover"
                loop
                playsInline
                autoPlay
                muted
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  if (videoRef.current) {
                    if (isPlaying) {
                      videoRef.current.pause();
                    } else {
                      videoRef.current.play();
                    }
                    setIsPlaying(!isPlaying);
                  }
                }}
                className="absolute bottom-4 right-4 rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-orange-500/20">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="text-8xl"
              >
                {template.name.includes('Griot') ? '🎭' : template.name.includes('Beat') ? '🎵' : '📰'}
              </motion.div>
            </div>
          )}
          
          {/* Badges */}
          <div className="absolute top-4 left-4 flex gap-2">
            {template.isPremium && (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                <Crown className="w-4 h-4 mr-1" />
                PRO
              </Badge>
            )}
            {template.isNew && (
              <Badge className="bg-green-500 text-white border-0">NEW</Badge>
            )}
          </div>
        </div>
        
        {/* Info */}
        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{template.name}</h2>
            {template.nameBa && (
              <p className="text-primary font-medium">{template.nameBa}</p>
            )}
            <p className="text-muted-foreground mt-2">{template.description}</p>
          </div>
          
          {/* Effects */}
          {template.effects && template.effects.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {template.effects.map((effect, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  <Zap className="w-3 h-3" />
                  {effect.type}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Download Status */}
          {downloadStatus === 'downloading' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Téléchargement des assets...</span>
                <span className="text-primary font-medium">{Math.round(downloadProgress)}%</span>
              </div>
              <Progress value={downloadProgress} className="h-2" />
            </div>
          )}
          
          {isReady && (
            <div className="flex items-center gap-2 text-green-500 text-sm">
              <HardDrive className="w-4 h-4" />
              <span>Assets disponibles hors-ligne</span>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-3">
            {!isReady && downloadStatus !== 'downloading' && (
              <Button
                variant="outline"
                onClick={onDownload}
                className="flex-1 rounded-xl gap-2"
              >
                <Download className="w-5 h-5" />
                Télécharger
              </Button>
            )}
            
            <Button
              onClick={onSelect}
              className="flex-1 rounded-xl bg-gradient-to-r from-primary to-orange-500 gap-2"
            >
              <Play className="w-5 h-5" />
              Utiliser ce template
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Main Component
export function UnifiedTemplateCatalog({ onSelect, onClose }: UnifiedTemplateCatalogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [globalMuted, setGlobalMuted] = useState(true);
  const [selectedForPreview, setSelectedForPreview] = useState<Template | null>(null);
  const [readyTemplates, setReadyTemplates] = useState<Set<string>>(new Set());
  
  const { downloadAssets, getProgress, cacheStats, progressMap } = useTemplateAssets();

  // Check which templates are ready on mount
  useEffect(() => {
    const checkReady = async () => {
      // For demo, mark templates without required assets as ready
      const ready = new Set<string>();
      for (const template of ALL_TEMPLATES) {
        const assets = (template as Template).requiredAssets;
        if (!assets || Object.keys(assets).length === 0) {
          ready.add(template.id);
        }
      }
      setReadyTemplates(ready);
    };
    checkReady();
  }, []);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let results = [...ALL_TEMPLATES];
    
    // Sort: premium first, then new, then alphabetical
    results.sort((a, b) => {
      if (a.isPremium && !b.isPremium) return -1;
      if (!a.isPremium && b.isPremium) return 1;
      if (a.isNew && !b.isNew) return -1;
      if (!a.isNew && b.isNew) return 1;
      return a.name.localeCompare(b.name);
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

  const handleDownload = useCallback(async (template: Template) => {
    if (template.requiredAssets) {
      await downloadAssets(template.id, template.requiredAssets);
      setReadyTemplates(prev => new Set([...prev, template.id]));
    }
  }, [downloadAssets]);

  const handleSelect = useCallback((template: Template) => {
    onSelect(template);
  }, [onSelect]);

  const getTemplateProgress = (templateId: string) => {
    const progress = getProgress(templateId);
    return {
      progress: progress.progress,
      status: progress.status,
    };
  };

  const previewProgress = selectedForPreview 
    ? getTemplateProgress(selectedForPreview.id)
    : { progress: 0, status: 'idle' as const };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/98 backdrop-blur-xl flex flex-col overflow-hidden"
      >
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-primary/20"
              initial={{ 
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000), 
                y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
                scale: Math.random() * 0.5 + 0.5
              }}
              animate={{ 
                y: [null, Math.random() * -200],
                opacity: [0.3, 0.7, 0.3]
              }}
              transition={{ 
                duration: 4 + Math.random() * 2,
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
                  Catalogue Templates
                </h1>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  {filteredTemplates.length} templates disponibles
                  {cacheStats && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <HardDrive className="w-3 h-3" />
                      {formatBytes(cacheStats.totalSize)} en cache
                    </Badge>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setGlobalMuted(!globalMuted)}
                className="rounded-xl"
              >
                {globalMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
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
                  const { progress, status } = getTemplateProgress(template.id);
                  const isReady = readyTemplates.has(template.id);
                  
                  return (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      isHovered={hoveredId === template.id}
                      downloadProgress={progress}
                      downloadStatus={status}
                      isReady={isReady}
                      onHover={setHoveredId}
                      onDownload={() => handleDownload(template)}
                      onSelect={() => handleSelect(template)}
                      onPreview={() => setSelectedForPreview(template)}
                      viewMode={viewMode}
                      globalMuted={globalMuted}
                    />
                  );
                })}
              </AnimatePresence>
            </motion.div>
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

        {/* Footer Stats */}
        <div className="flex-shrink-0 p-4 border-t border-border/50 bg-background/80 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{filteredTemplates.length} templates</span>
              {cacheStats && (
                <>
                  <span className="flex items-center gap-1">
                    <HardDrive className="w-4 h-4" />
                    {cacheStats.assetCount} assets
                  </span>
                  <span className="flex items-center gap-1">
                    {navigator.onLine ? (
                      <Wifi className="w-4 h-4 text-green-500" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-amber-500" />
                    )}
                    {navigator.onLine ? 'En ligne' : 'Hors ligne'}
                  </span>
                </>
              )}
            </div>
            <Button variant="ghost" size="sm" className="gap-2">
              <Star className="w-4 h-4" />
              Mes favoris
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Preview Modal */}
      <AnimatePresence>
        <TemplatePreviewModal
          template={selectedForPreview}
          isOpen={!!selectedForPreview}
          onClose={() => setSelectedForPreview(null)}
          onSelect={() => {
            if (selectedForPreview) {
              handleSelect(selectedForPreview);
              setSelectedForPreview(null);
            }
          }}
          onDownload={() => {
            if (selectedForPreview) {
              handleDownload(selectedForPreview);
            }
          }}
          downloadProgress={previewProgress.progress}
          downloadStatus={previewProgress.status}
          isReady={selectedForPreview ? readyTemplates.has(selectedForPreview.id) : false}
        />
      </AnimatePresence>
    </>
  );
}

export default UnifiedTemplateCatalog;
