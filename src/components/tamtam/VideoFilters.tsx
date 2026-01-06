// src/components/tamtam/VideoFilters.tsx
import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
  Sparkles,
  Sun,
  Camera,
  Palette,
  Check,
  Sliders,
  X,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/** =========================
 * Types & Helpers
 * ========================= */

export interface VideoFilter {
  id: string;
  name: string;
  name_ba?: string;
  icon: string;
  cssFilter: string;
  intensity: number; // 0..100 default intensity
  category: "beauty" | "color" | "artistic" | "mood";
}

/**
 * Normalise certains ids (compat)
 * - certains fichiers/états peuvent utiliser "original"
 * - ton dataset actuel utilise "none"
 */
export const normalizeFilterId = (id: string): string => {
  if (!id) return "none";
  return id === "original" ? "none" : id;
};

export const getFilterById = (id: string): VideoFilter => {
  const norm = normalizeFilterId(id);
  return VIDEO_FILTERS.find((f) => f.id === norm) ?? VIDEO_FILTERS[0];
};

/**
 * Applique une intensité 0..100 sur une string CSS filter(...) déjà définie.
 * - brightness/contrast/saturate : base ~ 1.xx
 * - sepia/grayscale/blur/hue-rotate : base ~ value
 */
export const scaleCssFilter = (cssFilter: string, intensity: number = 100): string => {
  if (!cssFilter || cssFilter === "none") return "none";

  const safe = Math.max(0, Math.min(100, intensity));
  const scale = safe / 100;

  const parts = cssFilter.split(" ").filter(Boolean);

  return parts
    .map((part) => {
      const match = part.match(/^([\w-]+)\(([-\d.]+)([^)]*)\)$/);
      if (!match) return part;

      const [, func, valueStr, unit] = match;
      const numValue = Number.parseFloat(valueStr);
      if (Number.isNaN(numValue)) return part;

      // brightness/contrast/saturate are around 1.0 (neutral)
      if (["brightness", "contrast", "saturate"].includes(func)) {
        const deviation = (numValue - 1) * scale;
        const out = 1 + deviation;
        return `${func}(${out.toFixed(2)}${unit})`;
      }

      // sepia/grayscale/blur/hue-rotate scale from 0 -> base value
      if (["sepia", "grayscale", "blur", "hue-rotate"].includes(func)) {
        const out = numValue * scale;
        // hue-rotate expects deg, keep unit
        return `${func}(${out.toFixed(2)}${unit})`;
      }

      return part;
    })
    .join(" ");
};

export const getFilterStyle = (filterId: string, intensity?: number): React.CSSProperties => {
  const f = getFilterById(filterId);
  if (f.id === "none") return {};
  const css = scaleCssFilter(f.cssFilter, intensity ?? f.intensity ?? 100);
  return css === "none" ? {} : { filter: css };
};

/** =========================
 * Filters list
 * ========================= */

export const VIDEO_FILTERS: VideoFilter[] = [
  { id: "none", name: "Original", name_ba: "Atilẹba", icon: "📷", cssFilter: "none", intensity: 100, category: "beauty" },

  // Beauty
  { id: "beauty", name: "Beauté", name_ba: "Ẹwa", icon: "✨", cssFilter: "brightness(1.05) contrast(0.95) saturate(1.1) blur(0.30px)", intensity: 50, category: "beauty" },
  { id: "soft_glow", name: "Lueur Douce", name_ba: "Imọlẹ Riro", icon: "🌟", cssFilter: "brightness(1.10) contrast(0.90) saturate(1.05)", intensity: 60, category: "beauty" },
  { id: "smooth", name: "Lisse", name_ba: "Didan", icon: "💎", cssFilter: "brightness(1.02) contrast(0.98) blur(0.50px)", intensity: 40, category: "beauty" },
  { id: "porcelain", name: "Porcelaine", name_ba: "Awọ Funfun", icon: "🎀", cssFilter: "brightness(1.08) contrast(0.92) saturate(0.95) blur(0.40px)", intensity: 55, category: "beauty" },

  // Color
  { id: "warm", name: "Chaud", name_ba: "Gbigbona", icon: "🔥", cssFilter: "sepia(0.20) saturate(1.30) brightness(1.05)", intensity: 50, category: "color" },
  { id: "cool", name: "Froid", name_ba: "Tutu", icon: "❄️", cssFilter: "saturate(0.90) brightness(1.05) hue-rotate(10deg)", intensity: 50, category: "color" },
  { id: "vivid", name: "Vif", name_ba: "Kikan", icon: "🌈", cssFilter: "saturate(1.50) contrast(1.10) brightness(1.05)", intensity: 60, category: "color" },
  { id: "pastel", name: "Pastel", name_ba: "Awọ Riro", icon: "🌸", cssFilter: "saturate(0.70) brightness(1.12) contrast(0.88)", intensity: 65, category: "color" },

  // Artistic
  { id: "vintage", name: "Vintage", name_ba: "Atijo", icon: "📻", cssFilter: "sepia(0.40) contrast(1.10) brightness(0.95) saturate(0.90)", intensity: 70, category: "artistic" },
  { id: "noir", name: "Noir & Blanc", name_ba: "Dudu ati Funfun", icon: "🎬", cssFilter: "grayscale(1) contrast(1.20) brightness(1.05)", intensity: 100, category: "artistic" },
  { id: "neon", name: "Néon", name_ba: "Imọlẹ Didan", icon: "💜", cssFilter: "saturate(2) contrast(1.30) brightness(1.10) hue-rotate(-10deg)", intensity: 80, category: "artistic" },
  { id: "cyberpunk", name: "Cyberpunk", name_ba: "Ọjọ Ọla", icon: "🤖", cssFilter: "saturate(1.80) contrast(1.40) brightness(0.95) hue-rotate(180deg)", intensity: 70, category: "artistic" },
  { id: "film", name: "Film", name_ba: "Fiimu", icon: "🎞️", cssFilter: "sepia(0.15) contrast(1.15) brightness(0.95) saturate(1.10)", intensity: 50, category: "artistic" },

  // Mood
  { id: "dreamy", name: "Rêveur", name_ba: "Ala", icon: "💭", cssFilter: "brightness(1.10) contrast(0.85) saturate(1.10) blur(0.80px)", intensity: 60, category: "mood" },
  { id: "dramatic", name: "Dramatique", name_ba: "Eru", icon: "🎭", cssFilter: "contrast(1.40) brightness(0.90) saturate(0.80)", intensity: 70, category: "mood" },
  { id: "sunrise", name: "Lever de Soleil", name_ba: "Imọlẹ Aaro", icon: "🌅", cssFilter: "sepia(0.30) saturate(1.40) brightness(1.10) hue-rotate(-15deg)", intensity: 60, category: "mood" },
  { id: "sunset", name: "Coucher de Soleil", name_ba: "Irolẹ", icon: "🌇", cssFilter: "sepia(0.40) saturate(1.30) brightness(1.00) hue-rotate(10deg)", intensity: 65, category: "mood" },
  { id: "moody", name: "Atmosphérique", name_ba: "Okan Dudu", icon: "🌑", cssFilter: "brightness(0.85) contrast(1.25) saturate(0.90)", intensity: 75, category: "mood" },
];

/** =========================
 * Inline panel (NEW) – for side panels / edge swipe
 * ========================= */

export interface VideoFiltersInlinePanelProps {
  selectedId: string;
  onSelect: (filterId: string) => void;
  language?: "fr" | "ba";
  initialCategory?: VideoFilter["category"];

  /** Optionnel: si tu veux afficher un slider d’intensité */
  showIntensity?: boolean;
  intensity?: number; // 0..100
  onIntensityChange?: (v: number) => void;
}

export const VideoFiltersInlinePanel: React.FC<VideoFiltersInlinePanelProps> = ({
  selectedId,
  onSelect,
  language = "fr",
  initialCategory = "beauty",
  showIntensity = false,
  intensity,
  onIntensityChange,
}) => {
  const [activeCategory, setActiveCategory] = useState<VideoFilter["category"]>(initialCategory);

  const selected = useMemo(() => getFilterById(selectedId), [selectedId]);
  const localIntensity = intensity ?? selected.intensity ?? 100;

  const categories = useMemo(
    () => [
      { id: "beauty" as const, label: language === "ba" ? "Ẹwa" : "Beauté", icon: <Sparkles className="w-4 h-4" /> },
      { id: "color" as const, label: language === "ba" ? "Awọ" : "Couleur", icon: <Sun className="w-4 h-4" /> },
      { id: "artistic" as const, label: language === "ba" ? "Ọna" : "Artistique", icon: <Camera className="w-4 h-4" /> },
      { id: "mood" as const, label: language === "ba" ? "Okan" : "Ambiance", icon: <Palette className="w-4 h-4" /> },
    ],
    [language]
  );

  const filtered = useMemo(() => VIDEO_FILTERS.filter((f) => f.category === activeCategory), [activeCategory]);

  return (
    <div className="text-white">
      {/* categories */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => {
          const active = cat.id === activeCategory;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                active ? "bg-white/15 border border-white/20" : "bg-white/10 hover:bg-white/15 border border-white/10 text-white/80"
              }`}
              aria-pressed={active}
            >
              {cat.icon}
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* intensity */}
      {showIntensity && selected.id !== "none" ? (
        <div className="mt-3 rounded-2xl bg-white/5 border border-white/10 p-3">
          <div className="flex items-center gap-2 text-xs text-white/80">
            <Sliders className="w-4 h-4 text-white/60" />
            <span>{language === "ba" ? "Ikankan" : "Intensité"}</span>
            <div className="flex-1" />
            <span className="font-semibold tabular-nums">{Math.round(localIntensity)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={localIntensity}
            onChange={(e) => onIntensityChange?.(Number.parseInt(e.target.value, 10))}
            className="w-full mt-2"
          />
        </div>
      ) : null}

      {/* grid */}
      <div className="mt-3 grid grid-cols-4 gap-3">
        {filtered.map((f) => {
          const isSelected = normalizeFilterId(selectedId) === f.id;
          const previewIntensity = isSelected ? localIntensity : f.intensity;

          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onSelect(f.id)}
              className={`relative aspect-square rounded-xl overflow-hidden border transition ${
                isSelected ? "border-white/30 ring-2 ring-white/15" : "border-white/10 hover:border-white/20"
              }`}
              aria-pressed={isSelected}
              aria-label={language === "ba" && f.name_ba ? f.name_ba : f.name}
            >
              <div
                className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-400"
                style={{ filter: scaleCssFilter(f.cssFilter, previewIntensity) }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl drop-shadow-lg">{f.icon}</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent py-1 px-1">
                <span className="text-white text-[10px] font-medium block text-center truncate">
                  {language === "ba" && f.name_ba ? f.name_ba : f.name}
                </span>
              </div>
              {isSelected ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1 right-1 w-5 h-5 bg-white/90 rounded-full flex items-center justify-center"
                >
                  <Check className="w-3 h-3 text-black" />
                </motion.div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/** =========================
 * Modal Sheet (existing behavior) – kept for compatibility
 * ========================= */

interface VideoFiltersSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFilter: (filter: VideoFilter) => void;
  currentFilter: VideoFilter | null;
  initialCategory?: VideoFilter["category"];
  language?: "fr" | "ba";
}

const ScrollIndicator: React.FC<{ direction: "left" | "right"; onClick: () => void; visible: boolean }> = ({
  direction,
  onClick,
  visible,
}) => {
  if (!visible) return null;
  return (
    <button
      onClick={onClick}
      className={`absolute top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/80 hover:bg-black/80 transition ${
        direction === "left" ? "left-0" : "right-0"
      }`}
      aria-label={direction === "left" ? "Défiler vers la gauche" : "Défiler vers la droite"}
      type="button"
    >
      {direction === "left" ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
    </button>
  );
};

export const VideoFiltersPanel: React.FC<VideoFiltersSheetProps> = ({
  isOpen,
  onClose,
  onSelectFilter,
  currentFilter,
  initialCategory = "beauty",
  language = "fr",
}) => {
  const [activeCategory, setActiveCategory] = useState<VideoFilter["category"]>(initialCategory);
  const [customIntensity, setCustomIntensity] = useState<number>(currentFilter?.intensity ?? 60);
  const categoriesRef = useRef<HTMLDivElement>(null);
  const [canScrollCatLeft, setCanScrollCatLeft] = useState(false);
  const [canScrollCatRight, setCanScrollCatRight] = useState(false);

  const categories = useMemo(
    () => [
      { id: "beauty" as const, label: language === "ba" ? "Ẹwa" : "Beauté", icon: <Sparkles className="w-4 h-4" /> },
      { id: "color" as const, label: language === "ba" ? "Awọ" : "Couleur", icon: <Sun className="w-4 h-4" /> },
      { id: "artistic" as const, label: language === "ba" ? "Ọna" : "Artistique", icon: <Camera className="w-4 h-4" /> },
      { id: "mood" as const, label: language === "ba" ? "Okan" : "Ambiance", icon: <Palette className="w-4 h-4" /> },
    ],
    [language]
  );

  const filteredFilters = useMemo(() => VIDEO_FILTERS.filter((f) => f.category === activeCategory), [activeCategory]);

  useEffect(() => {
    if (currentFilter) setCustomIntensity(currentFilter.intensity);
  }, [currentFilter?.id]);

  const checkCategoryScrollability = useCallback(() => {
    if (!categoriesRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = categoriesRef.current;
    setCanScrollCatLeft(scrollLeft > 0);
    setCanScrollCatRight(scrollLeft + clientWidth < scrollWidth - 5);
  }, []);

  useEffect(() => {
    checkCategoryScrollability();
    window.addEventListener("resize", checkCategoryScrollability);
    return () => window.removeEventListener("resize", checkCategoryScrollability);
  }, [checkCategoryScrollability, isOpen]);

  const scrollCategories = useCallback(
    (direction: "left" | "right") => {
      if (!categoriesRef.current) return;
      const scrollAmount = 100;
      categoriesRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      setTimeout(checkCategoryScrollability, 250);
    },
    [checkCategoryScrollability]
  );

  const handleSelectFilter = useCallback(
    (filter: VideoFilter) => {
      const adjustedFilter: VideoFilter = { ...filter, intensity: customIntensity };
      onSelectFilter(adjustedFilter);
    },
    [customIntensity, onSelectFilter]
  );

  const handleIntensityChange = useCallback(
    (value: number) => {
      setCustomIntensity(value);
      if (currentFilter && currentFilter.id !== "none") {
        onSelectFilter({ ...currentFilter, intensity: value });
      }
    },
    [currentFilter, onSelectFilter]
  );

  const handleReset = useCallback(() => {
    const noFilter = VIDEO_FILTERS.find((f) => f.id === "none");
    if (noFilter) {
      onSelectFilter(noFilter);
      setCustomIntensity(100);
    }
  }, [onSelectFilter]);

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.velocity.y > 500 || info.offset.y > 150) onClose();
    },
    [onClose]
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-black/60" onClick={onClose}>
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.5 }}
          onDragEnd={handleDragEnd}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 rounded-t-3xl max-h-[80vh] overflow-hidden flex flex-col"
          style={{
            background: "rgba(20, 20, 25, 0.95)",
            backdropFilter: "blur(40px)",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
            <div className="w-10 h-1 bg-white/30 rounded-full" />
          </div>

          <div className="px-4 pb-3 flex items-center justify-between flex-shrink-0">
            <div>
              <h3 className="text-white font-semibold text-lg">{language === "ba" ? "Awọ Fidio" : "Filtres & Beauté"}</h3>
              <p className="text-white/60 text-xs">{language === "ba" ? "Yan awọ, satunse ikankan" : "Choisir et ajuster l'intensité"}</p>
            </div>
            <div className="flex items-center gap-2">
              {currentFilter && currentFilter.id !== "none" ? (
                <button onClick={handleReset} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition" aria-label={language === "ba" ? "Tun pada" : "Réinitialiser"} type="button">
                  <RotateCcw className="w-4 h-4 text-white" />
                </button>
              ) : null}
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition" aria-label={language === "ba" ? "Pade" : "Fermer"} type="button">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          <div className="px-4 pb-3 flex-shrink-0">
            <div className="relative">
              <ScrollIndicator direction="left" onClick={() => scrollCategories("left")} visible={canScrollCatLeft} />
              <ScrollIndicator direction="right" onClick={() => scrollCategories("right")} visible={canScrollCatRight} />
              <div
                ref={categoriesRef}
                onScroll={checkCategoryScrollability}
                className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all snap-start flex-shrink-0 ${
                      activeCategory === cat.id ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg" : "bg-white/10 text-white/70 hover:bg-white/15"
                    }`}
                    aria-pressed={activeCategory === cat.id}
                    type="button"
                  >
                    {cat.icon}
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {currentFilter && currentFilter.id !== "none" ? (
            <div className="px-4 pb-3 flex-shrink-0">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                <div className="flex items-center gap-3 mb-2">
                  <Sliders className="w-4 h-4 text-white/60" />
                  <span className="text-white/80 text-sm font-medium">{language === "ba" ? "Ikankan" : "Intensité"}</span>
                  <div className="flex-1" />
                  <span className="text-white font-semibold text-sm tabular-nums">{customIntensity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={customIntensity}
                  onChange={(e) => handleIntensityChange(Number.parseInt(e.target.value, 10))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  aria-label={language === "ba" ? "Ikankan asayan" : "Intensité du filtre"}
                />
              </div>
            </div>
          ) : null}

          <div className="px-4 pb-6 grid grid-cols-4 gap-3 max-h-[50vh] overflow-y-auto overscroll-contain flex-1">
            {filteredFilters.map((filter) => {
              const isSelected = currentFilter?.id === filter.id;
              const previewIntensity = isSelected ? customIntensity : filter.intensity;

              return (
                <button
                  key={filter.id}
                  onClick={() => handleSelectFilter(filter)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    isSelected ? "border-purple-500 shadow-lg shadow-purple-500/50 scale-105" : "border-transparent hover:border-white/20"
                  }`}
                  aria-pressed={isSelected}
                  aria-label={language === "ba" && filter.name_ba ? filter.name_ba : filter.name}
                  type="button"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-400" style={{ filter: scaleCssFilter(filter.cssFilter, previewIntensity) }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl drop-shadow-lg">{filter.icon}</span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent py-1.5 px-1">
                    <span className="text-white text-[10px] font-medium block text-center truncate">
                      {language === "ba" && filter.name_ba ? filter.name_ba : filter.name}
                    </span>
                  </div>
                  {isSelected ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-1 right-1 w-5 h-5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                      <Check className="w-3 h-3 text-white" />
                    </motion.div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/** =========================
 * Hook (kept)
 * ========================= */

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
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      stopFilter();

      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 480;

      const css = scaleCssFilter(filter.cssFilter, intensity ?? filter.intensity ?? 100);

      const render = () => {
        ctx.filter = css === "none" ? "none" : css;
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        animationRef.current = requestAnimationFrame(render);
      };

      render();
    },
    [stopFilter]
  );

  const resetFilter = useCallback(() => setCurrentFilter(VIDEO_FILTERS[0]), []);

  useEffect(() => () => stopFilter(), [stopFilter]);

  return {
    currentFilter,
    setCurrentFilter,
    applyFilterToCanvas,
    stopFilter,
    resetFilter,
    canvasRef,
  };
};

// ⚠️ Compat: default export = modal sheet (comme ton fichier actuel)
export default VideoFiltersPanel;
