/**
 * IntegratedPreviewMode.tsx
 * Enhanced preview mode with effects timeline and export connection
 * ✅ Phase 6-7: Effects timeline, OptimizedExportScreen connection, PublishScreen flow
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Send, 
  Save, 
  ChevronLeft,
  Music,
  Type,
  Sparkles,
  Check,
  Sliders,
  Download,
  Share2,
  Layers,
  Clock,
  Wand2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UnifiedTemplate } from '@/types/UnifiedTemplateTypes';
import { cn } from '@/lib/utils';

interface VideoSegment {
  id: string;
  blob: Blob;
  duration: number;
  timestamp?: number;
}

interface EffectMarker {
  id: string;
  type: 'light-leak' | 'particles' | 'lens-flare' | 'transition' | 'beat';
  startTime: number;
  endTime: number;
  name: string;
  color: string;
}

interface IntegratedPreviewModeProps {
  segments: VideoSegment[];
  template: UnifiedTemplate | null;
  previewBlob?: Blob;
  onBack: () => void;
  onRetake: () => void;
  onPublish: () => void;
  onSaveDraft?: () => void;
  onAddText?: () => void;
  onAddMusic?: () => void;
  onExport?: (quality: 'low' | 'medium' | 'high') => void;
  effectMarkers?: EffectMarker[];
}

// Effect type colors
const EFFECT_COLORS: Record<string, string> = {
  'light-leak': 'from-orange-500 to-amber-400',
  'particles': 'from-cyan-500 to-blue-400',
  'lens-flare': 'from-yellow-500 to-orange-400',
  'transition': 'from-purple-500 to-pink-400',
  'beat': 'from-red-500 to-rose-400',
};

// Effects Timeline Component
const EffectsTimeline: React.FC<{
  duration: number;
  currentTime: number;
  effects: EffectMarker[];
  onSeek: (time: number) => void;
}> = ({ duration, currentTime, effects, onSeek }) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  
  const handleClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    onSeek(percent * duration);
  };

  return (
    <div className="px-4 py-3 bg-black/60 backdrop-blur-xl border-t border-white/10">
      <div className="flex items-center gap-2 mb-2">
        <Layers className="w-4 h-4 text-white/60" />
        <span className="text-xs text-white/60">Timeline des effets</span>
        <span className="text-xs text-primary ml-auto">
          {effects.length} effet{effects.length > 1 ? 's' : ''}
        </span>
      </div>
      
      <div 
        ref={timelineRef}
        className="relative h-12 bg-muted/30 rounded-xl overflow-hidden cursor-pointer"
        onClick={handleClick}
      >
        {/* Effect markers */}
        {effects.map((effect) => {
          const startPercent = (effect.startTime / duration) * 100;
          const widthPercent = ((effect.endTime - effect.startTime) / duration) * 100;
          
          return (
            <motion.div
              key={effect.id}
              className={cn(
                "absolute top-1 bottom-1 rounded-lg bg-gradient-to-r opacity-70 hover:opacity-100 transition-opacity",
                EFFECT_COLORS[effect.type] || 'from-gray-500 to-gray-400'
              )}
              style={{
                left: `${startPercent}%`,
                width: `${Math.max(widthPercent, 2)}%`,
              }}
              whileHover={{ scale: 1.05 }}
            >
              <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white font-medium truncate px-1">
                {effect.name}
              </span>
            </motion.div>
          );
        })}
        
        {/* Current time indicator */}
        <motion.div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg shadow-white/50"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        />
        
        {/* Time markers */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 pb-0.5">
          <span className="text-[8px] text-white/40">0s</span>
          <span className="text-[8px] text-white/40">{Math.round(duration / 2)}s</span>
          <span className="text-[8px] text-white/40">{Math.round(duration)}s</span>
        </div>
      </div>
    </div>
  );
};

// Quality Selector Component
const QualitySelector: React.FC<{
  selected: 'low' | 'medium' | 'high';
  onSelect: (quality: 'low' | 'medium' | 'high') => void;
}> = ({ selected, onSelect }) => {
  const options = [
    { id: 'low', label: 'Rapide', sublabel: '480p', icon: '⚡' },
    { id: 'medium', label: 'Équilibré', sublabel: '720p', icon: '✨' },
    { id: 'high', label: 'HD', sublabel: '1080p', icon: '🎬' },
  ] as const;

  return (
    <div className="flex gap-2">
      {options.map((option) => (
        <Button
          key={option.id}
          variant={selected === option.id ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSelect(option.id)}
          className={cn(
            "flex-1 flex-col h-auto py-2 rounded-xl",
            selected === option.id && "bg-gradient-to-r from-primary to-orange-500 border-0"
          )}
        >
          <span className="text-lg">{option.icon}</span>
          <span className="text-xs font-medium">{option.label}</span>
          <span className="text-[10px] opacity-70">{option.sublabel}</span>
        </Button>
      ))}
    </div>
  );
};

export const IntegratedPreviewMode: React.FC<IntegratedPreviewModeProps> = ({
  segments,
  template,
  previewBlob,
  onBack,
  onRetake,
  onPublish,
  onSaveDraft,
  onAddText,
  onAddMusic,
  onExport,
  effectMarkers = [],
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showEffectsTimeline, setShowEffectsTimeline] = useState(false);
  const [showQualityOptions, setShowQualityOptions] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const [isMuted, setIsMuted] = useState(false);

  // Generate mock effect markers from template
  const generatedEffectMarkers = useMemo<EffectMarker[]>(() => {
    if (effectMarkers.length > 0) return effectMarkers;
    if (!template) return [];

    const markers: EffectMarker[] = [];
    const d = duration || template.duration || 30;

    // Add effects based on template configuration
    if (template.kuaishouEffects?.sparkles) {
      markers.push({
        id: 'sparkles-1',
        type: 'particles',
        startTime: 0,
        endTime: d,
        name: 'Sparkles',
        color: 'cyan'
      });
    }
    if (template.kuaishouEffects?.glow) {
      markers.push({
        id: 'glow-1',
        type: 'light-leak',
        startTime: 0,
        endTime: d * 0.3,
        name: 'Light Leak',
        color: 'orange'
      });
    }
    if (template.kuaishouEffects?.beatSync) {
      // Add beat markers
      const effects = template.kuaishouEffects as any;
      const bpm = effects?.bpm || 128;
      const beatInterval = 60 / bpm;
      for (let i = 0; i < d; i += beatInterval * 4) {
        markers.push({
          id: `beat-${i}`,
          type: 'beat',
          startTime: i,
          endTime: i + 0.2,
          name: 'Beat',
          color: 'red'
        });
      }
    }

    return markers;
  }, [template, duration, effectMarkers]);

  // ✅ FIX: Use useMemo to create stable preview URL
  const previewUrl = useMemo(() => {
    if (previewBlob && previewBlob.size > 0) {
      return URL.createObjectURL(previewBlob);
    } else if (segments.length > 0 && segments[0]?.blob && segments[0].blob.size > 0) {
      return URL.createObjectURL(segments[0].blob);
    }
    return '';
  }, [previewBlob, segments.length > 0 ? segments[0]?.blob : null]);

  // Cleanup URL on unmount or change
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle video time/state updates
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleEnded = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(console.warn);
    }
  }, [isPlaying]);

  const handleSeek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const handleExport = useCallback(() => {
    if (onExport) {
      onExport(selectedQuality);
    } else {
      // Direct to publish if no export handler
      onPublish();
    }
  }, [onExport, selectedQuality, onPublish]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  const totalDuration = useMemo(() => {
    const segmentDuration = segments.reduce((sum, s) => {
      const dur = Number(s.duration);
      return !isNaN(dur) && isFinite(dur) && dur > 0 ? sum + dur : sum;
    }, 0);
    
    const videoDuration = Number(duration);
    const finalDuration = segmentDuration > 0 
      ? segmentDuration 
      : (isFinite(videoDuration) && videoDuration > 0 ? videoDuration : 30);
    
    return Math.max(1, finalDuration);
  }, [segments, duration]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-black flex flex-col"
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between safe-area-top">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-10 px-4 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white hover:bg-black/60"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Retour
        </Button>

        {template && (
          <Badge 
            variant="secondary" 
            className="bg-black/60 backdrop-blur-xl border border-white/20 px-3 py-1.5"
          >
            <span className="text-lg mr-2">{template.emoji}</span>
            <span className="text-sm text-white">{template.name}</span>
            {template.isPremium && (
              <Sparkles className="w-3 h-3 ml-1.5 text-amber-400" />
            )}
          </Badge>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMuted(!isMuted)}
          className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-xl border border-white/10"
        >
          {isMuted ? '🔇' : '🔊'}
        </Button>
      </div>

      {/* Video Preview */}
      <div className="flex-1 relative">
        {previewUrl ? (
          <video
            ref={videoRef}
            src={previewUrl}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted={isMuted}
            loop
            onClick={togglePlayPause}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
            <p className="text-white/60">Aucun aperçu disponible</p>
          </div>
        )}

        {/* Play/Pause Overlay */}
        <AnimatePresence>
          {!isPlaying && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center"
              onClick={togglePlayPause}
            >
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center border border-white/30">
                <Play className="w-10 h-10 text-white ml-1" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Bar with time display */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="px-4 pb-2 flex items-center gap-2">
            <span className="text-xs text-white/80 font-mono">
              {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}
            </span>
            <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-white/80 font-mono">
              {Math.floor(totalDuration / 60)}:{String(Math.floor(totalDuration % 60)).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Template Effects Overlay */}
        {template && (
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: 'inset 0 0 80px rgba(255, 215, 0, 0.15)',
            }}
          />
        )}
      </div>

      {/* Effects Timeline (toggleable) */}
      <AnimatePresence>
        {showEffectsTimeline && generatedEffectMarkers.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <EffectsTimeline
              duration={totalDuration}
              currentTime={currentTime}
              effects={generatedEffectMarkers}
              onSeek={handleSeek}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline Thumbnails */}
      {segments.length > 1 && (
        <ScrollArea className="max-h-28">
          <div className="p-4 bg-black/80">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {segments.map((segment, index) => (
                <div
                  key={segment.id}
                  className="relative flex-shrink-0 w-16 h-24 rounded-lg overflow-hidden border-2 border-white/20 hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <video
                    src={URL.createObjectURL(segment.blob)}
                    className="w-full h-full object-cover"
                    muted
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5 text-center">
                    <span className="text-[10px] text-white">{segment.duration.toFixed(1)}s</span>
                  </div>
                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-[10px] text-white font-bold">{index + 1}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      )}

      {/* Quick Edit Tools */}
      <div className="px-4 py-3 bg-black/80 border-t border-white/10">
        <div className="flex items-center justify-center gap-3">
          {onAddText && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddText}
              className="flex flex-col items-center gap-1 h-auto py-2 px-3 hover:bg-white/10 rounded-xl"
            >
              <Type className="w-5 h-5 text-white" />
              <span className="text-[10px] text-white/70">Texte</span>
            </Button>
          )}
          
          {onAddMusic && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddMusic}
              className="flex flex-col items-center gap-1 h-auto py-2 px-3 hover:bg-white/10 rounded-xl"
            >
              <Music className="w-5 h-5 text-white" />
              <span className="text-[10px] text-white/70">Musique</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowEffectsTimeline(!showEffectsTimeline)}
            className={cn(
              "flex flex-col items-center gap-1 h-auto py-2 px-3 rounded-xl",
              showEffectsTimeline ? "bg-primary/20" : "hover:bg-white/10"
            )}
          >
            <Layers className="w-5 h-5 text-white" />
            <span className="text-[10px] text-white/70">Effets</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowQualityOptions(!showQualityOptions)}
            className={cn(
              "flex flex-col items-center gap-1 h-auto py-2 px-3 rounded-xl",
              showQualityOptions ? "bg-primary/20" : "hover:bg-white/10"
            )}
          >
            <Sliders className="w-5 h-5 text-white" />
            <span className="text-[10px] text-white/70">Qualité</span>
          </Button>
        </div>
      </div>

      {/* Quality Options Panel */}
      <AnimatePresence>
        {showQualityOptions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-3 bg-black/80"
          >
            <QualitySelector
              selected={selectedQuality}
              onSelect={setSelectedQuality}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Actions */}
      <div className="p-4 bg-black safe-area-bottom">
        <div className="flex items-center justify-between gap-3">
          {/* Retake */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onRetake}
            className="h-14 w-14 rounded-full bg-white/10 border border-white/20 hover:bg-white/20"
          >
            <RotateCcw className="w-6 h-6 text-white" />
          </Button>

          {/* Play/Pause */}
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlayPause}
            className="h-16 w-16 rounded-full bg-white/20 border-2 border-white/30 hover:bg-white/30"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 text-white" />
            ) : (
              <Play className="w-8 h-8 text-white ml-1" />
            )}
          </Button>

          {/* Save Draft */}
          {onSaveDraft && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onSaveDraft}
              className="h-14 w-14 rounded-full bg-white/10 border border-white/20 hover:bg-white/20"
            >
              <Save className="w-6 h-6 text-white" />
            </Button>
          )}

          {/* Publish/Export */}
          <Button
            onClick={handleExport}
            className="h-14 px-6 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-lg shadow-orange-500/30"
          >
            <Check className="w-5 h-5 mr-2" />
            Publier
          </Button>
        </div>

        {/* Duration Info */}
        <div className="mt-3 flex items-center justify-center gap-2 text-white/50 text-xs">
          <Clock className="w-3 h-3" />
          <span>Durée: <span className="font-medium text-white">{totalDuration.toFixed(1)}s</span></span>
          {segments.length > 1 && (
            <span>• {segments.length} segments</span>
          )}
          <span>• Qualité: <span className="text-primary">{selectedQuality.toUpperCase()}</span></span>
        </div>
      </div>
    </motion.div>
  );
};

export default IntegratedPreviewMode;
