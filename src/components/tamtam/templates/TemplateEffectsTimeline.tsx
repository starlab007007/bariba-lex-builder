/**
 * TemplateEffectsTimeline - Visual timeline for template effects
 * Shows beat-sync, transitions, particles, and other effect markers
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Zap, Sparkles, Volume2, Type, Image, Layers } from 'lucide-react';
import { Effect, EffectType } from '@/components/tamtam/creator/TemplateSystem/types';
import { cn } from '@/lib/utils';

interface TemplateEffectsTimelineProps {
  effects: Effect[];
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
}

const EFFECT_ICONS: Record<EffectType, React.ElementType> = {
  'lens-flare': Sparkles,
  'light-leak': Zap,
  '3d-object': Layers,
  'particles': Sparkles,
  'text': Type,
  'transition': Image,
  'texture': Layers,
  'color-grade': Image,
  'sticker': Image,
};

const EFFECT_COLORS: Record<EffectType, string> = {
  'lens-flare': 'bg-yellow-400',
  'light-leak': 'bg-purple-400',
  '3d-object': 'bg-blue-400',
  'particles': 'bg-pink-400',
  'text': 'bg-green-400',
  'transition': 'bg-orange-400',
  'texture': 'bg-cyan-400',
  'color-grade': 'bg-indigo-400',
  'sticker': 'bg-rose-400',
};

interface TimelineMarker {
  id: string;
  type: EffectType;
  startTime: number;
  endTime: number;
  label: string;
}

export function TemplateEffectsTimeline({
  effects,
  duration,
  currentTime,
  onSeek
}: TemplateEffectsTimelineProps) {
  // Convert effects to timeline markers
  const markers = useMemo<TimelineMarker[]>(() => {
    return effects.map((effect, index) => {
      let startTime = 0;
      let endTime = duration;
      
      if (effect.config.timeRange) {
        startTime = effect.config.timeRange[0];
        endTime = effect.config.timeRange[1];
      } else if (effect.trigger === 'beat') {
        // For beat-triggered effects, show as periodic markers
        startTime = 0;
        endTime = duration;
      } else if (effect.trigger === 'always') {
        startTime = 0;
        endTime = duration;
      }
      
      return {
        id: effect.id || `effect-${index}`,
        type: effect.type,
        startTime,
        endTime,
        label: effect.type.replace('-', ' ')
      };
    });
  }, [effects, duration]);

  // Group markers by type for better visualization
  const groupedMarkers = useMemo(() => {
    const groups: Record<string, TimelineMarker[]> = {};
    markers.forEach(marker => {
      if (!groups[marker.type]) {
        groups[marker.type] = [];
      }
      groups[marker.type].push(marker);
    });
    return groups;
  }, [markers]);

  // Generate tick marks
  const ticks = useMemo(() => {
    const tickCount = Math.min(Math.ceil(duration / 5), 10);
    return Array.from({ length: tickCount + 1 }, (_, i) => {
      const time = (duration / tickCount) * i;
      return {
        time,
        label: `${Math.floor(time)}s`
      };
    });
  }, [duration]);

  const currentPosition = (currentTime / duration) * 100;

  return (
    <div className="space-y-3">
      {/* Timeline Container */}
      <div 
        className="relative h-24 bg-muted/30 rounded-xl overflow-hidden cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const percentage = x / rect.width;
          onSeek(percentage * duration);
        }}
      >
        {/* Tick Marks */}
        <div className="absolute inset-x-0 top-0 h-4 flex">
          {ticks.map((tick, index) => (
            <div
              key={index}
              className="flex-1 border-l border-muted-foreground/20 relative"
            >
              <span className="absolute top-1 left-1 text-[10px] text-muted-foreground">
                {tick.label}
              </span>
            </div>
          ))}
        </div>

        {/* Effect Tracks */}
        <div className="absolute inset-x-0 top-5 bottom-2 flex flex-col gap-1 px-1">
          {Object.entries(groupedMarkers).slice(0, 4).map(([type, typeMarkers], trackIndex) => {
            const Icon = EFFECT_ICONS[type as EffectType] || Sparkles;
            const color = EFFECT_COLORS[type as EffectType] || 'bg-primary';
            
            return (
              <div key={type} className="flex-1 relative flex items-center">
                {/* Track Label */}
                <div className="w-16 flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                  <Icon className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate capitalize">{type.replace('-', ' ')}</span>
                </div>
                
                {/* Track Bar */}
                <div className="flex-1 relative h-4 bg-muted/50 rounded-sm overflow-hidden">
                  {typeMarkers.map((marker, i) => {
                    const left = (marker.startTime / duration) * 100;
                    const width = ((marker.endTime - marker.startTime) / duration) * 100;
                    
                    return (
                      <motion.div
                        key={marker.id}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: trackIndex * 0.1 + i * 0.05 }}
                        className={cn(
                          "absolute top-0 bottom-0 rounded-sm opacity-70 hover:opacity-100 transition-opacity",
                          color
                        )}
                        style={{
                          left: `${left}%`,
                          width: `${Math.max(width, 2)}%`,
                          transformOrigin: 'left'
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Playhead */}
        <motion.div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
          style={{ left: `${currentPosition}%` }}
          animate={{ left: `${currentPosition}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Playhead Handle */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-md" />
        </motion.div>
      </div>

      {/* Effect Type Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(groupedMarkers).slice(0, 6).map(([type]) => {
          const Icon = EFFECT_ICONS[type as EffectType] || Sparkles;
          const color = EFFECT_COLORS[type as EffectType] || 'bg-primary';
          
          return (
            <div
              key={type}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted text-xs"
            >
              <div className={cn("w-2 h-2 rounded-full", color)} />
              <span className="capitalize text-muted-foreground">{type.replace('-', ' ')}</span>
            </div>
          );
        })}
      </div>

      {/* Beat Sync Indicator */}
      {effects.some(e => e.trigger === 'beat') && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm">
          <Volume2 className="w-4 h-4" />
          <span>Ce template utilise la synchronisation audio (Beat-Sync)</span>
        </div>
      )}
    </div>
  );
}
