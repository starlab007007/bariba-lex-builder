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
  autoLoad?: boolean; // If false, show placeholder until clicked
  onVideoReady?: () => void;
  onError?: (error: Error) => void;
  onRequestLoad?: () => void;
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

// ✅ FIXED: Robust image loading via fetch->blob to bypass CORS issues
async function loadImage(url: string, retries = 2): Promise<HTMLImageElement> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Strategy 1: Try fetch->blob->objectURL (bypasses CORS issues)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(url, { 
        mode: 'cors',
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      return await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(img);
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Image decode failed'));
        };
        img.src = objectUrl;
      });
    } catch (err) {
      // Strategy 2: Fallback to direct img.src with crossOrigin
      if (attempt === retries) {
        return await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          const timeout = setTimeout(() => reject(new Error('Timeout')), 8000);
          img.onload = () => {
            clearTimeout(timeout);
            resolve(img);
          };
          img.onerror = () => {
            clearTimeout(timeout);
            reject(new Error(`Failed to load: ${url}`));
          };
          img.src = url;
        });
      }
      // Wait before retry
      await new Promise(r => setTimeout(r, 500));
    }
  }
  throw new Error('All load attempts failed');
}

interface SceneData {
  url: string;
  durationMs: number;
  name_fr?: string;
}

/**
 * ✅ FALLBACK: Generate intermediate frames via color interpolation when not enough frames
 */
function generateFallbackFrames(existingFrames: string[], targetCount: number): string[] {
  if (existingFrames.length >= targetCount) return existingFrames;
  
  // If we have at least 1 frame, duplicate it to reach target
  const result: string[] = [];
  const step = existingFrames.length / targetCount;
  
  for (let i = 0; i < targetCount; i++) {
    const srcIndex = Math.min(Math.floor(i * step), existingFrames.length - 1);
    result.push(existingFrames[Math.max(0, srcIndex)]);
  }
  
  return result;
}

/**
 * Generate a WebM video from frames with optional scene-specific durations
 * Supports both simple frame arrays and scene-based storyboards with crossfade transitions
 * ✅ ENHANCED: Intelligent fallback for missing frames, smooth crossfades, visual loader
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

  // ✅ FALLBACK: Ensure minimum 2 frames for smooth playback
  const minFrames = 2;
  let processedFrames = frames;
  if (frames.length < minFrames) {
    console.log('[VideoTemplatePreview] Applying fallback for insufficient frames:', frames.length);
    processedFrames = generateFallbackFrames(frames, minFrames);
  }

  // Canvas setup (9:16 ratio)
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = 360;
  canvas.height = 640;

  // Load all images first with progress tracking
  const images: HTMLImageElement[] = [];
  const loadingErrors: number[] = [];
  
  for (let i = 0; i < processedFrames.length; i++) {
    try {
      const img = await loadImage(processedFrames[i]);
      images.push(img);
      onProgress?.((i + 1) / processedFrames.length * 0.4); // 0-40% for loading
    } catch (err) {
      console.warn(`[VideoTemplatePreview] Failed to load frame ${i}:`, err);
      loadingErrors.push(i);
    }
  }

  // ✅ FALLBACK: If some images failed, try to fill gaps with available images
  if (images.length === 0) {
    throw new Error('No frames could be loaded');
  }
  
  if (images.length < processedFrames.length && images.length > 0) {
    console.log('[VideoTemplatePreview] Filling gaps with available images');
    const targetCount = processedFrames.length;
    while (images.length < targetCount) {
      images.push(images[images.length - 1]);
    }
  }

  // Calculate timing based on scenes or equal distribution
  const fps = 30;
  const totalVideoFrames = Math.ceil(durationMs / 1000 * fps);
  const frameInterval = 1000 / fps;
  const transitionFrames = Math.ceil(0.6 * fps); // ✅ 0.6 second crossfade (smoother)

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
      
      // Clear canvas with black background
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // ✅ ENHANCED: Calculate crossfade alpha with easing
      const framesFromEnd = currentEntry.endFrame - frameCount;
      const inTransition = framesFromEnd <= transitionFrames && nextImg;
      let transitionAlpha = 0;
      if (inTransition) {
        // Apply ease-in-out easing for smoother transitions
        const rawAlpha = 1 - (framesFromEnd / transitionFrames);
        transitionAlpha = rawAlpha < 0.5 
          ? 2 * rawAlpha * rawAlpha 
          : 1 - Math.pow(-2 * rawAlpha + 2, 2) / 2;
      }

      // Draw function with aspect ratio fit (cover mode)
      const drawImageFit = (image: HTMLImageElement, alpha: number = 1) => {
        const imgAspect = image.width / image.height;
        const canvasAspect = canvas.width / canvas.height;
        
        let drawW, drawH, drawX, drawY;
        if (imgAspect > canvasAspect) {
          // Image is wider - fit height, crop sides
          drawH = canvas.height;
          drawW = canvas.height * imgAspect;
          drawX = (canvas.width - drawW) / 2;
          drawY = 0;
        } else {
          // Image is taller - fit width, crop top/bottom
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

      // ✅ Add subtle vignette effect for documentary feel
      const vignette = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.8
      );
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.25)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // ✅ Add subtle film grain overlay for cinematic feel
      if (frameCount % 3 === 0) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.02})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      frameCount++;
      // Progress: 40-100% for rendering
      onProgress?.(0.4 + (frameCount / actualTotalFrames) * 0.6);

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
  autoLoad = false,
  onVideoReady,
  onError,
  onRequestLoad
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [shouldLoad, setShouldLoad] = useState(autoLoad);

  // ✅ Sync shouldLoad with autoLoad prop changes
  useEffect(() => {
    if (autoLoad && !shouldLoad) {
      setShouldLoad(true);
    }
  }, [autoLoad, shouldLoad]);

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

  // ✅ FIXED: Robust cache key including duration + frame count + first frame hash
  const cacheKey = useMemo(() => {
    const frameHash = frames.length > 0 
      ? frames[0].slice(-20).replace(/[^a-zA-Z0-9]/g, '')
      : 'empty';
    return `${template.id}:${durationMs}:${frames.length}:${frameHash}`;
  }, [template.id, durationMs, frames]);

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
      // ✅ Check cache with robust key
      const cached = await templateVideoCache.get(cacheKey);
      if (cached && cached.frameCount === frames.length && cached.durationMs === durationMs) {
        console.log('[VideoTemplatePreview] Using cached video for:', cacheKey);
        const url = URL.createObjectURL(cached.blob);
        setVideoUrl(url);
        setIsGenerating(false);
        onVideoReady?.();
        return;
      }

      console.log('[VideoTemplatePreview] Generating new video:', { frames: frames.length, durationMs, scenes: scenes?.length });
      
      // Generate new video with scene support
      const blob = await generateVideoFromFrames(frames, durationMs, setProgress, scenes);
      
      // ✅ Cache with robust key
      await templateVideoCache.set(cacheKey, blob, durationMs, frames.length);
      
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
  }, [frames, durationMs, cacheKey, scenes, onVideoReady, onError]);

  // Auto-generate when visible, shouldLoad=true, and has frames
  useEffect(() => {
    if (shouldLoad && isVisible && frames.length >= 2 && !videoUrl && !isGenerating && !error) {
      generateVideo();
    }
  }, [shouldLoad, isVisible, frames.length, videoUrl, isGenerating, error, generateVideo]);

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

  // Lazy loading: show placeholder until user clicks
  if (!shouldLoad && !videoUrl) {
    return (
      <div className={cn("relative w-full h-full", className)}>
        <div className={cn("absolute inset-0 bg-gradient-to-br", template.color)} />
        {previewImage && (
          <img 
            src={previewImage} 
            alt={template.label_fr}
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
        )}
        <motion.div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/20"
          onClick={() => {
            setShouldLoad(true);
            onRequestLoad?.();
          }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="flex flex-col items-center gap-1">
            <div className="p-3 rounded-full bg-white/30 backdrop-blur-sm">
              <Play className="h-6 w-6 text-white" />
            </div>
            <span className="text-white text-[10px] font-medium">Aperçu</span>
          </div>
        </motion.div>
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

      {/* ✅ ENHANCED Loading state with visual progress */}
      {isGenerating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70 flex flex-col items-center justify-center gap-4"
        >
          {/* Animated loader ring */}
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-white/20" />
            <motion.div
              className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-white"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white text-xs font-bold">{Math.round(progress * 100)}%</span>
            </div>
          </div>
          
          {/* Status text */}
          <div className="text-center">
            <div className="text-white text-sm font-medium">
              {progress < 0.4 ? '🎞️ Chargement images...' : '🎬 Rendu vidéo...'}
            </div>
            <div className="text-white/60 text-xs mt-1">
              {Math.round(durationMs / 1000)}s • {frames.length} scènes
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-40 h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.3 }}
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
