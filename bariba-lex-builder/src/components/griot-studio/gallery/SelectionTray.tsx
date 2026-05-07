/**
 * SelectionTray — Fixed bottom tray showing selected media thumbnails.
 * Mobile-first: horizontal scroll, quick remove, clear all.
 */

import React from 'react';
import { X, Trash2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LibraryAsset } from '../AssetGallery';

interface SelectionTrayProps {
  selectedAssets: LibraryAsset[];
  maxSelection: number;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  disabled?: boolean;
}

export function SelectionTray({ selectedAssets, maxSelection, onRemove, onClearAll, disabled }: SelectionTrayProps) {
  if (selectedAssets.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 border-t border-amber-500/20 backdrop-blur-md safe-area-bottom">
      <div className="px-3 py-2 max-w-xl mx-auto">
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-amber-200">
            ✅ {selectedAssets.length}/{maxSelection} sélectionnés
          </span>
          <button
            onClick={onClearAll}
            disabled={disabled}
            className="text-[11px] text-red-400/70 hover:text-red-300 flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Tout retirer
          </button>
        </div>

        {/* Thumbnails — horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {selectedAssets.map((asset, idx) => (
            <div key={asset.id} className="relative flex-shrink-0 w-12 h-16 rounded-md overflow-hidden border border-amber-500/30">
              <img
                src={asset.image_url}
                alt=""
                className="w-full h-full object-cover"
              />
              {/* Index badge */}
              <div className="absolute top-0 left-0 bg-amber-500 text-black text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-br-md">
                {idx + 1}
              </div>
              {/* Remove button */}
              <button
                onClick={() => onRemove(asset.id)}
                disabled={disabled}
                className="absolute top-0 right-0 bg-black/70 rounded-bl-md p-0.5"
              >
                <X className="w-3 h-3 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
