/**
 * IntegratedPreviewMode.tsx
 * Mode preview intégré dans FullscreenCreator après capture avec template
 * ✅ FIX: useMemo for previewUrl to prevent infinite loop, robust duration calculation
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
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UnifiedTemplate } from '@/types/UnifiedTemplateTypes';

interface VideoSegment {
  id: string;
  blob: Blob;
  duration: number;
  timestamp?: number;
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
}

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
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // ✅ FIX: Use useMemo to create stable preview URL - prevents infinite loops
  const previewUrl = useMemo(() => {
    if (previewBlob && previewBlob.size > 0) {
      console.log('🎬 Creating preview URL from previewBlob:', previewBlob.size, previewBlob.type);
      return URL.createObjectURL(previewBlob);
    } else if (segments.length > 0 && segments[0]?.blob && segments[0].blob.size > 0) {
      console.log('🎬 Creating preview URL from segment:', segments[0].blob.size, segments[0].blob.type);
      return URL.createObjectURL(segments[0].blob);
    }
    console.warn('⚠️ No valid blob for preview');
    return '';
  }, [previewBlob, segments.length > 0 ? segments[0]?.blob : null]);

  // Cleanup URL on unmount or change
  useEffect(() => {
    return () => {
      if (previewUrl) {
        console.log('🧹 Revoking preview URL');
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle video time/state updates
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => {
      console.log('📹 Video metadata loaded, duration:', video.duration);
      setDuration(video.duration);
    };
    const handleEnded = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = (e: any) => {
      console.error('❌ Video error:', e);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
    };
  }, []);

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(e => console.warn('Play failed:', e));
    }
  }, [isPlaying]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  // ✅ FIX: Robust duration calculation with NaN/Infinity checks
  const totalDuration = useMemo(() => {
    const segmentDuration = segments.reduce((sum, s) => {
      const dur = Number(s.duration);
      return !isNaN(dur) && isFinite(dur) && dur > 0 ? sum + dur : sum;
    }, 0);
    
    const videoDuration = Number(duration);
    const finalDuration = segmentDuration > 0 
      ? segmentDuration 
      : (isFinite(videoDuration) && videoDuration > 0 ? videoDuration : 30);
    
    console.log('📏 Total duration:', finalDuration, '(segments:', segmentDuration, ', video:', videoDuration, ')');
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
          </Badge>
        )}

        <div className="w-24" /> {/* Spacer */}
      </div>

      {/* Video Preview */}
      <div className="flex-1 relative">
        {previewUrl ? (
          <video
            ref={videoRef}
            src={previewUrl}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted={false}
            loop
            onClick={togglePlayPause}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
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

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
            style={{ width: `${progress}%` }}
          />
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

      {/* Timeline Thumbnails */}
      {segments.length > 1 && (
        <div className="p-4 bg-black/80">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {segments.map((segment, index) => (
              <div
                key={segment.id}
                className="relative flex-shrink-0 w-16 h-24 rounded-lg overflow-hidden border-2 border-white/20"
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
      )}

      {/* Quick Edit Tools */}
      <div className="px-4 py-3 bg-black/80 border-t border-white/10">
        <div className="flex items-center justify-center gap-4">
          {onAddText && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddText}
              className="flex flex-col items-center gap-1 h-auto py-2 px-4 hover:bg-white/10"
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
              className="flex flex-col items-center gap-1 h-auto py-2 px-4 hover:bg-white/10"
            >
              <Music className="w-5 h-5 text-white" />
              <span className="text-[10px] text-white/70">Musique</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center gap-1 h-auto py-2 px-4 hover:bg-white/10"
          >
            <Sparkles className="w-5 h-5 text-white" />
            <span className="text-[10px] text-white/70">Effets</span>
          </Button>
        </div>
      </div>

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

          {/* Publish */}
          <Button
            onClick={onPublish}
            className="h-14 px-6 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold"
          >
            <Check className="w-5 h-5 mr-2" />
            Suivant
          </Button>
        </div>

        {/* Duration Info */}
        <div className="mt-3 flex items-center justify-center gap-2 text-white/50 text-xs">
          <span>Durée totale:</span>
          <span className="font-medium text-white">{totalDuration.toFixed(1)}s</span>
          {segments.length > 1 && (
            <span>• {segments.length} segments</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default IntegratedPreviewMode;
