/**
 * Style Selector Component
 * Choose animation style
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { ANIMATION_STYLES } from '@/engines/GriotAnimationEngine';

export type AnimationStyleName = 'traditional' | 'watercolor' | 'cutout' | 'fairytale';

interface StyleOption {
  id: AnimationStyleName;
  name: string;
  nameBa: string;
  emoji: string;
  description: string;
  gradient: string;
}

const STYLE_OPTIONS: StyleOption[] = [
  {
    id: 'traditional',
    name: 'Traditionnel',
    nameBa: 'Tíí bɔ̀ɔ̀rɛ̀',
    emoji: '🌅',
    description: 'Couleurs chaudes, grain film africain',
    gradient: 'from-amber-600 to-orange-700'
  },
  {
    id: 'watercolor',
    name: 'Aquarelle',
    nameBa: 'Kú sùrù',
    emoji: '🎨',
    description: 'Bords doux, couleurs fluides',
    gradient: 'from-blue-400 to-purple-500'
  },
  {
    id: 'cutout',
    name: 'Papier Découpé',
    nameBa: 'Tàkàdà',
    emoji: '✂️',
    description: 'Ombres portées, textures',
    gradient: 'from-amber-800 to-yellow-600'
  },
  {
    id: 'fairytale',
    name: 'Conte de Fées',
    nameBa: 'Kɔ̀gbɛ́ máàgì',
    emoji: '✨',
    description: 'Sparkles, monde onirique',
    gradient: 'from-pink-400 to-purple-600'
  }
];

interface StyleSelectorProps {
  selected: AnimationStyleName;
  onSelect: (style: AnimationStyleName) => void;
  disabled?: boolean;
}

export function StyleSelector({ selected, onSelect, disabled }: StyleSelectorProps) {
  return (
    <div className="w-full max-w-md mx-auto">
      <h3 className="text-sm font-medium text-amber-200/60 mb-3 text-center">
        🎨 Choisis un style
      </h3>
      
      <div className="grid grid-cols-2 gap-3">
        {STYLE_OPTIONS.map((style) => (
          <button
            key={style.id}
            onClick={() => onSelect(style.id)}
            disabled={disabled}
            className={cn(
              "relative p-4 rounded-xl border-2 transition-all text-left",
              "hover:scale-[1.02] active:scale-[0.98]",
              selected === style.id
                ? "border-amber-400 bg-amber-500/20"
                : "border-amber-500/20 bg-amber-950/20 hover:border-amber-500/40",
              disabled && "opacity-50 pointer-events-none"
            )}
          >
            {/* Background gradient */}
            <div 
              className={cn(
                "absolute inset-0 rounded-xl opacity-10 bg-gradient-to-br",
                style.gradient
              )} 
            />
            
            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{style.emoji}</span>
                <span className={cn(
                  "text-sm font-medium",
                  selected === style.id ? "text-amber-100" : "text-amber-200"
                )}>
                  {style.name}
                </span>
              </div>
              <p className="text-xs text-amber-200/50">
                {style.nameBa}
              </p>
            </div>

            {/* Selection indicator */}
            {selected === style.id && (
              <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-amber-400" />
            )}
          </button>
        ))}
      </div>

      {/* Preview hint */}
      <p className="text-xs text-amber-200/40 text-center mt-3">
        Le style influence les couleurs et les effets visuels
      </p>
    </div>
  );
}

export { STYLE_OPTIONS };
