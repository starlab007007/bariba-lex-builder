/**
 * PublishStep v3.1
 * Finalization screen with audio mode selector (TikTok-style), music library integration,
 * Web Audio API mixing, export MP4 and publish to feed.
 * 
 * v3.1 fixes:
 * - useNavigate instead of window.location.href
 * - Robust audio loading with try/catch fallback
 * - Responsive layout with max-w-md, centered
 * - VinylRecorder onAvatarCapture support
 * - Scroll-friendly layout
 */

import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Upload, Loader2, Sparkles, ArrowRight, Mic, Music, Volume2 } from 'lucide-react';
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
import { VinylRecorder } from './VinylRecorder';

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
  const navigate = useNavigate();
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
  const hasInitialNarration = !!(narrationAudioUrl || audioUrl);
  const [audioMode, setAudioMode] = useState<AudioMode>(hasInitialNarration ? 'voice_only' : 'music_only');
  const [showAudioLibrary, setShowAudioLibrary] = useState(false);
  const [selectedMusicTrack, setSelectedMusicTrack] = useState<AudioTrack | null>(null);
  const [localNarrationUrl, setLocalNarrationUrl] = useState<string | null>(null);

  // Effective narration URL: local recording > prop narrationAudioUrl > prop audioUrl
  const effectiveNarrationUrl = localNarrationUrl || narrationAudioUrl || audioUrl;
  const hasNarration = !!effectiveNarrationUrl;

  // Handle music track selection
  const handleMusicTrackSelect = useCallback((track: AudioTrack) => {
    setSelectedMusicTrack(track);
    setShowAudioLibrary(false);
    toast({ title: `🎵 ${track.title}`, description: 'Musique sélectionnée' });
  }, [toast]);

  // Handle local recording from VinylRecorder
  const handleLocalRecording = useCallback((blob: Blob, dur: number) => {
    const url = URL.createObjectURL(blob);
    setLocalNarrationUrl(url);
    if (audioMode === 'music_only') setAudioMode('voice_only');
    toast({ title: '🎤 Voix enregistrée!', description: `${Math.floor(dur)}s de narration` });
  }, [toast, audioMode]);

  // Generate thumbnail from canvas
  const generateThumbnail = useCallback(async (): Promise<Blob | null> => {
    if (!canvasRef.current) return null;
    return new Promise((resolve) => {
      canvasRef.current?.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
    });
  }, [canvasRef]);

  /**
   * Export video with proper audio mixing via Web Audio API
   * Uses fetch + decodeAudioData + AudioBufferSourceNode for reliable audio
   * (avoids createMediaElementSource CORS issues that silently mute audio)
   */
  const exportVideo = useCallback(async (): Promise<Blob | null> => {
    if (!canvasRef.current || !engineRef.current) {
      console.error('[PublishStep] Canvas or engine not initialized');
      return null;
    }
    
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    const animStyle = ANIMATION_STYLES[style] || ANIMATION_STYLES.fantasy;
    
    const videoStream = canvas.captureStream(24);
    let combinedStream = videoStream;
    let audioContext: AudioContext | null = null;
    const sourceNodes: AudioBufferSourceNode[] = [];
    
    const useVoice = audioMode === 'voice_only' || audioMode === 'voice_and_music';
    const useMusic = audioMode === 'music_only' || audioMode === 'voice_and_music';
    
    const hasVoice = useVoice && effectiveNarrationUrl;
    const musicUrl = selectedMusicTrack?.source?.url;
    const hasMusic = useMusic && musicUrl;
    
    console.log('[PublishStep] Export config:', { audioMode, hasVoice, hasMusic, effectiveNarrationUrl: effectiveNarrationUrl?.substring(0, 40), musicUrl: musicUrl?.substring(0, 40) });
    
    if (hasVoice || hasMusic) {
      try {
        audioContext = new AudioContext({ sampleRate: 44100 });
        if (audioContext.state === 'suspended') await audioContext.resume();
        console.log('[PublishStep] AudioContext state:', audioContext.state, 'sampleRate:', audioContext.sampleRate);
        
        const destination = audioContext.createMediaStreamDestination();
        let audioConnected = false;
        
        // Helper: fetch URL → decode to AudioBuffer (works for blob: and https:)
        const loadAudioBuffer = async (url: string, label: string): Promise<AudioBuffer> => {
          console.log(`[PublishStep] Fetching ${label}...`);
          const response = await fetch(url);
          if (!response.ok) throw new Error(`${label} fetch failed: ${response.status}`);
          const arrayBuffer = await response.arrayBuffer();
          console.log(`[PublishStep] ${label} fetched: ${(arrayBuffer.byteLength / 1024).toFixed(0)} KB`);
          // Clone buffer because decodeAudioData detaches it
          const bufferCopy = arrayBuffer.slice(0);
          const audioBuffer = await audioContext!.decodeAudioData(bufferCopy);
          console.log(`[PublishStep] ${label} decoded: ${audioBuffer.duration.toFixed(1)}s, ${audioBuffer.numberOfChannels}ch, ${audioBuffer.sampleRate}Hz`);
          return audioBuffer;
        };
        
        // Load and connect VOICE
        if (hasVoice) {
          try {
            const voiceBuffer = await loadAudioBuffer(effectiveNarrationUrl, 'Voice');
            const voiceSource = audioContext.createBufferSource();
            voiceSource.buffer = voiceBuffer;
            const voiceGain = audioContext.createGain();
            voiceGain.gain.value = 1.0;
            voiceSource.connect(voiceGain);
            voiceGain.connect(destination);
            sourceNodes.push(voiceSource);
            audioConnected = true;
            console.log('[PublishStep] ✅ Voice connected to MediaStream');
          } catch (err) {
            console.error('[PublishStep] ❌ Voice audio FAILED:', err);
          }
        }
        
        // Load and connect MUSIC
        if (hasMusic) {
          try {
            const musicBuffer = await loadAudioBuffer(musicUrl, 'Music');
            const musicSource = audioContext.createBufferSource();
            musicSource.buffer = musicBuffer;
            musicSource.loop = true;
            const musicGain = audioContext.createGain();
            musicGain.gain.value = audioMode === 'voice_and_music' ? 0.25 : 0.8;
            musicSource.connect(musicGain);
            musicGain.connect(destination);
            sourceNodes.push(musicSource);
            audioConnected = true;
            console.log('[PublishStep] ✅ Music connected to MediaStream');
          } catch (err) {
            console.error('[PublishStep] ❌ Music audio FAILED:', err);
            toast({ title: '⚠️ Musique indisponible', description: 'Export sans musique de fond.', variant: 'destructive' });
          }
        }
        
        if (audioConnected) {
          const audioTracks = destination.stream.getAudioTracks();
          console.log('[PublishStep] Audio tracks for recorder:', audioTracks.length, audioTracks.map(t => t.label));
          combinedStream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...audioTracks
          ]);
        }
      } catch (e) {
        console.error('[PublishStep] Audio context setup FAILED, exporting video only:', e);
      }
    }
    
    // Select best available codec with audio support
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm';
    
    console.log('[PublishStep] MediaRecorder mimeType:', mimeType);
    console.log('[PublishStep] Combined stream tracks:', combinedStream.getTracks().map(t => `${t.kind}:${t.readyState}`));
    
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
        // Stop all AudioBufferSourceNodes
        sourceNodes.forEach(node => { try { node.stop(); } catch {} });
        audioContext?.close().catch(() => {});
        const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
        console.log('[PublishStep] ✅ Export complete. Blob size:', (blob.size / 1024 / 1024).toFixed(2), 'MB, Audio tracks:', combinedStream.getAudioTracks().length);
        resolve(blob);
      };
      
      // Start all AudioBufferSourceNodes FIRST, then start recording
      for (const node of sourceNodes) {
        node.start(0);
        console.log('[PublishStep] AudioBufferSourceNode started');
      }
      
      // Small delay to ensure audio buffers are flowing
      setTimeout(() => {
        recorder.start(100);
        console.log('[PublishStep] MediaRecorder started');
        
        // Start animation
        engine.startSlideshowPreview(duration, animStyle, (progress) => {
          setExportProgress(progress * 100);
        });
        
        // Stop after duration
        setTimeout(() => {
          recorder.stop();
          engine.stopPreview();
          console.log('[PublishStep] Recording stopped after', duration, 'seconds');
        }, duration * 1000 + 500);
      }, 200);
    });
  }, [canvasRef, engineRef, style, duration, effectiveNarrationUrl, audioMode, selectedMusicTrack, toast]);

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
      setIsExporting(true);
      setExportProgress(0);
      toast({ title: '🎬 Export vidéo en cours...', description: 'Préparation de ta vidéo avec audio...' });
      
      const videoBlob = await exportVideo();
      if (!videoBlob) throw new Error('Échec de l\'export vidéo');
      
      console.log('[PublishStep] Video exported:', (videoBlob.size / 1024 / 1024).toFixed(2), 'MB, type:', videoBlob.type);
      setIsExporting(false);
      setExportProgress(100);
      
      const thumbnailBlob = await generateThumbnail();
      if (!thumbnailBlob) throw new Error('Échec de la génération de miniature');
      
      toast({ title: '🚀 Publication en cours...', description: 'Envoi vers le feed...' });
      
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
        console.log('[PublishStep] ✅ Published successfully, videoId:', result.videoId);
        setIsPublished(true);
        setPublishedVideoId(result.videoId || null);
        
        // Notify parent immediately — parent handles redirect
        onPublishSuccess?.(result.videoId || '');
        
        // AGGRESSIVE fallback redirect — ensures user ALWAYS goes to feed
        const feedUrl = result.videoId ? `/fitila?video=${result.videoId}` : '/fitila';
        setTimeout(() => {
          try {
            navigate(feedUrl);
          } catch {
            // Ultimate fallback: hard redirect
            window.location.href = feedUrl;
          }
        }, 1500);
      }
    } catch (error) {
      console.error('[PublishStep] Publish error:', error);
      setIsExporting(false);
      setExportProgress(0);
      toast({
        title: 'Erreur de publication',
        description: error instanceof Error ? error.message : 'Réessaie dans quelques instants.',
        variant: 'destructive'
      });
    }
  }, [exportVideo, generateThumbnail, publishVideo, title, storyText, duration, onPublishSuccess, toast, navigate]);

  // Success: no blocking screen — parent handles redirect via onPublishSuccess

  return (
    <div className="space-y-5 w-full max-w-md mx-auto overflow-y-auto">
      {/* Title Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-amber-200/80">📝 Titre</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Mon conte animé..."
          className="bg-amber-950/40 border-amber-500/30 text-amber-100 placeholder:text-amber-200/30"
          maxLength={60}
        />
      </div>

      {/* Narration / Vinyl Recorder */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-amber-200/80">🎙️ Narration</label>
        {hasNarration ? (
          <div className="flex items-center gap-3 p-4 bg-emerald-900/30 border border-emerald-500/30 rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Mic className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-200">✅ Voix enregistrée</p>
              <p className="text-xs text-emerald-200/60">Prêt pour la publication</p>
            </div>
          </div>
        ) : (
          <VinylRecorder
            avatarUrl={narratorAvatarUrl}
            maxDuration={120}
            onRecordingComplete={handleLocalRecording}
            onAvatarCapture={undefined}
            disabled={false}
            accentColor="#FFD700"
          />
        )}
      </div>

      {/* Audio Mode Selector — TikTok-style */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-amber-200/80">🎧 Mode audio</label>
        <div className="grid grid-cols-3 gap-2">
          {AUDIO_MODES.map((mode) => {
            const Icon = mode.icon;
            const isActive = audioMode === mode.value;
            const needsVoice = mode.value === 'voice_only' || mode.value === 'voice_and_music';
            const isVoiceDisabled = needsVoice && !hasNarration;
            
            return (
              <button
                key={mode.value}
                onClick={() => {
                  if (isVoiceDisabled) return;
                  const needsMusic = mode.value === 'music_only' || mode.value === 'voice_and_music';
                  if (needsMusic && !selectedMusicTrack) {
                    setShowAudioLibrary(true);
                    setAudioMode(mode.value);
                  } else {
                    setAudioMode(mode.value);
                  }
                }}
                disabled={isVoiceDisabled}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all min-h-[72px]',
                  isVoiceDisabled
                    ? 'border-white/5 bg-white/5 text-white/20 cursor-not-allowed'
                    : isActive
                      ? 'border-amber-400 bg-amber-500/20 text-white shadow-lg shadow-amber-500/10 active:scale-95'
                      : 'border-white/10 bg-white/5 text-white/60 hover:border-amber-500/40 active:scale-95'
                )}
              >
                <span className="text-xl">{mode.emoji}</span>
                <Icon className={cn('w-4 h-4', isVoiceDisabled ? 'text-white/15' : isActive ? 'text-amber-300' : 'text-white/40')} />
                <span className="text-[10px] font-medium leading-tight text-center">{mode.label}</span>
                {isVoiceDisabled && <span className="text-[8px] text-white/20">Enregistre d'abord</span>}
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
                  <p className="text-sm font-medium text-white truncate">{selectedMusicTrack.title}</p>
                  <p className="text-xs text-white/50">{selectedMusicTrack.artist}</p>
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
                className="w-full border-amber-500/30 text-white hover:bg-amber-500/10 h-12"
              >
                <Music className="w-4 h-4 mr-2" />
                🎵 Choisir une musique
              </Button>
            )}
          </motion.div>
        )}

        {/* Audio mode info */}
        <p className="text-[10px] text-white/40 text-center">
          {audioMode === 'voice_only' && '🎙️ Ta voix de griot sera l\'audio principal'}
          {audioMode === 'music_only' && '🎵 Seule la musique sera dans la vidéo'}
          {audioMode === 'voice_and_music' && '🎧 Voix à 100% + musique à 25%'}
        </p>
      </div>

      {/* Preview Thumbnail — Responsive */}
      <div className="aspect-[9/16] w-full max-w-[180px] sm:max-w-[220px] md:max-w-[260px] mx-auto rounded-2xl overflow-hidden bg-amber-950/30 border border-amber-500/20 shadow-lg">
        {scenes[0]?.imageUrl ? (
          <img src={scenes[0].imageUrl} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/40">📺</div>
        )}
      </div>

      {/* Progress */}
      {(isExporting || isPublishing) && (
        <div className="space-y-2">
          <Progress value={isExporting ? exportProgress : publishProgress} className="h-3" />
          <p className="text-sm text-center text-white/60">
            {isExporting ? `Export: ${Math.round(exportProgress)}%` : publishStage}
          </p>
        </div>
      )}

      {/* Published success — redirect feedback */}
      {isPublished ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 py-8"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            className="w-12 h-12 border-3 border-emerald-400/30 border-t-emerald-400 rounded-full"
          />
          <p className="text-emerald-300 font-semibold text-lg">🎉 Publié!</p>
          <p className="text-white/60 text-sm">Redirection vers le feed...</p>
        </motion.div>
      ) : (
        <>
          {/* Action Buttons — Centered, responsive, min-height for accessibility */}
          <div className="space-y-3 w-full">
            <Button
              variant="outline"
              size="lg"
              onClick={handleShare}
              disabled={isExporting || isPublishing}
              className="w-full h-14 bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-2xl"
            >
              <Share2 className="w-5 h-5 mr-2" />
              📤 Partager
            </Button>
            
            <Button
              size="lg"
              onClick={handlePublish}
              disabled={isExporting || isPublishing || !title.trim()}
              className={cn(
                "w-full h-16 text-lg font-semibold rounded-2xl",
                "bg-gradient-to-r from-emerald-500 to-teal-500",
                "hover:from-emerald-400 hover:to-teal-400",
                "text-white",
                "disabled:opacity-50"
              )}
            >
              {isPublishing ? (
                <><Loader2 className="w-6 h-6 mr-2 animate-spin" />Publication...</>
              ) : (
                <><Upload className="w-6 h-6 mr-2" />🚀 Publier<ArrowRight className="w-5 h-5 ml-2" /></>
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-white/30 pb-4">Ta vidéo sera visible par tous sur le feed</p>
        </>
      )}

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
