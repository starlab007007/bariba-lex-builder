/**
 * TemplatePreviewFullscreen - Voice-First Immersive Preview Modal
 * Features: Large controls, emoji UI, minimal text, audio cues
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Play, Pause, Volume2, VolumeX, Settings, Download, Share2,
  Crown, Clock, Eye, Heart, ChevronLeft, Sparkles, CheckCircle2, Loader2
} from 'lucide-react';
import { Template, TemplateCategory, Effect } from '@/components/tamtam/creator/TemplateSystem/types';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useTemplateAssets } from '@/hooks/useTemplateAssets';
import { TemplateEffectsTimeline } from './TemplateEffectsTimeline';

interface TemplatePreviewFullscreenProps {
  template: Template;
  onClose: () => void;
  onUse: () => void;
  onDownload: () => void;
}

const CATEGORY_EMOJIS: Record<TemplateCategory, string> = {
  storytelling: '📖',
  music: '🎵',
  business: '💼',
  education: '📚',
  future: '🚀',
};

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  storytelling: 'from-orange-400 to-rose-500',
  music: 'from-purple-400 to-pink-500',
  business: 'from-blue-400 to-cyan-500',
  education: 'from-green-400 to-emerald-500',
  future: 'from-violet-400 to-purple-500',
};

const QUALITY_OPTIONS = [
  { value: '480p', label: '480p', emoji: '📱' },
  { value: '720p', label: '720p', emoji: '💻' },
  { value: '1080p', label: '1080p', emoji: '📺' },
];

export function TemplatePreviewFullscreen({
  template,
  onClose,
  onUse,
  onDownload
}: TemplatePreviewFullscreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(template.duration || 30);
  const [quality, setQuality] = useState('720p');
  const [showSettings, setShowSettings] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  
  const { downloadAssets, getProgress } = useTemplateAssets();
  const progressData = getProgress(template.id);
  const progress = progressData?.progress || 0;
  const isReady = progressData?.status === 'ready';
  const [isDownloading, setIsDownloading] = useState(false);

  const categoryEmoji = CATEGORY_EMOJIS[template.category] || '✨';
  const categoryColor = CATEGORY_COLORS[template.category] || 'from-primary to-accent';

  // Video playback
  useEffect(() => {
    if (!videoRef.current || !template.demoVideo) return;
    
    const video = videoRef.current;
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    if (isPlaying) video.play().catch(() => {});
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [template.demoVideo, isPlaying]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if ('vibrate' in navigator) navigator.vibrate(30);
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleSeek = useCallback((value: number[]) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = value[0];
    setCurrentTime(value[0]);
  }, []);

  const handleDownloadAssets = useCallback(async () => {
    if (isDownloading) return;
    if ('vibrate' in navigator) navigator.vibrate(50);
    setIsDownloading(true);
    try {
      const manifest = {};
      await downloadAssets(template.id, manifest);
    } finally {
      setIsDownloading(false);
    }
  }, [template.id, downloadAssets, isDownloading]);

  const handleClose = useCallback(() => {
    if ('vibrate' in navigator) navigator.vibrate(20);
    onClose();
  }, [onClose]);

  const handleUse = useCallback(() => {
    if ('vibrate' in navigator) navigator.vibrate(50);
    onUse();
  }, [onUse]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/95"
    >
      {/* Mobile-First Layout */}
      <div className="h-full flex flex-col md:flex-row">
        
        {/* Video Section */}
        <div className="flex-1 relative flex items-center justify-center p-4 md:p-6">
          
          {/* Back Button - Large Touch Target */}
          <button
            onClick={handleClose}
            className="absolute top-4 left-4 z-20 flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md text-white active:scale-95 transition-transform min-h-[48px]"
            aria-label="Retour"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Retour</span>
          </button>

          {/* Video Container */}
          <div className="relative w-full max-w-xs md:max-w-sm aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl">
            
            {/* Background */}
            <div className={cn("absolute inset-0 bg-gradient-to-br", categoryColor)}>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-8xl opacity-20">{categoryEmoji}</span>
              </div>
            </div>

            {/* Thumbnail */}
            {template.thumbnail && !thumbnailError && !template.demoVideo && (
              <img
                src={template.thumbnail}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                onError={() => setThumbnailError(true)}
              />
            )}

            {/* Video */}
            {template.demoVideo && (
              <video
                ref={videoRef}
                src={template.demoVideo}
                muted={isMuted}
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

            {/* Top Info */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {template.isPremium && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-bold">
                    <Crown className="w-4 h-4" />
                    PRO
                  </div>
                )}
                <div className="px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-sm text-white text-sm font-medium">
                  {quality}
                </div>
              </div>
              
              {/* Settings */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-3 rounded-xl bg-black/40 backdrop-blur-sm text-white active:scale-95 transition-transform min-w-[48px] min-h-[48px] flex items-center justify-center"
                aria-label="Paramètres"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>

            {/* Settings Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-20 right-4 w-44 bg-black/80 backdrop-blur-md rounded-2xl p-3 space-y-1"
                >
                  <p className="text-white/70 text-xs font-medium mb-2 px-2">📺 Qualité</p>
                  {QUALITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setQuality(opt.value); setShowSettings(false); }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors min-h-[44px]",
                        quality === opt.value
                          ? "bg-primary text-white"
                          : "text-white hover:bg-white/10"
                      )}
                    >
                      <span>{opt.emoji}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Center Play Button */}
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center group"
              aria-label={isPlaying ? "Pause" : "Lecture"}
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={cn(
                  "p-5 rounded-full bg-white/20 backdrop-blur-md transition-opacity",
                  isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
                )}
              >
                {isPlaying ? (
                  <Pause className="w-10 h-10 text-white" />
                ) : (
                  <Play className="w-10 h-10 text-white ml-1" />
                )}
              </motion.div>
            </button>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
              {/* Progress */}
              <div className="space-y-1">
                <Slider
                  value={[currentTime]}
                  max={duration}
                  step={0.1}
                  onValueChange={handleSeek}
                  className="cursor-pointer"
                />
                <div className="flex justify-between text-white/70 text-xs font-medium">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Control Buttons - Large Touch Targets */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => { if ('vibrate' in navigator) navigator.vibrate(20); setIsMuted(!isMuted); }}
                  className="p-3 rounded-xl bg-white/10 backdrop-blur-sm text-white active:scale-95 transition-transform min-w-[48px] min-h-[48px] flex items-center justify-center"
                  aria-label={isMuted ? "Activer le son" : "Couper le son"}
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => { if ('vibrate' in navigator) navigator.vibrate(30); setIsLiked(!isLiked); }}
                    className={cn(
                      "p-3 rounded-xl backdrop-blur-sm active:scale-95 transition-all min-w-[48px] min-h-[48px] flex items-center justify-center",
                      isLiked ? "bg-red-500 text-white" : "bg-white/10 text-white"
                    )}
                    aria-label={isLiked ? "Retirer des favoris" : "Ajouter aux favoris"}
                  >
                    <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
                  </button>
                  <button 
                    className="p-3 rounded-xl bg-white/10 backdrop-blur-sm text-white active:scale-95 transition-transform min-w-[48px] min-h-[48px] flex items-center justify-center"
                    aria-label="Partager"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Panel - Scrollable on Mobile */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="w-full md:w-80 lg:w-96 bg-gradient-to-b from-background to-background/95 p-5 overflow-y-auto max-h-[45vh] md:max-h-full rounded-t-3xl md:rounded-none"
        >
          {/* Header with Emoji */}
          <div className="mb-5">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-4xl">{categoryEmoji}</span>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-foreground truncate">{template.name}</h2>
                {template.nameBa && (
                  <p className="text-muted-foreground text-sm truncate">{template.nameBa}</p>
                )}
              </div>
            </div>

            {/* Quick Stats with Emojis */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted text-sm">
                ⏱️ {template.duration || 30}s
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted text-sm">
                👁️ {template.usageCount || 0}
              </div>
              {template.isPremium && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-bold">
                  👑 Premium
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="mb-5">
            <p className="text-muted-foreground text-sm leading-relaxed">
              {template.description}
            </p>
            {template.descriptionBa && (
              <p className="text-muted-foreground text-sm leading-relaxed mt-2 italic opacity-80">
                🇧🇯 {template.descriptionBa}
              </p>
            )}
          </div>

          {/* Effects with Emojis */}
          <div className="mb-5">
            <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
              ✨ Effets inclus
            </h3>
            <div className="flex flex-wrap gap-2">
              {template.effects.slice(0, 5).map((effect, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-sm font-medium"
                >
                  <Sparkles className="w-3 h-3" />
                  {effect.type.replace('-', ' ')}
                </div>
              ))}
              {template.effects.length > 5 && (
                <div className="px-3 py-1.5 rounded-xl bg-muted text-muted-foreground text-sm">
                  +{template.effects.length - 5}
                </div>
              )}
            </div>
          </div>

          {/* Effects Timeline - Desktop */}
          <div className="hidden md:block mb-5">
            <TemplateEffectsTimeline 
              effects={template.effects}
              duration={duration}
              currentTime={currentTime}
              onSeek={(time) => handleSeek([time])}
            />
          </div>

          {/* Asset Status */}
          <div className="mb-5 p-4 rounded-2xl bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-foreground flex items-center gap-2">
                🎬 Assets 4K
              </span>
              {isReady ? (
                <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Prêt ✓
                </div>
              ) : (
                <span className="text-muted-foreground text-sm font-medium">
                  {Math.round(progress)}%
                </span>
              )}
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-accent-cyan"
                initial={{ width: 0 }}
                animate={{ width: `${isReady ? 100 : progress}%` }}
              />
            </div>
            {!isReady && (
              <button
                onClick={handleDownloadAssets}
                disabled={isDownloading}
                className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/10 text-primary text-sm font-bold active:scale-98 transition-transform disabled:opacity-50 min-h-[48px]"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Téléchargement...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    📥 Télécharger
                  </>
                )}
              </button>
            )}
          </div>

          {/* Action Buttons - Large Touch Targets */}
          <div className="space-y-3 sticky bottom-0 pt-3 bg-gradient-to-t from-background via-background to-transparent">
            <Button
              onClick={handleUse}
              size="lg"
              className="w-full h-14 text-base font-bold bg-gradient-to-r from-primary to-accent-violet active:scale-98 transition-transform rounded-2xl"
            >
              <Play className="w-5 h-5 mr-2" />
              🎬 Utiliser ce template
            </Button>
            
            <div className="flex gap-3">
              <Button
                onClick={onDownload}
                variant="outline"
                size="lg"
                className="flex-1 h-12 rounded-xl active:scale-98 transition-transform"
              >
                <Download className="w-4 h-4 mr-2" />
                📥
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="flex-1 h-12 rounded-xl active:scale-98 transition-transform"
              >
                <Share2 className="w-4 h-4 mr-2" />
                📤
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
