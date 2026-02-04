/**
 * PublishStep v1.0
 * Finalization screen with export MP4 and publish to feed
 * Voice-first design with minimal text
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Download, Share2, Upload, Check, Loader2, Sparkles, ArrowRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useVideoPublish } from '@/hooks/useVideoPublish';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { GriotAnimationEngine, ANIMATION_STYLES } from '@/engines/GriotAnimationEngine';
import type { StoryScene } from './hooks/useAnimeStoryGenerator';

interface PublishStepProps {
  scenes: StoryScene[];
  audioUrl?: string;
  audioBlob?: Blob;
  narratorAvatarUrl?: string | null;
  style: string;
  duration: number;
  storyText: string;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  engineRef: React.RefObject<GriotAnimationEngine | null>;
  onPublishSuccess?: (videoId: string) => void;
  onReset?: () => void;
}

export function PublishStep({
  scenes,
  audioUrl,
  audioBlob,
  narratorAvatarUrl,
  style,
  duration,
  storyText,
  canvasRef,
  engineRef,
  onPublishSuccess,
  onReset
}: PublishStepProps) {
  const { toast } = useToast();
  const { publishVideo, isPublishing, publishProgress, publishStage } = useVideoPublish();
  
  const [title, setTitle] = useState(() => {
    // Auto-generate title from first sentence
    const firstSentence = storyText.split(/[.!?]/)[0]?.trim() || 'Mon conte animé';
    return firstSentence.slice(0, 50) + (firstSentence.length > 50 ? '...' : '');
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isPublished, setIsPublished] = useState(false);
  const [publishedVideoId, setPublishedVideoId] = useState<string | null>(null);

  // Generate thumbnail from canvas
  const generateThumbnail = useCallback(async (): Promise<Blob | null> => {
    if (!canvasRef.current) return null;
    
    return new Promise((resolve) => {
      canvasRef.current?.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.85);
    });
  }, [canvasRef]);

  // Export video using MediaRecorder with proper audio muxing
  const exportVideo = useCallback(async (): Promise<Blob | null> => {
    if (!canvasRef.current || !engineRef.current) return null;
    
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    const animStyle = ANIMATION_STYLES[style] || ANIMATION_STYLES.fantasy;
    
    // Get canvas stream at 24 FPS
    const videoStream = canvas.captureStream(24);
    
    // Create combined stream with audio
    let combinedStream = videoStream;
    let audioElement: HTMLAudioElement | null = null;
    let audioContext: AudioContext | null = null;
    
    // Add audio track if available (from TTS generation)
    if (audioUrl) {
      try {
        console.log('[PublishStep] Adding audio track from:', audioUrl.substring(0, 50));
        audioContext = new AudioContext();
        audioElement = new Audio(audioUrl);
        audioElement.crossOrigin = 'anonymous';
        audioElement.volume = 1;
        
        // Wait for audio to be ready
        await new Promise<void>((res, rej) => {
          audioElement!.oncanplaythrough = () => res();
          audioElement!.onerror = () => rej(new Error('Audio load failed'));
          audioElement!.load();
        });
        
        const source = audioContext.createMediaElementSource(audioElement);
        const destination = audioContext.createMediaStreamDestination();
        source.connect(destination);
        source.connect(audioContext.destination); // Also play locally
        
        // Create new stream with both video and audio tracks
        combinedStream = new MediaStream([
          ...videoStream.getVideoTracks(),
          ...destination.stream.getAudioTracks()
        ]);
        
        console.log('[PublishStep] Audio track added successfully');
      } catch (e) {
        console.warn('[PublishStep] Could not add audio track:', e);
        // Continue without audio
      }
    }
    
    // Determine best supported format with audio codecs
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';
    
    console.log('[PublishStep] Using format:', mimeType);
    
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(combinedStream, { 
      mimeType,
      videoBitsPerSecond: 5000000, // 5 Mbps
      audioBitsPerSecond: 128000   // 128 kbps audio
    });
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };
    
    return new Promise((resolve) => {
      recorder.onstop = () => {
        // Cleanup audio resources
        if (audioElement) {
          audioElement.pause();
          audioElement.src = '';
        }
        if (audioContext) {
          audioContext.close().catch(() => {});
        }
        
        const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
        console.log('[PublishStep] Video export complete, size:', (blob.size / 1024 / 1024).toFixed(2), 'MB');
        resolve(blob);
      };
      
      // Start recording
      recorder.start(100);
      
      // Start audio playback in sync with animation
      if (audioElement) {
        audioElement.currentTime = 0;
        audioElement.play().catch(e => console.warn('Audio play error:', e));
      }
      
      // Start animation playback
      engine.startSlideshowPreview(duration, animStyle, (progress) => {
        setExportProgress(progress * 100);
      });
      
      // Stop after duration
      setTimeout(() => {
        recorder.stop();
        engine.stopPreview();
        if (audioElement) {
          audioElement.pause();
        }
      }, duration * 1000 + 500);
    });
  }, [canvasRef, engineRef, style, duration, audioUrl]);

  // Handle download
  const handleDownload = useCallback(async () => {
    setIsExporting(true);
    setExportProgress(0);
    
    try {
      toast({
        title: '🎬 Export en cours...',
        description: 'Création de ta vidéo...'
      });
      
      const videoBlob = await exportVideo();
      
      if (videoBlob) {
        const url = URL.createObjectURL(videoBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `griot-anime-${Date.now()}.${videoBlob.type.includes('mp4') ? 'mp4' : 'webm'}`;
        link.click();
        URL.revokeObjectURL(url);
        
        toast({
          title: '✅ Export terminé!',
          description: 'Ta vidéo a été téléchargée.'
        });
      }
    } catch (error) {
      console.error('[PublishStep] Export error:', error);
      toast({
        title: 'Erreur d\'export',
        description: 'Réessaie dans quelques instants.',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  }, [exportVideo, toast]);

  // Handle share
  const handleShare = useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: title,
          text: `🌙 Mon conte animé: ${title}`,
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: '📋 Lien copié!',
          description: 'Partage ce lien avec tes amis.'
        });
      }
    } catch (error) {
      console.error('[PublishStep] Share error:', error);
    }
  }, [title, toast]);

  // Handle publish to feed
  const handlePublish = useCallback(async () => {
    try {
      toast({
        title: '🚀 Publication en cours...',
        description: 'Envoi vers le feed FITILA...'
      });
      
      // Export video
      const videoBlob = await exportVideo();
      if (!videoBlob) {
        throw new Error('Échec de l\'export vidéo');
      }
      
      // Generate thumbnail
      const thumbnailBlob = await generateThumbnail();
      if (!thumbnailBlob) {
        throw new Error('Échec de la génération de miniature');
      }
      
      // Publish
      const result = await publishVideo({
        video: videoBlob,
        thumbnail: thumbnailBlob,
        title: title,
        description: storyText.slice(0, 200),
        templateId: 'griot-anime',
        templateName: 'Griot Animé IA',
        duration: duration
      });
      
      if (result.success) {
        setIsPublished(true);
        setPublishedVideoId(result.videoId || null);
        onPublishSuccess?.(result.videoId || '');
      }
      
    } catch (error) {
      console.error('[PublishStep] Publish error:', error);
      toast({
        title: 'Erreur de publication',
        description: error instanceof Error ? error.message : 'Réessaie dans quelques instants.',
        variant: 'destructive'
      });
    }
  }, [exportVideo, generateThumbnail, publishVideo, title, storyText, duration, onPublishSuccess, toast]);

  // Success state
  if (isPublished) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8 space-y-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center"
        >
          <Check className="w-12 h-12 text-white" />
        </motion.div>
        
        <div>
          <h2 className="text-2xl font-bold text-amber-100 mb-2">
            🎉 Publié!
          </h2>
          <p className="text-amber-200/60">
            Ton conte est maintenant sur FITILA
          </p>
        </div>
        
        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <Button
            size="lg"
            onClick={() => window.location.href = '/fitila'}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            📺 Voir le Feed
          </Button>
          
          <Button
            variant="outline"
            onClick={onReset}
            className="w-full border-amber-500/30 text-amber-200 hover:bg-amber-500/10"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            🔄 Créer un autre
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-amber-200/60">
          📝 Titre / Yíròn
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Mon conte animé..."
          className="bg-amber-950/30 border-amber-500/30 text-amber-100 placeholder:text-amber-200/30"
          maxLength={60}
        />
      </div>

      {/* Preview Thumbnail */}
      <div className="aspect-video w-full max-w-xs mx-auto rounded-xl overflow-hidden bg-amber-950/30 border border-amber-500/20">
        {scenes[0]?.imageUrl ? (
          <img 
            src={scenes[0].imageUrl} 
            alt="Preview" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-amber-200/40">
            📺
          </div>
        )}
      </div>

      {/* Progress */}
      {(isExporting || isPublishing) && (
        <div className="space-y-2">
          <Progress 
            value={isExporting ? exportProgress : publishProgress} 
            className="h-3"
          />
          <p className="text-sm text-center text-amber-200/60">
            {isExporting ? `Export: ${Math.round(exportProgress)}%` : publishStage}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 gap-3">
        {/* Download */}
        <Button
          variant="outline"
          size="lg"
          onClick={handleDownload}
          disabled={isExporting || isPublishing}
          className="w-full h-14 bg-amber-500/10 border-amber-500/30 text-amber-200 hover:bg-amber-500/20"
        >
          {isExporting ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Download className="w-5 h-5 mr-2" />
          )}
          ⬇️ Télécharger / Sɛ̀rɛ̀
        </Button>
        
        {/* Share */}
        <Button
          variant="outline"
          size="lg"
          onClick={handleShare}
          disabled={isExporting || isPublishing}
          className="w-full h-14 bg-amber-500/10 border-amber-500/30 text-amber-200 hover:bg-amber-500/20"
        >
          <Share2 className="w-5 h-5 mr-2" />
          📤 Partager / Pín
        </Button>
        
        {/* Publish */}
        <Button
          size="lg"
          onClick={handlePublish}
          disabled={isExporting || isPublishing || !title.trim()}
          className={cn(
            "w-full h-16 text-lg font-semibold",
            "bg-gradient-to-r from-amber-500 to-orange-500",
            "hover:from-amber-400 hover:to-orange-400",
            "disabled:opacity-50"
          )}
        >
          {isPublishing ? (
            <>
              <Loader2 className="w-6 h-6 mr-2 animate-spin" />
              Publication...
            </>
          ) : (
            <>
              <Upload className="w-6 h-6 mr-2" />
              🌐 Publier sur FITILA
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </div>

      {/* Info */}
      <p className="text-xs text-center text-amber-200/40">
        Ta vidéo sera visible par tous sur le feed
      </p>
    </div>
  );
}

export default PublishStep;
