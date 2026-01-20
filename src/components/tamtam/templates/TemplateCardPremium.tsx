/**
 * TemplateCardPremium - Voice-First Inclusive Template Card
 * Features: Large touch targets, emoji-based UI, minimal text dependency
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Eye, Crown, Zap, Clock, 
  Volume2, VolumeX, CheckCircle2
} from 'lucide-react';
import { Template, TemplateCategory } from '@/components/tamtam/creator/TemplateSystem/types';
import { cn } from '@/lib/utils';
import { useTemplateAssets } from '@/hooks/useTemplateAssets';

interface TemplateCardPremiumProps {
  template: Template;
  isHovered: boolean;
  onPreview: () => void;
  onUse: () => void;
  viewMode: 'grid' | 'list';
}

// Category emojis for voice-first design
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

export function TemplateCardPremium({
  template,
  isHovered,
  onPreview,
  onUse,
  viewMode
}: TemplateCardPremiumProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [thumbnailError, setThumbnailError] = useState(false);
  
  const { getProgress } = useTemplateAssets();
  const progressData = getProgress(template.id);
  const assetProgress = progressData?.progress || 0;
  const isReady = progressData?.status === 'ready';

  const categoryEmoji = CATEGORY_EMOJIS[template.category] || '✨';
  const categoryColor = CATEGORY_COLORS[template.category] || 'from-primary to-accent';

  // Handle video playback on hover/touch
  useEffect(() => {
    if (!videoRef.current || !template.demoVideo) return;
    
    if (isHovered) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isHovered, template.demoVideo]);

  // Toggle mute with haptic feedback
  const handleToggleMute = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if ('vibrate' in navigator) navigator.vibrate(20);
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  }, [isMuted]);

  // Handle preview with haptic
  const handlePreview = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if ('vibrate' in navigator) navigator.vibrate(30);
    onPreview();
  }, [onPreview]);

  // Handle use with haptic
  const handleUse = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if ('vibrate' in navigator) navigator.vibrate(50);
    onUse();
  }, [onUse]);

  // ===== GRID VIEW =====
  if (viewMode === 'grid') {
    return (
      <motion.div
        whileHover={{ scale: 1.02, y: -3 }}
        whileTap={{ scale: 0.98 }}
        className="relative group cursor-pointer touch-manipulation"
        onClick={handlePreview}
      >
        {/* Card Container - 9:16 Aspect Ratio */}
        <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-muted shadow-lg group-hover:shadow-xl transition-shadow duration-200">
          
          {/* Background Gradient with Emoji */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-br",
            categoryColor
          )}>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-7xl opacity-25">{categoryEmoji}</span>
            </div>
          </div>

          {/* Thumbnail */}
          {template.thumbnail && !thumbnailError && (
            <img
              src={template.thumbnail}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => setThumbnailError(true)}
              loading="lazy"
            />
          )}

          {/* Video Preview on Hover */}
          <AnimatePresence>
            {isHovered && template.demoVideo && (
              <motion.video
                ref={videoRef}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                src={template.demoVideo}
                muted={isMuted}
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                onLoadedData={() => setVideoLoaded(true)}
              />
            )}
          </AnimatePresence>

          {/* Light Effect on Hover */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.35 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at 25% 25%, rgba(255,255,255,0.4) 0%, transparent 45%)',
                  mixBlendMode: 'overlay'
                }}
              />
            )}
          </AnimatePresence>

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

          {/* Top Badges */}
          <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
            {/* Premium/New Badge */}
            {template.isPremium ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold shadow-lg"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>PRO</span>
              </motion.div>
            ) : template.isNew ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs font-bold shadow-lg"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>NEW</span>
              </motion.div>
            ) : (
              <div />
            )}

            {/* Category Emoji Badge */}
            <div className="text-2xl bg-black/40 backdrop-blur-sm rounded-xl px-2 py-1">
              {categoryEmoji}
            </div>
          </div>

          {/* Duration Badge */}
          {template.duration && (
            <div className="absolute top-2 right-14 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-white text-xs font-medium">
              <Clock className="w-3 h-3" />
              <span>{template.duration}s</span>
            </div>
          )}

          {/* Bottom Content */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            {/* Template Name - Short and Clear */}
            <h3 className="text-white font-bold text-base line-clamp-1 mb-0.5">
              {template.name}
            </h3>
            {template.nameBa && (
              <p className="text-white/70 text-xs line-clamp-1 mb-2">
                {template.nameBa}
              </p>
            )}

            {/* Action Buttons - Always Visible on Mobile, Hover on Desktop */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ 
                opacity: isHovered ? 1 : 0.9, 
                y: isHovered ? 0 : 0 
              }}
              className="flex gap-2"
            >
              <button
                onClick={handlePreview}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/25 backdrop-blur-md text-white text-sm font-medium active:scale-95 transition-transform min-h-[44px]"
                aria-label="Aperçu du template"
              >
                <Eye className="w-4 h-4" />
                <span className="hidden xs:inline">Voir</span>
                <span className="text-lg xs:hidden">👁️</span>
              </button>
              <button
                onClick={handleUse}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg active:scale-95 transition-transform min-h-[44px]"
                aria-label="Utiliser ce template"
              >
                <Play className="w-4 h-4" />
                <span>Utiliser</span>
              </button>
            </motion.div>

            {/* Asset Progress */}
            {assetProgress > 0 && assetProgress < 100 && (
              <div className="mt-2">
                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${assetProgress}%` }}
                  />
                </div>
                <p className="text-white/60 text-xs mt-1 text-center">
                  ⏳ {Math.round(assetProgress)}%
                </p>
              </div>
            )}
          </div>

          {/* Ready Indicator */}
          {isReady && (
            <div className="absolute bottom-[88px] right-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/90 text-white text-xs font-medium">
                <CheckCircle2 className="w-3 h-3" />
                <span>✓</span>
              </div>
            </div>
          )}

          {/* Mute Toggle */}
          {isHovered && template.demoVideo && videoLoaded && (
            <button
              onClick={handleToggleMute}
              className="absolute bottom-[88px] left-2 p-2.5 rounded-xl bg-black/50 backdrop-blur-sm text-white active:scale-95 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label={isMuted ? "Activer le son" : "Couper le son"}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // ===== LIST VIEW =====
  return (
    <motion.div
      whileHover={{ scale: 1.01, x: 3 }}
      whileTap={{ scale: 0.99 }}
      className="flex items-center gap-3 p-3 rounded-2xl bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md transition-all cursor-pointer border border-white/50 touch-manipulation"
      onClick={handlePreview}
    >
      {/* Thumbnail with Emoji Fallback */}
      <div className={cn(
        "relative w-16 h-24 sm:w-20 sm:h-28 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br",
        categoryColor
      )}>
        {template.thumbnail && !thumbnailError ? (
          <img
            src={template.thumbnail}
            alt=""
            className="w-full h-full object-cover"
            onError={() => setThumbnailError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl opacity-60">{categoryEmoji}</span>
          </div>
        )}
        
        {/* Premium Badge */}
        {template.isPremium && (
          <div className="absolute top-1 left-1 p-1 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500">
            <Crown className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-foreground text-base truncate">{template.name}</h3>
              <span className="text-lg flex-shrink-0">{categoryEmoji}</span>
            </div>
            {template.nameBa && (
              <p className="text-xs text-muted-foreground truncate">{template.nameBa}</p>
            )}
          </div>
        </div>
        
        {/* Meta with emojis */}
        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
          {template.duration && (
            <span className="flex items-center gap-1">
              ⏱️ {template.duration}s
            </span>
          )}
          {template.usageCount !== undefined && (
            <span className="flex items-center gap-1">
              👁️ {template.usageCount}
            </span>
          )}
        </div>
      </div>

      {/* Action Button - Large Touch Target */}
      <button
        onClick={handleUse}
        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white text-sm font-bold shadow-md active:scale-95 transition-transform min-h-[48px]"
        aria-label="Utiliser ce template"
      >
        <Play className="w-5 h-5" />
        <span className="hidden sm:inline">Utiliser</span>
      </button>
    </motion.div>
  );
}
