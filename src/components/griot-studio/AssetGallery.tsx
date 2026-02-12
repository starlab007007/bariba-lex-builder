/**
 * AssetGallery — TikTok-style gallery for browsing & selecting
 * pre-generated illustrations AND short video templates.
 * 
 * Features:
 * - Photo / Video toggle tabs
 * - Horizontal scrollable category chips (scene_type)
 * - Character sub-filters (character_type)
 * - Shows 3 items per view with "Voir plus" to expand
 * - Max 10 selections with numbered badges
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { X, ImageIcon, Camera, Film } from 'lucide-react';
import { AssetGridItem } from './gallery/AssetGridItem';
import { AssetExpandedDrawer } from './gallery/AssetExpandedDrawer';

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
  asset_type: string;
  video_url: string | null;
  video_duration: number | null;
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
const PREVIEW_COUNT = 3;

export function AssetGallery({ selectedAssets, onSelectionChange, maxSelection = MAX_SELECTION, disabled }: AssetGalleryProps) {
  const [assetType, setAssetType] = useState<'photo' | 'video'>('photo');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeCharacter, setActiveCharacter] = useState<string>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch all african assets (photos + videos)
  const { data: assets, isLoading } = useQuery({
    queryKey: ['anime-scene-library', 'african', 'all-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anime_scene_library')
        .select('id, image_url, scene_type, character_type, emotion, description_fr, description_en, action, time_of_day, asset_type, video_url, video_duration')
        .eq('style', 'african')
        .order('scene_type');
      if (error) throw error;
      return (data || []) as LibraryAsset[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Filter assets by type + category + character
  const filteredAssets = useMemo(() => {
    if (!assets) return [];
    return assets.filter(a => {
      if (a.asset_type !== assetType) return false;
      if (activeCategory !== 'all' && a.scene_type !== activeCategory) return false;
      if (activeCharacter !== 'all' && a.character_type !== activeCharacter) return false;
      return true;
    });
  }, [assets, assetType, activeCategory, activeCharacter]);

  // First 3 for preview, rest hidden
  const previewAssets = useMemo(() => filteredAssets.slice(0, PREVIEW_COUNT), [filteredAssets]);
  const remainingCount = Math.max(0, filteredAssets.length - PREVIEW_COUNT);

  // Count per type (for tab badges)
  const photosCount = useMemo(() => assets?.filter(a => a.asset_type === 'photo').length || 0, [assets]);
  const videosCount = useMemo(() => assets?.filter(a => a.asset_type === 'video').length || 0, [assets]);

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

      {/* Photo / Video Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => { setAssetType('photo'); setActiveCategory('all'); setActiveCharacter('all'); }}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all border',
            assetType === 'photo'
              ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20'
              : 'bg-blue-950/40 text-blue-200/50 border-blue-500/10 hover:border-blue-500/30'
          )}
          disabled={disabled}
        >
          <Camera className="w-4 h-4" />
          📸 Photos
          {photosCount > 0 && <span className="text-[10px] opacity-80">({photosCount})</span>}
        </button>
        <button
          onClick={() => { setAssetType('video'); setActiveCategory('all'); setActiveCharacter('all'); }}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all border',
            assetType === 'video'
              ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20'
              : 'bg-blue-950/40 text-blue-200/50 border-blue-500/10 hover:border-blue-500/30'
          )}
          disabled={disabled}
        >
          <Film className="w-4 h-4" />
          🎬 Vidéos
          {videosCount > 0 && <span className="text-[10px] opacity-80">({videosCount})</span>}
        </button>
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
                ? 'bg-blue-600 text-white border border-blue-500'
                : 'bg-blue-950/40 text-blue-200/60 border border-blue-500/10 hover:border-blue-500/30'
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
                ? 'bg-blue-600 text-white border border-blue-500'
                : 'bg-blue-950/30 text-blue-200/50 border border-transparent hover:text-blue-200/70'
            )}
          >
            {ch.emoji} {ch.label}
          </button>
        ))}
      </div>

      {/* Grid — 3 items preview with smooth transitions */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[9/16] rounded-xl bg-blue-900/30" />
          ))}
        </div>
      ) : previewAssets.length === 0 ? (
        <div className="text-center py-8 text-blue-200/40 text-sm animate-fade-in">
          {assetType === 'video'
            ? '🎬 Aucune vidéo dans cette catégorie'
            : '📸 Aucune illustration dans cette catégorie'}
        </div>
      ) : (
        <>
          <div key={`${assetType}-${activeCategory}-${activeCharacter}`} className="grid grid-cols-3 gap-2 animate-fade-in">
            {previewAssets.map(asset => (
              <AssetGridItem
                key={asset.id}
                asset={asset}
                isSelected={selectedIds.has(asset.id)}
                selectionIndex={selectionIndex(asset.id)}
                onToggle={toggleAsset}
                disabled={disabled || (!selectedIds.has(asset.id) && selectedAssets.length >= maxSelection)}
              />
            ))}
          </div>

          {/* "Voir plus" button */}
          {remainingCount > 0 && (
            <button
              onClick={() => setDrawerOpen(true)}
              disabled={disabled}
              className={cn(
                'w-full py-2.5 rounded-xl text-sm font-medium transition-all border',
                assetType === 'video'
                  ? 'bg-purple-500/10 text-purple-200 border-purple-400/30 hover:bg-purple-500/20'
                  : 'bg-amber-500/10 text-amber-200 border-amber-400/30 hover:bg-amber-500/20'
              )}
            >
              ▶ Voir plus ({remainingCount})
            </button>
          )}
        </>
      )}

      {/* Expanded drawer */}
      <AssetExpandedDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        assets={filteredAssets}
        selectedIds={selectedIds}
        selectionIndex={selectionIndex}
        onToggle={toggleAsset}
        maxSelection={maxSelection}
        currentCount={selectedAssets.length}
        assetType={assetType}
        disabled={disabled}
      />

      {/* Helper text */}
      <p className="text-[11px] text-center text-amber-200/30">
        {selectedAssets.length === 0
          ? assetType === 'video'
            ? '🎬 Sélectionne des vidéos pour ton conte (optionnel)'
            : '📸 Sélectionne des illustrations pour ton conte (optionnel)'
          : `✅ ${selectedAssets.length} sélection${selectedAssets.length > 1 ? 's' : ''} — utilisées dans ta vidéo`
        }
      </p>
    </section>
  );
}
