// src/components/tamtam/creator/StickerLayer.tsx
// Draggable stickers with XXL touch targets and animations

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, RotateCw, Maximize2 } from 'lucide-react';
import { Sticker, STICKER_CATEGORIES } from './CreatorEffectsData';
import { cn } from '@/lib/utils';

interface StickerLayerProps {
  stickers: Sticker[];
  onStickersChange: (stickers: Sticker[]) => void;
  isEditing: boolean;
  containerRef?: React.RefObject<HTMLDivElement>;
}

const ANIMATIONS: Record<string, any> = {
  bounce: { y: [0, -10, 0], transition: { repeat: Infinity, duration: 0.6 } },
  pulse: { scale: [1, 1.1, 1], transition: { repeat: Infinity, duration: 0.8 } },
  shake: { rotate: [-5, 5, -5, 5, 0], transition: { repeat: Infinity, duration: 0.5 } },
  float: { y: [0, -8, 0], x: [0, 4, 0, -4, 0], transition: { repeat: Infinity, duration: 2 } },
  none: {},
};

export const StickerLayer: React.FC<StickerLayerProps> = ({
  stickers,
  onStickersChange,
  isEditing,
  containerRef,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const updateSticker = useCallback((id: string, updates: Partial<Sticker>) => {
    onStickersChange(
      stickers.map(s => s.id === id ? { ...s, ...updates } : s)
    );
  }, [stickers, onStickersChange]);

  const deleteSticker = useCallback((id: string) => {
    onStickersChange(stickers.filter(s => s.id !== id));
    setSelectedId(null);
  }, [stickers, onStickersChange]);

  const handleDragEnd = useCallback((id: string, info: PanInfo) => {
    const container = containerRef?.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const sticker = stickers.find(s => s.id === id);
    if (!sticker) return;

    // Calculate new position as percentage
    const newX = Math.max(0, Math.min(100, sticker.position.x + (info.offset.x / rect.width) * 100));
    const newY = Math.max(0, Math.min(100, sticker.position.y + (info.offset.y / rect.height) * 100));

    updateSticker(id, { position: { x: newX, y: newY } });
    setIsDragging(false);
  }, [stickers, containerRef, updateSticker]);

  const handleScale = useCallback((id: string, delta: number) => {
    const sticker = stickers.find(s => s.id === id);
    if (!sticker) return;
    const newScale = Math.max(0.5, Math.min(3, sticker.scale + delta));
    updateSticker(id, { scale: newScale });
  }, [stickers, updateSticker]);

  const handleRotate = useCallback((id: string) => {
    const sticker = stickers.find(s => s.id === id);
    if (!sticker) return;
    updateSticker(id, { rotation: (sticker.rotation + 45) % 360 });
  }, [stickers, updateSticker]);

  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      <AnimatePresence>
        {stickers.map((sticker) => {
          const isSelected = selectedId === sticker.id && isEditing;
          const anim = sticker.animation && ANIMATIONS[sticker.animation] ? ANIMATIONS[sticker.animation] : {};

          return (
            <motion.div
              key={sticker.id}
              className={cn(
                'absolute pointer-events-auto touch-none',
                isSelected && 'z-50'
              )}
              style={{
                left: `${sticker.position.x}%`,
                top: `${sticker.position.y}%`,
                transform: `translate(-50%, -50%) scale(${sticker.scale}) rotate(${sticker.rotation}deg)`,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: sticker.scale, 
                opacity: 1,
                ...anim
              }}
              exit={{ scale: 0, opacity: 0 }}
              drag={isEditing}
              dragMomentum={false}
              onDragStart={() => {
                setSelectedId(sticker.id);
                setIsDragging(true);
              }}
              onDragEnd={(_, info) => handleDragEnd(sticker.id, info)}
              onClick={() => isEditing && setSelectedId(sticker.id)}
              whileTap={isEditing ? { scale: sticker.scale * 1.1 } : {}}
            >
              {/* Sticker content */}
              <div className={cn(
                'relative flex items-center justify-center transition-all',
                isSelected && 'ring-2 ring-white ring-offset-2 ring-offset-transparent rounded-xl'
              )}>
                {sticker.type === 'emoji' && (
                  <span className="text-6xl drop-shadow-lg select-none">{sticker.content}</span>
                )}
                {sticker.type === 'badge' && (
                  <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 text-white text-sm font-medium">
                    {sticker.content}
                  </div>
                )}
                {sticker.type === 'text' && (
                  <div className="px-4 py-2 text-white text-xl font-bold drop-shadow-lg">
                    {sticker.content}
                  </div>
                )}
                {sticker.type === 'reaction' && (
                  <span className="text-5xl drop-shadow-lg select-none">{sticker.content}</span>
                )}

                {/* Edit controls */}
                {isSelected && (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleScale(sticker.id, 0.2); }}
                      className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
                    >
                      <Maximize2 className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRotate(sticker.id); }}
                      className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
                    >
                      <RotateCw className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSticker(sticker.id); }}
                      className="w-8 h-8 rounded-full bg-red-500/80 backdrop-blur-sm flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

// ============= STICKER PICKER =============

interface StickerPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSticker: (sticker: Omit<Sticker, 'id'>) => void;
}

export const StickerPicker: React.FC<StickerPickerProps> = ({
  isOpen,
  onClose,
  onAddSticker,
}) => {
  const [activeCategory, setActiveCategory] = useState<keyof typeof STICKER_CATEGORIES>('emojis');
  const categories = [
    { id: 'emojis' as const, label: 'Emojis', emoji: '😀' },
    { id: 'badges' as const, label: 'Badges', emoji: '🏷️' },
    { id: 'reactions' as const, label: 'Réactions', emoji: '😍' },
    { id: 'cultural' as const, label: 'Culture', emoji: '🥁' },
  ];

  const handleSelect = (content: string, type: Sticker['type']) => {
    onAddSticker({
      type,
      content,
      position: { x: 50, y: 50 },
      scale: 1,
      rotation: 0,
      animation: 'none',
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[130] bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="absolute left-0 right-0 bottom-0 rounded-t-[28px] bg-[#0b0b0e] border-t border-white/10 p-4 max-h-[50vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />
        
        <div className="font-semibold mb-3 flex items-center gap-2">
          <span className="text-lg">Stickers</span>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-full text-sm whitespace-nowrap transition-all',
                activeCategory === cat.id
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-white/80'
              )}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Sticker grid */}
        <div className="grid grid-cols-6 gap-3 overflow-y-auto max-h-[200px] pb-4">
          {STICKER_CATEGORIES[activeCategory].map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(item, activeCategory === 'badges' ? 'badge' : activeCategory === 'reactions' ? 'reaction' : 'emoji')}
              className="aspect-square rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl hover:bg-white/10 transition-all active:scale-90"
            >
              {item}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default StickerLayer;
