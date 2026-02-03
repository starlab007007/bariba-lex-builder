/**
 * Anime Style Selector Component
 * Choose illustration style for the animated story
 */

import React from 'react';
import { cn } from '@/lib/utils';

export type AnimeStyleName = 'manga' | 'chibi' | 'fantasy' | 'african';

interface StyleOption {
  id: AnimeStyleName;
  name: string;
  nameBa: string;
  emoji: string;
  description: string;
  gradient: string;
  preview: string;
}

const ANIME_STYLES: StyleOption[] = [
  {
    id: 'manga',
    name: 'Manga',
    nameBa: 'Bɛ́ɛ̀ manga',
    emoji: '🎌',
    description: 'Style manga japonais classique',
    gradient: 'from-slate-600 to-slate-800',
    preview: 'Noir & blanc, contrastes forts'
  },
  {
    id: 'chibi',
    name: 'Chibi',
    nameBa: 'Bíkíkɛ̀',
    emoji: '😊',
    description: 'Mignon et expressif',
    gradient: 'from-pink-400 to-rose-500',
    preview: 'Personnages adorables, kawaii'
  },
  {
    id: 'fantasy',
    name: 'Fantasy',
    nameBa: 'Màgì',
    emoji: '✨',
    description: 'Épique et magique',
    gradient: 'from-purple-500 to-indigo-600',
    preview: 'Décors féeriques, magie'
  },
  {
    id: 'african',
    name: 'Conte Africain',
    nameBa: 'Àfríkà',
    emoji: '🌍',
    description: 'Fusion africaine + anime',
    gradient: 'from-amber-500 to-orange-600',
    preview: 'Motifs tribaux, couleurs chaudes'
  }
];

interface AnimeStyleSelectorProps {
  selected: AnimeStyleName;
  onSelect: (style: AnimeStyleName) => void;
  disabled?: boolean;
}

export function AnimeStyleSelector({ selected, onSelect, disabled }: AnimeStyleSelectorProps) {
  return (
    <div className="w-full max-w-md mx-auto">
      <h3 className="text-sm font-medium text-amber-200/60 mb-3 text-center">
        🎨 Style des illustrations
      </h3>
      
      <div className="grid grid-cols-2 gap-3">
        {ANIME_STYLES.map((style) => (
          <button
            key={style.id}
            onClick={() => onSelect(style.id)}
            disabled={disabled}
            className={cn(
              "relative p-4 rounded-xl border-2 transition-all text-left",
              "hover:scale-[1.02] active:scale-[0.98]",
              selected === style.id
                ? "border-amber-400 bg-amber-500/20 shadow-lg shadow-amber-500/20"
                : "border-amber-500/20 bg-amber-950/20 hover:border-amber-500/40",
              disabled && "opacity-50 pointer-events-none"
            )}
          >
            {/* Background gradient */}
            <div 
              className={cn(
                "absolute inset-0 rounded-xl opacity-20 bg-gradient-to-br",
                style.gradient
              )} 
            />
            
            <div className="relative">
              {/* Header with emoji and name */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{style.emoji}</span>
                <div>
                  <span className={cn(
                    "text-sm font-semibold block",
                    selected === style.id ? "text-amber-100" : "text-amber-200"
                  )}>
                    {style.name}
                  </span>
                  <span className="text-xs text-amber-200/40">
                    {style.nameBa}
                  </span>
                </div>
              </div>
              
              {/* Description */}
              <p className="text-xs text-amber-200/60 line-clamp-2">
                {style.description}
              </p>
              
              {/* Preview hint */}
              <div className="mt-2 flex items-center gap-1">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  style.id === 'manga' && "bg-slate-400",
                  style.id === 'chibi' && "bg-pink-400",
                  style.id === 'fantasy' && "bg-purple-400",
                  style.id === 'african' && "bg-amber-400"
                )} />
                <span className="text-[10px] text-amber-200/40">
                  {style.preview}
                </span>
              </div>
            </div>

            {/* Selection indicator */}
            {selected === style.id && (
              <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center">
                <span className="text-[10px] text-black font-bold">✓</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Style preview text */}
      <p className="text-xs text-amber-200/40 text-center mt-4">
        L'IA génère {selected === 'african' ? 'des illustrations style conte africain' : 
                     selected === 'manga' ? 'des illustrations manga noir & blanc' :
                     selected === 'chibi' ? 'des personnages chibi mignons' :
                     'des illustrations fantasy magiques'}
      </p>
    </div>
  );
}

export { ANIME_STYLES };
