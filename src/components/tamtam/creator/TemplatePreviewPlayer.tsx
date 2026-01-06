// TemplatePreviewPlayer.tsx
// Video/Audio preview component for AI Templates

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, Clock, Sparkles, Check } from "lucide-react";
import { AdvancedTemplate, formatDuration } from "./AdvancedTemplateData";
import { useFrenchTTS } from "@/hooks/useFrenchTTS";
import { useBaribaTTS } from "@/hooks/useBaribaTTS";
import { cn } from "@/lib/utils";

interface TemplatePreviewPlayerProps {
  template: AdvancedTemplate;
  isActive: boolean;
  onSelect: () => void;
  onPreviewStart?: () => void;
  onPreviewEnd?: () => void;
  language?: 'fr' | 'ba';
  autoPlay?: boolean;
}

const TemplatePreviewPlayer: React.FC<TemplatePreviewPlayerProps> = ({
  template,
  isActive,
  onSelect,
  onPreviewStart,
  onPreviewEnd,
  language = 'fr',
  autoPlay = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDescribing, setIsDescribing] = useState(false);
  
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  
  const { speak: speakFr, stop: stopFr, isSpeaking: isSpeakingFr } = useFrenchTTS();
  const { speak: speakBa, stop: stopBa, isSpeaking: isSpeakingBa } = useBaribaTTS();

  const speak = language === 'ba' ? speakBa : speakFr;
  const stop = language === 'ba' ? stopBa : stopFr;
  const isSpeaking = language === 'ba' ? isSpeakingBa : isSpeakingFr;

  // Get feature badges
  const getFeatureBadges = () => {
    const badges: { icon: string; label: string }[] = [];
    if (template.features.beatSync) badges.push({ icon: '🎵', label: 'Beat-Sync' });
    if (template.features.smartCaptions) badges.push({ icon: '💬', label: 'Sous-titres' });
    if (template.features.translation) badges.push({ icon: '🌍', label: 'Traduction' });
    if (template.features.audioEnhance) badges.push({ icon: '🔊', label: 'Audio+' });
    if (template.features.narrativeStructure) badges.push({ icon: '📖', label: 'Narration' });
    if (template.features.styleTransfer) badges.push({ icon: '🎨', label: 'Style' });
    if (template.features.photoAnimation) badges.push({ icon: '✨', label: 'Animation' });
    return badges.slice(0, 4);
  };

  // Animation loop for preview
  const startPreviewAnimation = useCallback(() => {
    setIsPlaying(true);
    onPreviewStart?.();
    startTimeRef.current = Date.now();
    
    const PREVIEW_DURATION = 5000; // 5 seconds preview
    
    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const p = Math.min(elapsed / PREVIEW_DURATION, 1);
      setProgress(p);
      
      if (p < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
        setProgress(0);
        onPreviewEnd?.();
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
  }, [onPreviewStart, onPreviewEnd]);

  // Stop preview
  const stopPreview = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsPlaying(false);
    setProgress(0);
    onPreviewEnd?.();
  }, [onPreviewEnd]);

  // Speak description
  const speakDescription = useCallback(() => {
    if (isSpeaking) {
      stop();
      setIsDescribing(false);
    } else {
      const text = language === 'ba' && template.description_ba
        ? `${template.label_ba || template.label_fr}. ${template.description_ba}`
        : `${template.label_fr}. ${template.description_fr}`;
      speak(text);
      setIsDescribing(true);
    }
  }, [template, language, speak, stop, isSpeaking]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      stop();
    };
  }, [stop]);

  // Auto-play on active (for swipe preview)
  useEffect(() => {
    if (autoPlay && isActive && !isPlaying) {
      startPreviewAnimation();
    }
  }, [autoPlay, isActive, isPlaying, startPreviewAnimation]);

  // Update isDescribing state based on isSpeaking
  useEffect(() => {
    if (!isSpeaking && isDescribing) {
      setIsDescribing(false);
    }
  }, [isSpeaking, isDescribing]);

  const badges = getFeatureBadges();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "relative rounded-xl sm:rounded-2xl overflow-hidden transition-all",
        isActive && "ring-2 ring-white shadow-[0_0_20px_rgba(255,255,255,0.15)]"
      )}
    >
      {/* Background Gradient */}
      <div className={cn("absolute inset-0 bg-gradient-to-br", template.color)} />

      {/* Animated Background Effect */}
      <motion.div
        className="absolute inset-0 bg-white/10"
        animate={{
          opacity: isPlaying
            ? [0.1, 0.3, 0.1]
            : template.previewAnimation === 'pulse'
            ? [0.05, 0.15, 0.05]
            : 0.05,
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Content */}
      <div className="relative z-10 p-3 sm:p-4">
        {/* Header: Emoji + Labels */}
        <div className="flex items-start justify-between">
          <motion.span 
            className="text-3xl sm:text-4xl"
            animate={isPlaying ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          >
            {template.emoji}
          </motion.span>
          
          {/* Voice Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              speakDescription();
            }}
            className={cn(
              "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center",
              isDescribing
                ? "bg-white text-black"
                : "bg-black/30 text-white"
            )}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" />
            ) : (
              <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </motion.button>
        </div>

        {/* Title & Description */}
        <h3 className="mt-2 font-bold text-white text-sm sm:text-base leading-tight">
          {template.label_fr}
        </h3>
        {template.label_ba && (
          <p className="text-white/60 text-[10px] sm:text-xs">{template.label_ba}</p>
        )}
        <p className="mt-1 text-white/80 text-xs sm:text-sm line-clamp-2 leading-snug">
          {template.description_fr}
        </p>

        {/* Feature Badges - Scrollable on mobile */}
        <div className="mt-2 sm:mt-3 flex gap-1 sm:gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          {badges.map((badge, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-black/30 text-white text-[10px] sm:text-xs whitespace-nowrap flex-shrink-0"
            >
              <span>{badge.icon}</span>
              <span className="opacity-80">{badge.label}</span>
            </span>
          ))}
        </div>

        {/* Durations */}
        <div className="mt-2 sm:mt-3 flex items-center gap-1 sm:gap-1.5 flex-wrap">
          <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white/60" />
          {template.supportedDurations.slice(0, 4).map((dur) => (
            <span
              key={dur}
              className="text-[10px] sm:text-xs text-white/70 bg-white/10 px-1.5 sm:px-2 py-0.5 rounded"
            >
              {formatDuration(dur)}
            </span>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mt-3 sm:mt-4 flex gap-1.5 sm:gap-2">
          {/* Preview Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              if (isPlaying) {
                stopPreview();
              } else {
                startPreviewAnimation();
              }
            }}
            className="flex-1 h-9 sm:h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center gap-1.5 text-white"
          >
            {isPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm font-medium">Arrêter</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm font-medium">Aperçu</span>
              </>
            )}
          </motion.button>

          {/* Select Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onSelect}
            className="flex-1 h-9 sm:h-11 rounded-full bg-white text-black flex items-center justify-center gap-1.5 font-semibold"
          >
            <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Utiliser</span>
          </motion.button>
        </div>

        {/* Progress Bar (when playing) */}
        <AnimatePresence>
          {isPlaying && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-2 sm:mt-3 h-1 rounded-full bg-black/30 overflow-hidden"
            >
              <motion.div
                className="h-full bg-white"
                style={{ width: `${progress * 100}%` }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Voice Instructions Indicator */}
      {template.voiceInstructions.length > 0 && (
        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-black/40 backdrop-blur-sm flex items-center gap-0.5 sm:gap-1">
          <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-400" />
          <span className="text-[9px] sm:text-[10px] text-white/80">
            {template.voiceInstructions.length} étapes
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default TemplatePreviewPlayer;
