/**
 * AssetGallery — TikTok-style gallery for browsing & selecting
 * pre-generated illustrations AND short video templates.
 * 
 * Features:
 * - Photo / Video toggle tabs
 * - Horizontal scrollable category chips (scene_type)
 * - Character sub-filters (character_type)
 * - Incremental "Voir plus" (+3 items each click)
 * - Search bar to filter by description
 * - Max 10 selections with numbered badges
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { X, ImageIcon, Camera, Film, Search } from 'lucide-react';
import { AssetGridItem } from './gallery/AssetGridItem';

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
const INITIAL_COUNT = 3;
const INCREMENT = 3;

export function AssetGallery({ selectedAssets, onSelectionChange, maxSelection = MAX_SELECTION, disabled }: AssetGalleryProps) {
  const [assetType, setAssetType] = useState<'photo' | 'video'>('photo');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeCharacter, setActiveCharacter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);

  // Fetch ALL african assets (no limit)
  const { data: assets, isLoading } = useQuery({
    queryKey: ['anime-scene-library', 'african', 'all-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anime_scene_library')
        .select('id, image_url, scene_type, character_type, emotion, description_fr, description_en, action, time_of_day, asset_type, video_url, video_duration')
        .eq('style', 'african')
        .order('scene_type')
        .range(0, 999);
      if (error) throw error;
      return (data || []) as LibraryAsset[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Filter assets by type + category + character + search
  const filteredAssets = useMemo(() => {
    if (!assets) return [];
    const q = searchQuery.toLowerCase().trim();
    return assets.filter(a => {
      if (a.asset_type !== assetType) return false;
      if (activeCategory !== 'all' && a.scene_type !== activeCategory) return false;
      if (activeCharacter !== 'all' && a.character_type !== activeCharacter) return false;
      if (q) {
        const text = `${a.description_fr || ''} ${a.description_en || ''} ${a.scene_type || ''} ${a.emotion || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [assets, assetType, activeCategory, activeCharacter, searchQuery]);

  // Reset visible count when filters change
  const resetFilters = useCallback(() => {
    setVisibleCount(INITIAL_COUNT);
  }, []);

  const visibleAssets = useMemo(() => filteredAssets.slice(0, visibleCount), [filteredAssets, visibleCount]);
  const hasMore = visibleCount < filteredAssets.length;

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

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-300/40" />
        <input
          type="text"
          placeholder="Rechercher une image ou vidéo..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); resetFilters(); }}
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-amber-950/30 border border-amber-500/10 text-sm text-amber-100 placeholder:text-amber-300/30 focus:outline-none focus:border-amber-500/30"
        />
      </div>

      {/* Photo / Video Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => { setAssetType('photo'); setActiveCategory('all'); setActiveCharacter('all'); resetFilters(); }}
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
        </button>
        <button
          onClick={() => { setAssetType('video'); setActiveCategory('all'); setActiveCharacter('all'); resetFilters(); }}
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
        </button>
      </div>

      {/* Scene category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        {SCENE_CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => { setActiveCategory(cat.key); resetFilters(); }}
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
            onClick={() => { setActiveCharacter(ch.key); resetFilters(); }}
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

      {/* Grid — incremental display */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[9/16] rounded-lg bg-blue-900/30" />
          ))}
        </div>
      ) : visibleAssets.length === 0 ? (
        <div className="text-center py-8 text-blue-200/40 text-sm animate-fade-in">
          {searchQuery
            ? '🔍 Aucun résultat pour cette recherche'
            : assetType === 'video'
              ? '🎬 Aucune vidéo dans cette catégorie'
              : '📸 Aucune illustration dans cette catégorie'}
        </div>
      ) : (
        <>
          <div key={`${assetType}-${activeCategory}-${activeCharacter}`} className="grid grid-cols-3 gap-1.5 animate-fade-in">
            {visibleAssets.map(asset => (
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

          {/* "Voir plus" button — adds 3 more */}
          {hasMore && (
            <button
              onClick={() => setVisibleCount(prev => prev + INCREMENT)}
              disabled={disabled}
              className={cn(
                'w-full py-2 rounded-xl text-sm font-medium transition-all border',
                'bg-blue-600/80 text-white border-blue-500/50 hover:bg-blue-500 active:scale-[0.98]'
              )}
            >
              ▶ Voir plus
            </button>
          )}
        </>
      )}

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
