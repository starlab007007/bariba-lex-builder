/**
 * VideoTemplatePreview - Generates and plays a real WebM video from AI frames
 * 
 * Features:
 * - Generates WebM video from storyboard frames using Canvas + MediaRecorder
 * - Plays for the exact template duration (10s = 10s)
 * - Loops continuously
 * - Caches generated videos in IndexedDB
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Loader2 } from 'lucide-react';
import { AdvancedTemplate } from './AdvancedTemplateData';
import { templateVideoCache } from '@/services/TemplateVideoCache';
import { cn } from '@/lib/utils';

interface VideoTemplatePreviewProps {
  template: AdvancedTemplate;
  aiData?: {
    storyboard_frames?: { frames?: string[]; durationMs?: number } | string[];
    ai_storyboard?: { animation_frames?: string[]; frames?: string[] };
    ai_preview_image_url?: string;
    preview_image_url?: string;
  };
  isVisible: boolean;
  loop?: boolean;
  className?: string;
  onVideoReady?: () => void;
  onError?: (error: Error) => void;
}

// Get supported video mime type for the browser
function getSupportedMimeType(): string {
  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return 'video/webm';
}

// Load an image and return it as HTMLImageElement
async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${url}`));
    img.src = url;
  });
}

/**
 * Generate a WebM video from an array of image URLs
 */
async function generateVideoFromFrames(
  frames: string[],
  durationMs: number,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  if (frames.length === 0) {
    throw new Error('No frames provided');
  }

  // Canvas setup (9:16 ratio)
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = 360;
  canvas.height = 640;

  // Load all images first
  const images: HTMLImageElement[] = [];
  for (let i = 0; i < frames.length; i++) {
    try {
      const img = await loadImage(frames[i]);
      images.push(img);
      onProgress?.((i + 1) / frames.length * 0.5); // 0-50% for loading
    } catch (err) {
      console.warn(`[VideoTemplatePreview] Failed to load frame ${i}:`, err);
    }
  }

  if (images.length === 0) {
    throw new Error('No frames could be loaded');
  }

  // Calculate timing
  const frameDurationMs = durationMs / images.length;
  const fps = 30;
  const totalVideoFrames = Math.ceil(durationMs / 1000 * fps);
  const framesPerImage = Math.ceil(totalVideoFrames / images.length);

  // Setup MediaRecorder
  const stream = canvas.captureStream(fps);
  const mimeType = getSupportedMimeType();
  const recorder = new MediaRecorder(stream, { 
    mimeType,
    videoBitsPerSecond: 2500000 // 2.5 Mbps for good quality
  });
  
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      resolve(blob);
    };

    recorder.onerror = (e) => {
      reject(new Error('MediaRecorder error'));
    };

    recorder.start();

    let currentImageIndex = 0;
    let frameCount = 0;
    const frameInterval = 1000 / fps;

    const drawFrame = () => {
      // Draw current image with smooth crossfade
      const img = images[currentImageIndex];
      
      // Clear and draw
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Calculate aspect ratio fit
      const imgAspect = img.width / img.height;
      const canvasAspect = canvas.width / canvas.height;
      
      let drawW, drawH, drawX, drawY;
      if (imgAspect > canvasAspect) {
        drawH = canvas.height;
        drawW = canvas.height * imgAspect;
        drawX = (canvas.width - drawW) / 2;
        drawY = 0;
      } else {
        drawW = canvas.width;
        drawH = canvas.width / imgAspect;
        drawX = 0;
        drawY = (canvas.height - drawH) / 2;
      }
      
      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      frameCount++;
      onProgress?.(0.5 + (frameCount / totalVideoFrames) * 0.5); // 50-100% for encoding

      // Move to next image
      if (frameCount % framesPerImage === 0) {
        currentImageIndex = (currentImageIndex + 1) % images.length;
      }

      // Continue or stop
      if (frameCount < totalVideoFrames) {
        setTimeout(drawFrame, frameInterval);
      } else {
        recorder.stop();
      }
    };

    // Start drawing
    drawFrame();
  });
}

const VideoTemplatePreview: React.FC<VideoTemplatePreviewProps> = ({
  template,
  aiData,
  isVisible,
  loop = true,
  className,
  onVideoReady,
  onError
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Extract frames from aiData
  const frames = useMemo(() => {
    if (!aiData) return [];
    
    // Try multiple sources
    const sfData = aiData.storyboard_frames;
    if (sfData) {
      if (Array.isArray(sfData)) return sfData.filter(f => typeof f === 'string' && f.startsWith('http'));
      if (sfData.frames) return sfData.frames.filter(f => typeof f === 'string' && f.startsWith('http'));
    }
    
    const aiSb = aiData.ai_storyboard;
    if (aiSb) {
      if (aiSb.animation_frames) return aiSb.animation_frames.filter(f => typeof f === 'string' && f.startsWith('http'));
      if (aiSb.frames) return aiSb.frames.filter(f => typeof f === 'string' && f.startsWith('http'));
    }
    
    return [];
  }, [aiData]);

  // Get template duration
  const durationMs = useMemo(() => {
    // From storyboard_frames data
    const sfData = aiData?.storyboard_frames;
    if (sfData && typeof sfData === 'object' && !Array.isArray(sfData) && sfData.durationMs) {
      return sfData.durationMs;
    }
    
    // From KSE manifest
    const kse = template.engine?.variants?.[template.engine?.defaultDuration || '15s'];
    if (kse?.durationSec) return kse.durationSec * 1000;
    
    // Default 10 seconds
    return 10000;
  }, [aiData, template]);

  // Fallback preview image
  const previewImage = aiData?.ai_preview_image_url || aiData?.preview_image_url;

  // Generate or load video
  const generateVideo = useCallback(async () => {
    if (frames.length < 2) {
      setError('Pas assez de frames');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setError(null);

    try {
      // Check cache first
      const cached = await templateVideoCache.get(template.id);
      if (cached && cached.frameCount === frames.length) {
        const url = URL.createObjectURL(cached.blob);
        setVideoUrl(url);
        setIsGenerating(false);
        onVideoReady?.();
        return;
      }

      // Generate new video
      const blob = await generateVideoFromFrames(frames, durationMs, setProgress);
      
      // Cache it
      await templateVideoCache.set(template.id, blob, durationMs, frames.length);
      
      // Create URL
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      onVideoReady?.();
    } catch (err) {
      console.error('[VideoTemplatePreview] Generation error:', err);
      setError('Échec de génération');
      onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsGenerating(false);
    }
  }, [frames, durationMs, template.id, onVideoReady, onError]);

  // Auto-generate when visible and has frames
  useEffect(() => {
    if (isVisible && frames.length >= 2 && !videoUrl && !isGenerating && !error) {
      generateVideo();
    }
  }, [isVisible, frames.length, videoUrl, isGenerating, error, generateVideo]);

  // Play/pause based on visibility
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    if (isVisible) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [isVisible, videoUrl]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  // Handle video events
  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleEnded = () => {
    if (loop && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  // If no frames, show preview image or gradient
  if (frames.length < 2) {
    return (
      <div className={cn("relative w-full h-full", className)}>
        {previewImage ? (
          <img 
            src={previewImage} 
            alt={template.label_fr}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={cn("w-full h-full bg-gradient-to-br", template.color)} />
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)}>
      {/* Video player */}
      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          className="absolute inset-0 w-full h-full object-cover"
          loop={loop}
          muted
          playsInline
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
        />
      )}

      {/* Loading state */}
      {isGenerating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3"
        >
          <Loader2 className="h-8 w-8 text-white animate-spin" />
          <div className="text-white text-sm font-medium">
            Génération vidéo... {Math.round(progress * 100)}%
          </div>
          <div className="w-32 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
            />
          </div>
        </motion.div>
      )}

      {/* Error state */}
      {error && !isGenerating && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <div className="text-white/70 text-sm">{error}</div>
        </div>
      )}

      {/* Play indicator */}
      {videoUrl && !isGenerating && (
        <div className="absolute bottom-2 right-2 z-10">
          <motion.div
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full",
              isPlaying ? "bg-green-500/80" : "bg-black/50"
            )}
            animate={isPlaying ? { opacity: [0.7, 1, 0.7] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {isPlaying ? (
              <Pause className="h-3 w-3 text-white" />
            ) : (
              <Play className="h-3 w-3 text-white" />
            )}
            <span className="text-white text-[10px] font-medium">
              {Math.round(durationMs / 1000)}s
            </span>
          </motion.div>
        </div>
      )}

      {/* Fallback while loading */}
      {!videoUrl && !isGenerating && previewImage && (
        <img 
          src={previewImage} 
          alt={template.label_fr}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
    </div>
  );
};

export default VideoTemplatePreview;
