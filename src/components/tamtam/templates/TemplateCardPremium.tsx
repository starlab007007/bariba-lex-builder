/**
 * TemplateCardPremium - Immersive 9:16 template card with Envato effects
 * Features: Video preview on hover, light leak overlay, animated badges
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Eye, Download, Sparkles, Crown, Zap, Clock, 
  Music, Film, Briefcase, GraduationCap, Rocket, Volume2, VolumeX,
  CheckCircle2, Loader2
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

const CATEGORY_ICONS: Record<TemplateCategory, React.ElementType> = {
  storytelling: Film,
  music: Music,
  business: Briefcase,
  education: GraduationCap,
  future: Rocket,
};

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  storytelling: 'from-orange-400 to-rose-500',
  music: 'from-purple-400 to-pink-500',
  business: 'from-blue-400 to-cyan-500',
  education: 'from-green-400 to-emerald-500',
  future: 'from-violet-400 to-purple-500',
};

// Generate gradient background based on template
function getTemplateGradient(template: Template): string {
  const colors = CATEGORY_COLORS[template.category] || 'from-primary to-accent';
  return `bg-gradient-to-br ${colors}`;
}

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
  
  const { getProgress, isTemplateReady } = useTemplateAssets();
  const assetProgress = getProgress(template.id);
  const isReady = isTemplateReady(template.id);

  const CategoryIcon = CATEGORY_ICONS[template.category] || Sparkles;

  // Handle video playback on hover
  useEffect(() => {
    if (!videoRef.current || !template.demoVideo) return;
    
    if (isHovered) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isHovered, template.demoVideo]);

  // Toggle mute
  const handleToggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  }, [isMuted]);

  // Grid card view
  if (viewMode === 'grid') {
    return (
      <motion.div
        whileHover={{ scale: 1.02, y: -4 }}
        whileTap={{ scale: 0.98 }}
        className="relative group cursor-pointer"
        onClick={onPreview}
      >
        {/* Card Container - 9:16 Aspect Ratio */}
        <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-gradient-to-br from-muted to-muted/50 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
          
          {/* Background - Gradient or Thumbnail */}
          <div className={cn(
            "absolute inset-0 transition-opacity duration-500",
            getTemplateGradient(template)
          )}>
            {/* Template Emoji as fallback */}
            <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-30">
              {template.category === 'music' ? '🎵' : 
               template.category === 'storytelling' ? '📖' :
               template.category === 'business' ? '💼' :
               template.category === 'education' ? '📚' : '🚀'}
            </div>
          </div>

          {/* Thumbnail Image */}
          {template.thumbnail && !thumbnailError && (
            <img
              src={template.thumbnail}
              alt={template.name}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
              onError={() => setThumbnailError(true)}
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

          {/* Light Leak Overlay - Only on hover */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at 20% 20%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(147,51,234,0.2) 0%, transparent 50%)',
                  mixBlendMode: 'screen'
                }}
              />
            )}
          </AnimatePresence>

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Top Badges */}
          <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
            {/* Premium Badge */}
            {template.isPremium && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-semibold shadow-lg"
              >
                <Crown className="w-3 h-3" />
                <span>PRO</span>
              </motion.div>
            )}
            
            {/* New Badge */}
            {template.isNew && !template.isPremium && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs font-semibold shadow-lg"
              >
                <Zap className="w-3 h-3" />
                <span>NEW</span>
              </motion.div>
            )}

            {/* Category Badge */}
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-white text-xs font-medium shadow-md bg-gradient-to-r",
              CATEGORY_COLORS[template.category]
            )}>
              <CategoryIcon className="w-3 h-3" />
            </div>
          </div>

          {/* Duration Badge */}
          {template.duration && (
            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs">
              <Clock className="w-3 h-3" />
              <span>{template.duration}s</span>
            </div>
          )}

          {/* Bottom Content */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            {/* Template Name */}
            <h3 className="text-white font-semibold text-sm line-clamp-1 mb-0.5">
              {template.name}
            </h3>
            {template.nameBa && (
              <p className="text-white/70 text-xs line-clamp-1 mb-2">
                {template.nameBa}
              </p>
            )}

            {/* Action Buttons - Show on Hover */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex gap-2"
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); onPreview(); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/20 backdrop-blur-md text-white text-xs font-medium hover:bg-white/30 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Aperçu
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onUse(); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors shadow-lg"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Utiliser
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Asset Download Progress */}
            {assetProgress > 0 && assetProgress < 100 && (
              <div className="mt-2">
                <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${assetProgress}%` }}
                  />
                </div>
                <p className="text-white/60 text-xs mt-1 text-center">
                  Téléchargement {Math.round(assetProgress)}%
                </p>
              </div>
            )}

            {/* Ready Badge */}
            {isReady && (
              <div className="absolute bottom-3 right-3">
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/90 text-white text-xs">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Prêt</span>
                </div>
              </div>
            )}
          </div>

          {/* Mute Toggle for Video */}
          {isHovered && template.demoVideo && videoLoaded && (
            <button
              onClick={handleToggleMute}
              className="absolute bottom-14 right-3 p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // List view
  return (
    <motion.div
      whileHover={{ scale: 1.01, x: 4 }}
      whileTap={{ scale: 0.99 }}
      className="flex items-center gap-4 p-3 rounded-2xl bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all cursor-pointer border border-white/50"
      onClick={onPreview}
    >
      {/* Thumbnail */}
      <div className={cn(
        "relative w-20 h-28 rounded-xl overflow-hidden flex-shrink-0",
        getTemplateGradient(template)
      )}>
        {template.thumbnail && !thumbnailError ? (
          <img
            src={template.thumbnail}
            alt={template.name}
            className="w-full h-full object-cover"
            onError={() => setThumbnailError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl opacity-50">
            {template.category === 'music' ? '🎵' : 
             template.category === 'storytelling' ? '📖' :
             template.category === 'business' ? '💼' :
             template.category === 'education' ? '📚' : '🚀'}
          </div>
        )}
        
        {/* Badges */}
        {template.isPremium && (
          <div className="absolute top-1 left-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold">
            <Crown className="w-2.5 h-2.5" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-foreground line-clamp-1">{template.name}</h3>
            {template.nameBa && (
              <p className="text-xs text-muted-foreground line-clamp-1">{template.nameBa}</p>
            )}
          </div>
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-white text-xs bg-gradient-to-r",
            CATEGORY_COLORS[template.category]
          )}>
            <CategoryIcon className="w-3 h-3" />
            <span className="capitalize">{template.category}</span>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
          {template.description}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-3 mt-2">
          {template.duration && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {template.duration}s
            </span>
          )}
          {template.usageCount !== undefined && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="w-3 h-3" />
              {template.usageCount} utilisations
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onUse(); }}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors shadow-md"
        >
          <Play className="w-4 h-4" />
          Utiliser
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onPreview(); }}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
        >
          <Eye className="w-4 h-4" />
          Aperçu
        </button>
      </div>
    </motion.div>
  );
}
