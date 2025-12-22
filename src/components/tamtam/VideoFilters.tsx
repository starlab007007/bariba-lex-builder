import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Sun, Moon, Zap, Camera, Palette, Check, Sliders } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { triggerFeedback } from '@/utils/tamtamFeedback';

export interface VideoFilter {
  id: string;
  name: string;
  name_ba?: string;
  icon: string;
  cssFilter: string;
  intensity: number; // 0-100
  category: 'beauty' | 'color' | 'artistic' | 'mood';
}

export const VIDEO_FILTERS: VideoFilter[] = [
  // Beauty filters
  {
    id: 'none',
    name: 'Original',
    name_ba: 'Àdáwà',
    icon: '📷',
    cssFilter: 'none',
    intensity: 100,
    category: 'beauty'
  },
  {
    id: 'beauty',
    name: 'Beauté',
    name_ba: 'Ẹwà',
    icon: '✨',
    cssFilter: 'brightness(1.05) contrast(0.95) saturate(1.1) blur(0.3px)',
    intensity: 50,
    category: 'beauty'
  },
  {
    id: 'soft_glow',
    name: 'Lueur Douce',
    name_ba: 'Ìmọ́lẹ̀ Rírọ̀',
    icon: '🌟',
    cssFilter: 'brightness(1.1) contrast(0.9) saturate(1.05)',
    intensity: 60,
    category: 'beauty'
  },
  {
    id: 'smooth',
    name: 'Lisse',
    name_ba: 'Dídán',
    icon: '💎',
    cssFilter: 'brightness(1.02) contrast(0.98) blur(0.5px)',
    intensity: 40,
    category: 'beauty'
  },
  
  // Color filters
  {
    id: 'warm',
    name: 'Chaud',
    name_ba: 'Gbígbóná',
    icon: '🔥',
    cssFilter: 'sepia(0.2) saturate(1.3) brightness(1.05)',
    intensity: 50,
    category: 'color'
  },
  {
    id: 'cool',
    name: 'Froid',
    name_ba: 'Tutù',
    icon: '❄️',
    cssFilter: 'saturate(0.9) brightness(1.05) hue-rotate(10deg)',
    intensity: 50,
    category: 'color'
  },
  {
    id: 'vivid',
    name: 'Vif',
    name_ba: 'Kíkankíkan',
    icon: '🌈',
    cssFilter: 'saturate(1.5) contrast(1.1) brightness(1.05)',
    intensity: 60,
    category: 'color'
  },
  
  // Artistic filters
  {
    id: 'vintage',
    name: 'Vintage',
    name_ba: 'Àtijọ́',
    icon: '📻',
    cssFilter: 'sepia(0.4) contrast(1.1) brightness(0.95) saturate(0.9)',
    intensity: 70,
    category: 'artistic'
  },
  {
    id: 'noir',
    name: 'Noir & Blanc',
    name_ba: 'Dúdú àti Funfun',
    icon: '🎬',
    cssFilter: 'grayscale(1) contrast(1.2) brightness(1.05)',
    intensity: 100,
    category: 'artistic'
  },
  {
    id: 'neon',
    name: 'Néon',
    name_ba: 'Ìmọ́lẹ̀ Dídán',
    icon: '💜',
    cssFilter: 'saturate(2) contrast(1.3) brightness(1.1) hue-rotate(-10deg)',
    intensity: 80,
    category: 'artistic'
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    name_ba: 'Ọjọ́ Ọ̀la',
    icon: '🤖',
    cssFilter: 'saturate(1.8) contrast(1.4) brightness(0.95) hue-rotate(180deg)',
    intensity: 70,
    category: 'artistic'
  },
  {
    id: 'film',
    name: 'Film',
    name_ba: 'Fíìmù',
    icon: '🎞️',
    cssFilter: 'sepia(0.15) contrast(1.15) brightness(0.95) saturate(1.1)',
    intensity: 50,
    category: 'artistic'
  },
  
  // Mood filters
  {
    id: 'dreamy',
    name: 'Rêveur',
    name_ba: 'Àlá',
    icon: '💭',
    cssFilter: 'brightness(1.1) contrast(0.85) saturate(1.1) blur(0.8px)',
    intensity: 60,
    category: 'mood'
  },
  {
    id: 'dramatic',
    name: 'Dramatique',
    name_ba: 'Ẹ̀rù',
    icon: '🎭',
    cssFilter: 'contrast(1.4) brightness(0.9) saturate(0.8)',
    intensity: 70,
    category: 'mood'
  },
  {
    id: 'sunrise',
    name: 'Lever de Soleil',
    name_ba: 'Ìmọ́lẹ̀ Àárọ̀',
    icon: '🌅',
    cssFilter: 'sepia(0.3) saturate(1.4) brightness(1.1) hue-rotate(-15deg)',
    intensity: 60,
    category: 'mood'
  },
  {
    id: 'sunset',
    name: 'Coucher de Soleil',
    name_ba: 'Ìrọ̀lẹ́',
    icon: '🌇',
    cssFilter: 'sepia(0.4) saturate(1.3) brightness(1.0) hue-rotate(10deg)',
    intensity: 65,
    category: 'mood'
  }
];

interface VideoFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFilter: (filter: VideoFilter) => void;
  currentFilter: VideoFilter | null;
  videoElement?: HTMLVideoElement | null;
}

export const VideoFiltersPanel: React.FC<VideoFiltersProps> = ({
  isOpen,
  onClose,
  onSelectFilter,
  currentFilter,
  videoElement
}) => {
  const { currentLang } = useTamTamLanguage();
  const [activeCategory, setActiveCategory] = useState<VideoFilter['category']>('beauty');
  const [customIntensity, setCustomIntensity] = useState(100);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const categories: { id: VideoFilter['category']; label: string; icon: React.ReactNode }[] = [
    { id: 'beauty', label: 'Beauté', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'color', label: 'Couleur', icon: <Palette className="w-4 h-4" /> },
    { id: 'artistic', label: 'Artistique', icon: <Camera className="w-4 h-4" /> },
    { id: 'mood', label: 'Ambiance', icon: <Sun className="w-4 h-4" /> },
  ];

  const filteredFilters = VIDEO_FILTERS.filter(f => f.category === activeCategory);

  const handleSelectFilter = (filter: VideoFilter) => {
    const adjustedFilter = {
      ...filter,
      intensity: customIntensity
    };
    onSelectFilter(adjustedFilter);
    triggerFeedback('notification');
  };

  // Generate filter preview with intensity
  const getFilterWithIntensity = (filter: VideoFilter, intensity: number): string => {
    if (filter.id === 'none') return 'none';
    
    // Parse and scale filter values based on intensity
    const scale = intensity / 100;
    const parts = filter.cssFilter.split(' ');
    
    return parts.map(part => {
      const match = part.match(/^(\w+)\(([\d.]+)([^)]*)\)$/);
      if (!match) return part;
      
      const [, func, value, unit] = match;
      const numValue = parseFloat(value);
      
      // Scale the deviation from 1 (for multiplicative filters)
      if (['brightness', 'contrast', 'saturate'].includes(func)) {
        const deviation = (numValue - 1) * scale;
        return `${func}(${(1 + deviation).toFixed(2)}${unit})`;
      }
      
      // Scale directly for other filters
      if (['sepia', 'grayscale', 'blur', 'hue-rotate'].includes(func)) {
        return `${func}(${(numValue * scale).toFixed(2)}${unit})`;
      }
      
      return part;
    }).join(' ');
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        onClick={e => e.stopPropagation()}
        className="absolute bottom-0 left-0 right-0 ios-glass-dark rounded-t-3xl max-h-[70vh] overflow-hidden"
      >
        {/* Handle */}
        <div className="w-12 h-1 bg-white/30 rounded-full mx-auto mt-3 mb-2" />
        
        {/* Header */}
        <div className="px-4 pb-3 flex items-center justify-between">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {currentLang === 'ba' ? 'Àwọ̀ Fídíò' : 'Filtres Vidéo'}
          </h3>
          {currentFilter && currentFilter.id !== 'none' && (
            <span className="text-primary text-sm">{currentFilter.name}</span>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {categories.map(cat => (
            <motion.button
              key={cat.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'bg-primary text-white'
                  : 'bg-white/10 text-white/70'
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </motion.button>
          ))}
        </div>

        {/* Intensity slider */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-3">
            <Sliders className="w-4 h-4 text-white/60" />
            <span className="text-white/60 text-sm w-16">Intensité</span>
            <input
              type="range"
              min={0}
              max={100}
              value={customIntensity}
              onChange={(e) => setCustomIntensity(parseInt(e.target.value))}
              className="flex-1 accent-primary"
            />
            <span className="text-white/60 text-sm w-10">{customIntensity}%</span>
          </div>
        </div>

        {/* Filter grid */}
        <div className="px-4 pb-8 grid grid-cols-4 gap-3 overflow-y-auto max-h-[40vh]">
          {filteredFilters.map(filter => (
            <motion.button
              key={filter.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelectFilter(filter)}
              className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-colors ${
                currentFilter?.id === filter.id
                  ? 'border-primary'
                  : 'border-transparent'
              }`}
            >
              {/* Filter preview */}
              <div 
                className="w-full h-full bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500"
                style={{ 
                  filter: getFilterWithIntensity(filter, filter.id === currentFilter?.id ? customIntensity : filter.intensity)
                }}
              />
              
              {/* Icon overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20">
                <span className="text-2xl">{filter.icon}</span>
              </div>

              {/* Label */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-1 px-1">
                <span className="text-white text-[10px] font-medium truncate block text-center">
                  {currentLang === 'ba' && filter.name_ba ? filter.name_ba : filter.name}
                </span>
              </div>

              {/* Selected indicator */}
              {currentFilter?.id === filter.id && (
                <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

// Hook for applying filters to video stream
export const useVideoFilter = () => {
  const [currentFilter, setCurrentFilter] = useState<VideoFilter>(VIDEO_FILTERS[0]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number>();

  const applyFilterToCanvas = useCallback((
    videoElement: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    filter: VideoFilter
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;

    const render = () => {
      ctx.filter = filter.cssFilter;
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      animationRef.current = requestAnimationFrame(render);
    };

    render();
  }, []);

  const stopFilter = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);

  const getFilterStyle = useCallback((filter: VideoFilter, intensity: number = 100): React.CSSProperties => {
    if (filter.id === 'none') return {};
    
    const scale = intensity / 100;
    const parts = filter.cssFilter.split(' ');
    
    const scaledFilter = parts.map(part => {
      const match = part.match(/^(\w+)\(([\d.]+)([^)]*)\)$/);
      if (!match) return part;
      
      const [, func, value, unit] = match;
      const numValue = parseFloat(value);
      
      if (['brightness', 'contrast', 'saturate'].includes(func)) {
        const deviation = (numValue - 1) * scale;
        return `${func}(${(1 + deviation).toFixed(2)}${unit})`;
      }
      
      if (['sepia', 'grayscale', 'blur', 'hue-rotate'].includes(func)) {
        return `${func}(${(numValue * scale).toFixed(2)}${unit})`;
      }
      
      return part;
    }).join(' ');

    return { filter: scaledFilter };
  }, []);

  return {
    currentFilter,
    setCurrentFilter,
    applyFilterToCanvas,
    stopFilter,
    getFilterStyle,
    canvasRef
  };
};

export default VideoFiltersPanel;
