import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Palette, Sliders, Sparkles, Sun, X } from 'lucide-react';

import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { triggerFeedback } from '@/utils/tamtamFeedback';

export type VideoFilterCategory = 'beauty' | 'color' | 'artistic' | 'mood';

export interface VideoFilter {
  id: string;
  name: string;
  name_ba?: string;
  icon: string;
  cssFilter: string; // CSS filter() string
  intensity: number; // 0..100
  category: VideoFilterCategory;
}

export const scaleCssFilter = (cssFilter: string, intensity: number) => {
  if (!cssFilter || cssFilter === 'none') return 'none';

  // intensity 0..100 => scale 0..1.5 (soft)
  const scale = Math.max(0, Math.min(1.5, intensity / 100));

  // transform each function
  return cssFilter
    .split(' ')
    .map((part) => {
      const m = part.match(/^([a-z-]+)\(([^)]+)\)$/i);
      if (!m) return part;
      const func = m[1];
      const rawValue = m[2];

      const num = Number.parseFloat(rawValue);
      if (Number.isNaN(num)) return part;

      const unit = rawValue.replace(String(num), '');

      // these functions scale reasonably
      if (['brightness', 'contrast', 'saturate'].includes(func)) {
        // keep 1 baseline
        const out = 1 + (num - 1) * scale;
        return `${func}(${out.toFixed(2)}${unit})`;
      }
      if (['sepia', 'grayscale', 'blur', 'hue-rotate'].includes(func)) {
        const out = num * scale;
        return `${func}(${out.toFixed(2)}${unit})`;
      }

      return part;
    })
    .join(' ');
};

export const getFilterStyle = (filter: VideoFilter | null, intensity = 100): React.CSSProperties => {
  if (!filter || filter.id === 'none') return { filter: 'none' };
  return { filter: scaleCssFilter(filter.cssFilter, intensity ?? filter.intensity ?? 100) };
};

export const VIDEO_FILTERS: VideoFilter[] = [
  // Beauty
  { id: 'none', name: 'Original', name_ba: 'Àdáwà', icon: '📷', cssFilter: 'none', intensity: 100, category: 'beauty' },
  { id: 'beauty', name: 'Beauté', name_ba: 'Ẹwà', icon: '✨', cssFilter: 'brightness(1.05) contrast(0.95) saturate(1.1) blur(0.3px)', intensity: 50, category: 'beauty' },
  { id: 'soft_glow', name: 'Lueur Douce', name_ba: 'Ìmọ́lẹ̀ Rírọ̀', icon: '🌟', cssFilter: 'brightness(1.1) contrast(0.9) saturate(1.05)', intensity: 60, category: 'beauty' },
  { id: 'smooth', name: 'Lisse', name_ba: 'Dídán', icon: '💎', cssFilter: 'brightness(1.02) contrast(0.98) blur(0.5px)', intensity: 40, category: 'beauty' },

  // Color
  { id: 'warm', name: 'Chaud', name_ba: 'Gbígbóná', icon: '🔥', cssFilter: 'sepia(0.2) saturate(1.3) brightness(1.05)', intensity: 50, category: 'color' },
  { id: 'cool', name: 'Froid', name_ba: 'Tutù', icon: '❄️', cssFilter: 'saturate(0.9) brightness(1.05) hue-rotate(10deg)', intensity: 50, category: 'color' },
  { id: 'vivid', name: 'Vif', name_ba: 'Kíkankíkan', icon: '🌈', cssFilter: 'saturate(1.5) contrast(1.1) brightness(1.05)', intensity: 60, category: 'color' },

  // Artistic
  { id: 'vintage', name: 'Vintage', name_ba: 'Àtijọ́', icon: '📻', cssFilter: 'sepia(0.4) contrast(1.1) brightness(0.95) saturate(0.9)', intensity: 70, category: 'artistic' },
  { id: 'noir', name: 'Noir & Blanc', name_ba: 'Dúdú àti Funfun', icon: '🎬', cssFilter: 'grayscale(1) contrast(1.2) brightness(1.05)', intensity: 100, category: 'artistic' },
  { id: 'neon', name: 'Néon', name_ba: 'Ìmọ́lẹ̀ Dídán', icon: '💜', cssFilter: 'saturate(2) contrast(1.3) brightness(1.1) hue-rotate(-10deg)', intensity: 80, category: 'artistic' },

  // Mood
  { id: 'dreamy', name: 'Rêveur', name_ba: 'Àlá', icon: '💭', cssFilter: 'brightness(1.1) contrast(0.85) saturate(1.1) blur(0.8px)', intensity: 60, category: 'mood' },
  { id: 'dramatic', name: 'Dramatique', name_ba: 'Ẹ̀rù', icon: '🎭', cssFilter: 'contrast(1.4) brightness(0.9) saturate(0.8)', intensity: 70, category: 'mood' },
  { id: 'sunrise', name: 'Lever de Soleil', name_ba: 'Ìmọ́lẹ̀ Àárọ̀', icon: '🌅', cssFilter: 'sepia(0.3) saturate(1.4) brightness(1.1) hue-rotate(-15deg)', intensity: 60, category: 'mood' },
  { id: 'sunset', name: 'Coucher de Soleil', name_ba: 'Ìrọ̀lẹ́', icon: '🌇', cssFilter: 'sepia(0.4) saturate(1.3) brightness(1.0) hue-rotate(10deg)', intensity: 65, category: 'mood' },
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
}) => {
  const { currentLang } = useTamTamLanguage();
  const [activeCategory, setActiveCategory] = useState<VideoFilterCategory>('beauty');
  const [customIntensity, setCustomIntensity] = useState(100);

  useEffect(() => {
    if (!currentFilter) return;
    setCustomIntensity(currentFilter.intensity ?? 100);
  }, [currentFilter]);

  const categories = useMemo(
    () => [
      { id: 'beauty' as const, label: 'Beauté', icon: <Sparkles className="w-4 h-4" /> },
      { id: 'color' as const, label: 'Couleur', icon: <Sun className="w-4 h-4" /> },
      { id: 'artistic' as const, label: 'Artistique', icon: <Camera className="w-4 h-4" /> },
      { id: 'mood' as const, label: 'Ambiance', icon: <Palette className="w-4 h-4" /> },
    ],
    []
  );

  const filteredFilters = useMemo(
    () => VIDEO_FILTERS.filter((f) => f.category === activeCategory),
    [activeCategory]
  );

  const handleSelectFilter = (filter: VideoFilter) => {
    const adjustedFilter: VideoFilter = { ...filter, intensity: customIntensity };
    onSelectFilter(adjustedFilter);
    triggerFeedback('notification');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 ios-glass-dark rounded-t-3xl max-h-[72vh] overflow-hidden"
        >
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-white/30 rounded-full" />
          </div>

          <div className="px-4 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold text-lg">
                {currentLang === 'ba' ? 'Àwọ̀ Fídíò' : 'Filtres Vidéo'}
              </h3>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat.id ? 'bg-primary text-white' : 'bg-white/10 text-white/70'
                }`}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>

          <div className="px-4 pb-3">
            <div className="flex items-center gap-3">
              <Sliders className="w-4 h-4 text-white/60" />
              <span className="text-white/80 text-sm">Intensité</span>
              <input
                type="range"
                min="0"
                max="100"
                value={customIntensity}
                onChange={(e) => setCustomIntensity(Number.parseInt(e.target.value, 10))}
                className="flex-1 accent-primary"
              />
              <span className="text-white/80 text-sm w-10">{customIntensity}%</span>
            </div>
          </div>

          <div className="px-4 pb-6 grid grid-cols-4 gap-3 max-h-[42vh] overflow-y-auto">
            {filteredFilters.map((filter) => {
              const isSelected = currentFilter?.id === filter.id;
              const previewIntensity = isSelected ? customIntensity : filter.intensity;

              return (
                <button
                  key={filter.id}
                  onClick={() => handleSelectFilter(filter)}
                  className={`rounded-2xl p-3 text-left bg-white/10 border transition-all ${
                    isSelected ? 'border-primary shadow-lg' : 'border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="text-xl">{filter.icon}</div>
                  <div className="mt-2 text-white text-xs font-semibold truncate">
                    {currentLang === 'ba' ? filter.name_ba || filter.name : filter.name}
                  </div>
                  <div className="mt-1 text-white/60 text-[10px]">
                    {filter.id === 'none' ? '—' : `${previewIntensity}%`}
                  </div>
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
  const [currentFilter, setCurrentFilter] = useState<VideoFilter | null>(VIDEO_FILTERS[0]);
  const rafRef = useRef<number | null>(null);

  const stopFilter = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => () => stopFilter(), [stopFilter]);

  const applyFilterToCanvas = useCallback(
    (video: HTMLVideoElement, canvas: HTMLCanvasElement, intensity?: number) => {
      stopFilter();

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const draw = () => {
        const w = video.videoWidth || canvas.width;
        const h = video.videoHeight || canvas.height;
        if (w && h) {
          if (canvas.width !== w) canvas.width = w;
          if (canvas.height !== h) canvas.height = h;

          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.filter = getFilterStyle(currentFilter, intensity ?? currentFilter?.intensity ?? 100).filter as string;

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
        rafRef.current = requestAnimationFrame(draw);
      };

      rafRef.current = requestAnimationFrame(draw);
    },
    [currentFilter, stopFilter]
  );

  return {
    currentFilter,
    setCurrentFilter,
    stopFilter,
    applyFilterToCanvas,
    getFilterStyle,
  };
};
