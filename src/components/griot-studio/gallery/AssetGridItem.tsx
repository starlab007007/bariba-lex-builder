/**
 * AssetGridItem — Single asset card (photo or video) for the gallery grid.
 * 
 * Performance optimizations:
 * - React.memo with shallow comparison prevents unnecessary re-renders
 * - Native loading="lazy" for images
 * - IntersectionObserver for lazy video mounting
 * - Skeleton placeholder with fade-in transition
 * - will-change for GPU-accelerated hover
 * - Video poster fallback: uses image_url as poster, shows first frame
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Play, Film } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { LibraryAsset } from '../AssetGallery';

interface AssetGridItemProps {
  asset: LibraryAsset;
  isSelected: boolean;
  selectionIndex: number;
  onToggle: (asset: LibraryAsset) => void;
  disabled?: boolean;
}

const AssetGridItemInner = ({ asset, isSelected, selectionIndex, onToggle, disabled }: AssetGridItemProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const isVideo = asset.asset_type === 'video' && asset.video_url;

  // IntersectionObserver for lazy mounting of videos
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1, rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleClick = useCallback(() => {
    onToggle(asset);
  }, [onToggle, asset]);

  // Play video on hover/touch — only when visible
  const handlePointerEnter = useCallback(() => {
    if (isVideo && videoRef.current && isVisible) {
      videoRef.current.play().catch(() => {});
    }
  }, [isVideo, isVisible]);

  const handlePointerLeave = useCallback(() => {
    if (isVideo && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isVideo]);

  return (
    <button
      ref={containerRef as any}
      onClick={handleClick}
      disabled={disabled}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className={cn(
        'relative aspect-[9/16] rounded-lg overflow-hidden border-2 transition-colors',
        'will-change-transform active:scale-[0.97] transition-transform duration-150',
        isSelected
          ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-lg shadow-amber-500/20'
          : 'border-transparent hover:border-amber-500/30',
        disabled && 'opacity-50 pointer-events-none'
      )}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 200px' }}
    >
      {/* Skeleton placeholder while loading */}
      {!imageLoaded && (
        <div className="absolute inset-0 z-10">
          <Skeleton className="w-full h-full rounded-none bg-amber-900/30" />
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Film className="w-6 h-6 text-amber-200/30" />
            </div>
          )}
        </div>
      )}

      {/* Thumbnail: video or image */}
      {isVideo ? (
        <>
          {/* Always show poster image first for instant visual */}
          <img
            src={asset.image_url}
            alt=""
            loading="lazy"
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            className={cn(
              'absolute inset-0 w-full h-full object-cover transition-opacity duration-200',
              imageLoaded ? 'opacity-100' : 'opacity-0'
            )}
          />
          {/* Video loads on top when visible — plays on hover */}
          {isVisible && (
            <video
              ref={videoRef}
              src={asset.video_url!}
              poster={asset.image_url}
              muted
              loop
              playsInline
              preload="none"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          {/* Play icon overlay */}
          {imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                <Play className="w-4 h-4 text-white ml-0.5" />
              </div>
            </div>
          )}
        </>
      ) : (
        <img
          src={asset.image_url}
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
