import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Download, Eye, Sparkles, Volume2, Loader2, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AnimationData {
  type: string;
  frames: string[];
  duration: number;
  fps: number;
}

interface AnimatedTemplateCardProps {
  template: {
    id: string;
    template_key: string;
    emoji: string;
    label_fr: string;
    label_ba?: string;
    description_fr: string;
    family: string;
    color: string;
    preview_image_url?: string;
    icon_url?: string;
    demo_video_url?: string;
    visual_generation_status?: string;
    usage_count?: number;
    is_featured?: boolean;
    storyboard_frames?: AnimationData | any;
    ai_storyboard?: { animation_frames?: string[] };
  };
  onSelect: () => void;
  onPreview: () => void;
  onDownload: () => void;
  onSpeak?: () => void;
  isGeneratingVisuals?: boolean;
  autoPlayVideo?: boolean;
}

export function AnimatedTemplateCard({
  template,
  onSelect,
  onPreview,
  onDownload,
  onSpeak,
  isGeneratingVisuals = false,
  autoPlayVideo = true
}: AnimatedTemplateCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract animation frames from template
  const animationFrames: string[] = 
    (template.storyboard_frames as AnimationData)?.frames || 
    template.ai_storyboard?.animation_frames || 
    [];
  
  const hasAnimationFrames = animationFrames.length > 1;
  const hasPreviewImage = template.preview_image_url && !imageError;
  const hasDemoVideo = template.demo_video_url && !imageError;
  const isGenerating = template.visual_generation_status === 'generating' || isGeneratingVisuals;

  // Frame animation logic
  const startAnimation = useCallback(() => {
    if (!hasAnimationFrames || isAnimating) return;
    setIsAnimating(true);
    
    const frameDuration = 1200; // ms per frame
    let frameIndex = 0;
    
    const animate = () => {
      frameIndex = (frameIndex + 1) % animationFrames.length;
      setCurrentFrameIndex(frameIndex);
      animationRef.current = window.setTimeout(animate, frameDuration);
    };
    
    animationRef.current = window.setTimeout(animate, frameDuration);
  }, [hasAnimationFrames, isAnimating, animationFrames.length]);

  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      clearTimeout(animationRef.current);
      animationRef.current = null;
    }
    setIsAnimating(false);
    setCurrentFrameIndex(0);
  }, []);

  // Auto-play animation when visible
  useEffect(() => {
    if (!autoPlayVideo || !hasAnimationFrames || !containerRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            startAnimation();
          } else {
            stopAnimation();
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      stopAnimation();
    };
  }, [autoPlayVideo, hasAnimationFrames, startAnimation, stopAnimation]);

  // Handle hover for animation
  useEffect(() => {
    if (isHovered && hasAnimationFrames) {
      startAnimation();
    } else if (!isHovered) {
      stopAnimation();
    }
  }, [isHovered, hasAnimationFrames, startAnimation, stopAnimation]);

  const getGradientStyle = () => {
    if (template.color.includes(',')) {
      const colors = template.color.split(',').map(c => c.trim());
      return `linear-gradient(135deg, ${colors.join(', ')})`;
    }
    return `linear-gradient(135deg, ${template.color}, ${template.color}dd)`;
  };

  const currentDisplayImage = hasAnimationFrames 
    ? animationFrames[currentFrameIndex] 
    : template.preview_image_url;

  const toggleAnimation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAnimating) {
      stopAnimation();
    } else {
      startAnimation();
    }
  };

  return (
    <motion.div
      ref={containerRef}
      className="relative group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onSelect}
    >
      {/* Card Container */}
      <div className="relative aspect-[9/16] rounded-2xl overflow-hidden shadow-lg border border-white/10">
        
        {/* Background Layer - Gradient Fallback */}
        <div 
          className="absolute inset-0"
          style={{ background: getGradientStyle() }}
        />

        {/* Animated Frames Layer */}
        {hasAnimationFrames && (
          <div className="absolute inset-0 z-10">
            {animationFrames.map((frameUrl, index) => (
              <img
                key={frameUrl}
                src={frameUrl}
                alt={`Frame ${index + 1}`}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                  index === currentFrameIndex ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))}
          </div>
        )}

        {/* Static Image Layer - When no animation frames */}
        {!hasAnimationFrames && hasPreviewImage && (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 animate-pulse z-5" />
            )}
            <img
              src={template.preview_image_url}
              alt={template.label_fr}
              className={`absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          </>
        )}

        {/* Emoji Fallback when no media */}
        {!hasAnimationFrames && !hasPreviewImage && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <span className="text-6xl drop-shadow-lg">{template.emoji}</span>
          </div>
        )}

        {/* Generating Overlay */}
        {isGenerating && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-30">
            <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
            <span className="text-white text-sm font-medium">Génération vidéo IA...</span>
            <span className="text-white/60 text-xs mt-1">Création de l'aperçu animé</span>
          </div>
        )}

        {/* Live Badge for animation */}
        {hasAnimationFrames && isAnimating && (
          <div className="absolute top-2 left-2 z-20">
            <Badge className="bg-red-500 text-white font-bold gap-1 animate-pulse">
              <span className="w-2 h-2 bg-white rounded-full" />
              LIVE
            </Badge>
          </div>
        )}

        {/* Frame Counter */}
        {hasAnimationFrames && isAnimating && (
          <div className="absolute top-2 right-2 z-20">
            <Badge className="bg-black/60 text-white text-xs">
              {currentFrameIndex + 1}/{animationFrames.length}
            </Badge>
          </div>
        )}

        {/* Featured Badge */}
        {template.is_featured && !hasAnimationFrames && (
          <div className="absolute top-2 left-2 z-20">
            <Badge className="bg-yellow-500 text-black font-bold gap-1">
              <Sparkles className="w-3 h-3" />
              Featured
            </Badge>
          </div>
        )}

        {/* Visual Status Badge */}
        {template.visual_generation_status && template.visual_generation_status !== 'completed' && (
          <div className="absolute top-2 right-2 z-20">
            <Badge 
              variant={template.visual_generation_status === 'failed' ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {template.visual_generation_status === 'pending' && '⏳ En attente'}
              {template.visual_generation_status === 'generating' && '🎬 Génération'}
              {template.visual_generation_status === 'failed' && '❌ Échec'}
            </Badge>
          </div>
        )}

        {/* Animation indicator badge */}
        {hasAnimationFrames && template.visual_generation_status === 'completed' && !isAnimating && (
          <div className="absolute top-2 right-2 z-20">
            <Badge className="bg-green-500/80 text-white text-xs gap-1">
              <Play className="w-3 h-3" />
              {animationFrames.length} frames
            </Badge>
          </div>
        )}

        {/* Bottom Gradient Overlay */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-16 z-20">
          {/* Template Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{template.emoji}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white truncate">{template.label_fr}</h3>
                <p className="text-xs text-white/70 truncate">{template.family}</p>
              </div>
            </div>

            {/* Usage Stats */}
            {(template.usage_count ?? 0) > 0 && (
              <div className="flex items-center gap-1 text-xs text-white/60">
                <Eye className="w-3 h-3" />
                <span>{template.usage_count} utilisations</span>
              </div>
            )}
          </div>

          {/* Action Buttons on Hover */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10 }}
            className="flex gap-2 mt-3"
          >
            <Button
              size="sm"
              className="flex-1 bg-white text-black hover:bg-white/90"
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
            >
              <Play className="w-4 h-4 mr-1" />
              Utiliser
            </Button>
            
            {hasAnimationFrames && (
              <Button
                size="sm"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/20"
                onClick={toggleAnimation}
              >
                {isAnimating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
            )}
            
            <Button
              size="sm"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                onPreview();
              }}
            >
              <Eye className="w-4 h-4" />
            </Button>
            
            {onSpeak && (
              <Button
                size="sm"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  onSpeak();
                }}
              >
                <Volume2 className="w-4 h-4" />
              </Button>
            )}
            
            <Button
              size="sm"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
            >
              <Download className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>

        {/* Play Overlay (when not animating) */}
        {!isHovered && !isGenerating && hasAnimationFrames && !isAnimating && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-15">
            <motion.div
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 0.8 }}
              className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
            >
              <Play className="w-6 h-6 text-white fill-white" />
            </motion.div>
          </div>
        )}

        {/* Static Play Icon for templates without animation */}
        {!isHovered && !isGenerating && !hasAnimationFrames && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-15">
            <motion.div
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 0.8 }}
              className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
            >
              <Play className="w-6 h-6 text-white fill-white" />
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
