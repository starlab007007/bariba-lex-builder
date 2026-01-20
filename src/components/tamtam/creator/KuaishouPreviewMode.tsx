/**
 * KuaishouPreviewMode.tsx
 * Mode prévisualisation avec timeline, effets Kuaishou et édition
 * Version: 2.0.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  Volume2,
  VolumeX,
  Scissors,
  Type,
  Music,
  Sticker,
  Wand2,
  Check,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { KuaishouTemplateConfig, VideoSegment, PreviewVideo } from '@/types/KuaishouTypes';
import { HybridRenderingEngine } from '@/engines/HybridRenderingEngine';
import { KuaishouEffectsOverlay } from './KuaishouEffects';
import { TemplateStepNavigator } from './TemplateStepNavigator';

interface KuaishouPreviewModeProps {
  template: KuaishouTemplateConfig;
  segments: VideoSegment[];
  onBack: () => void;
  onPublish: (video: PreviewVideo) => void;
  onEditSegment?: (index: number) => void;
}

type EditTool = 'trim' | 'text' | 'music' | 'stickers' | 'effects' | null;

export const KuaishouPreviewMode: React.FC<KuaishouPreviewModeProps> = ({
  template,
  segments,
  onBack,
  onPublish,
  onEditSegment
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(template.video.duration);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [activeTool, setActiveTool] = useState<EditTool>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [previewVideo, setPreviewVideo] = useState<PreviewVideo | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const renderEngineRef = useRef<HybridRenderingEngine | null>(null);

  // Initialize render engine
  useEffect(() => {
    renderEngineRef.current = new HybridRenderingEngine();

    // Listen for progress events
    const handleProgress = (e: CustomEvent) => {
      setRenderProgress(e.detail.progress);
    };

    window.addEventListener('rendering-progress', handleProgress as EventListener);

    return () => {
      renderEngineRef.current?.destroy();
      window.removeEventListener('rendering-progress', handleProgress as EventListener);
    };
  }, []);

  // Generate preview from captured segments
  useEffect(() => {
    const generatePreview = async () => {
      // If we have captured segments, create preview from them
      if (segments.length > 0) {
        setIsRendering(true);
        try {
          // Combine all segment blobs into one video
          const segmentBlobs = segments
            .filter(s => s.blob)
            .map(s => s.blob!);

          if (segmentBlobs.length > 0) {
            const combinedBlob = new Blob(segmentBlobs, { type: 'video/webm' });
            const totalDuration = segments.reduce((acc, s) => acc + (s.duration || 0), 0);
            
            setPreviewVideo({
              url: URL.createObjectURL(combinedBlob),
              duration: totalDuration > 0 ? totalDuration : template.video.duration,
              quality: 'preview',
              size: combinedBlob.size,
              readyTime: Date.now(),
              format: 'webm'
            });
            setDuration(totalDuration > 0 ? totalDuration : template.video.duration);
          }
        } catch (error) {
          console.error('Preview generation failed:', error);
        }
        setIsRendering(false);
      } else {
        // No segments yet - show placeholder or template preview
        setPreviewVideo(null);
      }
    };

    generatePreview();
  }, [segments, template]);

  // Playback controls
  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const handleSeek = useCallback((value: number[]) => {
    const time = value[0];
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  }, []);

  const handleRestart = useCallback(() => {
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setIsPlaying(true);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  }, [isMuted]);

  const handleVolumeChange = useCallback((value: number[]) => {
    const vol = value[0];
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
    }
  }, []);

  // Video time update
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Publish handler - Ensure blob is passed with the video
  const handlePublish = useCallback(async () => {
    if (previewVideo && segments.length > 0) {
      // Combine all segment blobs
      const segmentBlobs = segments
        .filter(s => s.blob)
        .map(s => s.blob!);
      
      if (segmentBlobs.length > 0) {
        const combinedBlob = new Blob(segmentBlobs, { type: 'video/webm' });
        // Add blob to previewVideo for downstream consumption
        const videoWithBlob = {
          ...previewVideo,
          blob: combinedBlob
        };
        console.log('📹 Publishing with blob:', combinedBlob.size, 'bytes');
        onPublish(videoWithBlob);
      } else {
        console.warn('⚠️ No blobs available for publish');
        onPublish(previewVideo);
      }
    } else if (previewVideo) {
      console.log('📹 Publishing without segments');
      onPublish(previewVideo);
    }
  }, [previewVideo, segments, onPublish]);

  // Format time
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get current segment index
  const getCurrentSegmentIndex = useCallback(() => {
    let elapsed = 0;
    for (let i = 0; i < template.segments.length; i++) {
      elapsed += template.segments[i].duration;
      if (currentTime < elapsed) return i;
    }
    return template.segments.length - 1;
  }, [currentTime, template.segments]);

  const editTools: { id: EditTool; icon: React.ReactNode; label: string }[] = [
    { id: 'trim', icon: <Scissors className="w-5 h-5" />, label: 'Couper' },
    { id: 'text', icon: <Type className="w-5 h-5" />, label: 'Texte' },
    { id: 'music', icon: <Music className="w-5 h-5" />, label: 'Musique' },
    { id: 'stickers', icon: <Sticker className="w-5 h-5" />, label: 'Stickers' },
    { id: 'effects', icon: <Wand2 className="w-5 h-5" />, label: 'Effets' }
  ];

  return (
    <div className="fixed inset-0 bg-black flex flex-col h-[100dvh] overflow-hidden">
      {/* Header - Fixed */}
      <div className="shrink-0 flex items-center justify-between p-4 bg-black/80 backdrop-blur-sm border-b border-white/10">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-white">
          <ArrowLeft className="w-6 h-6" />
        </Button>

        <div className="text-center">
          <h2 className="text-white font-semibold text-lg">Prévisualisation</h2>
          <p className="text-white/60 text-xs">Étape 3/4 • Vérification</p>
        </div>

        <Button
          onClick={handlePublish}
          disabled={isRendering || !previewVideo}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Check className="w-4 h-4 mr-2" />
          Publier
        </Button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Video Preview */}
        <div className="relative flex items-center justify-center bg-black min-h-[50vh]">
        {isRendering ? (
          <div className="text-center">
            <div className="mb-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"
              />
            </div>
            <p className="text-white mb-2">Génération du preview...</p>
            <Progress value={renderProgress} className="w-48 mx-auto" />
            <p className="text-white/60 text-sm mt-2">{renderProgress.toFixed(0)}%</p>
          </div>
        ) : previewVideo ? (
          <div className="relative w-full max-w-sm aspect-[9/16]">
            <video
              ref={videoRef}
              src={previewVideo.url}
              className="w-full h-full object-contain rounded-lg"
              playsInline
              muted={isMuted}
              onClick={togglePlay}
            />

            {/* Kuaishou Effects Overlay */}
            {template.kuaishouEffects && (
              <KuaishouEffectsOverlay
                effects={template.kuaishouEffects}
                currentTime={currentTime}
                duration={duration}
                isRecording={false}
              />
            )}

            {/* Play/Pause Overlay */}
            <AnimatePresence>
              {!isPlaying && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
                  onClick={togglePlay}
                >
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Play className="w-8 h-8 text-white fill-white" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Current segment indicator */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <Badge variant="secondary" className="bg-black/70 text-white">
                Segment {getCurrentSegmentIndex() + 1}/{template.segments.length}
              </Badge>
              {template.kuaishouEffects && (
                <Badge variant="secondary" className="bg-amber-500/80 text-white">
                  🐴 Premium
                </Badge>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center text-white/60 flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-muted/20 flex items-center justify-center">
              <Play className="w-12 h-12 text-muted-foreground" />
            </div>
            <p>Aucune vidéo capturée</p>
            <p className="text-sm">Retourne à la capture pour enregistrer des segments</p>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-black/80 p-4">
        {/* Time display */}
        <div className="flex justify-between text-xs text-white/60 mb-2">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Seek slider */}
        <Slider
          value={[currentTime]}
          min={0}
          max={duration}
          step={0.1}
          onValueChange={handleSeek}
          className="mb-4"
        />

        {/* Segment indicators */}
        <div className="flex gap-1 mb-4">
          {template.segments.map((seg, index) => {
            const segmentStart = template.segments
              .slice(0, index)
              .reduce((acc, s) => acc + s.duration, 0);
            const segmentWidth = (seg.duration / duration) * 100;
            const isActive = getCurrentSegmentIndex() === index;
            const isUserCapture = seg.type === 'user_capture' || seg.type === 'photo_slot';

            return (
              <motion.div
                key={seg.id}
                className={`h-8 rounded cursor-pointer transition-all ${
                  isActive
                    ? 'ring-2 ring-primary'
                    : selectedSegment === index
                    ? 'ring-2 ring-white/50'
                    : ''
                } ${
                  isUserCapture
                    ? 'bg-primary/60'
                    : 'bg-white/20'
                }`}
                style={{ width: `${segmentWidth}%` }}
                onClick={() => {
                  setSelectedSegment(index);
                  handleSeek([segmentStart]);
                }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="h-full flex items-center justify-center">
                  <span className="text-[10px] text-white/80 truncate px-1">
                    {seg.id}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRestart}
            className="text-white"
          >
            <RotateCcw className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlay}
            className="text-white w-14 h-14 rounded-full bg-white/10"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 fill-white" />
            )}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="text-white"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              min={0}
              max={1}
              step={0.1}
              onValueChange={handleVolumeChange}
              className="w-20"
            />
          </div>
        </div>
      </div>

      {/* Edit Tools */}
      <div className="bg-muted/10 border-t border-border">
        <div className="flex justify-around p-2">
          {editTools.map(tool => (
            <Button
              key={tool.id}
              variant={activeTool === tool.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id)}
              className="flex-col h-auto py-2 text-white"
            >
              {tool.icon}
              <span className="text-[10px] mt-1">{tool.label}</span>
            </Button>
          ))}
        </div>

        {/* Tool Panel */}
        <AnimatePresence>
          {activeTool && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 border-t border-border">
                {activeTool === 'trim' && (
                  <div className="text-center text-white/60">
                    <p>Sélectionne un segment pour le couper</p>
                  </div>
                )}
                {activeTool === 'text' && (
                  <div className="text-center text-white/60">
                    <p>Ajoute du texte à ta vidéo</p>
                    <Button variant="outline" size="sm" className="mt-2">
                      + Nouveau texte
                    </Button>
                  </div>
                )}
                {activeTool === 'music' && (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 text-white">
                      <Music className="w-4 h-4" />
                      <span className="text-sm">{template.music?.title || 'Aucune musique'}</span>
                    </div>
                    <Button variant="outline" size="sm" className="mt-2">
                      Changer la musique
                    </Button>
                  </div>
                )}
                {activeTool === 'stickers' && (
                  <div className="text-center text-white/60">
                    <p>Stickers et emojis</p>
                    <div className="flex justify-center gap-2 mt-2">
                      {['🔥', '✨', '💯', '❤️', '😂', '🎉'].map(emoji => (
                        <button
                          key={emoji}
                          className="text-2xl hover:scale-125 transition-transform"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {activeTool === 'effects' && (
                  <div className="text-center text-white/60">
                    <p>Effets visuels</p>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {['Vintage', 'Glow', 'B&W', 'Warm'].map(effect => (
                        <Button
                          key={effect}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          {effect}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fixed Bottom Navigation */}
      <div className="shrink-0 bg-black/95 backdrop-blur-lg border-t border-white/10 p-4 pb-[env(safe-area-inset-bottom)]">
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={onBack}
            className="flex-1 h-12 text-base border-white/20 text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Retour
          </Button>
          <Button 
            onClick={handlePublish}
            disabled={isRendering || !previewVideo}
            className="flex-1 h-12 text-base bg-green-600 hover:bg-green-700 text-white"
          >
            Publier
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
};

export default KuaishouPreviewMode;
