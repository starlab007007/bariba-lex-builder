/**
 * AssetGridItem — Single asset card (photo or video) for the gallery grid.
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - React.memo with shallow comparison prevents unnecessary re-renders
 * - gridThumb() → 320px CDN-resized thumbnails (30x smaller than originals)
 * - Native loading="lazy" + decoding="async"
 * - Video poster = gridThumb(image_url), NO video element in grid
 * - Skeleton placeholder with fade-in transition
 * - will-change for GPU-accelerated hover
 */

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Play, Film } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { gridThumb, isVideoFileUrl } from './thumbnailUrl';
import type { LibraryAsset } from '../AssetGallery';

interface AssetGridItemProps {
  asset: LibraryAsset;
  isSelected: boolean;
  selectionIndex: number;
  onToggle: (asset: LibraryAsset) => void;
  disabled?: boolean;
}

const AssetGridItemInner = ({ asset, isSelected, selectionIndex, onToggle, disabled }: AssetGridItemProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const isVideo = asset.asset_type === 'video' && asset.video_url;

  // THUMBNAIL URL: CDN-resized 320px instead of full original
  // Returns '' if image_url is actually a video file (993/994 videos!)
  const thumbnailSrc = gridThumb(asset.image_url);
  const hasPoster = !!thumbnailSrc;

  const handleClick = useCallback(() => {
    onToggle(asset);
  }, [onToggle, asset]);

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 200px' }}
      className={cn(
        'relative w-full aspect-[9/16] rounded-lg overflow-hidden border-2 transition-colors',
        'will-change-transform active:scale-[0.97] transition-transform duration-150',
        isSelected
          ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-lg shadow-amber-500/20'
          : 'border-transparent hover:border-amber-500/30',
        disabled && 'opacity-50 pointer-events-none'
      )}
    >
      {/* Case 1: Has real image thumbnail → show it with skeleton loader */}
      {hasPoster && !imageLoaded && (
        <div className="absolute inset-0 z-10">
          <Skeleton className="w-full h-full rounded-none bg-muted/20" />
        </div>
      )}

      {hasPoster && (
        <img
          src={thumbnailSrc}
          alt={asset.description_fr || asset.description_en}
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-200',
            imageLoaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}

      {/* Case 2: No poster (video file as image_url) → styled gradient fallback */}
      {!hasPoster && (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-indigo-900/60 to-slate-900/80 flex flex-col items-center justify-center gap-1.5">
          <Film className="w-8 h-8 text-purple-300/70" />
          <span className="text-[10px] text-purple-200/60 font-medium">
            {asset.scene_type}
          </span>
        </div>
      )}

      {/* Video play icon overlay */}
      {isVideo && (hasPoster ? imageLoaded : true) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
            <Play className="w-4 h-4 text-white ml-0.5" />
          </div>
        </div>
      )}
      {/* Selection overlay */}
      {isSelected && (
        <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-amber-500 text-black font-bold text-sm flex items-center justify-center shadow-lg">
            {selectionIndex}
          </div>
        </div>
      )}

      {/* Bottom badges */}
      <div className="absolute bottom-1 left-1 right-1 flex justify-between items-end">
        <span className="text-[10px] bg-black/60 text-amber-200/80 px-1.5 py-0.5 rounded-md backdrop-blur-sm truncate max-w-[60%]">
          {asset.scene_type}
        </span>
        {isVideo && asset.video_duration && (
          <span className="text-[10px] bg-black/60 text-purple-200/80 px-1.5 py-0.5 rounded-md backdrop-blur-sm">
            {asset.video_duration.toFixed(0)}s
          </span>
        )}
      </div>
    </button>
  );
};

// React.memo — prevents re-render unless props actually change
export const AssetGridItem = React.memo(AssetGridItemInner, (prev, next) => {
  return (
    prev.asset.id === next.asset.id &&
    prev.isSelected === next.isSelected &&
    prev.selectionIndex === next.selectionIndex &&
    prev.disabled === next.disabled
  );
});
