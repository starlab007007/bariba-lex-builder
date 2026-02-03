/**
 * Griot Animé Studio v6.1
 * AI-powered Anime Story Creator
 * Generates illustrated stories with AI images and voice narration
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, Sparkles, Wand2, Play, Pause, Download, Share2, RotateCcw, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { NarratorCapture } from './NarratorCapture';
import { StoryInput } from './StoryInput';
import { AnimeStyleSelector, AnimeStyleName } from './AnimeStyleSelector';
import { useAnimeStoryGenerator, StoryScene } from './hooks/useAnimeStoryGenerator';
import { useVFXEngine } from './hooks/useVFXEngine';
import { GriotAnimationEngine, ANIMATION_STYLES } from '@/engines/GriotAnimationEngine';

type StudioStep = 'create' | 'generating' | 'preview';

const DURATION_OPTIONS = [
  { value: 15, label: '15s', emoji: '⚡' },
  { value: 30, label: '30s', emoji: '🎬' },
  { value: 60, label: '60s', emoji: '🎥' }
];

export function GriotStudio() {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GriotAnimationEngine | null>(null);
  
  // State
  const [step, setStep] = useState<StudioStep>('create');
  const [narratorFile, setNarratorFile] = useState<File | Blob | null>(null);
  const [narratorPreviewUrl, setNarratorPreviewUrl] = useState<string | null>(null);
  const [story, setStory] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [style, setStyle] = useState<AnimeStyleName>('african');
  const [duration, setDuration] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);

  // Hooks
  const {
    state: generationState,
    result: generationResult,
    generateStory,
    reset: resetGeneration
  } = useAnimeStoryGenerator();

  const { preloadStyleFlares } = useVFXEngine();

  // Initialize engine when canvas is ready
  useEffect(() => {
    if (canvasRef.current && !engineRef.current) {
      engineRef.current = new GriotAnimationEngine(canvasRef.current);
    }
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  // Handlers
  const handleNarratorCaptured = useCallback((file: File | Blob) => {
    setNarratorFile(file);
    const url = URL.createObjectURL(file);
    setNarratorPreviewUrl(url);
  }, []);

  const clearNarrator = useCallback(() => {
    if (narratorPreviewUrl) {
      URL.revokeObjectURL(narratorPreviewUrl);
    }
    setNarratorFile(null);
    setNarratorPreviewUrl(null);
  }, [narratorPreviewUrl]);

  const handleAudioRecorded = useCallback((blob: Blob) => {
    setAudioBlob(blob);
    setStory('[🎤 Audio enregistré - En attente de transcription...]');
    toast({
      title: "🎤 Audio enregistré!",
      description: "Ton histoire vocale a été capturée."
    });
  }, [toast]);

  const handleGenerate = useCallback(async () => {
    if (!story.trim() || story.startsWith('[')) {
      toast({
        title: "Histoire requise",
        description: "Écris ou dicte ton conte pour créer l'animation.",
        variant: "destructive"
      });
      return;
    }

    setStep('generating');

    try {
      // Preload VFX assets
      await preloadStyleFlares(style);

      // Generate anime story with AI
      const result = await generateStory(story, style, duration);

      if (!result || !result.scenes.length) {
        throw new Error('Aucune scène générée');
      }

      // Load scenes into engine
      if (engineRef.current && result.scenes.length > 0) {
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

        await engineRef.current.loadScenes(scenesWithTiming);

        // Load narrator avatar if provided
        if (narratorPreviewUrl) {
          await engineRef.current.loadNarratorAvatar(narratorPreviewUrl);
        }

        // Set audio if available
        if (result.audioUrl) {
          engineRef.current.setAudio(result.audioUrl);
        }
      }

      // Transition to preview
      setStep('preview');

      // Start preview automatically
      setTimeout(() => {
        handlePlay();
      }, 500);

    } catch (error) {
      console.error('[GriotStudio] Generation error:', error);
      toast({
        title: "Erreur de génération",
        description: error instanceof Error ? error.message : "Réessaie dans quelques instants.",
        variant: "destructive"
      });
      setStep('create');
    }
  }, [story, style, duration, preloadStyleFlares, generateStory, narratorPreviewUrl, toast]);

  const handlePlay = useCallback(() => {
    if (engineRef.current && generationResult) {
      const animStyle = ANIMATION_STYLES[style] || ANIMATION_STYLES.fantasy;
      engineRef.current.startSlideshowPreview(duration, animStyle, (progress) => {
        // Could update progress UI here
      });
      setIsPlaying(true);
    }
  }, [style, duration, generationResult]);

  const handlePause = useCallback(() => {
    engineRef.current?.stopPreview();
    setIsPlaying(false);
  }, []);

  const handleExport = useCallback(async () => {
    try {
      handlePause();
      
      toast({
        title: "🎬 Export en cours...",
        description: "Patiente pendant la création de ta vidéo."
      });

      if (engineRef.current) {
        const animStyle = ANIMATION_STYLES[style] || ANIMATION_STYLES.fantasy;
        const frames = await engineRef.current.renderSlideshowFrames(duration, animStyle, 24, (progress, msg) => {
          // Update progress
        });
        
        // Download last frame as preview
        if (frames.length > 0) {
          const lastFrame = frames[frames.length - 1];
          const url = URL.createObjectURL(lastFrame);
          
          const link = document.createElement('a');
          link.href = url;
          link.download = `griot-anime-${Date.now()}.png`;
          link.click();
          
          URL.revokeObjectURL(url);
        }
      }

      toast({
        title: "✅ Export terminé!",
        description: "Ton conte animé a été sauvegardé."
      });

    } catch (error) {
      console.error('[GriotStudio] Export error:', error);
      toast({
        title: "Erreur d'export",
        description: "Réessaie dans quelques instants.",
        variant: "destructive"
      });
    }
  }, [handlePause, style, duration, toast]);

  const handleShare = useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Mon conte animé - Griot Studio',
          text: story.slice(0, 100) + '...',
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "📋 Lien copié!",
          description: "Partage ce lien avec tes amis."
        });
      }
    } catch (error) {
      console.error('[GriotStudio] Share error:', error);
    }
  }, [story, toast]);

  const handleReset = useCallback(() => {
    handlePause();
    resetGeneration();
    clearNarrator();
    setStory('');
    setAudioBlob(null);
    setStep('create');
  }, [handlePause, resetGeneration, clearNarrator]);

  const handleBack = useCallback(() => {
    if (step === 'preview') {
      handlePause();
      setStep('create');
    } else if (step === 'generating') {
      setStep('create');
    }
  }, [step, handlePause]);

  const canGenerate = story.trim() && !story.startsWith('[');

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-950 via-black to-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-3 bg-black/80 backdrop-blur-lg border-b border-amber-500/20">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {step !== 'create' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="text-amber-200 hover:text-amber-100"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Retour
            </Button>
          ) : (
            <div className="w-20" />
          )}
          
          <h1 className="text-lg font-bold text-amber-100 flex items-center gap-2">
            <span className="text-2xl">🌙</span>
            Griot Animé
          </h1>
          
          <div className="w-20" />
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6 pb-20">
        
        {/* Step: Create */}
        {step === 'create' && (
          <>
            {/* Narrator Avatar (optional) */}
            <section className="flex justify-center">
              <NarratorCapture
                onImageCaptured={handleNarratorCaptured}
                previewUrl={narratorPreviewUrl}
                onClear={clearNarrator}
                disabled={generationState.isGenerating}
              />
            </section>

            {/* Story Input */}
            <section>
              <StoryInput
                value={story}
                onChange={setStory}
                onAudioRecorded={handleAudioRecorded}
                disabled={generationState.isGenerating}
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
                ⏱️ Durée du conte
              </h3>
              <div className="flex justify-center gap-3">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDuration(opt.value)}
                    disabled={generationState.isGenerating}
                    className={cn(
                      "px-4 py-2 rounded-lg border transition-all",
                      duration === opt.value
                        ? "border-amber-400 bg-amber-500/20 text-amber-100"
                        : "border-amber-500/20 bg-amber-950/20 text-amber-200/60 hover:border-amber-500/40"
                    )}
                  >
                    <span className="mr-1">{opt.emoji}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Generate Button */}
            <section className="pt-4">
              <Button
                size="lg"
                onClick={handleGenerate}
                disabled={!canGenerate || generationState.isGenerating}
                className={cn(
                  "w-full py-6 text-lg font-semibold rounded-2xl transition-all",
                  "bg-gradient-to-r from-amber-500 to-orange-500",
                  "hover:from-amber-400 hover:to-orange-400",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                ✨ Créer mon conte animé
              </Button>
              
              {!canGenerate && (
                <p className="text-xs text-amber-200/40 text-center mt-2">
                  Écris ton histoire pour commencer
                </p>
              )}
            </section>
          </>
        )}

        {/* Step: Generating */}
        {step === 'generating' && (
          <section className="py-8 space-y-6">
            <div className="text-center">
              <Wand2 className="w-16 h-16 mx-auto text-amber-400 animate-pulse mb-4" />
              <h2 className="text-xl font-semibold text-amber-100 mb-2">
                🎨 L'IA illustre ton conte...
              </h2>
              <p className="text-amber-200/60">
                {generationState.message || 'Création en cours...'}
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-amber-900/30 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                style={{ width: `${generationState.progress}%` }}
              />
            </div>

            {/* Scene progress */}
            {generationState.totalScenes > 0 && (
              <div className="space-y-2">
                {Array.from({ length: generationState.totalScenes }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {i < generationState.currentScene ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : i === generationState.currentScene ? (
                      <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-amber-500/30" />
                    )}
                    <span className={cn(
                      i < generationState.currentScene ? "text-green-400" :
                      i === generationState.currentScene ? "text-amber-200" :
                      "text-amber-200/40"
                    )}>
                      Scène {i + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <section className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-lg font-semibold text-amber-100">
                🎬 Ton conte animé est prêt!
              </h2>
            </div>

            {/* Canvas Preview */}
            <div className="relative aspect-[9/16] w-full max-w-sm mx-auto rounded-2xl overflow-hidden bg-black shadow-2xl shadow-amber-500/20">
              <canvas
                ref={canvasRef}
                width={540}
                height={960}
                className="w-full h-full object-cover"
              />
              
              {/* Play/Pause overlay */}
              <button
                onClick={isPlaying ? handlePause : handlePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors group"
              >
                <div className={cn(
                  "w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center",
                  "group-hover:bg-white/30 transition-colors",
                  isPlaying && "opacity-0 group-hover:opacity-100"
                )}>
                  {isPlaying ? (
                    <Pause className="w-8 h-8 text-white" />
                  ) : (
                    <Play className="w-8 h-8 text-white ml-1" />
                  )}
                </div>
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex justify-center gap-3">
              <Button
                variant="outline"
                onClick={handleShare}
                className="bg-amber-500/10 border-amber-500/30 text-amber-200 hover:bg-amber-500/20"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Partager
              </Button>
              <Button
                variant="outline"
                onClick={handleExport}
                className="bg-amber-500/10 border-amber-500/30 text-amber-200 hover:bg-amber-500/20"
              >
                <Download className="w-4 h-4 mr-2" />
                Télécharger
              </Button>
            </div>

            {/* Reset button */}
            <div className="text-center pt-4">
              <Button
                variant="ghost"
                onClick={handleReset}
                className="text-amber-200/60 hover:text-amber-200"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Créer un autre conte
              </Button>
            </div>

            {/* Scene thumbnails */}
            {generationResult?.scenes && generationResult.scenes.length > 0 && (
              <div className="pt-4">
                <h3 className="text-sm text-amber-200/60 mb-2 text-center">
                  📖 {generationResult.scenes.length} scènes générées
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {generationResult.scenes.map((scene, i) => (
                    <div 
                      key={i}
                      className="flex-shrink-0 w-16 h-24 rounded-lg overflow-hidden border border-amber-500/30 bg-amber-950/30"
                    >
                      {scene.imageUrl ? (
                        <img 
                          src={scene.imageUrl} 
                          alt={`Scène ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-amber-200/40 text-xs">
                          {i + 1}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Footer branding */}
      <footer className="fixed bottom-0 left-0 right-0 py-2 bg-black/60 backdrop-blur-sm">
        <p className="text-center text-xs text-amber-200/30">
          Griot Animé v6.1 • Powered by FITILA AI
        </p>
      </footer>
    </div>
  );
}

export default GriotStudio;
