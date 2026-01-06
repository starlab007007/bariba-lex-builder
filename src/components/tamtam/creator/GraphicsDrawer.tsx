// src/components/tamtam/creator/GraphicsDrawer.tsx
// Complete Graphics module with frames, borders, overlays, backgrounds, text styles

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, X, Check, Frame, Circle, Palette, Type, Image } from 'lucide-react';
import { GRAPHICS_ITEMS, GraphicsItem } from './CreatorEffectsData';
import { cn } from '@/lib/utils';

interface GraphicsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFrame?: string;
  selectedBorder?: string;
  selectedOverlay?: string;
  selectedBackground?: string;
  selectedTextStyle?: string;
  onSelectFrame: (id: string | undefined) => void;
  onSelectBorder: (id: string | undefined) => void;
  onSelectOverlay: (id: string | undefined) => void;
  onSelectBackground: (id: string | undefined) => void;
  onSelectTextStyle: (id: string | undefined) => void;
}

type GraphicsCategory = 'frames' | 'borders' | 'overlays' | 'backgrounds' | 'text_styles';

const CATEGORY_CONFIG = [
  { id: 'frames' as const, label: 'Cadres', icon: <Frame className="w-4 h-4" /> },
  { id: 'borders' as const, label: 'Bordures', icon: <Circle className="w-4 h-4" /> },
  { id: 'overlays' as const, label: 'Overlays', icon: <Layers className="w-4 h-4" /> },
  { id: 'backgrounds' as const, label: 'Fonds', icon: <Image className="w-4 h-4" /> },
  { id: 'text_styles' as const, label: 'Textes', icon: <Type className="w-4 h-4" /> },
];

export const GraphicsDrawer: React.FC<GraphicsDrawerProps> = ({
  isOpen,
  onClose,
  selectedFrame,
  selectedBorder,
  selectedOverlay,
  selectedBackground,
  selectedTextStyle,
  onSelectFrame,
  onSelectBorder,
  onSelectOverlay,
  onSelectBackground,
  onSelectTextStyle,
}) => {
  // ALL HOOKS MUST BE DECLARED BEFORE ANY CONDITIONAL RETURNS
  const [activeCategory, setActiveCategory] = useState<GraphicsCategory>('frames');

  const items = useMemo(() => 
    GRAPHICS_ITEMS.filter(item => item.category === activeCategory),
    [activeCategory]
  );

  const getSelectedId = () => {
    switch (activeCategory) {
      case 'frames': return selectedFrame;
      case 'borders': return selectedBorder;
      case 'overlays': return selectedOverlay;
      case 'backgrounds': return selectedBackground;
      case 'text_styles': return selectedTextStyle;
    }
  };

  const handleSelect = (id: string) => {
    const currentSelected = getSelectedId();
    const newValue = currentSelected === id ? undefined : id;
    
    switch (activeCategory) {
      case 'frames': onSelectFrame(newValue); break;
      case 'borders': onSelectBorder(newValue); break;
      case 'overlays': onSelectOverlay(newValue); break;
      case 'backgrounds': onSelectBackground(newValue); break;
      case 'text_styles': onSelectTextStyle(newValue); break;
    }
  };

  // EARLY RETURN AFTER ALL HOOKS
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-[120] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="absolute left-0 right-0 bottom-0 rounded-t-[28px] bg-[#0b0b0e] border-t border-white/10 p-4 max-h-[60vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold flex items-center gap-2">
              <Palette className="h-5 w-5" /> Graphics
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none">
            {CATEGORY_CONFIG.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all',
                  activeCategory === cat.id
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white/80 hover:bg-white/15'
                )}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>

          {/* Items grid */}
          <div className="grid grid-cols-4 gap-3 overflow-y-auto max-h-[300px] pb-4">
            {/* None option */}
            <button
              onClick={() => handleSelect('none')}
              className={cn(
                'aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all',
                !getSelectedId()
                  ? 'border-white bg-white/10'
                  : 'border-white/20 bg-white/5 hover:bg-white/10'
              )}
            >
              <X className="w-6 h-6 text-white/60" />
              <span className="text-[10px] text-white/60">Aucun</span>
            </button>

            {items.map((item) => {
              const isSelected = getSelectedId() === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={cn(
                    'relative aspect-square rounded-xl border-2 overflow-hidden transition-all',
                    isSelected
                      ? 'border-white ring-2 ring-white/20'
                      : 'border-white/20 hover:border-white/40'
                  )}
                >
                  {/* Preview */}
                  <div 
                    className="absolute inset-2 rounded-lg bg-gradient-to-br from-purple-500/30 to-pink-500/30"
                    style={item.cssStyle}
                  />
                  
                  {/* Emoji */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl drop-shadow-lg">{item.emoji}</span>
                  </div>
                  
                  {/* Label */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent py-1 px-1">
                    <span className="text-white text-[9px] font-medium block text-center truncate">
                      {item.label}
                    </span>
                  </div>

                  {/* Selected indicator */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-1 right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center"
                    >
                      <Check className="w-3 h-3 text-black" />
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

// ============= APPLY GRAPHICS STYLES =============

export function getGraphicsStyles(
  frameId?: string,
  borderId?: string,
  overlayId?: string,
  backgroundId?: string
): React.CSSProperties {
  const styles: React.CSSProperties = {};
  
  const frame = frameId ? GRAPHICS_ITEMS.find(g => g.id === frameId) : null;
  const border = borderId ? GRAPHICS_ITEMS.find(g => g.id === borderId) : null;
  const overlay = overlayId ? GRAPHICS_ITEMS.find(g => g.id === overlayId) : null;
  const background = backgroundId ? GRAPHICS_ITEMS.find(g => g.id === backgroundId) : null;

  if (frame?.cssStyle) Object.assign(styles, frame.cssStyle);
  if (border?.cssStyle) Object.assign(styles, border.cssStyle);
  if (overlay?.cssStyle) Object.assign(styles, overlay.cssStyle);
  if (background?.cssStyle) Object.assign(styles, background.cssStyle);

  return styles;
}

export function getGraphicsClasses(
  frameId?: string,
  borderId?: string,
  overlayId?: string,
  backgroundId?: string
): string {
  const classes: string[] = [];
  
  const frame = frameId ? GRAPHICS_ITEMS.find(g => g.id === frameId) : null;
  const border = borderId ? GRAPHICS_ITEMS.find(g => g.id === borderId) : null;
  const overlay = overlayId ? GRAPHICS_ITEMS.find(g => g.id === overlayId) : null;
  const background = backgroundId ? GRAPHICS_ITEMS.find(g => g.id === backgroundId) : null;

  if (frame?.cssClass) classes.push(frame.cssClass);
  if (border?.cssClass) classes.push(border.cssClass);
  if (overlay?.cssClass) classes.push(overlay.cssClass);
  if (background?.cssClass) classes.push(background.cssClass);

  return classes.join(' ');
}

export default GraphicsDrawer;
