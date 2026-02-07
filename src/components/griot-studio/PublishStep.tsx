/**
 * PublishStep v2.0
 * Finalization screen with audio mode selector (TikTok-style), music library integration,
 * Web Audio API mixing, export MP4 and publish to feed.
 * 
 * Audio modes:
 * - voice_only: Narrator's recorded voice only (default)
 * - music_only: Background music only (from AudioLibrary)
 * - voice_and_music: Voice + background music (music at 25% volume)
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share2, Upload, Check, Loader2, Sparkles, ArrowRight, ExternalLink, Mic, Music, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useVideoPublish } from '@/hooks/useVideoPublish';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { GriotAnimationEngine, ANIMATION_STYLES } from '@/engines/GriotAnimationEngine';
import AudioLibrary from '@/components/tamtam/creator/AudioLibrary';
import type { AudioTrack } from '@/types/audio';
import type { StoryScene } from './hooks/useAnimeStoryGenerator';

type AudioMode = 'voice_only' | 'music_only' | 'voice_and_music';

interface PublishStepProps {
  scenes: StoryScene[];
  audioUrl?: string;
  narrationAudioUrl?: string;
  narrationBlob?: Blob;
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

const AUDIO_MODES: { value: AudioMode; emoji: string; label: string; description: string; icon: React.ElementType }[] = [
  { value: 'voice_only', emoji: '🎙️', label: 'Voix seule', description: 'Narration du griot', icon: Mic },
  { value: 'music_only', emoji: '🎵', label: 'Musique seule', description: 'Musique de fond', icon: Music },
  { value: 'voice_and_music', emoji: '🎧', label: 'Voix + Musique', description: 'Les deux combinés', icon: Volume2 },
];

export function PublishStep({
  scenes,
  audioUrl,
  narrationAudioUrl,
  narrationBlob,
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
    const firstSentence = storyText.split(/[.!?]/)[0]?.trim() || 'Mon conte animé';
    return firstSentence.slice(0, 50) + (firstSentence.length > 50 ? '...' : '');
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isPublished, setIsPublished] = useState(false);
  const [publishedVideoId, setPublishedVideoId] = useState<string | null>(null);

  // Audio mode state
  const [audioMode, setAudioMode] = useState<AudioMode>('voice_only');
  const [showAudioLibrary, setShowAudioLibrary] = useState(false);
  const [selectedMusicTrack, setSelectedMusicTrack] = useState<AudioTrack | null>(null);

  // Effective narration URL: prefer narrationAudioUrl (user's recorded voice), fallback to audioUrl (TTS)
  const effectiveNarrationUrl = narrationAudioUrl || audioUrl;

  // Handle music track selection
  const handleMusicTrackSelect = useCallback((track: AudioTrack) => {
    setSelectedMusicTrack(track);
    setShowAudioLibrary(false);
    toast({ title: `🎵 ${track.title}`, description: 'Musique sélectionnée' });
  }, [toast]);

  // Generate thumbnail from canvas
  const generateThumbnail = useCallback(async (): Promise<Blob | null> => {
    if (!canvasRef.current) return null;
    return new Promise((resolve) => {
      canvasRef.current?.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
    });
  }, [canvasRef]);

  /**
   * Export video with proper audio mixing via Web Audio API
   * Supports 3 modes: voice_only, music_only, voice_and_music
   */
  const exportVideo = useCallback(async (): Promise<Blob | null> => {
    if (!canvasRef.current || !engineRef.current) return null;
    
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    const animStyle = ANIMATION_STYLES[style] || ANIMATION_STYLES.fantasy;
    
    // Get canvas stream at 24 FPS
    const videoStream = canvas.captureStream(24);
    
    let combinedStream = videoStream;
    const audioElements: HTMLAudioElement[] = [];
    let audioContext: AudioContext | null = null;
    
    // Determine which audio sources to use
    const useVoice = audioMode === 'voice_only' || audioMode === 'voice_and_music';
    const useMusic = audioMode === 'music_only' || audioMode === 'voice_and_music';
    
    const hasVoice = useVoice && effectiveNarrationUrl;
    const musicUrl = selectedMusicTrack?.source?.url;
    const hasMusic = useMusic && musicUrl;
    
    if (hasVoice || hasMusic) {
      try {
        audioContext = new AudioContext();
        const destination = audioContext.createMediaStreamDestination();
        
        // Add voice track
        if (hasVoice) {
          console.log('[PublishStep] Adding voice track');
          const voiceEl = new Audio(effectiveNarrationUrl);
          voiceEl.crossOrigin = 'anonymous';
          voiceEl.volume = 1;
          
          await new Promise<void>((res, rej) => {
            voiceEl.oncanplaythrough = () => res();
            voiceEl.onerror = () => rej(new Error('Voice audio load failed'));
            voiceEl.load();
          });
          
          const voiceSource = audioContext.createMediaElementSource(voiceEl);
          const voiceGain = audioContext.createGain();
          voiceGain.gain.value = 1.0;
          voiceSource.connect(voiceGain);
          voiceGain.connect(destination);
          
          audioElements.push(voiceEl);
        }
        
        // Add music track
        if (hasMusic) {
          console.log('[PublishStep] Adding music track:', selectedMusicTrack?.title);
          const musicEl = new Audio(musicUrl);
          musicEl.crossOrigin = 'anonymous';
          musicEl.loop = true; // Loop music to fill duration
          musicEl.volume = 1;
          
          await new Promise<void>((res, rej) => {
            musicEl.oncanplaythrough = () => res();
            musicEl.onerror = () => rej(new Error('Music audio load failed'));
            musicEl.load();
          });
          
          const musicSource = audioContext.createMediaElementSource(musicEl);
          const musicGain = audioContext.createGain();
          // Music at 25% when combined with voice, 80% when alone
          musicGain.gain.value = audioMode === 'voice_and_music' ? 0.25 : 0.8;
          musicSource.connect(musicGain);
          musicGain.connect(destination);
          
          audioElements.push(musicEl);
        }
        
        // Create combined stream with video + mixed audio
        combinedStream = new MediaStream([
          ...videoStream.getVideoTracks(),
          ...destination.stream.getAudioTracks()
        ]);
        
        console.log('[PublishStep] Audio tracks added successfully, mode:', audioMode);
      } catch (e) {
        console.warn('[PublishStep] Could not add audio tracks:', e);
      }
    }
    
    // Determine best supported format
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';
    
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(combinedStream, { 
      mimeType,
      videoBitsPerSecond: 5000000,
      audioBitsPerSecond: 128000
    });
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    
    return new Promise((resolve) => {
      recorder.onstop = () => {
        // Cleanup
        audioElements.forEach(el => { el.pause(); el.src = ''; });
        audioContext?.close().catch(() => {});
        
        const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
        console.log('[PublishStep] Video export complete, size:', (blob.size / 1024 / 1024).toFixed(2), 'MB');
        resolve(blob);
      };
      
      recorder.start(100);
      
      // Start all audio elements in sync
      audioElements.forEach(el => {
        el.currentTime = 0;
        el.play().catch(e => console.warn('Audio play error:', e));
      });
      
      // Start animation playback
      engine.startSlideshowPreview(duration, animStyle, (progress) => {
        setExportProgress(progress * 100);
      });
      
      // Stop after duration
      setTimeout(() => {
        recorder.stop();
        engine.stopPreview();
        audioElements.forEach(el => el.pause());
      }, duration * 1000 + 500);
    });
  }, [canvasRef, engineRef, style, duration, effectiveNarrationUrl, audioMode, selectedMusicTrack]);

  // Handle download
  const handleDownload = useCallback(async () => {
    setIsExporting(true);
    setExportProgress(0);
    try {
      toast({ title: '🎬 Export en cours...', description: 'Création de ta vidéo...' });
      const videoBlob = await exportVideo();
      if (videoBlob) {
        const url = URL.createObjectURL(videoBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `griot-anime-${Date.now()}.${videoBlob.type.includes('mp4') ? 'mp4' : 'webm'}`;
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: '✅ Export terminé!', description: 'Ta vidéo a été téléchargée.' });
      }
    } catch (error) {
      console.error('[PublishStep] Export error:', error);
      toast({ title: 'Erreur d\'export', description: 'Réessaie dans quelques instants.', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  }, [exportVideo, toast]);

  // Handle share
  const handleShare = useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text: `🌙 Mon conte animé: ${title}`, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({ title: '📋 Lien copié!', description: 'Partage ce lien avec tes amis.' });
      }
    } catch (error) {
      console.error('[PublishStep] Share error:', error);
    }
  }, [title, toast]);

  // Handle publish to feed
  const handlePublish = useCallback(async () => {
    try {
      toast({ title: '🚀 Publication en cours...', description: 'Envoi vers le feed FITILA...' });
      const videoBlob = await exportVideo();
      if (!videoBlob) throw new Error('Échec de l\'export vidéo');
      const thumbnailBlob = await generateThumbnail();
      if (!thumbnailBlob) throw new Error('Échec de la génération de miniature');
      
      const result = await publishVideo({
        video: videoBlob,
        thumbnail: thumbnailBlob,
        title,
        description: storyText.slice(0, 200),
        templateId: 'griot-anime',
        templateName: 'Griot Animé IA',
        duration
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
          <h2 className="text-2xl font-bold text-amber-100 mb-2">🎉 Publié!</h2>
          <p className="text-amber-200/60">Ton conte est maintenant sur FITILA</p>
        </div>
        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <Button size="lg" onClick={() => window.location.href = '/fitila'} className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400">
            <ExternalLink className="w-4 h-4 mr-2" />📺 Voir le Feed
          </Button>
          <Button variant="outline" onClick={onReset} className="w-full border-amber-500/30 text-amber-200 hover:bg-amber-500/10">
            <Sparkles className="w-4 h-4 mr-2" />🔄 Créer un autre
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-amber-200/60">📝 Titre / Yíròn</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Mon conte animé..."
          className="bg-amber-950/30 border-amber-500/30 text-amber-100 placeholder:text-amber-200/30"
          maxLength={60}
        />
      </div>

      {/* Audio Mode Selector — TikTok-style */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-amber-200/60">🎧 Mode audio</label>
        <div className="grid grid-cols-3 gap-2">
          {AUDIO_MODES.map((mode) => {
            const Icon = mode.icon;
            const isActive = audioMode === mode.value;
            const needsMusic = mode.value === 'music_only' || mode.value === 'voice_and_music';
            
            return (
              <button
                key={mode.value}
                onClick={() => {
                  if (needsMusic && !selectedMusicTrack) {
                    setShowAudioLibrary(true);
                    setAudioMode(mode.value);
                  } else {
                    setAudioMode(mode.value);
                  }
                }}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all active:scale-95',
                  isActive
                    ? 'border-amber-400 bg-amber-500/20 text-amber-100 shadow-lg shadow-amber-500/10'
                    : 'border-amber-500/20 bg-amber-950/30 text-amber-200/60 hover:border-amber-500/40'
                )}
              >
                <span className="text-xl">{mode.emoji}</span>
                <Icon className={cn('w-4 h-4', isActive ? 'text-amber-300' : 'text-amber-200/40')} />
                <span className="text-[10px] font-medium leading-tight text-center">{mode.label}</span>
              </button>
            );
          })}
        </div>

        {/* Selected music display / Choose music button */}
        {audioMode !== 'voice_only' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {selectedMusicTrack ? (
              <div className="flex items-center gap-3 p-3 bg-amber-950/40 border border-amber-500/20 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/30 to-orange-500/30 flex items-center justify-center">
                  <Music className="w-5 h-5 text-amber-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-100 truncate">{selectedMusicTrack.title}</p>
                  <p className="text-xs text-amber-200/50">{selectedMusicTrack.artist}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAudioLibrary(true)}
                  className="text-amber-300 hover:text-amber-200 text-xs"
                >
                  Changer
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowAudioLibrary(true)}
                className="w-full border-amber-500/30 text-amber-200 hover:bg-amber-500/10 h-12"
              >
                <Music className="w-4 h-4 mr-2" />
                🎵 Choisir une musique
              </Button>
            )}
          </motion.div>
        )}

        {/* Audio mode info */}
        <p className="text-[10px] text-amber-200/40 text-center">
          {audioMode === 'voice_only' && '🎙️ Ta voix de griot sera l\'audio principal'}
          {audioMode === 'music_only' && '🎵 Seule la musique sera dans la vidéo'}
          {audioMode === 'voice_and_music' && '🎧 Voix à 100% + musique à 25%'}
        </p>
      </div>

      {/* Preview Thumbnail */}
      <div className="aspect-video w-full max-w-xs mx-auto rounded-xl overflow-hidden bg-amber-950/30 border border-amber-500/20">
        {scenes[0]?.imageUrl ? (
          <img src={scenes[0].imageUrl} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-amber-200/40">📺</div>
        )}
      </div>

      {/* Progress */}
      {(isExporting || isPublishing) && (
        <div className="space-y-2">
          <Progress value={isExporting ? exportProgress : publishProgress} className="h-3" />
          <p className="text-sm text-center text-amber-200/60">
            {isExporting ? `Export: ${Math.round(exportProgress)}%` : publishStage}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 gap-3">
        <Button
          variant="outline"
          size="lg"
          onClick={handleDownload}
          disabled={isExporting || isPublishing}
          className="w-full h-14 bg-amber-500/10 border-amber-500/30 text-amber-200 hover:bg-amber-500/20"
        >
          {isExporting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Download className="w-5 h-5 mr-2" />}
          ⬇️ Télécharger / Sɛ̀rɛ̀
        </Button>
        
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
            <><Loader2 className="w-6 h-6 mr-2 animate-spin" />Publication...</>
          ) : (
            <><Upload className="w-6 h-6 mr-2" />🌐 Publier sur FITILA<ArrowRight className="w-5 h-5 ml-2" /></>
          )}
        </Button>
      </div>

      <p className="text-xs text-center text-amber-200/40">Ta vidéo sera visible par tous sur le feed</p>

      {/* Audio Library Modal */}
      <AnimatePresence>
        {showAudioLibrary && (
          <AudioLibrary
            isOpen={true}
            onClose={() => setShowAudioLibrary(false)}
            onSelectTrack={handleMusicTrackSelect}
            selectedTrackId={selectedMusicTrack?.id}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default PublishStep;
