/**
 * VideoPreviewModal — Fullscreen video preview before selection.
 * Plays the video so users can preview before choosing.
 */

import React, { useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LibraryAsset } from '../AssetGallery';

interface VideoPreviewModalProps {
  asset: LibraryAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSelected: boolean;
  onToggle: (asset: LibraryAsset) => void;
  disabled?: boolean;
}

export function VideoPreviewModal({
  asset,
  open,
  onOpenChange,
  isSelected,
  onToggle,
  disabled,
}: VideoPreviewModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (open && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
    if (!open && videoRef.current) {
      videoRef.current.pause();
    }
  }, [open]);

  if (!asset) return null;

  const videoSrc = asset.video_url || asset.image_url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/95 border-purple-500/30 p-0 max-w-md w-[95vw] overflow-hidden rounded-2xl">
        {/* Close */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-3 right-3 z-20 bg-black/60 rounded-full p-1.5 text-white/80 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Video */}
        <div className="relative w-full aspect-[9/16] bg-black">
          <video
            ref={videoRef}
            src={videoSrc}
            controls
            playsInline
            preload="auto"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Info + Select */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm text-purple-100 font-medium truncate max-w-[200px]">
                {asset.description_fr || asset.description_en}
              </p>
              <p className="text-[11px] text-purple-300/60">
                {asset.scene_type} • {asset.emotion}
                {asset.video_duration && ` • ${asset.video_duration.toFixed(0)}s`}
              </p>
            </div>

            <Button
              size="sm"
              disabled={disabled && !isSelected}
              onClick={() => {
                onToggle(asset);
                if (!isSelected) onOpenChange(false);
              }}
              className={cn(
                'gap-1.5 min-w-[120px]',
                isSelected
                  ? 'bg-amber-500 hover:bg-amber-600 text-black'
                  : 'bg-purple-600 hover:bg-purple-500 text-white'
              )}
            >
              {isSelected ? (
                <><Check className="w-4 h-4" /> Sélectionné</>
              ) : (
                <><Plus className="w-4 h-4" /> Sélectionner</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
