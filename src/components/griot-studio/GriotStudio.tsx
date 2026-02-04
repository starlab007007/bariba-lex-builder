/**
 * Griot Animé Studio v6.3
 * AI-powered Anime Story Creator
 * Complete workflow: Record → Generate → Preview → Publish
 * Voice-first design with minimal text
 * 
 * v6.3 additions:
 * - Cloud draft save/restore
 * - Cancel/Modify buttons with confirmation
 * - Fullscreen preview
 * - Navigate to feed after publish with focus on published video
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Wand2, Check, Loader2, X, Maximize, Minimize, Save, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { NarratorCapture } from './NarratorCapture';
import { VinylRecorder } from './VinylRecorder';
import { StoryPreviewPlayer } from './StoryPreviewPlayer';
import { PublishStep } from './PublishStep';
import { AnimeStyleSelector, AnimeStyleName } from './AnimeStyleSelector';
import { useAnimeStoryGenerator, StoryScene } from './hooks/useAnimeStoryGenerator';
import { useVFXEngine } from './hooks/useVFXEngine';
import { useGriotDraft } from './hooks/useGriotDraft';
import { GriotAnimationEngine, ANIMATION_STYLES } from '@/engines/GriotAnimationEngine';

type StudioStep = 'create' | 'generating' | 'preview' | 'finalize' | 'success';

const DURATION_OPTIONS = [
  { value: 15, label: '15s', emoji: '⚡', labelBa: 'Kpékpé' },
  { value: 30, label: '30s', emoji: '🎬', labelBa: 'Bìyà' },
  { value: 60, label: '60s', emoji: '🎥', labelBa: 'Gbángbá' }
];

// Confirmation modal component
function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-amber-950 border border-amber-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
      >
        <h3 className="text-lg font-bold text-amber-100 mb-2">{title}</h3>
        <p className="text-amber-200/70 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1 border-amber-500/30 text-amber-200">
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
            {confirmLabel}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export function GriotStudio() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GriotAnimationEngine | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // State
  const [step, setStep] = useState<StudioStep>('create');
  const [narratorFile, setNarratorFile] = useState<File | Blob | null>(null);
  const [narratorPreviewUrl, setNarratorPreviewUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [transcribedStory, setTranscribedStory] = useState('');
  const [style, setStyle] = useState<AnimeStyleName>('african');
  const [duration, setDuration] = useState(30);
  const [showNarratorCapture, setShowNarratorCapture] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [publishedVideoId, setPublishedVideoId] = useState<string | null>(null);

  // Hooks
  const {
    state: generationState,
    result: generationResult,
    generateStory,
    reset: resetGeneration
  } = useAnimeStoryGenerator();

  const { preloadStyleFlares } = useVFXEngine();
  const { draft, saveDraft, clearDraft, isSaving } = useGriotDraft();

  // Auto-save draft when step or data changes
  useEffect(() => {
    if (step === 'create' || step === 'preview' || step === 'finalize') {
      const timeout = setTimeout(() => {
        saveDraft({
          style,
          duration,
          audioUrl: null, // TODO: upload audio blob to storage
          narratorAvatarUrl: narratorPreviewUrl,
          step,
          scenes: generationResult?.scenes || null,
        });
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [step, style, duration, narratorPreviewUrl, generationResult, saveDraft]);

  // Initialize engine when canvas is ready and step is preview
  useEffect(() => {
    const initEngine = async () => {
      if ((step === 'preview' || step === 'finalize') && canvasRef.current) {
        if (!engineRef.current) {
          console.log('[GriotStudio] Initializing animation engine');
          engineRef.current = new GriotAnimationEngine(canvasRef.current);
        }

        // Load pending scenes if any
        const pending = (window as any).__griotPendingScenes;
        if (pending && engineRef.current) {
          console.log('[GriotStudio] Loading', pending.scenes.length, 'scenes into engine');

          try {
            await engineRef.current.loadScenes(pending.scenes);

            if (pending.narratorUrl) {
              await engineRef.current.loadNarratorAvatar(pending.narratorUrl);
            }

            if (pending.audioUrl) {
              engineRef.current.setAudio(pending.audioUrl);
            }

            // Clear pending data
            delete (window as any).__griotPendingScenes;
          } catch (err) {
            console.error('[GriotStudio] Failed to load scenes:', err);
          }
        }
      }
    };

    initEngine();

    return () => {
      if (step !== 'preview' && step !== 'finalize' && engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, [step]);

  // Fullscreen API toggle
  const toggleFullscreen = useCallback(() => {
    if (!previewContainerRef.current) return;
    if (!document.fullscreenElement) {
      previewContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Handlers
  const handleNarratorCaptured = useCallback((file: File | Blob) => {
    setNarratorFile(file);
    const url = URL.createObjectURL(file);
    setNarratorPreviewUrl(url);
    setShowNarratorCapture(false);
  }, []);

  const clearNarrator = useCallback(() => {
    if (narratorPreviewUrl) {
      URL.revokeObjectURL(narratorPreviewUrl);
    }
    setNarratorFile(null);
    setNarratorPreviewUrl(null);
  }, [narratorPreviewUrl]);

  const handleRecordingComplete = useCallback(async (blob: Blob, recordedDuration: number) => {
    setAudioBlob(blob);
    setAudioDuration(recordedDuration);

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 30, 50]);
    }

    toast({
      title: '🎤 Enregistré!',
      description: `${Math.floor(recordedDuration)}s de ton conte.`
    });

    // Placeholder for transcription
    setTranscribedStory('[Audio enregistré - Génération en cours...]');

    // Auto-trigger generation after short delay
    setTimeout(() => {
      handleGenerate(blob);
    }, 500);
  }, [toast]);

  const handleGenerate = useCallback(async (audioToTranscribe?: Blob) => {
    setStep('generating');

    try {
      // Preload VFX assets
      await preloadStyleFlares(style);

      // Demo story fallback - use demo if transcribed text is empty, placeholder, or too short
      const isPlaceholder = !transcribedStory || transcribedStory.trim().length < 10 || transcribedStory.startsWith('[');
      const storyText = isPlaceholder
        ? 'Il était une fois dans un village africain, un jeune garçon nommé Kofi qui rêvait de devenir un grand griot. Un jour, il rencontra un vieux sage qui lui apprit les secrets des contes ancestraux. Le sage lui dit: "Pour devenir griot, tu dois écouter les histoires du vent et chanter avec les étoiles."'
        : transcribedStory;

      console.log('[GriotStudio] Generating with story:', storyText.substring(0, 50) + '...');

      // Generate anime story with AI
      const result = await generateStory(storyText, style, duration);

      if (!result || !result.scenes.length) {
        throw new Error('Aucune scène générée');
      }

      console.log('[GriotStudio] Generation complete, got', result.scenes.length, 'scenes');

      // Calculate timing for each scene
      let currentTime = 0;
      const scenesWithTiming = result.scenes.map((scene: StoryScene) => {
        const sceneData = {
          imageUrl: scene.imageUrl || '',
          startTime: currentTime,
          endTime: currentTime + scene.durationSeconds,
          emotion: scene.emotion
        };
        currentTime += scene.durationSeconds;
        return sceneData;
      }).filter(s => s.imageUrl);

      console.log('[GriotStudio] Scenes with timing:', scenesWithTiming.length);

      // Store scenes data for loading after canvas mount
      (window as any).__griotPendingScenes = {
        scenes: scenesWithTiming,
        narratorUrl: narratorPreviewUrl,
        audioUrl: result.audioUrl,
        style: style,
        duration: duration
      };

      // Update transcribed story
      setTranscribedStory(storyText);

      // Transition to preview
      setStep('preview');
    } catch (error) {
      console.error('[GriotStudio] Generation error:', error);
      toast({
        title: 'Erreur de génération',
        description: error instanceof Error ? error.message : 'Réessaie dans quelques instants.',
        variant: 'destructive'
      });
      setStep('create');
    }
  }, [style, duration, preloadStyleFlares, generateStory, narratorPreviewUrl, transcribedStory, toast]);

  const handleContinueToFinalize = useCallback(() => {
    setStep('finalize');
  }, []);

  const handlePublishSuccess = useCallback((videoId: string) => {
    setPublishedVideoId(videoId);
    clearDraft();
    setStep('success');
    console.log('[GriotStudio] Published video:', videoId);
  }, [clearDraft]);

  const handleViewInFeed = useCallback(() => {
    // Navigate to feed and scroll to the published video
    if (publishedVideoId) {
      navigate(`/fitila?video=${publishedVideoId}`);
    } else {
      navigate('/fitila');
    }
  }, [navigate, publishedVideoId]);

  const handleReset = useCallback(() => {
    engineRef.current?.stopPreview();
    resetGeneration();
    clearNarrator();
    setAudioBlob(null);
    setAudioDuration(0);
    setTranscribedStory('');
    setPublishedVideoId(null);
    clearDraft();
    setStep('create');
  }, [resetGeneration, clearNarrator, clearDraft]);

  const handleBack = useCallback(() => {
    if (step === 'finalize') {
      setStep('preview');
    } else if (step === 'preview') {
      engineRef.current?.stopPreview();
      setStep('create');
    } else if (step === 'generating') {
      setStep('create');
    }
  }, [step]);

  // Cancel with confirmation
  const handleCancelClick = useCallback(() => {
    if (audioBlob || generationResult) {
      setShowCancelConfirm(true);
    } else {
      navigate(-1);
    }
  }, [audioBlob, generationResult, navigate]);

  const confirmCancel = useCallback(() => {
    setShowCancelConfirm(false);
    handleReset();
    navigate(-1);
  }, [handleReset, navigate]);

  // Modify: go back to create step
  const handleModify = useCallback(() => {
    engineRef.current?.stopPreview();
    setStep('create');
  }, []);

  const canGenerate = audioBlob !== null;

  return (
    <div className="min-h-[100dvh] h-[100dvh] flex flex-col bg-gradient-to-b from-amber-950 via-black to-black text-white overflow-hidden">
      {/* Confirmation Modal */}
      <AnimatePresence>
        <ConfirmModal
          isOpen={showCancelConfirm}
          title="Annuler la création ?"
          message="Ton enregistrement et tes illustrations seront perdus."
          confirmLabel="Oui, annuler"
          cancelLabel="Non, continuer"
          onConfirm={confirmCancel}
          onCancel={() => setShowCancelConfirm(false)}
        />
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-3 bg-black/80 backdrop-blur-lg border-b border-amber-500/20 safe-area-inset-top">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {/* Left: Back / Cancel */}
          <div className="flex items-center gap-1">
            {step !== 'create' && step !== 'success' ? (
              <Button variant="ghost" size="icon" onClick={handleBack} className="text-amber-200 hover:text-amber-100">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            ) : null}
            <Button variant="ghost" size="icon" onClick={handleCancelClick} className="text-red-400 hover:text-red-300">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <h1 className="text-lg font-bold text-amber-100 flex items-center gap-2">
            <span className="text-2xl">🌙</span>
            <span className="hidden sm:inline">Griot Animé</span>
          </h1>

          {/* Right: Save / Modify */}
          <div className="flex items-center gap-1">
            {(step === 'preview' || step === 'finalize') && (
              <Button variant="ghost" size="icon" onClick={handleModify} className="text-amber-200 hover:text-amber-100" title="Modifier">
                <RotateCcw className="w-5 h-5" />
              </Button>
            )}
            {isSaving ? (
              <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
            ) : (
              <Button variant="ghost" size="icon" onClick={() => saveDraft({ step })} className="text-amber-200 hover:text-amber-100" title="Sauvegarder">
                <Save className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto overscroll-contain px-4 py-6 max-w-lg mx-auto space-y-6 pb-24">

        {/* Step: Create */}
        {step === 'create' && (
          <>
            {/* Narrator Capture Modal */}
            {showNarratorCapture && (
              <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                <div className="bg-amber-950 rounded-2xl p-6 max-w-sm w-full border border-amber-500/30">
                  <NarratorCapture
                    onImageCaptured={handleNarratorCaptured}
                    previewUrl={narratorPreviewUrl}
                    onClear={clearNarrator}
                    disabled={false}
                  />
                  <Button variant="ghost" onClick={() => setShowNarratorCapture(false)} className="w-full mt-4 text-amber-200/60">
                    Annuler
                  </Button>
                </div>
              </div>
            )}

            {/* Vinyl Recorder */}
            <section className="py-4">
              <VinylRecorder
                avatarUrl={narratorPreviewUrl}
                maxDuration={duration}
                onRecordingComplete={handleRecordingComplete}
                onAvatarCapture={() => setShowNarratorCapture(true)}
                disabled={generationState.isGenerating}
                accentColor="#FFD700"
              />
            </section>

            {/* Anime Style Selector */}
            <section>
              <AnimeStyleSelector
                selected={style}
                onSelect={setStyle}
                disabled={generationState.isGenerating}
              />
            </section>

            {/* Duration Selector */}
            <section>
              <h3 className="text-sm font-medium text-amber-200/60 mb-3 text-center">⏱️ Durée</h3>
              <div className="flex justify-center gap-3">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDuration(opt.value)}
                    disabled={generationState.isGenerating}
                    className={cn(
                      'px-5 py-3 rounded-xl border transition-all min-w-[80px]',
                      'active:scale-95',
                      duration === opt.value
                        ? 'border-amber-400 bg-amber-500/20 text-amber-100'
                        : 'border-amber-500/20 bg-amber-950/20 text-amber-200/60 hover:border-amber-500/40'
                    )}
                  >
                    <span className="text-lg mr-1">{opt.emoji}</span>
                    <span className="font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Info text */}
            <p className="text-xs text-center text-amber-200/40 pt-4">🎙️ Maintiens pour enregistrer ton conte</p>
          </>
        )}

        {/* Step: Generating */}
        {step === 'generating' && (
          <section className="flex-1 flex flex-col items-center justify-center py-8 space-y-8">
            {/* Animated Icon */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-2xl animate-pulse" />
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Wand2 className="w-20 h-20 text-amber-400 relative z-10" />
              </motion.div>
            </motion.div>

            {/* Title and message */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-amber-100">📚 Bibliothèque Griot</h2>
              <motion.p 
                key={generationState.message}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-amber-200/80 text-base"
              >
                {generationState.message || 'Sélection des illustrations...'}
              </motion.p>
            </div>

            {/* Progress bar - enhanced */}
            <div className="w-full max-w-xs space-y-2">
              <div className="w-full bg-amber-900/40 rounded-full h-3 overflow-hidden shadow-inner">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 rounded-full relative overflow-hidden"
                  initial={{ width: 0 }}
                  animate={{ width: `${generationState.progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </motion.div>
              </div>
              <p className="text-center text-amber-300 text-lg font-semibold">
                {Math.round(generationState.progress)}%
              </p>
            </div>

            {/* Scene dots - compact and elegant */}
            {generationState.totalScenes > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center gap-3"
              >
                {Array.from({ length: generationState.totalScenes }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300',
                      i < generationState.currentScene
                        ? 'bg-green-500 shadow-lg shadow-green-500/30'
                        : i === generationState.currentScene
                          ? 'bg-amber-500 animate-pulse shadow-lg shadow-amber-500/30'
                          : 'bg-amber-900/40 border border-amber-500/20'
                    )}
                  >
                    {i < generationState.currentScene ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : (
                      <span className="text-white/80 text-xs font-medium">{i + 1}</span>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Info message */}
            <p className="text-amber-200/50 text-xs text-center max-w-xs">
              ⚡ Images pré-générées pour une création ultra-rapide
            </p>
          </section>
        )}

        {/* Step: Preview */}
        {step === 'preview' && generationResult && (
          <section className="space-y-6" ref={previewContainerRef}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-amber-100">🎬 Preview / Gbíyà</h2>
              <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-amber-200 hover:text-amber-100">
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </Button>
            </div>

            <StoryPreviewPlayer
              scenes={generationResult.scenes}
              audioUrl={generationResult.audioUrl}
              narratorAvatarUrl={narratorPreviewUrl}
              style={style}
              duration={duration}
            />

            {/* Continue button */}
            <div className="pt-4">
              <Button
                size="lg"
                onClick={handleContinueToFinalize}
                className={cn(
                  'w-full py-6 text-lg font-semibold rounded-2xl',
                  'bg-gradient-to-r from-amber-500 to-orange-500',
                  'hover:from-amber-400 hover:to-orange-400'
                )}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                ✅ Continuer / Tɛ́rɛ́
              </Button>
            </div>

            {/* Reset button */}
            <Button variant="ghost" onClick={handleReset} className="w-full text-amber-200/60 hover:text-amber-200">
              🔄 Recommencer
            </Button>
          </section>
        )}

        {/* Step: Finalize */}
        {step === 'finalize' && generationResult && (
          <section className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-lg font-semibold text-amber-100">📤 Finaliser / Sɔ̀ɔ́rɔ́</h2>
            </div>

            {/* Hidden canvas for export */}
            <canvas ref={canvasRef} width={540} height={960} className="hidden" />

            <PublishStep
              scenes={generationResult.scenes}
              audioUrl={generationResult.audioUrl}
              narratorAvatarUrl={narratorPreviewUrl}
              style={style}
              duration={duration}
              storyText={transcribedStory}
              canvasRef={canvasRef}
              engineRef={engineRef}
              onPublishSuccess={handlePublishSuccess}
              onReset={handleReset}
            />
          </section>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <section className="py-12 text-center space-y-6">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="text-6xl">
              🎉
            </motion.div>
            <h2 className="text-2xl font-bold text-amber-100">Publié sur FITILA!</h2>
            <p className="text-amber-200/60">Ton conte est maintenant visible par tous</p>

            <div className="flex flex-col gap-3 max-w-xs mx-auto pt-4">
              <Button size="lg" onClick={handleViewInFeed} className="w-full bg-gradient-to-r from-amber-500 to-orange-500">
                📺 Voir dans le Feed
              </Button>

              <Button variant="outline" onClick={handleReset} className="w-full border-amber-500/30 text-amber-200">
                🔄 Créer un autre conte
              </Button>
            </div>
          </section>
        )}
      </main>

      {/* Footer branding */}
      <footer className="fixed bottom-0 left-0 right-0 py-2 bg-black/60 backdrop-blur-sm safe-area-inset-bottom">
        <p className="text-center text-xs text-amber-200/30">Griot Animé v6.3 • FITILA AI</p>
      </footer>
    </div>
  );
}

export default GriotStudio;
