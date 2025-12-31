// VideoFilters.tsx - TOUTES LES AMÉLIORATIONS INTÉGRÉES
// ✅ Barre de catégories horizontale avec overflow-x-auto
// ✅ Grille de filtres avec overflow-y-auto et snap-y
// ✅ Slider d'intensité ajustable en temps réel
// ✅ Bouton Reset pour désactiver les filtres
// ✅ useEffect pour appliquer/nettoyer les filtres CSS
// ✅ Accessibilité améliorée

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Sun, Camera, Palette, Check, Sliders, X, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

export interface VideoFilter {
  id: string;
  name: string;
  name_ba?: string;
  icon: string;
  cssFilter: string;
  intensity: number;
  category: 'beauty' | 'color' | 'artistic' | 'mood';
}

export const scaleCssFilter = (cssFilter: string, intensity: number): string => {
  if (!cssFilter || cssFilter === 'none') return 'none';
  const scale = Math.max(0, Math.min(100, intensity)) / 100;
  const parts = cssFilter.split(' ');

  return parts
    .map((part) => {
      const match = part.match(/^([\w-]+)\(([-\d.]+)([^)]*)\)$/);
      if (!match) return part;
      const [, func, valueStr, unit] = match;
      const numValue = Number.parseFloat(valueStr);
      if (Number.isNaN(numValue)) return part;

      if (['brightness', 'contrast', 'saturate'].includes(func)) {
        const deviation = (numValue - 1) * scale;
        const out = 1 + deviation;
        return `${func}(${out.toFixed(2)}${unit})`;
      }

      if (['sepia', 'grayscale', 'blur', 'hue-rotate'].includes(func)) {
        const out = numValue * scale;
        return `${func}(${out.toFixed(2)}${unit})`;
      }

      return part;
    })
    .join(' ');
};

export const VIDEO_FILTERS: VideoFilter[] = [
  { id: 'none', name: 'Original', name_ba: 'Àdáwọ̀', icon: '📷', cssFilter: 'none', intensity: 100, category: 'beauty' },
  { id: 'beauty', name: 'Beauté', name_ba: 'Ẹwà', icon: '✨', cssFilter: 'brightness(1.05) contrast(0.95) saturate(1.1) blur(0.3px)', intensity: 50, category: 'beauty' },
  { id: 'soft_glow', name: 'Lueur Douce', name_ba: 'Ìmọ́lẹ̀ Rírọ̀', icon: '🌟', cssFilter: 'brightness(1.1) contrast(0.9) saturate(1.05)', intensity: 60, category: 'beauty' },
  { id: 'smooth', name: 'Lisse', name_ba: 'Dídán', icon: '💎', cssFilter: 'brightness(1.02) contrast(0.98) blur(0.5px)', intensity: 40, category: 'beauty' },
  { id: 'porcelain', name: 'Porcelaine', name_ba: 'Àwọ̀ Funfun', icon: '🎀', cssFilter: 'brightness(1.08) contrast(0.92) saturate(0.95) blur(0.4px)', intensity: 55, category: 'beauty' },
  
  { id: 'warm', name: 'Chaud', name_ba: 'Gbígbóná', icon: '🔥', cssFilter: 'sepia(0.2) saturate(1.3) brightness(1.05)', intensity: 50, category: 'color' },
  { id: 'cool', name: 'Froid', name_ba: 'Tútù', icon: '❄️', cssFilter: 'saturate(0.9) brightness(1.05) hue-rotate(10deg)', intensity: 50, category: 'color' },
  { id: 'vivid', name: 'Vif', name_ba: 'Kíkankíkan', icon: '🌈', cssFilter: 'saturate(1.5) contrast(1.1) brightness(1.05)', intensity: 60, category: 'color' },
  { id: 'pastel', name: 'Pastel', name_ba: 'Àwọ̀ Rírọ̀', icon: '🌸', cssFilter: 'saturate(0.7) brightness(1.12) contrast(0.88)', intensity: 65, category: 'color' },
  
  { id: 'vintage', name: 'Vintage', name_ba: 'Àtijọ́', icon: '📻', cssFilter: 'sepia(0.4) contrast(1.1) brightness(0.95) saturate(0.9)', intensity: 70, category: 'artistic' },
  { id: 'noir', name: 'Noir & Blanc', name_ba: 'Dúdú àti Funfun', icon: '🎬', cssFilter: 'grayscale(1) contrast(1.2) brightness(1.05)', intensity: 100, category: 'artistic' },
  { id: 'neon', name: 'Néon', name_ba: 'Ìmọ́lẹ̀ Dídán', icon: '💜', cssFilter: 'saturate(2) contrast(1.3) brightness(1.1) hue-rotate(-10deg)', intensity: 80, category: 'artistic' },
  { id: 'cyberpunk', name: 'Cyberpunk', name_ba: 'Ọjọ́ Ọ̀la', icon: '🤖', cssFilter: 'saturate(1.8) contrast(1.4) brightness(0.95) hue-rotate(180deg)', intensity: 70, category: 'artistic' },
  { id: 'film', name: 'Film', name_ba: 'Fíìmù', icon: '🎞️', cssFilter: 'sepia(0.15) contrast(1.15) brightness(0.95) saturate(1.1)', intensity: 50, category: 'artistic' },
  
  { id: 'dreamy', name: 'Rêveur', name_ba: 'Àlá', icon: '💭', cssFilter: 'brightness(1.1) contrast(0.85) saturate(1.1) blur(0.8px)', intensity: 60, category: 'mood' },
  { id: 'dramatic', name: 'Dramatique', name_ba: 'Ẹ̀rù', icon: '🎭', cssFilter: 'contrast(1.4) brightness(0.9) saturate(0.8)', intensity: 70, category: 'mood' },
  { id: 'sunrise', name: 'Lever de Soleil', name_ba: 'Ìmọ́lẹ̀ Àárọ̀', icon: '🌅', cssFilter: 'sepia(0.3) saturate(1.4) brightness(1.1) hue-rotate(-15deg)', intensity: 60, category: 'mood' },
  { id: 'sunset', name: 'Coucher de Soleil', name_ba: 'Ìrọ̀lẹ́', icon: '🌇', cssFilter: 'sepia(0.4) saturate(1.3) brightness(1.0) hue-rotate(10deg)', intensity: 65, category: 'mood' },
  { id: 'moody', name: 'Atmosphérique', name_ba: 'Ọkàn Dúdú', icon: '🌑', cssFilter: 'brightness(0.85) contrast(1.25) saturate(0.9)', intensity: 75, category: 'mood' },
];

interface VideoFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFilter: (filter: VideoFilter) => void;
  currentFilter: VideoFilter | null;
  initialCategory?: VideoFilter['category'];
  language?: 'fr' | 'ba';
}

export const VideoFiltersPanel: React.FC<VideoFiltersProps> = ({
  isOpen,
  onClose,
  onSelectFilter,
  currentFilter,
  initialCategory = 'beauty',
  language = 'fr',
}) => {
  const [activeCategory, setActiveCategory] = useState<VideoFilter['category']>(initialCategory);
  const [customIntensity, setCustomIntensity] = useState<number>(currentFilter?.intensity ?? 60);
  const [isAdjusting, setIsAdjusting] = useState(false);

  // ✅ Référence pour le scroll des catégories
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const categories = useMemo(
    () => [
      { id: 'beauty' as const, label: language === 'ba' ? 'Ẹwà' : 'Beauté', icon: <Sparkles className="w-4 h-4" /> },
      { id: 'color' as const, label: language === 'ba' ? 'Àwọ̀' : 'Couleur', icon: <Sun className="w-4 h-4" /> },
      { id: 'artistic' as const, label: language === 'ba' ? 'Ọnà' : 'Artistique', icon: <Camera className="w-4 h-4" /> },
      { id: 'mood' as const, label: language === 'ba' ? 'Ọkàn' : 'Ambiance', icon: <Palette className="w-4 h-4" /> },
    ],
    [language]
  );

  const filteredFilters = useMemo(
    () => VIDEO_FILTERS.filter((f) => f.category === activeCategory),
    [activeCategory]
  );

  // ✅ Vérifier si les flèches doivent être affichées
  const checkScrollArrows = useCallback(() => {
    const container = categoryScrollRef.current;
    if (!container) return;

    setShowLeftArrow(container.scrollLeft > 0);
    setShowRightArrow(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 5
    );
  }, []);

  useEffect(() => {
    checkScrollArrows();
    const container = categoryScrollRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollArrows);
      window.addEventListener('resize', checkScrollArrows);
      return () => {
        container.removeEventListener('scroll', checkScrollArrows);
        window.removeEventListener('resize', checkScrollArrows);
      };
    }
  }, [checkScrollArrows]);

  // ✅ Fonction pour faire défiler les catégories
  const scrollCategories = useCallback((direction: 'left' | 'right') => {
    const container = categoryScrollRef.current;
    if (!container) return;

    const scrollAmount = 150;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  }, []);

  // ✅ Synchroniser l'intensité avec le filtre actuel
  useEffect(() => {
    if (currentFilter) {
      setCustomIntensity(currentFilter.intensity);
    }
  }, [currentFilter]);

  const handleSelectFilter = useCallback((filter: VideoFilter) => {
    const adjustedFilter: VideoFilter = { ...filter, intensity: customIntensity };
    onSelectFilter(adjustedFilter);
  }, [customIntensity, onSelectFilter]);

  const handleIntensityChange = useCallback((value: number) => {
    setCustomIntensity(value);
    setIsAdjusting(true);
    if (currentFilter && currentFilter.id !== 'none') {
      const adjustedFilter: VideoFilter = { ...currentFilter, intensity: value };
      onSelectFilter(adjustedFilter);
    }
  }, [currentFilter, onSelectFilter]);

  const handleIntensityEnd = useCallback(() => {
    setIsAdjusting(false);
  }, []);

  // ✅ Fonction Reset pour désactiver tous les filtres
  const handleReset = useCallback(() => {
    const noneFilter = VIDEO_FILTERS.find(f => f.id === 'none');
    if (noneFilter) {
      onSelectFilter(noneFilter);
      setCustomIntensity(100);
    }
  }, [onSelectFilter]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] bg-black/60"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 rounded-t-3xl max-h-[80vh] overflow-hidden flex flex-col"
          style={{
            background: 'rgba(20, 20, 25, 0.95)',
            backdropFilter: 'blur(40px)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* Drag Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-white/30 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-4 pb-3 flex items-center justify-between flex-shrink-0">
            <div>
              <h3 className="text-white font-semibold text-lg">
                {language === 'ba' ? 'Àwọ̀ Fídíò' : 'Filtres & Beauté'}
              </h3>
              <p className="text-white/60 text-xs">
                {language === 'ba' ? 'Yàn àwọ̀, ṣàtúnṣe ìkankíkan' : 'Choisir et ajuster l\'intensité'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* ✅ Bouton Reset */}
              {currentFilter && currentFilter.id !== 'none' && (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  onClick={handleReset}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                  title={language === 'ba' ? 'Parẹ́' : 'Réinitialiser'}
                  aria-label={language === 'ba' ? 'Parẹ́ àwọ̀' : 'Réinitialiser les filtres'}
                >
                  <RotateCcw className="w-4 h-4 text-white" />
                </motion.button>
              )}
              <button 
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition"
                aria-label={language === 'ba' ? 'Padé' : 'Fermer'}
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* ✅ Category Tabs avec défilement horizontal */}
          <div className="px-4 pb-3 flex-shrink-0 relative">
            {/* Flèche gauche */}
            {showLeftArrow && (
              <button
                onClick={() => scrollCategories('left')}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/80 backdrop-blur-sm flex items-center justify-center shadow-lg"
                aria-label={language === 'ba' ? 'Síwájú' : 'Précédent'}
              >
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
            )}

            {/* Conteneur des catégories */}
            <div 
              ref={categoryScrollRef}
              className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth"
              style={{ scrollSnapType: 'x proximity' }}
            >
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    activeCategory === cat.id 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                      : 'bg-white/10 text-white/70 hover:bg-white/15'
                  }`}
                  style={{ scrollSnapAlign: 'start' }}
                  aria-label={`${language === 'ba' ? 'Yàn àkójọ' : 'Catégorie'} ${cat.label}`}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Flèche droite */}
            {showRightArrow && (
              <button
                onClick={() => scrollCategories('right')}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/80 backdrop-blur-sm flex items-center justify-center shadow-lg"
                aria-label={language === 'ba' ? 'Tẹ̀lé' : 'Suivant'}
              >
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
            )}

            {/* Gradients d'indication */}
            {showLeftArrow && (
              <div className="absolute left-11 top-0 bottom-0 w-6 bg-gradient-to-r from-[rgba(20,20,25,0.95)] to-transparent pointer-events-none" />
            )}
            {showRightArrow && (
              <div className="absolute right-11 top-0 bottom-0 w-6 bg-gradient-to-l from-[rgba(20,20,25,0.95)] to-transparent pointer-events-none" />
            )}
          </div>

          {/* ✅ Intensity Slider */}
          {currentFilter && currentFilter.id !== 'none' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 pb-3 flex-shrink-0"
            >
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                <div className="flex items-center gap-3 mb-2">
                  <Sliders className="w-4 h-4 text-white/60" />
                  <span className="text-white/80 text-sm font-medium">
                    {language === 'ba' ? 'Ìkankíkan' : 'Intensité'}
                  </span>
                  <div className="flex-1" />
                  <span className="text-white font-semibold text-sm tabular-nums">
                    {customIntensity}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={customIntensity}
                  onChange={(e) => handleIntensityChange(Number.parseInt(e.target.value, 10))}
                  onMouseUp={handleIntensityEnd}
                  onTouchEnd={handleIntensityEnd}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgb(168, 85, 247) 0%, rgb(236, 72, 153) ${customIntensity}%, rgba(255,255,255,0.1) ${customIntensity}%, rgba(255,255,255,0.1) 100%)`,
                  }}
                  aria-label={`${language === 'ba' ? 'Ṣàtúnṣe ìkankíkan' : 'Ajuster l\'intensité'}: ${customIntensity}%`}
                />
              </div>
            </motion.div>
          )}

          {/* ✅ Filters Grid avec snap-y */}
          <div 
            className="px-4 pb-6 grid grid-cols-4 gap-3 overflow-y-auto flex-1"
            style={{ scrollSnapType: 'y proximity' }}
          >
            {filteredFilters.map((filter) => {
              const isSelected = currentFilter?.id === filter.id;
              const previewIntensity = isSelected ? customIntensity : filter.intensity;

              return (
                <motion.button
                  key={filter.id}
                  onClick={() => handleSelectFilter(filter)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    isSelected 
                      ? 'border-purple-500 shadow-lg shadow-purple-500/50 scale-105' 
                      : 'border-transparent hover:border-white/20'
                  }`}
                  style={{ scrollSnapAlign: 'start' }}
                  whileHover={{ scale: isSelected ? 1.05 : 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  aria-label={`${language === 'ba' ? 'Lo àwọ̀' : 'Appliquer le filtre'} ${language === 'ba' && filter.name_ba ? filter.name_ba : filter.name}`}
                  title={language === 'ba' && filter.name_ba ? filter.name_ba : filter.name}
                >
                  <div
                    className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-400"
                    style={{ filter: scaleCssFilter(filter.cssFilter, previewIntensity) }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl drop-shadow-lg">{filter.icon}</span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent py-1.5 px-1">
                    <span className="text-white text-[10px] font-medium block text-center truncate">
                      {language === 'ba' && filter.name_ba ? filter.name_ba : filter.name}
                    </span>
                  </div>

                  {isSelected && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-1 right-1 w-5 h-5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg"
                    >
                      <Check className="w-3 h-3 text-white" />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export const useVideoFilter = () => {
  const [currentFilter, setCurrentFilter] = useState<VideoFilter>(VIDEO_FILTERS[0]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  const stopFilter = useCallback(() => {
    if (animationRef.current != null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const applyFilterToCanvas = useCallback(
    (videoElement: HTMLVideoElement, canvas: HTMLCanvasElement, filter: VideoFilter, intensity?: number) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      stopFilter();

      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 480;

      const css = scaleCssFilter(filter.cssFilter, intensity ?? filter.intensity ?? 100);

      const render = () => {
        ctx.filter = css === 'none' ? 'none' : css;
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        animationRef.current = requestAnimationFrame(render);
      };

      render();
    },
    [stopFilter]
  );

  const getFilterStyle = useCallback((filter: VideoFilter, intensity: number = 100): React.CSSProperties => {
    if (filter.id === 'none') return {};
    return { filter: scaleCssFilter(filter.cssFilter, intensity) };
  }, []);

  // ✅ Nettoyer le filtre lors du démontage du composant
  useEffect(() => {
    return () => {
      stopFilter();
    };
  }, [stopFilter]);

  return {
    currentFilter,
    setCurrentFilter,
    applyFilterToCanvas,
    stopFilter,
    getFilterStyle,
    canvasRef,
  };
};

export default VideoFiltersPanel;
