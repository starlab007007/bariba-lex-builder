/**
 * AssetGallery — TikTok-style gallery for browsing & selecting
 * pre-generated illustrations from the anime_scene_library.
 * 
 * Features:
 * - Horizontal scrollable category chips (scene_type)
 * - Character sub-filters (character_type)
 * - 3-column grid with tap-to-select
 * - Max 10 selections with numbered badges
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { X, ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface LibraryAsset {
  id: string;
  image_url: string;
  scene_type: string;
  character_type: string | null;
  emotion: string;
  description_fr: string | null;
  description_en: string;
  action: string | null;
  time_of_day: string | null;
}

interface AssetGalleryProps {
  selectedAssets: LibraryAsset[];
  onSelectionChange: (assets: LibraryAsset[]) => void;
  maxSelection?: number;
  disabled?: boolean;
}

const SCENE_CATEGORIES = [
  { key: 'all', label: 'Tous', emoji: '🎨' },
  { key: 'village', label: 'Village', emoji: '🏘️' },
  { key: 'forest', label: 'Forêt', emoji: '🌳' },
  { key: 'mountain', label: 'Montagne', emoji: '⛰️' },
  { key: 'river', label: 'Rivière', emoji: '🏞️' },
  { key: 'market', label: 'Marché', emoji: '🛒' },
  { key: 'night', label: 'Nuit', emoji: '🌙' },
  { key: 'journey', label: 'Voyage', emoji: '🚶' },
  { key: 'home', label: 'Maison', emoji: '🏠' },
  { key: 'gathering', label: 'Réunion', emoji: '👥' },
] as const;

const CHARACTER_FILTERS = [
  { key: 'all', label: 'Tous', emoji: '👤' },
  { key: 'elder', label: 'Ancien', emoji: '🧓' },
  { key: 'child_boy', label: 'Garçon', emoji: '👦' },
  { key: 'child_girl', label: 'Fille', emoji: '👧' },
  { key: 'group', label: 'Groupe', emoji: '👨‍👩‍👧‍👦' },
  { key: 'animal', label: 'Animal', emoji: '🦁' },
  { key: 'spirit', label: 'Esprit', emoji: '✨' },
] as const;

const MAX_SELECTION = 10;

export function AssetGallery({ selectedAssets, onSelectionChange, maxSelection = MAX_SELECTION, disabled }: AssetGalleryProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeCharacter, setActiveCharacter] = useState<string>('all');

  // Fetch all african assets
  const { data: assets, isLoading } = useQuery({
    queryKey: ['anime-scene-library', 'african'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anime_scene_library')
        .select('id, image_url, scene_type, character_type, emotion, description_fr, description_en, action, time_of_day')
        .eq('style', 'african')
        .order('scene_type');
      if (error) throw error;
      return (data || []) as LibraryAsset[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Filter assets
  const filteredAssets = useMemo(() => {
    if (!assets) return [];
    return assets.filter(a => {
      if (activeCategory !== 'all' && a.scene_type !== activeCategory) return false;
      if (activeCharacter !== 'all' && a.character_type !== activeCharacter) return false;
      return true;
    });
  }, [assets, activeCategory, activeCharacter]);

  // Selection helpers
  const selectedIds = useMemo(() => new Set(selectedAssets.map(a => a.id)), [selectedAssets]);

  const toggleAsset = useCallback((asset: LibraryAsset) => {
    if (disabled) return;
    if (selectedIds.has(asset.id)) {
      onSelectionChange(selectedAssets.filter(a => a.id !== asset.id));
    } else if (selectedAssets.length < maxSelection) {
      onSelectionChange([...selectedAssets, asset]);
    }
  }, [selectedAssets, selectedIds, maxSelection, disabled, onSelectionChange]);

  const clearSelection = useCallback(() => {
    if (!disabled) onSelectionChange([]);
  }, [disabled, onSelectionChange]);

  const selectionIndex = useCallback((id: string) => {
    const idx = selectedAssets.findIndex(a => a.id === id);
    return idx >= 0 ? idx + 1 : 0;
  }, [selectedAssets]);

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-amber-100 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-amber-400" />
          Illustrations
          {selectedAssets.length > 0 && (
            <span className="ml-1 bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
              {selectedAssets.length}/{maxSelection}
            </span>
          )}
        </h3>
        {selectedAssets.length > 0 && (
          <button
            onClick={clearSelection}
            disabled={disabled}
            className="text-xs text-amber-300/60 hover:text-amber-200 flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" /> Tout retirer
          </button>
        )}
      </div>

      {/* Scene category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        {SCENE_CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            disabled={disabled}
            className={cn(
              'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
              activeCategory === cat.key
                ? 'bg-amber-500/30 text-amber-100 border border-amber-400/50'
                : 'bg-amber-950/40 text-amber-200/60 border border-amber-500/10 hover:border-amber-500/30'
            )}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* Character sub-filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        {CHARACTER_FILTERS.map(ch => (
          <button
            key={ch.key}
            onClick={() => setActiveCharacter(ch.key)}
            disabled={disabled}
            className={cn(
              'flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] transition-all whitespace-nowrap',
              activeCharacter === ch.key
                ? 'bg-orange-500/25 text-orange-200 border border-orange-400/40'
                : 'bg-amber-950/30 text-amber-200/50 border border-transparent hover:text-amber-200/70'
            )}
          >
            {ch.emoji} {ch.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[9/16] rounded-xl bg-amber-900/30" />
          ))}
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="text-center py-8 text-amber-200/40 text-sm">
          Aucune illustration dans cette catégorie
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <AnimatePresence mode="popLayout">
            {filteredAssets.map(asset => {
              const isSelected = selectedIds.has(asset.id);
              const index = selectionIndex(asset.id);
              return (
                <motion.button
                  key={asset.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => toggleAsset(asset)}
                  disabled={disabled || (!isSelected && selectedAssets.length >= maxSelection)}
                  className={cn(
                    'relative aspect-[9/16] rounded-xl overflow-hidden border-2 transition-all',
                    isSelected
                      ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-lg shadow-amber-500/20'
                      : 'border-transparent hover:border-amber-500/30',
                    disabled && 'opacity-50 pointer-events-none'
                  )}
                >
                  <img
                    src={asset.image_url}
                    alt={asset.description_fr || asset.description_en}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />

                  {/* Selection overlay */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-amber-500 text-black font-bold text-sm flex items-center justify-center shadow-lg">
                        {index}
                      </div>
                    </div>
                  )}

                  {/* Emotion badge */}
                  <div className="absolute bottom-1 left-1 right-1 flex justify-between items-end">
                    <span className="text-[10px] bg-black/60 text-amber-200/80 px-1.5 py-0.5 rounded-md backdrop-blur-sm truncate max-w-[60%]">
                      {asset.scene_type}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Helper text */}
      <p className="text-[11px] text-center text-amber-200/30">
        {selectedAssets.length === 0
          ? '📸 Sélectionne des illustrations pour ton conte (optionnel)'
          : `✅ ${selectedAssets.length} illustration${selectedAssets.length > 1 ? 's' : ''} — elles seront utilisées dans ta vidéo`
        }
      </p>
    </section>
  );
}
