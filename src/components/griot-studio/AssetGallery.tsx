/**
 * AssetGallery — Gallery for browsing & selecting illustrations AND video clips.
 *
 * KEY FEATURES:
 * - Paginated display: 8 items at a time with "Voir plus" button
 * - Separate selection: up to 12 photos AND 12 videos independently
 * - Video preview modal: play video before selecting
 * - CDN thumbnails, debounced search, React Query cache
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { X, ImageIcon, Camera, Film, Search, Loader2, ChevronDown } from 'lucide-react';
import { AssetGridItem } from './gallery/AssetGridItem';
import { SelectionTray } from './gallery/SelectionTray';
import { VideoPreviewModal } from './gallery/VideoPreviewModal';

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

const MAX_PHOTOS = 12;
const MAX_VIDEOS = 12;
const PAGE_SIZE = 60; // server page
const DISPLAY_BATCH = 8; // visible batch in UI

const SELECT_COLUMNS = 'id, image_url, scene_type, character_type, emotion, description_fr, description_en, action, time_of_day, asset_type, video_url, video_duration';

export function AssetGallery({ selectedAssets, onSelectionChange, maxSelection, disabled }: AssetGalleryProps) {
  const [assetType, setAssetType] = useState<'photo' | 'video'>('photo');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeCharacter, setActiveCharacter] = useState<string>('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(DISPLAY_BATCH);
  const [previewAsset, setPreviewAsset] = useState<LibraryAsset | null>(null);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(DISPLAY_BATCH);
  }, [assetType, activeCategory, activeCharacter, debouncedSearch]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Server-side paginated query
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
    staleTime: 5 * 60 * 1000,
  });

  const allAssets = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(p => p.items);
  }, [data]);

  // Split selection by type
  const selectedPhotos = useMemo(() => selectedAssets.filter(a => a.asset_type === 'photo'), [selectedAssets]);
  const selectedVideos = useMemo(() => selectedAssets.filter(a => a.asset_type === 'video'), [selectedAssets]);

  const selectedIds = useMemo(() => new Set(selectedAssets.map(a => a.id)), [selectedAssets]);

  const currentMax = assetType === 'photo' ? MAX_PHOTOS : MAX_VIDEOS;
  const currentTypeCount = assetType === 'photo' ? selectedPhotos.length : selectedVideos.length;

  const toggleAsset = useCallback((asset: LibraryAsset) => {
    if (disabled) return;
    if (selectedIds.has(asset.id)) {
      onSelectionChange(selectedAssets.filter(a => a.id !== asset.id));
    } else {
      // Check limit for the asset's type
      const typeCount = asset.asset_type === 'photo' ? selectedPhotos.length : selectedVideos.length;
      const typeMax = asset.asset_type === 'photo' ? MAX_PHOTOS : MAX_VIDEOS;
      if (typeCount < typeMax) {
        onSelectionChange([...selectedAssets, asset]);
      }
    }
  }, [selectedAssets, selectedIds, selectedPhotos.length, selectedVideos.length, disabled, onSelectionChange]);

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

  const handlePreview = useCallback((asset: LibraryAsset) => {
    setPreviewAsset(asset);
  }, []);

  // Pagination: show only `visibleCount` items, load more server data if needed
  const visibleAssets = allAssets.slice(0, visibleCount);
  const totalFetched = allAssets.length;
  const canShowMore = visibleCount < totalFetched || hasNextPage;

  const handleShowMore = useCallback(() => {
    const nextVisible = visibleCount + DISPLAY_BATCH;
    setVisibleCount(nextVisible);
    // If we need more data from server
    if (nextVisible >= totalFetched && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [visibleCount, totalFetched, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const hasSelection = selectedAssets.length > 0;

  return (
    <section className="space-y-3 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-amber-100 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-amber-400" />
          Illustrations
          {selectedPhotos.length > 0 && (
            <span className="ml-1 bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
              📸 {selectedPhotos.length}/{MAX_PHOTOS}
            </span>
          )}
          {selectedVideos.length > 0 && (
            <span className="ml-1 bg-purple-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              🎬 {selectedVideos.length}/{MAX_VIDEOS}
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

      {/* Search */}
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
            {type === 'photo' ? `📸 Photos (${selectedPhotos.length}/${MAX_PHOTOS})` : `🎬 Vidéos (${selectedVideos.length}/${MAX_VIDEOS})`}
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
      {!isLoading && totalFetched > 0 && (
        <p className="text-[11px] text-amber-200/40 px-1">
          {visibleAssets.length} sur {totalFetched}{hasNextPage ? '+' : ''} résultat{totalFetched > 1 ? 's' : ''}
        </p>
      )}

      {/* GRID — paginated by 8 */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[9/16] rounded-lg bg-muted/20" />
          ))}
        </div>
      ) : totalFetched === 0 ? (
        <div className="text-center py-8 text-amber-200/40 text-sm">
          {debouncedSearch
            ? '🔍 Aucun résultat pour cette recherche'
            : assetType === 'video'
              ? '🎬 Aucune vidéo dans cette catégorie'
              : '📸 Aucune illustration dans cette catégorie'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2" style={{ contain: 'layout style' }}>
            {visibleAssets.map(asset => (
              <AssetGridItem
                key={asset.id}
                asset={asset}
                isSelected={selectedIds.has(asset.id)}
                selectionIndex={selectionIndex(asset.id)}
                onToggle={toggleAsset}
                onPreview={asset.asset_type === 'video' ? handlePreview : undefined}
                disabled={disabled || (!selectedIds.has(asset.id) && currentTypeCount >= currentMax)}
              />
            ))}
          </div>

          {/* "Voir plus" button */}
          {canShowMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShowMore}
                disabled={isFetchingNextPage}
                className="gap-2 border-amber-500/20 text-amber-200 hover:bg-amber-500/10 hover:text-amber-100"
              >
                {isFetchingNextPage ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Chargement...</>
                ) : (
                  <><ChevronDown className="w-4 h-4" /> Voir plus ({DISPLAY_BATCH})</>
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Video Preview Modal */}
      <VideoPreviewModal
        asset={previewAsset}
        open={!!previewAsset}
        onOpenChange={(open) => { if (!open) setPreviewAsset(null); }}
        isSelected={previewAsset ? selectedIds.has(previewAsset.id) : false}
        onToggle={toggleAsset}
        disabled={disabled || (previewAsset ? !selectedIds.has(previewAsset.id) && currentTypeCount >= currentMax : false)}
      />

      {/* Selection Tray */}
      {hasSelection && (
        <SelectionTray
          selectedAssets={selectedAssets}
          maxSelection={MAX_PHOTOS + MAX_VIDEOS}
          onRemove={removeFromSelection}
          onClearAll={clearSelection}
          disabled={disabled}
        />
      )}
    </section>
  );
}
