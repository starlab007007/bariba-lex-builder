import React, { useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Sun, Camera, Palette, Check, Sliders, X } from 'lucide-react';

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
  { id: 'none', name: 'Original', name_ba: 'Àdáwà', icon: '📷', cssFilter: 'none', intensity: 100, category: 'beauty' },
  { id: 'beauty', name: 'Beauté', name_ba: 'Ẹwà', icon: '✨', cssFilter: 'brightness(1.05) contrast(0.95) saturate(1.1) blur(0.3px)', intensity: 50, category: 'beauty' },
  { id: 'soft_glow', name: 'Lueur Douce', name_ba: 'Ìmọ́lẹ̀ Rírọ̀', icon: '🌟', cssFilter: 'brightness(1.1) contrast(0.9) saturate(1.05)', intensity: 60, category: 'beauty' },
  { id: 'smooth', name: 'Lisse', name_ba: 'Dídán', icon: '💎', cssFilter: 'brightness(1.02) contrast(0.98) blur(0.5px)', intensity: 40, category: 'beauty' },
  { id: 'porcelain', name: 'Porcelaine', name_ba: 'Àwọ̀ Funfun', icon: '🎀', cssFilter: 'brightness(1.08) contrast(0.92) saturate(0.95) blur(0.4px)', intensity: 55, category: 'beauty' },
  
  { id: 'warm', name: 'Chaud', name_ba: 'Gbígbóná', icon: '🔥', cssFilter: 'sepia(0.2) saturate(1.3) brightness(1.05)', intensity: 50, category: 'color' },
  { id: 'cool', name: 'Froid', name_ba: 'Tutù', icon: '❄️', cssFilter: 'saturate(0.9) brightness(1.05) hue-rotate(10deg)', intensity: 50, category: 'color' },
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
          className="absolute bottom-0 left-0 right-0 rounded-t-3xl max-h-[80vh] overflow-hidden"
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
          <div className="px-4 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold text-lg">
                {language === 'ba' ? 'Àwọ̀ Fídíò' : 'Filtres & Beauté'}
              </h3>
              <p className="text-white/60 text-xs">
                {language === 'ba' ? 'Yàn àwọ̀, ṣàtúnṣe ìkankíkan' : 'Choisir et ajuster l\'intensité'}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Category Tabs */}
          <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat.id 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                    : 'bg-white/10 text-white/70 hover:bg-white/15'
                }`}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>

          {/* Intensity Slider */}
          {currentFilter && currentFilter.id !== 'none' && (
            <div className="px-4 pb-3">
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
                />
              </div>
            </div>
          )}

          {/* Filters Grid */}
          <div className="px-4 pb-6 grid grid-cols-4 gap-3 max-h-[45vh] overflow-y-auto">
            {filteredFilters.map((filter) => {
              const isSelected = currentFilter?.id === filter.id;
              const previewIntensity = isSelected ? customIntensity : filter.intensity;

              return (
                <button
                  key={filter.id}
                  onClick={() => handleSelectFilter(filter)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    isSelected 
                      ? 'border-purple-500 shadow-lg shadow-purple-500/50 scale-105' 
                      : 'border-transparent hover:border-white/20'
                  }`}
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
                </button>
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
