/**
 * AssetGridItem — Single asset card (photo or video) for the gallery grid.
 * Optimized: skeleton placeholder, fade-in, IntersectionObserver lazy video, GPU-accelerated hover.
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Play, Film } from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import type { LibraryAsset } from '../AssetGallery';

interface AssetGridItemProps {
  asset: LibraryAsset;
  isSelected: boolean;
  selectionIndex: number;
  onToggle: (asset: LibraryAsset) => void;
  disabled?: boolean;
}

export function AssetGridItem({ asset, isSelected, selectionIndex, onToggle, disabled }: AssetGridItemProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const isVideo = asset.asset_type === 'video' && asset.video_url;

  // IntersectionObserver for lazy mounting of videos
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1, rootMargin: '100px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
    if (isVideo && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [isVideo]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    if (isVideo && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isVideo]);

  return (
    <motion.button
      ref={containerRef as any}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onClick={() => onToggle(asset)}
      disabled={disabled}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleMouseEnter}
      onTouchEnd={handleMouseLeave}
      className={cn(
        'relative aspect-[9/16] rounded-xl overflow-hidden border-2 transition-all',
        'will-change-transform',
        isSelected
          ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-lg shadow-amber-500/20'
          : 'border-transparent hover:border-amber-500/30',
        disabled && 'opacity-50 pointer-events-none'
      )}
    >
      {/* Skeleton placeholder while loading */}
      {!imageLoaded && (
        <div className="absolute inset-0 z-10">
          <Skeleton className="w-full h-full rounded-xl bg-amber-900/30" />
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
          {isVisible ? (
            <video
              ref={videoRef}
              src={asset.video_url!}
              poster={asset.image_url}
              muted
              loop
              playsInline
              preload="metadata"
              onLoadedData={() => setImageLoaded(true)}
              className={cn(
                'w-full h-full object-cover transition-opacity duration-300',
                imageLoaded ? 'opacity-100' : 'opacity-0'
              )}
            />
          ) : (
            // Poster image as fallback when not visible
            <img
              src={asset.image_url}
              alt=""
              onLoad={() => setImageLoaded(true)}
              className={cn(
                'w-full h-full object-cover transition-opacity duration-300',
                imageLoaded ? 'opacity-100' : 'opacity-0'
              )}
            />
          )}
          {/* Play icon overlay when not hovering */}
          {!isHovering && imageLoaded && (
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
          onLoad={() => setImageLoaded(true)}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
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
    </motion.button>
  );
}
