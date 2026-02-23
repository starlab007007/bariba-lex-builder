/**
 * AssetGallery — Optimized gallery for browsing & selecting
 * pre-generated illustrations AND short video clips.
 *
 * PERFORMANCE STRATEGY (why it's fast with 2000+ assets):
 *
 * 1. SERVER-SIDE PAGINATION — 60 items/page via useInfiniteQuery
 *    Never loads 2000 assets at once. Each page is a light DB query.
 *
 * 2. CDN THUMBNAILS — gridThumb() transforms Supabase URLs to
 *    /render/image/public/ with width=320 quality=55
 *    → ~15KB per thumb vs ~500KB originals = 30x bandwidth reduction
 *
 * 3. NO VIDEO ELEMENTS IN GRID — Videos show their poster image only.
 *    No <video> tags in the grid = zero decode overhead.
 *
 * 4. CONTENT-VISIBILITY: AUTO — Browser skips layout/paint for
 *    off-screen cards. Massive scroll perf gain.
 *
 * 5. INFINITE SCROLL + PREFETCH — IntersectionObserver sentinel
 *    triggers fetchNextPage 400px before user reaches bottom.
 *
 * 6. DEBOUNCED SEARCH (300ms) — Prevents query spam during typing.
 *
 * 7. REACT QUERY CACHE — staleTime: 5min. Switching tabs/filters
 *    reuses cached data instantly, no re-fetch.
 *
 * 8. REACT.MEMO + STABLE CALLBACKS — AssetGridItem never re-renders
 *    unless its specific props change.
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { X, ImageIcon, Camera, Film, Search, Loader2 } from 'lucide-react';
import { AssetGridItem } from './gallery/AssetGridItem';
import { SelectionTray } from './gallery/SelectionTray';

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
  { key: 'spirit', label: 'Esprit', emoji: '✨' },
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

const MAX_SELECTION = 12;
const PAGE_SIZE = 60;

/** Only select columns needed for the grid — no heavy fields */
const SELECT_COLUMNS = 'id, image_url, scene_type, character_type, emotion, description_fr, description_en, action, time_of_day, asset_type, video_url, video_duration';

export function AssetGallery({ selectedAssets, onSelectionChange, maxSelection = MAX_SELECTION, disabled }: AssetGalleryProps) {
  const [assetType, setAssetType] = useState<'photo' | 'video'>('photo');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeCharacter, setActiveCharacter] = useState<string>('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const sentinelRef = useRef<HTMLDivElement>(null);

  // DEBOUNCE SEARCH — 300ms to prevent query spam
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // PAGINATED SERVER-SIDE QUERY — 60 items/page, cached 5min
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['asset-gallery', assetType, activeCategory, activeCharacter, debouncedSearch],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from('anime_scene_library')
        .select(SELECT_COLUMNS)
        .eq('asset_type', assetType)
        .order('scene_type')
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      if (activeCategory !== 'all') query = query.eq('scene_type', activeCategory);
      if (activeCharacter !== 'all') query = query.eq('character_type', activeCharacter);
      if (debouncedSearch) {
        query = query.or(`description_fr.ilike.%${debouncedSearch}%,description_en.ilike.%${debouncedSearch}%,scene_type.ilike.%${debouncedSearch}%,emotion.ilike.%${debouncedSearch}%`);
      }

      const { data: items, error } = await query;
      if (error) throw error;
      return {
        items: (items || []) as LibraryAsset[],
        nextOffset: (items?.length ?? 0) >= PAGE_SIZE ? pageParam + PAGE_SIZE : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialPageParam: 0,
    // CACHE — 5 min staleTime so switching tabs reuses data instantly
    staleTime: 5 * 60 * 1000,
  });

  // Flatten all pages — memoized
  const allAssets = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(p => p.items);
  }, [data]);

  // INFINITE SCROLL — prefetch 400px before bottom
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1, rootMargin: '400px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // SELECTION — stable callbacks to prevent card re-renders
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

  const removeFromSelection = useCallback((id: string) => {
    if (!disabled) onSelectionChange(selectedAssets.filter(a => a.id !== id));
  }, [disabled, selectedAssets, onSelectionChange]);

  const selectionIndex = useCallback((id: string) => {
    const idx = selectedAssets.findIndex(a => a.id === id);
    return idx >= 0 ? idx + 1 : 0;
  }, [selectedAssets]);

  const totalCount = allAssets.length;
  const hasSelection = selectedAssets.length > 0;

  return (
    <section className="space-y-3 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-amber-100 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-amber-400" />
          Illustrations
          {hasSelection && (
            <span className="ml-1 bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
              {selectedAssets.length}/{maxSelection}
            </span>
          )}
        </h3>
        {hasSelection && (
          <button
            onClick={clearSelection}
            disabled={disabled}
            className="text-xs text-amber-300/60 hover:text-amber-200 flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" /> Tout retirer
          </button>
        )}
      </div>

      {/* Search — DEBOUNCED 300ms */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-300/40" />
        <input
          type="text"
          placeholder="Rechercher une image ou vidéo..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-amber-950/30 border border-amber-500/10 text-sm text-amber-100 placeholder:text-amber-300/30 focus:outline-none focus:border-amber-500/30"
        />
      </div>

      {/* Photo / Video Tabs */}
      <div className="flex gap-2">
        {(['photo', 'video'] as const).map(type => (
          <button
            key={type}
            onClick={() => { setAssetType(type); setActiveCategory('all'); setActiveCharacter('all'); }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all border min-h-[44px]',
              assetType === type
                ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                : 'bg-blue-950/40 text-blue-200/50 border-blue-500/10 hover:border-blue-500/30'
            )}
            disabled={disabled}
          >
            {type === 'photo' ? <Camera className="w-4 h-4" /> : <Film className="w-4 h-4" />}
            {type === 'photo' ? '📸 Photos' : '🎬 Vidéos'}
          </button>
        ))}
      </div>

      {/* Scene category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        {SCENE_CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            disabled={disabled}
            className={cn(
              'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap min-h-[32px]',
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
              'flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] transition-all whitespace-nowrap min-h-[28px]',
              activeCharacter === ch.key
                ? 'bg-blue-600 text-white border border-blue-500'
                : 'bg-blue-950/30 text-blue-200/50 border border-transparent hover:text-blue-200/70'
            )}
          >
            {ch.emoji} {ch.label}
          </button>
        ))}
      </div>

      {/* Result count */}
      {!isLoading && totalCount > 0 && (
        <p className="text-[11px] text-amber-200/40 px-1">
          {totalCount} résultat{totalCount > 1 ? 's' : ''}{hasNextPage ? '+' : ''}
        </p>
      )}

      {/* GRID — content-visibility: auto for off-screen paint skip */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[9/16] rounded-lg bg-amber-900/20" />
          ))}
        </div>
      ) : totalCount === 0 ? (
        <div className="text-center py-8 text-amber-200/40 text-sm">
          {debouncedSearch
            ? '🔍 Aucun résultat pour cette recherche'
            : assetType === 'video'
              ? '🎬 Aucune vidéo dans cette catégorie'
              : '📸 Aucune illustration dans cette catégorie'}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {allAssets.map(asset => (
            <AssetGridItem
              key={asset.id}
              asset={asset}
              isSelected={selectedIds.has(asset.id)}
              selectionIndex={selectionIndex(asset.id)}
              onToggle={toggleAsset}
              disabled={disabled || (!selectedIds.has(asset.id) && selectedAssets.length >= maxSelection)}
            />
          ))}

          {/* INFINITE SCROLL SENTINEL — triggers fetchNextPage */}
          <div ref={sentinelRef} className="col-span-full flex items-center justify-center py-4">
            {isFetchingNextPage && (
              <div className="flex items-center gap-2 text-amber-200/40 text-xs">
                <Loader2 className="w-4 h-4 animate-spin" />
                Chargement...
              </div>
            )}
          </div>
        </div>
      )}

      {/* SELECTION TRAY — fixed bottom */}
      {hasSelection && (
        <SelectionTray
          selectedAssets={selectedAssets}
          maxSelection={maxSelection}
          onRemove={removeFromSelection}
          onClearAll={clearSelection}
          disabled={disabled}
        />
      )}
    </section>
  );
}
