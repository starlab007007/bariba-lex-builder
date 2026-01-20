/**
 * TemplateGalleryModal - Premium Template Gallery as a Modal
 * Voice-First Design: Integrates TamTamTemplates gallery into FullscreenCreator
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, Sparkles, Search, Mic, MicOff } from 'lucide-react';
import { TemplateHeroSection } from './TemplateHeroSection';
import { TemplateGalleryGrid } from './TemplateGalleryGrid';
import { TemplatePreviewFullscreen } from './TemplatePreviewFullscreen';
import { Template } from '@/components/tamtam/creator/TemplateSystem/types';
import { allTemplates } from '@/components/tamtam/creator/TemplateSystem/templates';
import { UnifiedTemplate } from '@/types/UnifiedTemplateTypes';
import { cn } from '@/lib/utils';

interface TemplateGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: UnifiedTemplate) => void;
}

// Category emojis for voice-first navigation
const CATEGORY_EMOJIS: Record<string, { emoji: string; label: string; labelBa?: string }> = {
  all: { emoji: '✨', label: 'Tous', labelBa: 'Kpɛ́rɛ̀' },
  storytelling: { emoji: '📖', label: 'Histoires', labelBa: 'Kɔ̀gbɛ́' },
  music: { emoji: '🎵', label: 'Musique', labelBa: 'Wùúsú' },
  business: { emoji: '💼', label: 'Business', labelBa: 'Sɔ́ŋɔ́' },
  education: { emoji: '📚', label: 'Éducation', labelBa: 'Kɛ́kɛ́' },
  future: { emoji: '🚀', label: 'Futur', labelBa: 'Sɔ̀ɔ́' },
};

export function TemplateGalleryModal({
  isOpen,
  onClose,
  onSelectTemplate
}: TemplateGalleryModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedTemplate(null);
      setShowPreview(false);
      setSearchQuery('');
    }
  }, [isOpen]);

  // Filter templates
  const filteredTemplates = allTemplates.filter(template => {
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.nameBa?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Handle template preview
  const handleSelectForPreview = useCallback((template: Template) => {
    if ('vibrate' in navigator) navigator.vibrate(30);
    setSelectedTemplate(template);
    setShowPreview(true);
  }, []);

  // Convert Template to UnifiedTemplate and select
  const handleUseTemplate = useCallback((template: Template) => {
    if ('vibrate' in navigator) navigator.vibrate(50);
    
    // Map category to UnifiedTemplate category
    const categoryMap: Record<string, 'social' | 'education' | 'storytelling' | 'music' | 'premium'> = {
      'storytelling': 'storytelling',
      'music': 'music',
      'business': 'social',
      'education': 'education',
      'future': 'premium',
    };
    
    const unifiedTemplate: UnifiedTemplate = {
      id: template.id,
      templateKey: template.id,
      name: template.name,
      name_bariba: template.nameBa,
      description: template.description,
      thumbnail: template.thumbnail || '',
      category: categoryMap[template.category] || 'social',
      duration: template.duration,
      format: '9:16',
      resolution: { width: 1080, height: 1920 },
      contentType: 'video',
      difficulty: 'beginner',
      icon: '🎬',
      emoji: '🎬',
      color: '#7C3AED',
      isPremium: template.isPremium || false,
      isNew: template.isNew || false,
      isFeatured: false,
      isActive: true,
      source: 'kuaishou',
      originalConfig: null,
      tags: template.tags || [],
      rating: 5,
      usageCount: template.usageCount || 0,
      downloadCount: 0,
    };
    
    onSelectTemplate(unifiedTemplate);
  }, [onSelectTemplate]);

  // Handle preview close
  const handleClosePreview = useCallback(() => {
    if ('vibrate' in navigator) navigator.vibrate(20);
    setShowPreview(false);
    setSelectedTemplate(null);
  }, []);

  // Voice search placeholder
  const toggleVoiceSearch = useCallback(() => {
    if ('vibrate' in navigator) navigator.vibrate(30);
    setIsListening(!isListening);
    // TODO: Implement actual voice search
  }, [isListening]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-background"
    >
      {/* Header - Large Touch Targets */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border/30">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => { 
              if ('vibrate' in navigator) navigator.vibrate(20); 
              onClose(); 
            }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted/50 hover:bg-muted active:scale-95 transition-all min-h-[48px]"
            aria-label="Fermer"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-medium">Retour</span>
          </button>
          
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg">Templates</span>
          </div>
          
          <button
            onClick={() => { 
              if ('vibrate' in navigator) navigator.vibrate(20); 
              onClose(); 
            }}
            className="p-3 rounded-xl bg-muted/50 hover:bg-muted active:scale-95 transition-all min-h-[48px] min-w-[48px] flex items-center justify-center"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar - Voice First */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="🔍 Rechercher un template..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-14 py-3.5 rounded-2xl bg-muted/50 border border-border/30 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-base min-h-[48px]"
            />
            <button
              onClick={toggleVoiceSearch}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all min-w-[44px] min-h-[44px] flex items-center justify-center",
                isListening 
                  ? "bg-red-500 text-white animate-pulse" 
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              )}
              aria-label="Recherche vocale"
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Category Pills - Emoji Navigation */}
        <div className="px-4 pb-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2">
            {Object.entries(CATEGORY_EMOJIS).map(([key, { emoji, label, labelBa }]) => (
              <button
                key={key}
                onClick={() => {
                  if ('vibrate' in navigator) navigator.vibrate(20);
                  setSelectedCategory(key);
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-2xl font-medium whitespace-nowrap transition-all min-h-[44px] active:scale-95",
                  selectedCategory === key
                    ? "bg-primary text-white shadow-lg"
                    : "bg-muted/60 hover:bg-muted text-foreground"
                )}
              >
                <span className="text-lg">{emoji}</span>
                <span className="text-sm">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="h-[calc(100vh-200px)] overflow-y-auto px-4 pb-24">
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            {filteredTemplates.length} templates disponibles
          </p>
          <TemplateGalleryGrid
            templates={filteredTemplates}
            onSelectForPreview={handleSelectForPreview}
            onUseTemplate={handleUseTemplate}
          />
        </div>
      </div>

      {/* Fullscreen Preview Modal */}
      <AnimatePresence>
        {showPreview && selectedTemplate && (
          <TemplatePreviewFullscreen
            template={selectedTemplate}
            onClose={handleClosePreview}
            onUse={() => handleUseTemplate(selectedTemplate)}
            onDownload={() => {}}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
