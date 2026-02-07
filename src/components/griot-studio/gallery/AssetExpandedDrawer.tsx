/**
 * AssetExpandedDrawer — Full-screen drawer showing all assets
 * for the active category/type, with selection support.
 */

import React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AssetGridItem } from './AssetGridItem';
import type { LibraryAsset } from '../AssetGallery';

interface AssetExpandedDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: LibraryAsset[];
  selectedIds: Set<string>;
  selectionIndex: (id: string) => number;
  onToggle: (asset: LibraryAsset) => void;
  maxSelection: number;
  currentCount: number;
  assetType: 'photo' | 'video';
  disabled?: boolean;
}

export function AssetExpandedDrawer({
  open,
  onOpenChange,
  assets,
  selectedIds,
  selectionIndex,
  onToggle,
  maxSelection,
  currentCount,
  assetType,
  disabled,
}: AssetExpandedDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-black/95 border-amber-500/20 max-h-[85dvh]">
        <DrawerHeader className="flex items-center justify-between pb-2">
          <DrawerTitle className={cn(
            'text-base font-semibold',
            assetType === 'video' ? 'text-purple-100' : 'text-amber-100'
          )}>
            {assetType === 'video' ? '🎬 Vidéos' : '📸 Photos'} — {assets.length} disponibles
          </DrawerTitle>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="text-amber-200 hover:text-amber-100">
              <X className="w-5 h-5" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        {/* Selection counter */}
        {currentCount > 0 && (
          <div className="px-4 pb-2">
            <span className={cn(
              'text-xs font-bold px-2.5 py-1 rounded-full',
              assetType === 'video'
                ? 'bg-purple-500/20 text-purple-200'
                : 'bg-amber-500/20 text-amber-200'
            )}>
              {currentCount}/{maxSelection} sélectionnés
            </span>
          </div>
        )}

        {/* Grid */}
        <div className="overflow-y-auto px-4 pb-8 pt-2">
          <div className="grid grid-cols-3 gap-2">
            {assets.map(asset => (
              <AssetGridItem
                key={asset.id}
                asset={asset}
                isSelected={selectedIds.has(asset.id)}
                selectionIndex={selectionIndex(asset.id)}
                onToggle={onToggle}
                disabled={disabled || (!selectedIds.has(asset.id) && currentCount >= maxSelection)}
              />
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
