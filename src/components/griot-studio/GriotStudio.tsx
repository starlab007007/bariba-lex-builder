/**
 * Griot Animé Studio v6.2
 * AI-powered Anime Story Creator
 * Complete workflow: Record → Generate → Preview → Publish
 * Voice-first design with minimal text
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, Sparkles, Wand2, Check, Loader2 } from 'lucide-react';
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
import { GriotAnimationEngine, ANIMATION_STYLES } from '@/engines/GriotAnimationEngine';

type StudioStep = 'create' | 'generating' | 'preview' | 'finalize' | 'success';

const DURATION_OPTIONS = [
  { value: 15, label: '15s', emoji: '⚡', labelBa: 'Kpékpé' },
  { value: 30, label: '30s', emoji: '🎬', labelBa: 'Bìyà' },
  { value: 60, label: '60s', emoji: '🎥', labelBa: 'Gbángbá' }
];

export function GriotStudio() {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GriotAnimationEngine | null>(null);
  
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

  // Hooks
  const {
    state: generationState,
    result: generationResult,
    generateStory,
    reset: resetGeneration
  } = useAnimeStoryGenerator();

  const { preloadStyleFlares } = useVFXEngine();

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
      title: "🎤 Enregistré!",
      description: `${Math.floor(recordedDuration)}s de ton conte.`
    });
    
    // TODO: Transcribe audio using Whisper or similar
    // For now, use a placeholder
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

      // For now, use a demo story if transcription is not ready
      // In production, this would call a transcription API
      const storyText = transcribedStory.startsWith('[') 
        ? "Il était une fois dans un village africain, un jeune garçon nommé Kofi qui rêvait de devenir un grand griot. Un jour, il rencontra un vieux sage qui lui apprit les secrets des contes ancestraux."
        : transcribedStory;

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
        title: "Erreur de génération",
        description: error instanceof Error ? error.message : "Réessaie dans quelques instants.",
        variant: "destructive"
      });
      setStep('create');
    }
  }, [style, duration, preloadStyleFlares, generateStory, narratorPreviewUrl, transcribedStory, toast]);

  const handleContinueToFinalize = useCallback(() => {
    setStep('finalize');
  }, []);

  const handlePublishSuccess = useCallback((videoId: string) => {
    setStep('success');
    console.log('[GriotStudio] Published video:', videoId);
  }, []);

  const handleReset = useCallback(() => {
    engineRef.current?.stopPreview();
    resetGeneration();
    clearNarrator();
    setAudioBlob(null);
    setAudioDuration(0);
    setTranscribedStory('');
    setStep('create');
  }, [resetGeneration, clearNarrator]);

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

  const canGenerate = audioBlob !== null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-950 via-black to-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-3 bg-black/80 backdrop-blur-lg border-b border-amber-500/20">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {step !== 'create' && step !== 'success' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="text-amber-200 hover:text-amber-100"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span className="sr-only md:not-sr-only">Retour</span>
            </Button>
          ) : (
            <div className="w-16" />
          )}
          
          <h1 className="text-lg font-bold text-amber-100 flex items-center gap-2">
            <span className="text-2xl">🌙</span>
            <span className="hidden sm:inline">Griot Animé</span>
          </h1>
          
          <div className="w-16" />
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6 pb-24">
        
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
                  <Button
                    variant="ghost"
                    onClick={() => setShowNarratorCapture(false)}
                    className="w-full mt-4 text-amber-200/60"
                  >
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
              <h3 className="text-sm font-medium text-amber-200/60 mb-3 text-center">
                ⏱️ Durée
              </h3>
              <div className="flex justify-center gap-3">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDuration(opt.value)}
                    disabled={generationState.isGenerating}
                    className={cn(
                      "px-5 py-3 rounded-xl border transition-all min-w-[80px]",
                      "active:scale-95",
                      duration === opt.value
                        ? "border-amber-400 bg-amber-500/20 text-amber-100"
                        : "border-amber-500/20 bg-amber-950/20 text-amber-200/60 hover:border-amber-500/40"
                    )}
                  >
                    <span className="text-lg mr-1">{opt.emoji}</span>
                    <span className="font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Info text */}
            <p className="text-xs text-center text-amber-200/40 pt-4">
              🎙️ Maintiens pour enregistrer ton conte
            </p>
          </>
        )}

        {/* Step: Generating */}
        {step === 'generating' && (
          <section className="py-8 space-y-6">
            <div className="text-center">
              <Wand2 className="w-16 h-16 mx-auto text-amber-400 animate-pulse mb-4" />
              <h2 className="text-xl font-semibold text-amber-100 mb-2">
                🎨 L'IA illustre...
              </h2>
              <p className="text-amber-200/60 text-sm">
                {generationState.message || 'Création en cours...'}
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-amber-900/30 rounded-full h-4 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500 relative"
                style={{ width: `${generationState.progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>
            <p className="text-center text-amber-200/60 text-sm">
              {Math.round(generationState.progress)}%
            </p>

            {/* Scene progress */}
            {generationState.totalScenes > 0 && (
              <div className="flex justify-center gap-2">
                {Array.from({ length: generationState.totalScenes }).map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                      i < generationState.currentScene 
                        ? "bg-green-500/20 border-2 border-green-400" 
                        : i === generationState.currentScene 
                          ? "bg-amber-500/20 border-2 border-amber-400 animate-pulse"
                          : "bg-amber-900/20 border border-amber-500/20"
                    )}
                  >
                    {i < generationState.currentScene ? (
                      <Check className="w-5 h-5 text-green-400" />
                    ) : i === generationState.currentScene ? (
                      <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                    ) : (
                      <span className="text-amber-200/40 text-sm">{i + 1}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Step: Preview */}
        {step === 'preview' && generationResult && (
          <section className="space-y-6">
            <div className="text-center mb-4">
              <h2 className="text-lg font-semibold text-amber-100">
                🎬 Preview / Gbíyà
              </h2>
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
                  "w-full py-6 text-lg font-semibold rounded-2xl",
                  "bg-gradient-to-r from-amber-500 to-orange-500",
                  "hover:from-amber-400 hover:to-orange-400"
                )}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                ✅ Continuer / Tɛ́rɛ́
              </Button>
            </div>

            {/* Reset button */}
            <Button
              variant="ghost"
              onClick={handleReset}
              className="w-full text-amber-200/60 hover:text-amber-200"
            >
              🔄 Recommencer
            </Button>
          </section>
        )}

        {/* Step: Finalize */}
        {step === 'finalize' && generationResult && (
          <section className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-lg font-semibold text-amber-100">
                📤 Finaliser / Sɔ̀ɔ́rɔ́
              </h2>
            </div>

            {/* Hidden canvas for export */}
            <canvas
              ref={canvasRef}
              width={540}
              height={960}
              className="hidden"
            />

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
            <div className="text-6xl animate-bounce">🎉</div>
            <h2 className="text-2xl font-bold text-amber-100">
              Publié sur FITILA!
            </h2>
            <p className="text-amber-200/60">
              Ton conte est maintenant visible par tous
            </p>
            
            <div className="flex flex-col gap-3 max-w-xs mx-auto pt-4">
              <Button
                size="lg"
                onClick={() => window.location.href = '/fitila'}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500"
              >
                📺 Voir le Feed
              </Button>
              
              <Button
                variant="outline"
                onClick={handleReset}
                className="w-full border-amber-500/30 text-amber-200"
              >
                🔄 Créer un autre conte
              </Button>
            </div>
          </section>
        )}
      </main>

      {/* Footer branding */}
      <footer className="fixed bottom-0 left-0 right-0 py-2 bg-black/60 backdrop-blur-sm">
        <p className="text-center text-xs text-amber-200/30">
          Griot Animé v6.2 • FITILA AI
        </p>
      </footer>
    </div>
  );
}

export default GriotStudio;
