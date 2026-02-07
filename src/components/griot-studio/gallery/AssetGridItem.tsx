/**
 * AssetGridItem — Single asset card (photo or video) for the gallery grid.
 * Videos auto-play muted on hover/tap.
 */

import React, { useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Play } from 'lucide-react';
import { motion } from 'framer-motion';
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
  const [isHovering, setIsHovering] = useState(false);
  const isVideo = asset.asset_type === 'video' && asset.video_url;

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
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onClick={() => onToggle(asset)}
      disabled={disabled}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleMouseEnter}
      onTouchEnd={handleMouseLeave}
      className={cn(
        'relative aspect-[9/16] rounded-xl overflow-hidden border-2 transition-all',
        isSelected
          ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-lg shadow-amber-500/20'
          : 'border-transparent hover:border-amber-500/30',
        disabled && 'opacity-50 pointer-events-none'
      )}
    >
      {/* Thumbnail: video or image */}
      {isVideo ? (
        <>
          <video
            ref={videoRef}
            src={asset.video_url!}
            poster={asset.image_url}
            muted
            loop
            playsInline
            preload="none"
            className="w-full h-full object-cover"
          />
          {/* Play icon overlay when not hovering */}
          {!isHovering && (
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
          className="w-full h-full object-cover"
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
