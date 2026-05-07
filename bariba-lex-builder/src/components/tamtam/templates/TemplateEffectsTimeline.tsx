/**
 * TemplateEffectsTimeline - Visual Timeline with Emoji Indicators
 * Voice-First: Uses colors and emojis instead of text labels
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { Effect, EffectType } from '@/components/tamtam/creator/TemplateSystem/types';
import { cn } from '@/lib/utils';

interface TemplateEffectsTimelineProps {
  effects: Effect[];
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
}

// Emoji-based effect representation for voice-first design
const EFFECT_EMOJIS: Record<EffectType, string> = {
  'lens-flare': '✨',
  'light-leak': '🌈',
  '3d-object': '🎲',
  'particles': '💫',
  'text': '📝',
  'transition': '🔀',
  'texture': '🎨',
  'color-grade': '🖌️',
  'sticker': '🏷️',
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
  emoji: string;
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
      }
      
      return {
        id: effect.id || `effect-${index}`,
        type: effect.type,
        startTime,
        endTime,
        emoji: EFFECT_EMOJIS[effect.type] || '✨'
      };
    });
  }, [effects, duration]);

  // Group by type
  const groupedMarkers = useMemo(() => {
    const groups: Record<string, TimelineMarker[]> = {};
    markers.forEach(marker => {
      if (!groups[marker.type]) groups[marker.type] = [];
      groups[marker.type].push(marker);
    });
    return groups;
  }, [markers]);

  // Time ticks
  const ticks = useMemo(() => {
    const count = Math.min(Math.ceil(duration / 5), 8);
    return Array.from({ length: count + 1 }, (_, i) => ({
      time: (duration / count) * i,
      label: `${Math.floor((duration / count) * i)}s`
    }));
  }, [duration]);

  const currentPosition = (currentTime / duration) * 100;
  const hasBeatSync = effects.some(e => e.trigger === 'beat');

  return (
    <div className="space-y-3">
      {/* Timeline Container - Large Touch Target */}
      <div 
        className="relative h-20 md:h-24 bg-muted/30 rounded-2xl overflow-hidden cursor-pointer touch-manipulation"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const percentage = x / rect.width;
          if ('vibrate' in navigator) navigator.vibrate(15);
          onSeek(percentage * duration);
        }}
      >
        {/* Time Ticks */}
        <div className="absolute inset-x-0 top-0 h-5 flex">
          {ticks.map((tick, index) => (
            <div
              key={index}
              className="flex-1 border-l border-muted-foreground/20 relative"
            >
              <span className="absolute top-0.5 left-1 text-[10px] text-muted-foreground font-medium">
                {tick.label}
              </span>
            </div>
          ))}
        </div>

        {/* Effect Tracks */}
        <div className="absolute inset-x-0 top-6 bottom-2 flex flex-col gap-1 px-2">
          {Object.entries(groupedMarkers).slice(0, 3).map(([type, typeMarkers], trackIndex) => {
            const emoji = EFFECT_EMOJIS[type as EffectType] || '✨';
            const color = EFFECT_COLORS[type as EffectType] || 'bg-primary';
            
            return (
              <div key={type} className="flex-1 relative flex items-center min-h-[18px]">
                {/* Track Label - Emoji Only */}
                <div className="w-8 flex items-center justify-center text-base">
                  {emoji}
                </div>
                
                {/* Track Bar */}
                <div className="flex-1 relative h-4 bg-muted/50 rounded-lg overflow-hidden">
                  {typeMarkers.map((marker, i) => {
                    const left = (marker.startTime / duration) * 100;
                    const width = ((marker.endTime - marker.startTime) / duration) * 100;
                    
                    return (
                      <motion.div
                        key={marker.id}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: trackIndex * 0.08 + i * 0.03 }}
                        className={cn(
                          "absolute top-0 bottom-0 rounded-md opacity-75 hover:opacity-100 transition-opacity",
                          color
                        )}
                        style={{
                          left: `${left}%`,
                          width: `${Math.max(width, 3)}%`,
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
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-10 rounded-full"
          style={{ left: `${currentPosition}%` }}
          animate={{ left: `${currentPosition}%` }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        >
          <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-md" />
        </motion.div>
      </div>

      {/* Effect Legend - Emoji-Based */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(groupedMarkers).slice(0, 5).map(([type]) => {
          const emoji = EFFECT_EMOJIS[type as EffectType] || '✨';
          const color = EFFECT_COLORS[type as EffectType] || 'bg-primary';
          
          return (
            <div
              key={type}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-muted text-sm"
            >
              <div className={cn("w-2.5 h-2.5 rounded-full", color)} />
              <span>{emoji}</span>
            </div>
          );
        })}
      </div>

      {/* Beat Sync Indicator */}
      {hasBeatSync && (
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium"
        >
          <Volume2 className="w-4 h-4" />
          <span>🎵 Synchronisation audio (Beat-Sync)</span>
        </motion.div>
      )}
    </div>
  );
}
