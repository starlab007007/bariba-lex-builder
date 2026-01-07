import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Download, Eye, Sparkles, Volume2, Loader2, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const hasPreviewImage = template.preview_image_url && !imageError;
  const hasDemoVideo = template.demo_video_url && !videoError;
  const isGenerating = template.visual_generation_status === 'generating' || isGeneratingVisuals;

  // Auto-play video when visible
  useEffect(() => {
    if (autoPlayVideo && hasDemoVideo && videoRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              videoRef.current?.play().catch(() => {});
              setVideoPlaying(true);
            } else {
              videoRef.current?.pause();
              setVideoPlaying(false);
            }
          });
        },
        { threshold: 0.5 }
      );

      observer.observe(videoRef.current);
      return () => observer.disconnect();
    }
  }, [autoPlayVideo, hasDemoVideo]);

  // Handle hover for video
  useEffect(() => {
    if (hasDemoVideo && videoRef.current) {
      if (isHovered) {
        videoRef.current.play().catch(() => {});
        setVideoPlaying(true);
      }
    }
  }, [isHovered, hasDemoVideo]);

  const getGradientStyle = () => {
    if (template.color.includes(',')) {
      const colors = template.color.split(',').map(c => c.trim());
      return `linear-gradient(135deg, ${colors.join(', ')})`;
    }
    return `linear-gradient(135deg, ${template.color}, ${template.color}dd)`;
  };

  const toggleVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (videoPlaying) {
        videoRef.current.pause();
        setVideoPlaying(false);
      } else {
        videoRef.current.play().catch(() => {});
        setVideoPlaying(true);
      }
    }
  };

  return (
    <motion.div
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

        {/* Video Layer - Primary when available */}
        {hasDemoVideo && (
          <video
            ref={videoRef}
            src={template.demo_video_url}
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover z-10"
            onError={() => setVideoError(true)}
            onPlay={() => setVideoPlaying(true)}
            onPause={() => setVideoPlaying(false)}
          />
        )}

        {/* Image Layer - Fallback when no video */}
        {!hasDemoVideo && hasPreviewImage && (
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
        {!hasDemoVideo && !hasPreviewImage && (
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

        {/* Live Badge for videos */}
        {hasDemoVideo && videoPlaying && (
          <div className="absolute top-2 left-2 z-20">
            <Badge className="bg-red-500 text-white font-bold gap-1 animate-pulse">
              <span className="w-2 h-2 bg-white rounded-full" />
              LIVE
            </Badge>
          </div>
        )}

        {/* Featured Badge */}
        {template.is_featured && !hasDemoVideo && (
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

        {/* Video indicator badge */}
        {hasDemoVideo && template.visual_generation_status === 'completed' && (
          <div className="absolute top-2 right-2 z-20">
            <Badge className="bg-green-500/80 text-white text-xs gap-1">
              <Play className="w-3 h-3" />
              Vidéo
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
            
            {hasDemoVideo && (
              <Button
                size="sm"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/20"
                onClick={toggleVideo}
              >
                {videoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
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

        {/* Play/Pause Overlay (when not hovered and has video) */}
        {!isHovered && !isGenerating && hasDemoVideo && !videoPlaying && (
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

        {/* Static Play Icon for templates without video */}
        {!isHovered && !isGenerating && !hasDemoVideo && (
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
