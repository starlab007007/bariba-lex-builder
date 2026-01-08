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

interface SceneData {
  url: string;
  durationMs: number;
  name_fr?: string;
}

/**
 * Generate a WebM video from frames with optional scene-specific durations
 * Supports both simple frame arrays and scene-based storyboards with crossfade transitions
 */
async function generateVideoFromFrames(
  frames: string[],
  durationMs: number,
  onProgress?: (progress: number) => void,
  scenes?: SceneData[]
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

  // Calculate timing based on scenes or equal distribution
  const fps = 30;
  const totalVideoFrames = Math.ceil(durationMs / 1000 * fps);
  const frameInterval = 1000 / fps;
  const transitionFrames = Math.ceil(0.5 * fps); // 0.5 second crossfade

  // Build timeline with scene durations or equal split
  interface TimelineEntry { imageIndex: number; startFrame: number; endFrame: number; }
  const timeline: TimelineEntry[] = [];
  
  if (scenes && scenes.length === images.length) {
    // Use scene-specific durations (Mini-Doc Village style)
    let currentFrame = 0;
    for (let i = 0; i < scenes.length; i++) {
      const sceneFrames = Math.ceil(scenes[i].durationMs / 1000 * fps);
      timeline.push({
        imageIndex: i,
        startFrame: currentFrame,
        endFrame: currentFrame + sceneFrames
      });
      currentFrame += sceneFrames;
    }
  } else {
    // Equal distribution
    const framesPerImage = Math.ceil(totalVideoFrames / images.length);
    for (let i = 0; i < images.length; i++) {
      timeline.push({
        imageIndex: i,
        startFrame: i * framesPerImage,
        endFrame: (i + 1) * framesPerImage
      });
    }
  }

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

    recorder.onerror = () => {
      reject(new Error('MediaRecorder error'));
    };

    recorder.start();

    let frameCount = 0;
    const actualTotalFrames = timeline[timeline.length - 1]?.endFrame || totalVideoFrames;

    const drawFrame = () => {
      // Find current scene
      let currentEntry = timeline.find(e => frameCount >= e.startFrame && frameCount < e.endFrame);
      if (!currentEntry) currentEntry = timeline[timeline.length - 1];
      
      const img = images[currentEntry.imageIndex];
      const nextEntry = timeline[currentEntry.imageIndex + 1];
      const nextImg = nextEntry ? images[nextEntry.imageIndex] : null;
      
      // Clear canvas
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Calculate crossfade alpha
      const framesFromEnd = currentEntry.endFrame - frameCount;
      const inTransition = framesFromEnd <= transitionFrames && nextImg;
      const transitionAlpha = inTransition ? 1 - (framesFromEnd / transitionFrames) : 0;

      // Draw function with aspect ratio fit
      const drawImageFit = (image: HTMLImageElement, alpha: number = 1) => {
        const imgAspect = image.width / image.height;
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
        
        ctx.globalAlpha = alpha;
        ctx.drawImage(image, drawX, drawY, drawW, drawH);
        ctx.globalAlpha = 1;
      };

      // Draw current image
      drawImageFit(img, 1 - transitionAlpha);
      
      // Draw next image (crossfade)
      if (inTransition && nextImg) {
        drawImageFit(nextImg, transitionAlpha);
      }

      // Add subtle vignette effect for documentary feel
      const vignette = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.8
      );
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      frameCount++;
      onProgress?.(0.5 + (frameCount / actualTotalFrames) * 0.5);

      // Continue or stop
      if (frameCount < actualTotalFrames) {
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

  // Extract frames and scenes from aiData
  const { frames, scenes } = useMemo(() => {
    if (!aiData) return { frames: [], scenes: undefined };
    
    const frameList: string[] = [];
    let sceneList: SceneData[] | undefined = undefined;
    
    // Try storyboard_frames first (Mini-Doc Village format with scene durations)
    const sfData = aiData.storyboard_frames as any;
    if (sfData) {
      if (sfData.scenes && Array.isArray(sfData.scenes)) {
        // Scene-based format with individual durations
        sceneList = sfData.scenes.map((s: any) => ({
          url: s.url || s.imageUrl,
          durationMs: s.durationMs || 5000,
          name_fr: s.name_fr
        })).filter((s: any) => s.url?.startsWith('http'));
        sceneList?.forEach(s => frameList.push(s.url));
      } else if (sfData.frames) {
        frameList.push(...sfData.frames.filter((f: string) => typeof f === 'string' && f.startsWith('http')));
      } else if (Array.isArray(sfData)) {
        frameList.push(...sfData.filter((f: string) => typeof f === 'string' && f.startsWith('http')));
      }
    }
    
    // Fallback to ai_storyboard
    if (frameList.length === 0) {
      const aiSb = aiData.ai_storyboard as any;
      if (aiSb) {
        if (aiSb.scenes && Array.isArray(aiSb.scenes)) {
          sceneList = aiSb.scenes.map((s: any) => ({
            url: s.imageUrl || s.url,
            durationMs: s.durationMs || 5000,
            name_fr: s.name_fr
          })).filter((s: any) => s.url?.startsWith('http'));
          sceneList?.forEach(s => frameList.push(s.url));
        } else if (aiSb.animation_frames) {
          frameList.push(...aiSb.animation_frames.filter((f: string) => typeof f === 'string' && f.startsWith('http')));
        } else if (aiSb.frames) {
          frameList.push(...aiSb.frames.filter((f: string) => typeof f === 'string' && f.startsWith('http')));
        }
      }
    }
    
    return { frames: frameList, scenes: sceneList };
  }, [aiData]);

  // Get template duration
  const durationMs = useMemo(() => {
    // From storyboard_frames data
    const sfData = aiData?.storyboard_frames as any;
    if (sfData && typeof sfData === 'object' && !Array.isArray(sfData) && sfData.durationMs) {
      return sfData.durationMs;
    }
    
    // From ai_storyboard
    const aiSb = aiData?.ai_storyboard as any;
    if (aiSb?.durationMs) {
      return aiSb.durationMs;
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

      // Generate new video with scene support
      const blob = await generateVideoFromFrames(frames, durationMs, setProgress, scenes);
      
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
