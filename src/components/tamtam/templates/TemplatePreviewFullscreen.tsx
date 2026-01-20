/**
 * TemplatePreviewFullscreen - Immersive 4K template preview modal
 * Features: 1080x1920 player, effects timeline, quality selector, bilingual info
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Play, Pause, Volume2, VolumeX, Settings, Download, Share2,
  Crown, Zap, Clock, Eye, Heart, ChevronRight, Sparkles, Music,
  Film, Briefcase, GraduationCap, Rocket, CheckCircle2, Loader2
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

const QUALITY_OPTIONS = [
  { value: '480p', label: '480p', description: 'Rapide' },
  { value: '720p', label: '720p', description: 'Standard' },
  { value: '1080p', label: '1080p', description: 'HD' },
];

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  storytelling: 'from-orange-400 to-rose-500',
  music: 'from-purple-400 to-pink-500',
  business: 'from-blue-400 to-cyan-500',
  education: 'from-green-400 to-emerald-500',
  future: 'from-violet-400 to-purple-500',
};

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
  
  const { downloadAssets, getProgress, isTemplateReady } = useTemplateAssets();
  const progress = getProgress(template.id);
  const isReady = isTemplateReady(template.id);
  const [isDownloading, setIsDownloading] = useState(false);

  // Handle video playback
  useEffect(() => {
    if (!videoRef.current || !template.demoVideo) return;
    
    const video = videoRef.current;
    
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    if (isPlaying) {
      video.play().catch(() => {});
    }
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [template.demoVideo, isPlaying]);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // Seek video
  const handleSeek = useCallback((value: number[]) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = value[0];
    setCurrentTime(value[0]);
  }, []);

  // Download assets
  const handleDownloadAssets = useCallback(async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadAssets(template.id);
    } finally {
      setIsDownloading(false);
    }
  }, [template.id, downloadAssets, isDownloading]);

  // Format time
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
      className="fixed inset-0 z-50 bg-black/95 flex flex-col md:flex-row"
    >
      {/* Video Player Section */}
      <div className="flex-1 relative flex items-center justify-center p-4 md:p-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-20 p-2 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Video Container - 9:16 Aspect Ratio */}
        <div className="relative w-full max-w-sm aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl">
          {/* Background Gradient */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-br",
            CATEGORY_COLORS[template.category]
          )}>
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-20 h-20 text-white/20" />
            </div>
          </div>

          {/* Thumbnail */}
          {template.thumbnail && !thumbnailError && !template.demoVideo && (
            <img
              src={template.thumbnail}
              alt={template.name}
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

          {/* Light Leak Overlay */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.4) 0%, transparent 40%), radial-gradient(ellipse at 70% 80%, rgba(147,51,234,0.3) 0%, transparent 40%)',
              mixBlendMode: 'screen'
            }}
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

          {/* Top Bar */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            {/* Quality Badge */}
            <div className="flex items-center gap-2">
              {template.isPremium && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-semibold">
                  <Crown className="w-3 h-3" />
                  PRO
                </div>
              )}
              <div className="px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-medium">
                {quality}
              </div>
            </div>

            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-16 right-4 w-48 bg-black/80 backdrop-blur-md rounded-xl p-3 space-y-2"
              >
                <p className="text-white/70 text-xs font-medium mb-2">Qualité vidéo</p>
                {QUALITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setQuality(opt.value); setShowSettings(false); }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                      quality === opt.value
                        ? "bg-primary text-white"
                        : "text-white hover:bg-white/10"
                    )}
                  >
                    <span>{opt.label}</span>
                    <span className="text-xs opacity-70">{opt.description}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Center Play Button */}
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center group"
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "p-4 rounded-full bg-white/20 backdrop-blur-md transition-opacity",
                isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
              )}
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 text-white" />
              ) : (
                <Play className="w-8 h-8 text-white ml-1" />
              )}
            </motion.div>
          </button>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
            {/* Progress Bar */}
            <div className="space-y-1">
              <Slider
                value={[currentTime]}
                max={duration}
                step={0.1}
                onValueChange={handleSeek}
                className="cursor-pointer"
              />
              <div className="flex justify-between text-white/70 text-xs">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-colors"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setIsLiked(!isLiked)}
                  className={cn(
                    "p-2 rounded-full backdrop-blur-sm transition-colors",
                    isLiked ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
                  )}
                >
                  <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
                </button>
                <button className="p-2 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-colors">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Effects Timeline - Below video on mobile */}
        <div className="absolute bottom-0 left-0 right-0 md:hidden p-4">
          <TemplateEffectsTimeline 
            effects={template.effects}
            duration={duration}
            currentTime={currentTime}
            onSeek={(time) => handleSeek([time])}
          />
        </div>
      </div>

      {/* Info Panel */}
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full md:w-96 bg-gradient-to-b from-background to-background-soft p-6 overflow-y-auto max-h-[40vh] md:max-h-full"
      >
        {/* Template Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{template.name}</h2>
              {template.nameBa && (
                <p className="text-muted-foreground">{template.nameBa}</p>
              )}
            </div>
            {template.isPremium && (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-semibold shadow-lg">
                <Crown className="w-4 h-4" />
                Premium
              </div>
            )}
          </div>

          {/* Meta Info */}
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              {template.duration || 30}s
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Eye className="w-4 h-4" />
              {template.usageCount || 0} vues
            </div>
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs text-white bg-gradient-to-r",
              CATEGORY_COLORS[template.category]
            )}>
              <Sparkles className="w-3 h-3" />
              {template.category}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-2">Description</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {template.description}
          </p>
          {template.descriptionBa && (
            <p className="text-muted-foreground text-sm leading-relaxed mt-2 italic">
              🇧🇯 {template.descriptionBa}
            </p>
          )}
        </div>

        {/* Effects Preview */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">Effets inclus</h3>
          <div className="flex flex-wrap gap-2">
            {template.effects.slice(0, 6).map((effect, index) => (
              <div
                key={index}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm"
              >
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="capitalize">{effect.type.replace('-', ' ')}</span>
              </div>
            ))}
            {template.effects.length > 6 && (
              <div className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                +{template.effects.length - 6} autres
              </div>
            )}
          </div>
        </div>

        {/* Effects Timeline - Desktop */}
        <div className="hidden md:block mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">Timeline des effets</h3>
          <TemplateEffectsTimeline 
            effects={template.effects}
            duration={duration}
            currentTime={currentTime}
            onSeek={(time) => handleSeek([time])}
          />
        </div>

        {/* Asset Status */}
        <div className="mb-6 p-4 rounded-xl bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Assets 4K Envato</span>
            {isReady ? (
              <div className="flex items-center gap-1 text-green-600 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Prêt
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">
                {Math.round(progress)}%
              </span>
            )}
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
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
              className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Téléchargement...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Télécharger les assets
                </>
              )}
            </button>
          )}
        </div>

        {/* Tags */}
        {template.metadata?.tags && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-foreground mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {template.metadata.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 sticky bottom-0 bg-gradient-to-t from-background pt-4">
          <Button
            onClick={onUse}
            size="lg"
            className="w-full bg-gradient-to-r from-primary to-accent-violet hover:opacity-90 text-white font-semibold shadow-lg"
          >
            <Play className="w-5 h-5 mr-2" />
            Utiliser ce template
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
          
          <div className="flex gap-3">
            <Button
              onClick={onDownload}
              variant="outline"
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger
            </Button>
            <Button
              variant="outline"
              className="flex-1"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Partager
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
